/* SETPI — director: máquina de estados + comportamiento autónomo con contexto (PIN, jugadores, quiz).
   Estados (D.state): IDLE, WALKING, LOOKING, GREETING, THUMBS_UP, QR_INTERACTION, HIDING, PEEKING, SLEEPING,
   CELEBRATING, REACTING, EXITING, AWAY.   Fases de la sala (D.phase): pin | lobby | quiz | podium.
   Solo OBSERVA el estado de la página (PIN, nº de jugadores, inicio/fin del quiz): nunca lo modifica.
   Se mueve por DOS carriles libres (junto al QR y sobre la carretera), calculados del layout real: nunca tapa
   QR, título, texto, premios, panel ni botones. Un solo bucle rAF; se detiene si la diapositiva no está activa. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const CANCEL = S.CANCEL, CV = S.CV;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  S.init = function (cfg) {
    const slide = cfg.slide, stage = cfg.stage;
    const a = new S.Actor(stage, cfg.base || 'setpi/');
    const D = S.dir = { a, state: 'AWAY', phase: 'pin', players: 0, t: 0, last: {}, active: 0, L: null, lastRun: '' };
    const A = (ang, thumb) => ({ f: 'stand_noarm', arm: { a: ang, thumb: !!thumb } });
    const rel = (r, sr) => ({ left: r.left - sr.left, right: r.right - sr.left, top: r.top - sr.top, bottom: r.bottom - sr.top, w: r.width, h: r.height });

    /* ---------- escenario: todo derivado del layout real (nunca px fijos) ---------- */
    function layout() {
      const sr = stage.getBoundingClientRect(); if (!sr.width || !sr.height) return false;
      const pr = rel(cfg.panel().getBoundingClientRect(), sr);
      const road = slide.querySelector('.escena-viva line[stroke-dasharray]');
      const nav = document.getElementById('nav'), navTop = nav ? rel(nav.getBoundingClientRect(), sr).top : sr.height;   // la barra inferior nunca tapa sus pies
      const floor = Math.min(road ? rel(road.getBoundingClientRect(), sr).top + 8 : sr.height * 0.88, navTop - 6);
      const qr = rel(cfg.qr.getBoundingClientRect(), sr);
      let textB = 0;
      cfg.content.querySelectorAll(cfg.text).forEach(e => { const r = rel(e.getBoundingClientRect(), sr); if (r.w > 0 && r.bottom > textB && r.bottom < qr.top + 4) textB = r.bottom; });
      const yU = Math.min(qr.bottom - 2, floor - 30);                 // carril alto: pies a la altura del borde inferior del QR
      const Hc = clamp(Math.min(sr.height * 0.2, yU - textB - 8), 56, sr.height * 0.2);
      const s = Hc / (CV.ay - 8), half = 150 * s;
      const side = pr.left > sr.width * 0.4;                          // panel a la derecha; si se apila (móvil) no hay escondite
      const xMin = 14 + half, xMax = Math.max(xMin + 10, (side ? pr.left : sr.width) - half - 8);
      const textRect = e => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };   // el enlace ocupa todo el ancho: se mide solo su texto
      const obs = [qr, cfg.premio && rel(cfg.premio.getBoundingClientRect(), sr), cfg.link && rel(textRect(cfg.link), sr)].filter(Boolean);
      const x0 = fy => { let v = xMin; obs.forEach(o => { if (o.w > 0 && fy > o.top - 4 && fy - Hc < o.bottom + 4) v = Math.max(v, o.right + half + 6); }); return Math.min(v, xMax); };
      const lanes = { U: { y: yU, x0: x0(yU) }, L: { y: floor, x0: x0(floor) } };
      if (!side) lanes.L = lanes.U;                                    // apilado (móvil): bajo el panel no hay sitio, un solo carril junto al QR
      const prev = D.L, onLane = prev && (Math.abs(a.y - prev.lanes.U.y) < 6 ? 'U' : Math.abs(a.y - prev.lanes.L.y) < 6 ? 'L' : null);   // si el diseño se mueve, SETPI sigue a su carril
      D.L = { sr, pr, floor, s, half, side, xMin, xMax, lanes, qr, qrc: [qr.left + qr.w / 2, qr.top + qr.h / 2], pinc: [0, 0], canHide: side && (xMax - lanes.L.x0) > 60 };
      if (cfg.pin) { const p = rel(cfg.pin().getBoundingClientRect(), sr); D.L.pinc = [p.left + p.w / 2, p.top + p.h / 2]; }
      a.resize(s); a.place(onLane ? Math.max(a.x, lanes[onLane].x0) : a.x, onLane ? lanes[onLane].y : a.y || floor);   // nunca queda sobre el QR/texto tras un cambio de tamaño
      a.setObstacle(side ? { left: pr.left, top: pr.top, bottom: pr.bottom } : null);
      return true;
    }
    D.layout = layout;

    /* ---------- primitivas ---------- */
    const L = () => D.L;
    const setState = s => { D.state = s; };
    const laneName = () => Math.abs(a.y - L().lanes.U.y) < Math.abs(a.y - L().lanes.L.y) ? 'U' : 'L';
    const spotX = ln => rnd(L().lanes[ln].x0, L().xMax);
    /* camina a (x, carril). Cambio de carril SOLO por el pasillo derecho (libre en ambos carriles). */
    async function go(x, ln, free) {
      const l = L(); ln = ln || laneName(); const lane = l.lanes[ln];
      if (!free) x = clamp(x, lane.x0, l.xMax);
      const sameLane = Math.abs(a.y - lane.y) < 4;
      if (sameLane && Math.abs(x - a.x) < 10) return;
      setState('WALKING'); a.face((sameLane ? x : Math.max(l.lanes.U.x0, l.lanes.L.x0) + 10) > a.x ? 1 : -1);
      await a.play('walk_enter');
      if (!sameLane) {
        const xs = clamp(Math.max(a.x, l.lanes.U.x0, l.lanes.L.x0) + 8, l.xMin, l.xMax - 30);
        if (a.x < xs - 2) await a.walkTo(xs, a.y, { chain: true });
        await a.walkTo(Math.min(l.xMax, xs + 36 * l.s), lane.y, { chain: true });
      }
      await a.walkTo(x, lane.y); await a.play('walk_exit'); a.setPose({ f: 'stand' });
    }
    const idle = async sec => { setState('IDLE'); await a.wait(sec); };
    function pointAngle(tx, ty) {
      const s = a.s, f = a.facing, px = a.x + f * (CV.pivot[0] - CV.ax) * s, py = a.y - (CV.ay - CV.pivot[1]) * s;
      let vx = tx - px, vy = ty - py; const n = Math.hypot(vx, vy) || 1; vx /= n; vy /= n;
      return clamp(Math.atan2(-f * vx, vy) * 180 / Math.PI, -172, -62);
    }
    const armIn = (th, thumb) => [0, .3, .62, .88, 1].map(k => A(th * k, thumb && k > .6));
    const armOut = (th, thumb) => [.8, .55, .3, .1, 0].map(k => A(th * k, thumb && k > .6));
    async function point(tx, ty, holds) {
      const th = pointAngle(tx, ty);
      await a.playFrames(armIn(th), 12);
      for (let i = 0; i < (holds || 2); i++) await a.playFrames([A(th), A(th - 7), A(th), A(th + 5), A(th)], 9);
      await a.playFrames(armOut(th), 12); a.setPose({ f: 'stand' });
    }
    async function wave(n) { setState('GREETING'); await a.play('wave_enter'); await a.play('wave_loop', { loops: n || 2 }); await a.play('wave_exit'); a.setPose({ f: 'stand' }); }
    async function thumbs() { setState('THUMBS_UP'); await a.play('thumb_enter'); await a.play('thumb_hold'); await a.play('thumb_exit'); a.setPose({ f: 'stand' }); }
    async function celebrate(times) {
      setState('CELEBRATING'); a.fx('spark');
      for (let i = 0; i < (times || 1); i++) { await a.play('celebrate'); a.fx('spark'); }
      await a.play('celebrate_exit'); a.setPose({ f: 'stand' });
    }
    async function surprised() { a.fx('alert'); await a.play('alert'); }
    async function relax() { await a.play('relax'); a.setPose({ f: 'stand' }); }
    async function lookAround() { setState('LOOKING'); await a.play('look_enter'); await a.wait(.5); a.face(-a.facing); await a.wait(.45); a.face(-a.facing); await a.wait(.3); await a.play('look_exit'); }
    const qrSpot = () => ({ x: L().lanes.U.x0, ln: 'U' });              // al lado del QR (carril alto, justo a su derecha)

    /* ---------- comportamientos ---------- */
    const BEH = {
      wander: async () => { const ln = Math.random() < .5 ? 'U' : 'L'; await go(spotX(ln), ln); },
      greet: async () => { const ln = Math.random() < .5 ? 'U' : 'L'; await go(spotX(ln), ln); await a.play('look_enter'); await a.wait(.3); await a.play('look_exit'); await wave(2 + (Math.random() < .4 ? 1 : 0)); },
      thumbs: async () => { const ln = Math.random() < .5 ? 'U' : 'L'; await go(spotX(ln), ln); await thumbs(); },
      look: async () => { const ln = Math.random() < .5 ? 'U' : 'L'; await go(spotX(ln), ln); await lookAround(); },
      /* QR: mira → camina → se detiene → mira → señala → vuelve a señalar → reacción positiva → se aleja */
      inviteQR: async () => {
        const l = L(), sp = qrSpot();
        a.face(l.qrc[0] > a.x ? 1 : -1); setState('QR_INTERACTION'); await a.play('look_enter'); await a.wait(.5); await a.play('look_exit');
        await go(sp.x, sp.ln); a.face(-1); setState('QR_INTERACTION');  // de cara al QR (a su izquierda)
        await a.play('look_enter'); await a.wait(.55); await a.play('look_exit');
        await point(l.qrc[0], l.qrc[1], 2);
        await a.wait(.35); await point(l.qrc[0], l.qrc[1], 1);
        await thumbs();
        await a.wait(.4); const ln = Math.random() < .5 ? 'U' : 'L'; await go(spotX(ln), ln);
      },
      /* antes del PIN: se asoma al candado, mira al anfitrión, señala el campo del PIN */
      lookLock: async () => {
        const l = L(), sp = qrSpot(); await go(sp.x, sp.ln); a.face(-1); setState('LOOKING');
        await a.play('look_enter'); await a.wait(.7); await a.play('look_exit');
        await a.play('shake_no'); await a.wait(.4);
        a.face(1); await a.play('look_enter'); await a.wait(.5); await a.play('look_exit');
        await point(l.pinc[0], l.pinc[1], 2);
        await a.wait(.5);
      },
      /* esconderse detrás del panel de la sala: capas + recorte real, no se encoge */
      peekaboo: async () => {
        const l = L(); if (!l.canHide) return BEH.look();
        const ln = Math.random() < .5 ? 'U' : 'L', y = l.lanes[ln].y;
        await go(l.xMax, ln); a.face(1); setState('HIDING');
        await a.play('look_enter'); await a.wait(.5); a.face(-1); await a.wait(.4); a.face(1); await a.wait(.4); await a.play('look_exit');
        const hideX = l.pr.left + l.half + 20, peekX = l.pr.left - 26 * l.s, sp = a.s * CV.h;
        a.face(1); await a.play('walk_enter'); await a.walkTo(hideX, y, { speed: sp * .55 }); a.setPose({ f: 'stand' });
        await a.wait(rnd(.9, 1.6));
        for (let i = 0; i < 2; i++) {
          setState('PEEKING'); a.face(-1);
          await a.play('walk_enter'); await a.walkTo(peekX - i * 14 * l.s, y, { speed: sp * .35 }); a.setPose({ f: 'look' });
          await a.wait(rnd(.9, 1.5)); a.setPose({ f: 'stand' }); await a.wait(.35);
          a.face(1); await a.play('walk_enter'); await a.walkTo(hideX, y, { speed: sp * .5 }); a.setPose({ f: 'stand' });
          await a.wait(rnd(.7, 1.2));
        }
        a.face(-1); await a.play('walk_enter'); await a.walkTo(l.xMax, y, { speed: sp * .6 }); await a.play('walk_exit'); a.setPose({ f: 'stand' });
        await wave(1);
      },
      /* dormir esperando: cansado → bosteza → cabeza baja → ojos cerrados → duerme → despierta */
      nap: async () => {
        const l = L(); await go(clamp(l.xMax - rnd(10, 80) * l.s, l.lanes.L.x0, l.xMax), 'L'); a.face(1); setState('SLEEPING');
        await a.play('look_enter'); await a.wait(.6); await a.play('look_exit');
        await a.play('sleep_enter'); a.loop('sleep_loop');
        const n = Math.floor(rnd(3, 6)); for (let i = 0; i < n; i++) { a.fx('zzz'); await a.wait(rnd(2.1, 2.7)); }
        await a.toStand(); await surprised(); await relax();
      }
    };
    const WEIGHTS = {
      pin: { wander: 3, look: 2, greet: 2, lookLock: 3.2, peekaboo: 1.6, thumbs: .5 },
      lobby: { wander: 2, look: 1.4, greet: 2, inviteQR: 4, peekaboo: 1.6, thumbs: 1 },
      podium: { greet: 3, thumbs: 3, wander: 1.5, look: 1 },
      quiz: {}
    };
    const COOL = { wander: 8, look: 14, greet: 26, thumbs: 36, inviteQR: 32, lookLock: 30, peekaboo: 55, nap: 80 };
    function choose() {
      const w = Object.assign({}, WEIGHTS[D.phase] || {}), idleFor = D.t - D.active;
      if ((D.phase === 'lobby' && D.players === 0 && idleFor > 40) || (D.phase === 'pin' && idleFor > 45)) w.nap = 6;     // nadie entra / nadie pone el PIN: se duerme
      let tot = 0; const c = [];
      for (const k in w) {
        if (!w[k] || (k === 'peekaboo' && !L().canHide) || D.t - (D.last[k] || -999) < COOL[k] || k === D.lastRun) continue;
        tot += w[k]; c.push([k, w[k]]);
      }
      if (!c.length) return 'wander';
      let r = Math.random() * tot; for (const [k, v] of c) { if ((r -= v) <= 0) return k; } return c[0][0];
    }

    /* ---------- bucle principal: reacciones > comportamiento autónomo ---------- */
    D.reaction = null;
    D.interrupt = fn => { D.reaction = fn; a.cancel(); };
    D.run = name => D.interrupt(async () => { D.last[name] = D.t; D.lastRun = name; await BEH[name](); });
    async function main() {
      for (;;) {
        try {
          if (D.reaction) { const r = D.reaction; D.reaction = null; layout(); await a.toStand(); await r(); await a.toStand(); setState(a.visible ? 'IDLE' : 'AWAY'); continue; }
          if (D.phase === 'quiz' || !a.visible) { await a.wait(.5); continue; }
          await idle(rnd(3.2, 8.5)); layout();
          const l = L(); if (a.x > l.xMax + 6) await go(l.xMax, laneName(), true);
          const k = choose(); D.lastRun = k; D.last[k] = D.t; await BEH[k](); await a.toStand();
        } catch (e) { if (e !== CANCEL) { console.error('[SETPI]', e); await a.wait(1).catch(() => { }); } }
      }
    }

    /* ---------- reacciones a eventos de la página ---------- */
    async function emerge() { const l = L(); if (a.x > l.xMax + 4) await go(l.xMax, laneName(), true); }
    async function reactJoin(prev, n) {
      D.active = D.t; await emerge(); a.face(1); setState('REACTING');
      await surprised();
      if (prev === 0 || n >= 4) { await a.wait(.15); await celebrate(prev === 0 ? 2 : 1); await wave(2); }
      else { await relax(); await (Math.random() < .5 ? thumbs() : wave(1)); }
    }
    D.onPlayers = function (n) {
      const prev = D.players; D.players = n;
      if (n > prev && D.phase === 'lobby' && a.visible && D.t - (D.lastJoin || -99) > 3.5) { D.lastJoin = D.t; D.interrupt(() => reactJoin(prev, n)); }   // ráfaga de entradas: una sola reacción
    };
    D.pinError = function () { if (!a.visible || D.phase !== 'pin') return; D.interrupt(async () => { setState('REACTING'); await a.play('shake_no'); await a.wait(.2); await a.play('shake_no'); }); };
    /* SIEMPRE llama cb: el reveal real del QR/sala nunca depende de la animación */
    D.unlock = function (cb) {
      let done = false; const fin = () => { if (done) return; done = true; if (cb) cb(); };
      setTimeout(fin, 2300);
      if (!a.visible) { fin(); return; }
      D.interrupt(async () => { await emerge(); a.face(1); setState('CELEBRATING'); await surprised(); fin(); await celebrate(2); await thumbs(); });
    };
    D.setPhase = function (p) {
      if (D.phase === p) return; D.phase = p; D.active = D.t;
      if (p === 'quiz') {
        D.interrupt(async () => { setState('EXITING'); await emerge(); a.face(-1); await wave(2); await go(-L().half - 24, 'L', true); a.show(false); setState('AWAY'); });
      } else if (!a.visible) {
        layout(); a.face(1); a.place(-L().half - 24, L().lanes.L.y); a.show(true);
        D.interrupt(async () => { const l = L(); await go(p === 'podium' ? Math.max(l.lanes.L.x0, l.sr.width * .45) : spotX('L'), 'L', true); if (p === 'podium') { await celebrate(2); await thumbs(); } else await wave(2); });
      } else if (p === 'podium') D.interrupt(async () => { await celebrate(2); await thumbs(); });
    };
    a.root.addEventListener('click', () => {
      if (D.state === 'REACTING' || D.state === 'EXITING') return;
      const sleeping = D.state === 'SLEEPING';
      D.interrupt(async () => { setState('REACTING'); if (sleeping) { await surprised(); await relax(); } await (Math.random() < .5 ? wave(2) : thumbs()); });
    });

    /* ---------- bucle rAF (se detiene si no se ve; un vigilante lo reanuda al volver) ---------- */
    let last = 0, chain = 0, wall = 0;
    const reduced = g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isActive = () => !document.hidden && slide.classList.contains('activa');
    D.step = dt => { D.t += dt; a.update(dt); };                      // avance determinista (también para pruebas)
    function kick() {
      const my = ++chain; last = 0;
      const f = ts => {
        if (my !== chain) return; wall = performance.now();
        if (!isActive()) { last = 0; setTimeout(() => { if (my === chain) requestAnimationFrame(f); }, 400); return; }
        const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts; D.step(dt); requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    }
    D.kick = kick;
    setInterval(() => { if (isActive() && performance.now() - wall > 900) kick(); }, 600);
    document.addEventListener('visibilitychange', () => { if (isActive()) kick(); });
    if ('ResizeObserver' in g) new ResizeObserver(() => { if (isActive() && D.L) layout(); }).observe(stage);
    function boot() {
      if (!layout()) { setTimeout(boot, 300); return; }
      const l = L(); a.place(l.lanes.L.x0 + 20 * l.s, l.lanes.L.y); a.setPose({ f: 'stand' }); a.show(true); D.state = 'IDLE';
      if (reduced) { a.update(0); return; }
      kick(); main();
      setTimeout(layout, 1500);                                       // tras las animaciones de entrada de la diapositiva
    }
    boot();
    return D;
  };
})(window);
