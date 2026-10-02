/* SETPI — actor: sprite real por capas + posición (x/y de escenario) independiente de la pose.
   Mismo lienzo (360x520) y mismo ancla (centro de la cabeza, contacto con el suelo) en todos los frames,
   así que cambiar de frame nunca "salta". La posición es del contenedor; la pose es el frame/brazo. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const CANCEL = S.CANCEL = { cancelado: true };
  const CV = { w: 360, h: 520, ax: 180, ay: 508, pivot: [251, 330], eyes: [[193, 233], [258, 228]] };
  const FRAMES = ['walk_1', 'walk_2', 'walk_3', 'walk_4', 'walk_5', 'walk_6', 'look_3', 'stand', 'look', 'alert', 'stand_noarm'];
  S.CV = CV;

  function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  class Actor {
    constructor(stage, base) {
      this.stage = stage; this.base = base || 'setpi/';
      this.x = 0; this.y = 0; this.s = 0.26; this.facing = 1;
      this.pose = { f: 'stand' }; this.anim = null; this.walk = null; this.timers = []; this.pending = new Set();
      this.obstacle = null; this.blink = 0; this.nextBlink = 3 + Math.random() * 3; this.dirty = true; this.fxN = 0;
      this.build();
    }
    build() {
      this.root = el('div', 'sp', this.stage);
      this.flip = el('div', 'sp-flip', this.root);
      this.body = el('div', 'sp-body', this.flip);
      this.imgs = {};
      FRAMES.forEach(k => { const i = el('img', 'sp-f', this.body); i.src = this.base + k + '.webp'; i.alt = ''; i.draggable = false; this.imgs[k] = i; });
      this.armImg = el('img', 'sp-arm', this.body); this.armImg.src = this.base + 'arm_r.webp'; this.armImg.alt = ''; this.armImg.draggable = false;
      this.thumbImg = el('img', 'sp-arm', this.body); this.thumbImg.src = this.base + 'arm_r_thumb.webp'; this.thumbImg.alt = ''; this.thumbImg.draggable = false;
      this.eyes = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.eyes.setAttribute('class', 'sp-eyes'); this.eyes.setAttribute('viewBox', '0 0 ' + CV.w + ' ' + CV.h);
      this.eyes.innerHTML = CV.eyes.map(p => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="33" ry="31" fill="#9a9692"/><path d="M${p[0] - 24} ${p[1] - 2} Q${p[0]} ${p[1] + 22} ${p[0] + 24} ${p[1] - 2}" fill="none" stroke="#10213f" stroke-width="6" stroke-linecap="round"/>`).join('');
      this.body.appendChild(this.eyes);
    }
    resize(s) {
      this.s = s; const W = CV.w * s, H = CV.h * s;
      this.root.style.width = W + 'px'; this.root.style.height = H + 'px';
      [this.flip, this.body].forEach(e => { e.style.width = W + 'px'; e.style.height = H + 'px'; });
      this.flip.style.transformOrigin = (CV.ax * s) + 'px 0';
      this.body.style.transformOrigin = (CV.ax * s) + 'px ' + (CV.ay * s) + 'px';
      this.armImg.style.transformOrigin = this.thumbImg.style.transformOrigin = (CV.pivot[0] * s) + 'px ' + (CV.pivot[1] * s) + 'px';
      this.dirty = true;
    }
    place(x, y) { this.x = x; if (y != null) this.y = y; this.dirty = true; }
    show(v) { this.root.style.visibility = v ? 'visible' : 'hidden'; this.visible = v; }
    /* ---- promesas cancelables ---- */
    _p(fn) { return new Promise((res, rej) => { const rec = { res, rej }; this.pending.add(rec); fn(() => { this.pending.delete(rec); res(); }); }); }
    cancel() {
      this.walk = null; this.anim = null; this.timers = [];
      const p = [...this.pending]; this.pending.clear(); p.forEach(r => r.rej(CANCEL));
    }
    wait(sec) { return this._p(done => this.timers.push({ t: sec, done })); }
    setPose(p) { this.pose = p; this.dirty = true; }
    play(name, o) {
      o = o || {}; const c = S.CLIPS[name]; if (!c) return Promise.resolve();
      return this.playFrames(c.frames, o.fps || c.fps || 10, o.loops || 1);
    }
    playFrames(frames, fps, loops) {
      return this._p(done => { this.anim = { frames, fps, loop: false, loops: loops || 1, i: 0, acc: 0, done }; this.setPose(frames[0]); });
    }
    loop(name) { const c = S.CLIPS[name]; this.anim = { frames: c.frames, fps: c.fps || 10, loop: true, loops: 1, i: 0, acc: 0, done: null }; this.setPose(c.frames[0]); }
    /* bucle de caminar mientras se desplaza hasta (tx,ty) en px de escenario; chain=true encadena tramos sin cortar el ciclo */
    walkTo(tx, ty, o) {
      o = o || {}; if (ty == null) ty = this.y;
      if (Math.abs(tx - this.x) < 2 && Math.abs(ty - this.y) < 2) return Promise.resolve();
      return this._p(done => {
        if (Math.abs(tx - this.x) > 2) this.facing = tx > this.x ? 1 : -1;
        this.walk = { tx, ty, speed: o.speed || (CV.h * this.s * 0.85), chain: !!o.chain, done };
        const c = S.CLIPS.walk_loop;
        if (!(this.anim && this.anim.frames === c.frames)) { this.anim = { frames: c.frames, fps: o.fps || c.fps, loop: true, loops: 1, i: 0, acc: 0, done: null }; this.setPose(c.frames[0]); }
        this.dirty = true;
      });
    }
    face(dir) { this.facing = dir; this.dirty = true; }
    get walking() { return !!this.walk; }
    /* vuelve SIEMPRE a la pose neutra con su salida (nada de saltos bruscos) */
    async toStand() {
      this.walk = null; this.anim = null;
      let p = this.pose;
      if (p.arm) {
        const a = p.arm.a, th = p.arm.thumb;
        await this.playFrames([.75, .5, .28, .1, 0].map(k => ({ f: 'stand_noarm', arm: { a: a * k, thumb: th && k > .4 } })), 14);
        p = this.pose;
      }
      if (p.eyes === 'closed' || p.tilt || p.dy) { await this.play('wake'); p = this.pose; }
      const f = String(p.f);
      if (f.indexOf('walk') === 0 || f === 'look_3') await this.play('walk_exit');
      else if (f === 'look') await this.play('look_exit');
      else if (f === 'alert') await this.play('relax');
      this.anim = null; this.setPose({ f: 'stand' });
    }
    /* ---- recorte: oculto detrás de un rect del escenario (panel de la sala) ---- */
    setObstacle(r) { this.obstacle = r; this.dirty = true; }
    _clip() {
      const r = this.obstacle, s = this.s, W = CV.w * s, H = CV.h * s;
      if (!r) { this.root.style.clipPath = ''; return; }
      const L = this.x - CV.ax * s, T = this.y - CV.ay * s;
      const ox1 = Math.max(0, r.left - L), oy1 = Math.max(0, r.top - T), oy2 = Math.min(H, r.bottom - T);
      if (ox1 >= W || oy1 >= oy2) { this.root.style.clipPath = ''; return; }
      const f = v => v.toFixed(1);
      this.root.style.clipPath = `polygon(0px 0px,${f(W)}px 0px,${f(W)}px ${f(oy1)}px,${f(ox1)}px ${f(oy1)}px,${f(ox1)}px ${f(oy2)}px,${f(W)}px ${f(oy2)}px,${f(W)}px ${f(H)}px,0px ${f(H)}px)`;
    }
    /* ---- efectos temporales (NO son parte del personaje) ---- */
    fx(kind) {
      const s = this.s, hx = this.x, hy = this.y - 368 * s;     // centro aprox. de la cabeza
      if (this.fxN > 14) return;
      const mk = (cls, x, y, html, life) => { const e = el('div', 'sp-fx ' + cls, this.stage); e.style.left = x + 'px'; e.style.top = y + 'px'; if (html) e.innerHTML = html; this.fxN++; setTimeout(() => { e.remove(); this.fxN--; }, life); return e; };
      if (kind === 'zzz') { [0, 1, 2].forEach(i => { const e = mk('z', hx + 40 * s * this.facing + i * 10, hy + 90 * s - i * 8, 'Z', 2600); e.style.animationDelay = (i * .55) + 's'; e.style.fontSize = (11 + i * 5) + 'px'; }); }
      if (kind === 'alert') { mk('alert', hx + 60 * s * this.facing, hy - 20 * s, '<svg viewBox="0 0 60 50" width="' + 56 * s * 3 + '"><g stroke="#FFC21A" stroke-width="6" stroke-linecap="round"><path d="M10 38 L22 22"/><path d="M30 30 L30 8"/><path d="M50 38 L38 22"/></g></svg>', 900); }
      if (kind === 'spark') { for (let i = 0; i < 7; i++) { const e = mk('spark', hx + (Math.random() - .5) * 150 * s, hy + 60 * s + (Math.random() - .5) * 120 * s, '', 1100); e.style.background = ['#F0A800', '#159BD6', '#00A830', '#D62828', '#fff'][i % 5]; e.style.animationDelay = (i * .05) + 's'; } }
    }
    update(dt) {
      // temporizadores
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.done(); } }
      // animación por clip
      const a = this.anim;
      if (a) {
        a.acc += dt; const step = 1 / a.fps;
        while (a.acc >= step && this.anim === a) {
          a.acc -= step; a.i++;
          if (a.i >= a.frames.length) {
            if (a.loop) a.i = 0;
            else if (a.loops > 1) { a.loops--; a.i = 0; }
            else { this.anim = null; this.setPose(a.frames[a.frames.length - 1]); if (a.done) a.done(); break; }
          }
          this.setPose(a.frames[a.i]);
        }
      }
      // desplazamiento (independiente de la pose)
      const w = this.walk;
      if (w) {
        const dx = w.tx - this.x, dy = w.ty - this.y, dist = Math.hypot(dx, dy), st = Math.min(dist, w.speed * dt);
        if (dist > 0) { this.x += dx / dist * st; this.y += dy / dist * st; }
        this.dirty = true;
        if (dist - st < 0.5) { this.x = w.tx; this.y = w.ty; this.walk = null; if (!w.chain) { this.anim = null; this.setPose({ f: 'look_3' }); } w.done(); }
      }
      // parpadeo (solo de pie y con los ojos abiertos)
      if (!this.walk && !this.pose.arm && this.pose.eyes !== 'closed') {
        this.nextBlink -= dt; if (this.nextBlink <= 0) { this.blink = .13; this.nextBlink = 2.6 + Math.random() * 3.5; this.dirty = true; }
      }
      if (this.blink > 0) { this.blink -= dt; if (this.blink <= 0) this.dirty = true; }
      if (this.dirty || this.obstacle) this.render();
    }
    render() {
      this.dirty = false;
      const p = this.pose, s = this.s;
      const f = p.f in this.imgs ? p.f : 'stand';
      if (this._f !== f) { if (this._f) this.imgs[this._f].classList.remove('on'); this.imgs[f].classList.add('on'); this._f = f; }
      const arm = p.arm;
      this.armImg.classList.toggle('on', !!arm && !arm.thumb); this.thumbImg.classList.toggle('on', !!arm && !!arm.thumb);
      if (arm) { const t = 'rotate(' + arm.a + 'deg)'; this.armImg.style.transform = this.thumbImg.style.transform = t; }
      this.eyes.classList.toggle('on', (p.eyes === 'closed' || this.blink > 0) && (f === 'stand' || f === 'stand_noarm'));
      this.body.style.transform = 'translateY(' + ((p.dy || 0) * s).toFixed(1) + 'px) rotate(' + (p.tilt || 0) + 'deg)';
      this.flip.style.transform = 'scaleX(' + this.facing + ')';
      this.root.style.transform = 'translate3d(' + (this.x - CV.ax * s).toFixed(1) + 'px,' + (this.y - CV.ay * s).toFixed(1) + 'px,0)';
      this._clip();
    }
  }
  S.Actor = Actor;
})(window);
