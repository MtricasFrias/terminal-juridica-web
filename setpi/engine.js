/* SETPI — motor: carga de frames reales, actor (canvas) y animación por clips.
   - Cada pose es un dibujo real (frames.json: tamaño, ancla de pies y escala relativa al "alto de pie" S).
   - Posición (x,y de suelo), altura (lift), escala por profundidad y volteo son del actor; la pose es solo el frame.
   - Todo es cancelable: cancel() rechaza las promesas pendientes con Setpi.CANCEL, así el director puede interrumpir
     cualquier animación sin dejar estados a medias. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const CANCEL = S.CANCEL = { cancelado: true };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = { out: t => 1 - (1 - t) * (1 - t), in: t => t * t, in3: t => t * t * t, io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, lin: t => t };

  /* ---------- carga de frames (los del movimiento primero; el resto en segundo plano) ---------- */
  const CORE = ['idle_a', 'idle_b', 'blink_f', 'turn_34', 'blink_34', 'turn_f', 'run_1', 'run_2', 'run_3', 'run_4', 'run_5', 'run_6'];
  S.Frames = {
    meta: null, img: {}, ok: {},
    load(base) {
      const self = this;
      return fetch(base + 'frames.json').then(r => r.json()).then(j => {
        self.meta = j.frames; self.ref = j.ref;
        const early = /^(walkf|back|turn|wave|wavew|wave34|like|around|lookuser|surp|point|jump|no|clap|cele|watch|search|selfie|stretch|dance|bench|sit|yawn|nod|sleep|wake|think|lupa|tablet|peek|spy|bus|bwin|bexit)/;
        const names = Object.keys(j.frames).sort((p, q) => (early.test(q) ? 1 : 0) - (early.test(p) ? 1 : 0)), order = CORE.concat(names.filter(n => CORE.indexOf(n) < 0));
        const mk = n => new Promise(res => { const i = new Image(); i.onload = () => { self.ok[n] = true; if (i.decode) i.decode().catch(() => { }); res(); }; i.onerror = () => res(); i.decoding = 'async'; i.src = base + 'f/' + n + '.webp'; self.img[n] = i; });
        const core = Promise.all(CORE.map(mk));
        core.then(() => { order.slice(CORE.length).forEach(mk); });
        return core;
      });
    },
    has(n) { return !!this.ok[n]; }
  };

  function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  class Actor {
    constructor(stage) {
      this.stage = stage;
      this.layerSh = el('div', 'sp-l-sh', stage); this.layerA = el('div', 'sp-l-a', stage); this.layerFx = el('div', 'sp-l-fx', stage);
      this.sh = el('div', 'sp-sh', this.layerSh);
      this.root = el('div', 'sp', this.layerA);
      this.cv = el('canvas', 'sp-cv', this.root); this.ctx = this.cv.getContext('2d');
      this.x = 0; this.y = 0; this.lift = 0; this.S = 200; this.Scap = 200; this.facing = 1; this.stance = 'F';
      this.pose = { f: 'idle_a' }; this.prev = null; this.xf = 0; this.xfDur = 0;
      this.anim = null; this.walk = null; this.tw = []; this.timers = []; this.pending = new Set();
      this.t = 0; this.visible = false; this.dirty = true; this.fxN = 0; this.autoIdle = true;
      this.idleT = 0; this.blinkT = 2 + Math.random() * 3; this.blinking = 0; this.idleSwap = 0; this.idleA = true;
      this.mod = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, a: 1, br: 1 };
      this.dpr = Math.min(2, g.devicePixelRatio || 1);
      this.scaleAt = null;         // y -> S (profundidad); lo pone el director
      this.pathHook = null; this.clipL = -1e9; this.clipR = 1e9;       // recorte: solo se ve lo que queda a la derecha de clipL (esconderse tras el QR)
    }
    /* ---------- tamaño / posición ---------- */
    setCap(Scap) {                // lienzo para el tamaño máximo; el dibujo usa S <= Scap
      Scap = Math.ceil(Scap); if (this.Scap === Scap && this.cv.width) return;
      this.Scap = Scap; const m = S.Frames.meta; let hw = 0.6, up = 1.05, dn = 0.12;
      if (m) for (const k in m) { const f = m[k], u = f.u; hw = Math.max(hw, f.ax * u, (f.w - f.ax) * u); up = Math.max(up, f.ay * u); dn = Math.max(dn, (f.h - f.ay) * u); }
      this.hw = hw; this.up = up; this.dn = dn;
      const W = Math.ceil(2 * hw * Scap) + 4, H = Math.ceil((up + dn) * Scap) + 4;
      this.cvW = W; this.cvH = H; this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
      this.cv.width = Math.round(W * this.dpr); this.cv.height = Math.round(H * this.dpr);
      this.cv.style.left = (-W / 2) + 'px'; this.cv.style.top = (-(up * Scap + 2)) + 'px';
      this.dirty = true;
    }
    setS(s) { this.S = clamp(s, 20, this.Scap); this.dirty = true; }
    place(x, y) { this.x = x; if (y != null) this.y = y; this.dirty = true; }
    face(d) { if (d !== this.facing) { this.facing = d; this.dirty = true; } }
    show(v) { this.visible = v; this.root.style.visibility = v ? 'visible' : 'hidden'; this.sh.style.visibility = v ? 'visible' : 'hidden'; this.dirty = true; }
    /* ---------- promesas cancelables ---------- */
    _p(fn) { return new Promise((res, rej) => { const rec = { res, rej }; this.pending.add(rec); fn(() => { this.pending.delete(rec); res(); }); }); }
    cancel() {
      this.walk = null; this.anim = null; this.tw = []; this.timers = [];
      const p = [...this.pending]; this.pending.clear(); p.forEach(r => r.rej(CANCEL));
      this.clipL = -1e9; this.mod.rot = 0; this.mod.sx = this.mod.sy = 1; this.mod.dx = this.mod.dy = 0; this.mod.a = 1; this.mod.br = 1;
    }
    wait(sec) { return this._p(done => this.timers.push({ t: sec, done })); }
    /* ---------- clips: lista de {f, t, dx, dy, rot, sx, sy, fade} ---------- */
    play(clip, o) {
      o = o || {}; const frames = clip.frames || clip; if (!frames.length) return Promise.resolve();
      return this._p(done => {
        this.autoIdle = false; this.walk = null;
        this.anim = { frames, i: -1, t: 0, loops: o.loops || 1, rate: o.rate || 1, done, onFrame: o.onFrame || null, hold: !!o.hold };
        this._frame(0);
      });
    }
    loop(clip, o) {
      o = o || {}; const frames = clip.frames || clip;
      this.autoIdle = false; this.anim = { frames, i: -1, t: 0, loops: Infinity, rate: o.rate || 1, done: null, onFrame: o.onFrame || null };
      this._frame(0);
    }
    _frame(i) {
      const a = this.anim, fr = a.frames[i]; a.i = i; a.t = 0;
      this._setPose(fr);
      if (a.onFrame) a.onFrame(fr, i);
    }
    _setPose(fr) {
      if (fr.f !== this.pose.f && fr.fade) { this.prev = { f: this.pose.f, mod: Object.assign({}, this.mod), flip: this.facing }; this.xf = 0; this.xfDur = fr.fade; }
      if (fr.face) this.facing = fr.face;
      this.pose = fr; this.mod.dx = fr.dx || 0; this.mod.dy = fr.dy || 0; this.mod.rot = fr.rot || 0; this.mod.sx = fr.sx || 1; this.mod.sy = fr.sy || 1; this.mod.a = fr.a == null ? 1 : fr.a; this.mod.br = fr.br == null ? 1 : fr.br;
      this.dirty = true;
    }
    /* vuelve al reposo automático (respira y parpadea) en la vista indicada */
    rest(stance) { this.walk = null; this.anim = null; this.autoIdle = true; if (stance) this.stance = stance; this.idleT = 0; this.blinking = 0; this._idleFrame(); }
    /* ---------- tweens de valores del actor ---------- */
    tween(key, to, dur, easing, obj) {
      obj = obj || this;
      return this._p(done => this.tw.push({ obj, key, from: obj[key], to, t: 0, dur: Math.max(.001, dur), e: ease[easing || 'io'], done }));
    }
    /* ---------- movimiento ---------- */
    /* corre hasta (tx,ty). El ciclo de carrera se ata a la velocidad real (sin patinar). */
    moveTo(tx, ty, o) {
      o = o || {}; if (ty == null) ty = this.y;
      const dx = tx - this.x, dy = ty - this.y; if (Math.hypot(dx, dy) < 2) return Promise.resolve();
      return this._p(done => {
        this.autoIdle = false; this.anim = null;
        const gait = o.gait || (Math.abs(dy) > Math.abs(dx) * 1.6 && dy > 0 ? 'front' : 'run');
        if (gait === 'run' && Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
        this.walk = { sx: this.x, sy: this.y, tx, ty, speed: o.speed || this.S * 1.6, gait, done, t: 0, ramp: o.ramp == null ? this.S * .35 : o.ramp, ci: 0, ct: 0 };
        this.dirty = true;
      });
    }
    get moving() { return !!this.walk; }
    /* de espaldas a de frente: giro de caricatura (se achata a lo ancho, cambia de dibujo y se estira) */
    async spin(frame, f2) {
      await this.tween('sx', .04, .11, 'in', this.mod); this._setPose({ f: frame || 'idle_a' }); this.mod.sx = .04; this.stance = 'F'; this.facing = 1;
      await this.tween('sx', 1, .15, 'out', this.mod);
    }
    /* ---------- efectos ---------- */
    headPos() {
      const f = S.Frames.meta && S.Frames.meta[this.pose.f]; const s = this.S;
      if (!f || f.hx == null) return { x: this.x, y: this.y - this.lift - 0.8 * s, r: 0.18 * s };
      const u = f.u * s;
      return { x: this.x + this.facing * (f.hx - f.ax) * u, y: this.y - this.lift + (f.hy - f.ay) * u, r: f.hw * u / 2 };
    }
    fx(kind, o) { return S.fx ? S.fx(this, kind, o) : null; }
    /* ---------- bucle ---------- */
    update(dt) {
      this.t += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.done(); } }
      for (let i = this.tw.length - 1; i >= 0; i--) {
        const w = this.tw[i]; w.t += dt; const p = clamp(w.t / w.dur, 0, 1); w.obj[w.key] = w.from + (w.to - w.from) * w.e(p); this.dirty = true; if (w.obj.apply) w.obj.apply();
        if (p >= 1) { this.tw.splice(i, 1); w.done(); }
      }
      const a = this.anim;
      if (a) {
        a.t += dt * a.rate;
        for (let guard = 0; guard < 8 && this.anim === a; guard++) {
          const fr = a.frames[a.i]; const dur = fr.t || .1;
          if (a.t < dur) break;
          a.t -= dur;
          if (a.i + 1 >= a.frames.length) {
            if (a.loops === Infinity) { this._frame(0); continue; }
            if (--a.loops > 0) { this._frame(0); continue; }
            this.anim = null; if (a.done) a.done(); break;
          }
          this._frame(a.i + 1);
        }
      }
      if (a && !this.pose.sway && !this.walk && (a.frames[a.i].t || 0) >= .4) { const p = this.pose; this.mod.sy = (p.sy || 1) * (1 + .0045 * Math.sin(this.t * 2.6)); this.mod.rot = (p.rot || 0) + .6 * Math.sin(this.t * 1.9 + 1); this.dirty = true; }   // una pose sostenida no se queda congelada
      if (this.pose.sway) { const w = this.pose.sway; this.mod.rot = (this.pose.rot || 0) + w.a * Math.sin(this.t * 6.2832 / w.p); this.dirty = true; }   // balanceo suave y continuo mientras dura el frame
      this._walk(dt);
      if (this.autoIdle && !this.anim && !this.walk) this._idle(dt);
      if (this.xfDur && this.prev) { this.xf += dt; this.dirty = true; if (this.xf >= this.xfDur) { this.prev = null; this.xfDur = 0; } }
      if (this.scaleAt) { const s = clamp(this.scaleAt(this.y), 20, this.Scap); if (Math.abs(s - this.S) > .05) { this.S = s; this.dirty = true; } }
      if (this.dirty) this.render();
    }
    _idleFrame() {
      this.idleSwap = 0;
      const f = this.stance === 'F' ? (this.idleA ? 'idle_a' : 'idle_b') : 'turn_34';
      if (this.pose.f !== f) this._setPose({ f, fade: .08 });
    }
    _idle(dt) {
      this.idleT += dt;
      const F = this.stance === 'F';
      if (this.blinking > 0) { this.blinking -= dt; if (this.blinking <= 0) this._idleFrame(); }
      else {
        this.blinkT -= dt;
        if (this.blinkT <= 0) { this.blinkT = 2.6 + Math.random() * 3.6; this.blinking = .11; this._setPose({ f: F ? 'blink_f' : 'blink_34' }); }
        else if (F) { this.idleSwap += dt; if (this.idleSwap > 1.15) { this.idleA = !this.idleA; this._idleFrame(); } }
        else if (this.pose.f !== 'turn_34') this._idleFrame();
      }
      // respiración casi imperceptible (solo escala vertical sobre los pies)
      const br = 1 + 0.006 * Math.sin(this.t * 2.1); if (Math.abs(br - this.mod.sy) > .0015) { this.mod.sy = br; this.dirty = true; }
    }
    _walk(dt) {
      const w = this.walk; if (!w) return;
      const dx = w.tx - this.x, dy = w.ty - this.y, dist = Math.hypot(dx, dy);
      w.t += dt;
      const fromStart = Math.hypot(this.x - w.sx, this.y - w.sy);
      const k = clamp(Math.min(fromStart / (w.ramp || 1), dist / ((w.ramp || 1) * .8)) , 0, 1);
      const spd = w.speed * (.38 + .62 * k);
      const st = Math.min(dist, spd * dt);
      if (dist > 0) { this.x += dx / dist * st; this.y += dy / dist * st; }
      if (w.gait === 'run') { if (Math.abs(dx) > 1.5) this.facing = dx > 0 ? 1 : -1; }
      // ciclo atado a la distancia recorrida: una zancada (6 frames) = stride px
      const names = w.gait === 'run' ? ['run_1', 'run_2', 'run_3', 'run_4', 'run_5', 'run_6'] : w.gait === 'back' ? ['back_1', 'back_2', 'back_3', 'back_4', 'back_5', 'back_6'] : ['walkf_1', 'walkf_2', 'walkf_3', 'walkf_4', 'walkf_5', 'walkf_6'];
      /* cadencia: antes la carrera salia a ~6-9 dibujos por segundo (se veía a saltos). Zancada más corta + mínimo de ritmo (aunque arranque o frene) */
      const stride = Math.min(this.S * (w.gait === 'run' ? .8 : .5), (w.speed || 1) / 1.7);
      w.ct += Math.max(st / stride * 6, dt * 7.5); w.ci = Math.floor(w.ct) % 6;
      const f = names[w.ci]; if (this.pose.f !== f) this._setPose({ f });
      this.stance = w.gait === 'run' ? 'R' : 'F';
      this.dirty = true;
      if (dist - st < .5) { this.x = w.tx; this.y = w.ty; this.walk = null; w.done(); }
    }
    /* ---------- dibujo ---------- */
    _blit(ctx, f, mod, flip, alpha) {
      const m = S.Frames.meta[f], im = S.Frames.img[f]; if (!m || !S.Frames.ok[f]) return;
      const sc = this.S * m.u * this.dpr, ax = m.ax, ay = m.ay;
      ctx.save();
      ctx.globalAlpha = alpha * mod.a;
      if (mod.br !== 1) ctx.filter = 'brightness(' + mod.br + ')';
      ctx.translate((this.cvW / 2 + mod.dx * this.S * flip) * this.dpr, (this.up * this.Scap + 2 + mod.dy * this.S) * this.dpr);
      if (mod.rot) ctx.rotate(mod.rot * Math.PI / 180 * flip);
      ctx.scale(flip * mod.sx, mod.sy);
      ctx.drawImage(im, -ax * sc, -ay * sc, m.w * sc, m.h * sc);
      ctx.restore();
    }
    render() {
      this.dirty = false;
      if (!S.Frames.meta || !this.cvW) return;
      const ctx = this.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      const flip = this.facing;
      let f = this.pose.f; if (!S.Frames.has(f)) f = this._good || 'idle_a'; else this._good = f;
      if (this.prev && this.xfDur) {
        const p = clamp(this.xf / this.xfDur, 0, 1);
        this._blit(ctx, this.prev.f in S.Frames.meta ? this.prev.f : 'idle_a', this.prev.mod, this.prev.flip, 1);
        this._blit(ctx, f, this.mod, flip, p);
      } else this._blit(ctx, f, this.mod, flip, 1);
      const L0 = this.x - this.cvW / 2, il = this.clipL > -1e8 ? Math.max(0, this.clipL - L0) : 0, ir = this.clipR < 1e8 ? Math.max(0, L0 + this.cvW - this.clipR) : 0;   // lo que cae detrás del panel / tarjeta no se transparenta
      const V = this._v || (this._v = {}), sv = (k, el, prop, val) => { if (V[k] !== val) { V[k] = val; el.style[prop] = val; } };    // solo se escribe en el DOM lo que cambió
      sv('cl', this.cv, 'clipPath', il || ir ? 'inset(0 ' + ir.toFixed(1) + 'px 0 ' + il.toFixed(1) + 'px)' : '');
      sv('rt', this.root, 'transform', 'translate3d(' + this.x.toFixed(1) + 'px,' + (this.y - this.lift).toFixed(1) + 'px,0)');
      const sw = this.S * .62 * (1 - clamp(this.lift / (this.S * .9), 0, .55)), shh = this.S * .11;
      sv('sd', this.sh, 'display', this.noShadow ? 'none' : '');
      sv('sw', this.sh, 'width', sw.toFixed(1) + 'px'); sv('sh', this.sh, 'height', shh.toFixed(1) + 'px');
      sv('st', this.sh, 'transform', 'translate3d(' + (this.x - sw / 2).toFixed(1) + 'px,' + (this.y - shh * .55).toFixed(1) + 'px,0)');
      sv('so', this.sh, 'opacity', (1 - clamp(this.lift / (this.S * 1.1), 0, .6)).toFixed(2));
      sv('sc', this.sh, 'clipPath', this.clipR < 1e8 && this.x + sw / 2 > this.clipR ? 'inset(0 ' + Math.max(0, this.x + sw / 2 - this.clipR).toFixed(1) + 'px 0 0)' : '');
    }
  }
  S.Actor = Actor;
})(window);
