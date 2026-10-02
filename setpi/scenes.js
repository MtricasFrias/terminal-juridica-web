/* SETPI — repertorio de escenas y programador (V.2).
   Cada escena es una pequeña historia (varios dibujos reales + movimiento) con familia, enfriamiento y peso según el contexto
   (fase, jugadores, inactividad, energía). El programador evita la monotonía:
     - una escena no se repite hasta que pase su enfriamiento ni mientras esté en las últimas 6 (penaliza cada aparición);
     - la familia (mirar, social, movimiento, esconderse...) tampoco se repite seguido;
     - cuantas más veces se usó una escena, menos peso tiene (se olvida despacio);
     - los descansos son irregulares: casi siempre calmados, a veces muy cortos o muy largos, con micro-gestos (miradas) sueltos;
     - los saludos tienen presupuesto (mín. 40 s y máx. 3 cada 6 min), las variantes salen de una bolsa y las frases son escasas;
     - las reacciones a eventos (jugadores, líder, pregunta, podio) también salen de bolsas, para no ser siempre la misma. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  S.Scenes = function (D, P) {
    const { a, C, rnd, clamp } = P, L = P.L, F = S.Frames, SC = D.SC = {};
    D.uses = {}; D.famHist = []; D.names = []; D.top = []; D.quiz = { idx: -1, inTrans: false, total: 10 }; D.lastLeaderT = -99; D.lastSayT = -99;
    const shuffleBag = items => { let q = [], last = null; return () => { if (!q.length) { q = items.slice(); for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } if (q.length > 1 && q[q.length - 1] === last) q.unshift(q.pop()); } return last = q.pop(); }; };
    const fire = P.fire;
    /* ¿están cargados todos los dibujos de estas familias? (el resto se baja en segundo plano) */
    const have = (...pre) => pre.every(p => { const m = F.meta; if (!m) return false; let n = 0; for (const k in m) if (k === p || k.indexOf(p + '_') === 0) { n++; if (!F.ok[k]) return false; } return n > 0; });
    /* ancho / alto máximo (en S) de las familias de dibujos: para pedir sitio libre ANTES de empezar */
    function ext(pre) { let w = .47, h = .975; const m = F.meta; for (const k in m) if (pre.some(p => k === p || k.indexOf(p + '_') === 0)) { const f = m[k]; w = Math.max(w, f.ax * f.u, (f.w - f.ax) * f.u); h = Math.max(h, f.ay * f.u); } return { w, h }; }
    async function fit(...pre) { const e = ext(pre); await P.space(Math.max(0, (e.h - L().K) * a.S) + 4); await P.room(e.w + .03); }
    const firstName = nm => String(nm || '').trim().split(/\s+/)[0].slice(0, 14);
    const hold = (sec) => a.wait(sec);
    const pcx = () => ({ ph: D.phase, n: D.players, idle: D.t - D.active, en: D.energy, hostBusy: D.t - D.hostT < 7, sinceJoin: D.t - D.lastJoin, l: L() });
    const def = (id, fam, cd, w, run, need) => { SC[id] = { id, fam, cd, w, run, need }; };
    const fin = () => { a.rest(a.stance === 'R' ? 'R' : 'F'); };
    /* una frase suelta (escasa): como mínimo `gap` s desde la última que dijo */
    async function chat(text, gap, secs) { if (D.t - D.lastSayT < (gap || 30)) return false; D.lastSayT = D.t; await P.say(text, secs); return true; }

    /* ================= escenas autónomas ================= */
    def('lookAround', 'look', 14, c => c.ph === 'podium' || c.ph === 'quiz' ? 1 : 2.2, async () => { P.setState('LOOKING'); await P.front(); await a.play(C.around()); fin(); });
    def('glance', 'look', 20, c => c.ph === 'quiz' ? 1.1 : 1.3, async () => { P.setState('LOOKING'); await P.front(); await a.play(C.lookUser()); fin(); });
    def('search', 'look', 40, c => c.ph === 'pin' ? 1.5 : c.ph === 'lobby' ? (c.n <= 2 ? 1.9 : .9) : c.ph === 'quiz' ? .5 : .6, async () => {
      P.setState('LOOKING'); await fit('search'); await P.front(); const d = Math.random() < .5 ? -1 : 1;
      await a.play(C.search(d)); fin();
      if (Math.random() < .55) { const s = P.spot(); await P.goTo(s.x, s.y); await P.front(); await a.play(C.search(-d)); fin(); }
    }, ['search']);
    def('wander', 'move', 8, c => c.ph === 'quiz' ? .5 : c.ph === 'podium' ? 1.2 : 2.6, async () => {
      const s = P.spot(); await P.goTo(s.x, s.y, { speed: rnd(1.15, 1.7) });
      if (a.stance === 'R' && D.energy > .55 && Math.random() < .25) await P.jump('R', .24);
      if (a.stance === 'R' && Math.random() < .4) { await hold(rnd(.4, 1)); }                     // a veces se queda un momento de perfil antes de volverse
      await P.front();
    });
    def('wave', 'social', 40, c => !P.D.waveOK() ? 0 : c.ph === 'pin' ? 1.4 : c.ph === 'lobby' ? (c.n > 0 ? 2.2 : 1.6) : c.ph === 'podium' ? 1.8 : 0, async () => {
      if (Math.random() < .5) { const s = P.spot(); await P.goTo(s.x, s.y); } await P.front(); await P.wave(2 + (Math.random() < .4 ? 1 : 0));
    });
    def('thumbs', 'social', 45, c => c.ph === 'pin' ? 0 : c.ph === 'podium' ? 2.6 : c.ph === 'quiz' ? .3 : (c.n >= 2 ? 2 + (c.sinceJoin < 25 ? 2 : 0) : .8), async () => {
      if (Math.random() < .5) { const s = P.spot(); await P.goTo(s.x, s.y); } await P.thumbs();
    });
    def('applaud', 'social', 50, c => c.ph === 'podium' ? 2.6 : c.ph === 'lobby' && c.n >= 3 ? 1.5 : 0, async () => {
      await fit('applaud'); await P.front(); P.setState('CELEBRATING');
      if (have('applaud') && Math.random() < .6) { await a.play(C.applaud(4)); fin(); } else await P.clap(3);
    });
    def('hop', 'fun', 55, c => c.ph === 'podium' ? .5 : D.energy > .5 ? .9 + (D.energy - .5) * 3 : 0, async () => {
      await P.front(); const lp = have('leap') && Math.random() < .5; await P.jump(lp ? 'L' : 'F', .3); if (Math.random() < .4) { await hold(.25); await P.jump(lp ? 'F' : 'L', .24); }
    });
    const noteWhile = (clip, every, n) => { const p = a.play(clip); (async () => { for (let i = 0; i < n; i++) { await a.wait(every); a.fx('note'); } })().catch(() => { }); return p; };
    def('dance', 'fun', 90, c => c.ph === 'lobby' ? (c.n >= 3 ? 2.6 : c.n >= 1 ? 1.1 : .35) * (D.energy > .45 ? 1 : .4) : c.ph === 'podium' ? 2.4 : c.ph === 'pin' ? .25 : 0, async () => {
      await fit('dance'); await P.front(); P.setState('CELEBRATING'); const lo = Math.random() < .55 ? 2 : 3;
      await noteWhile(C.dance(lo), .55, lo * 3); fin();
    }, ['dance']);
    def('selfie', 'fun', 80, c => c.ph === 'lobby' ? (c.n >= 1 ? (c.sinceJoin < 45 ? 2.4 : 1) : .35) : c.ph === 'podium' ? 1.4 : c.ph === 'pin' ? .3 : 0, async () => {
      await fit('selfie'); await P.front(); const p = a.play(C.selfie()); await hold(1); a.fx('flash'); await p; fin();
    }, ['selfie']);
    def('stretch', 'move', 70, c => c.ph === 'quiz' ? .3 : (c.idle > 14 || D.energy < .5 ? 1.5 : .6) * (c.ph === 'podium' ? .5 : 1), async () => { await fit('stretch'); await P.front(); await a.play(C.stretch()); fin(); }, ['stretch']);
    def('watch', 'wait', 50, c => c.ph === 'pin' ? (c.idle > 6 ? 2.4 : 1) : c.ph === 'lobby' ? (c.n <= 2 ? 2.2 : .7) : c.ph === 'quiz' ? .6 : 0, async () => {
      await fit('watch'); await P.front(); await a.play(C.watch(1 + (Math.random() < .5 ? 1 : 0))); fin();
    }, ['watch']);
    def('armsx', 'wait', 55, c => c.ph === 'quiz' ? .9 : c.ph === 'lobby' && c.n <= 1 && c.idle > 12 ? 1.4 : c.ph === 'pin' && c.idle > 18 ? 1.2 : 0, async () => {
      await fit('armsx'); await P.front(); await a.play(C.armsx(2 + Math.floor(Math.random() * 3))); fin();
    }, ['armsx']);
    def('shrug', 'wait', 60, c => c.ph === 'quiz' ? 1 : c.ph === 'lobby' && c.n === 0 && c.idle > 25 ? .9 : 0, async () => { await fit('shrug'); await P.front(); await a.play(C.shrug()); fin(); }, ['shrug']);
    def('tablet', 'tool', 90, c => c.ph === 'pin' ? 1.1 : c.ph === 'lobby' ? .8 : c.ph === 'quiz' ? .9 : 0, async () => { await fit('tablet'); await P.front(); await a.play(C.tablet()); fin(); }, ['tablet']);
    def('lupa', 'tool', 90, c => c.ph === 'pin' ? .6 : c.ph === 'lobby' ? .7 : c.ph === 'quiz' ? 1.1 : 0, async () => {
      if (D.phase === 'lobby' && Math.random() < .5) { const q = P.nearQR(); await P.goTo(q.x, q.y); }   // a veces revisa el QR de cerca
      await fit('lupa'); await P.front(); await a.play(C.lupa()); fin();
    }, ['lupa']);
    def('think', 'tool', 25, c => c.ph === 'quiz' ? 1.2 : 0, async () => { P.setState('THINKING'); await fit('think'); await P.front(); a.fx('question'); await a.play(C.think()); fin(); }, ['think']);
    def('cheer', 'fun', 45, c => c.ph === 'quiz' ? 1 : c.ph === 'podium' ? 1.4 : 0, async () => { await fit('cheer'); await P.front(); a.fx('spark', { n: 6 }); await a.play(C.cheer()); fin(); }, ['cheer']);
    def('uy', 'wait', 70, c => c.ph === 'quiz' ? .45 : 0, async () => { await fit('uy'); await P.front(); await a.play(C.uy()); fin(); }, ['uy']);
    def('bow', 'fun', 60, c => c.ph === 'podium' ? 1.6 : 0, async () => { await fit('bow'); await P.front(); await a.play(C.bow()); fin(); }, ['bow']);
    def('confetti', 'fun', 50, c => c.ph === 'podium' ? 2.2 : 0, async () => {
      await fit('confetti'); await P.front(); P.setState('CELEBRATING'); const p = a.play(C.confetti()); a.fx('confetti'); await hold(.9); a.fx('confetti', { n: 18 }); await p; fin();
    }, ['confetti']);
    def('watchPodium', 'look', 6, c => c.ph === 'quiz' && D.quiz.inTrans ? 4 : 0, async () => { P.setState('WATCHING'); await P.toR(1); await hold(rnd(1.6, 2.6)); await P.front(); });
    /* QR: mira → camina → se detiene → mira → señala → vuelve a señalar → reacción positiva → se aleja */
    const inviteBag = shuffleBag(['Escanea el QR y entra', '¿Ya escaneaste el QR?', 'Entra con tu celular: escanea el QR']);
    def('inviteQR', 'qr', 55, c => c.ph !== 'lobby' ? 0 : (c.n === 0 ? 4.2 : c.n <= 2 ? 2.4 : .5) * (c.idle > 14 ? 1.5 : 1), async () => {
      const l = L(), q = P.nearQR(); P.setState('QR_INTERACTION');
      await P.toR(l.qrc[0] > a.x ? 1 : -1); await hold(.55);
      await P.goTo(q.x, q.y); P.setState('QR_INTERACTION');
      await P.toR(-1); await hold(.4);
      await P.point(2);
      await P.front(); await a.play(C.lookUser()); fin();
      if (Math.random() < .5) await chat(inviteBag(), 40);
      await P.toR(-1); await P.point(1);
      const rr = Math.random(); if (rr < .35) await P.thumbs(); else if (rr < .65) await P.clap(2); else { await P.toR(-1); await P.jump('R', .26); }
      await hold(.3); const s = P.spot({ minDist: 1 }); await P.goTo(s.x, s.y);
    });
    /* antes del PIN: se acerca al candado, niega con la cabeza y señala el campo del PIN */
    def('lookLock', 'qr', 35, c => c.ph === 'pin' ? (c.idle > 10 ? 3.4 : 1.2) : 0, async () => {
      const q = P.nearQR(); P.setState('LOOKING');
      await P.goTo(q.x, q.y); await P.toR(-1); await hold(.6);
      await P.front(); await P.shake(2);
      await P.toR(1); await hold(.35); P.setState('QR_INTERACTION'); await P.point(2);
      await P.front(); await a.play(C.lookUser()); fin();
    });
    /* esconderse detrás del panel de la sala y asomarse (capas reales: el panel va por delante) */
    def('peekaboo', 'hide', 60, c => (c.ph === 'pin' || c.ph === 'lobby') && c.l.canHide ? (c.n <= 3 ? 2.6 : 1.2) : 0, async () => {
      const l = L(); if (!l.canHide) return SC.lookAround.run();
      const y = l.oneLane ? l.yU : (Math.random() < .5 ? l.yL : rnd(l.yU, l.yL)); P.setState('HIDING');
      await P.goTo(l.xMaxAt(y) - .08 * a.S, y); await P.toR(1); await hold(.35);
      const hideX = l.hideX(); await P.runLeg(hideX, y, { speed: .95 });
      await hold(rnd(.9, 1.6));
      const n = Math.random() < .5 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        P.setState('PEEKING'); a.face(1); a.stance = 'R'; a.autoIdle = false; a.setS(l.sAt(y));
        const edge = l.pr.left + 4, half = a.S * .72, v = i === 0 ? 1 : 2;
        a.place(edge + half, y); fire(C.peek(v)); await a.tween('x', edge, .42, 'out');
        await hold(v === 1 ? 1.05 : 1.35); await a.tween('x', edge + half, .38, 'in');
        await hold(rnd(.7, 1.3));
      }
      a.place(hideX, y); a.face(-1); a.stance = 'R';
      await P.runLeg(l.xMaxAt(y) - .1 * a.S, y, { speed: 1.1 });
      await P.toR(-1); await P.front(); await P.wave(1);
    });
    /* esconderse detrás del QR (la tarjeta va por debajo de SETPI: se recorta en su borde) y asomarse */
    def('peekQR', 'hide', 70, c => (c.ph === 'pin' || c.ph === 'lobby') && P.valid(clamp(c.l.qr.right + 3 + .55 * c.l.SU, c.l.xMin, c.l.xMaxAt(c.l.yU)), c.l.yU) ? 1.9 : 0, async () => {
      const l = L(), y = l.yU, edge = l.qr.right + 3; P.setState('HIDING');
      try {
        await P.goTo(edge + .55 * l.SU, y); await P.toR(-1); await hold(.3);
        a.clipL = edge; await P.runLeg(edge - .6 * a.S, y, { speed: .95 });
        await hold(rnd(.9, 1.5));
        const n = Math.random() < .5 ? 1 : 2, half = a.S * .72;
        for (let i = 0; i < n; i++) {
          P.setState('PEEKING'); a.face(-1); a.stance = 'R'; a.autoIdle = false; a.clipL = edge;
          a.place(edge - half, y); fire(C.peekQR(i === 0 ? 1 : 2)); await a.tween('x', edge, .42, 'out');
          await hold(i === 0 ? 1.05 : 1.35); await a.tween('x', edge - half, .38, 'in'); await hold(rnd(.7, 1.2));
        }
        a.place(edge - .6 * a.S, y); a.face(1); a.stance = 'R'; a.rest('R');
        await P.runLeg(edge + .62 * a.S, y, { speed: 1.1 });
      } finally { a.clipL = -1e9; }
      await P.toR(1); await P.front(); await P.wave(1);
    });
    /* a las escondidas: cuenta con los ojos tapados, avisa, busca por los lados y se encoge de hombros */
    def('seek', 'hide', 100, c => (c.ph === 'lobby' || c.ph === 'pin') && c.idle > 10 ? (c.n <= 3 ? 1.6 : .8) : 0, async () => {
      P.setState('LOOKING'); await fit('count', 'search', 'shrug'); await P.front(); await hold(.3);
      await P.sayNow('1…'); await a.play(C.hold('count_1', .85, { fade: .1 }));
      await P.sayNow('2…'); await a.play(C.hold('count_2', .85));
      await P.sayNow('3…'); await a.play(C.hold('count_1', .85));
      await P.sayNow('¡Ahí voy!'); await a.play(C.hold('count_3', 1.1)); S.sayClear(a); D.lastSayT = D.t;
      await a.play(C.search(-1)); fin();
      const s = P.spot({ minDist: 1.2 }); await P.goTo(s.x, s.y); await P.front(); await a.play(C.search(1)); fin();
      if (have('shrug')) { await a.play(C.shrug()); fin(); }
    }, ['count', 'search']);
    /* dormir esperando: se sienta → bosteza → cabecea → duerme (Z temporales) → despierta */
    def('nap', 'rest', 140, c => (c.ph === 'pin' && c.idle > 45) || (c.ph === 'lobby' && c.n === 0 && c.idle > 38) || ((c.ph === 'pin' || c.ph === 'lobby') && D.energy < .25 && c.idle > 25) ? 5 + Math.min(6, (c.idle - 30) / 6) : 0, async () => {
      P.setState('SLEEPING');
      if (Math.random() < .6) { const s = P.spot({ lane: 'L' }); await P.goTo(s.x, s.y); }
      await P.front(); await hold(.5);
      await a.play(C.sit()); await a.play(C.yawn()); await a.play(C.nod());
      a.loop(C.sleepLoop()); const n = Math.floor(rnd(3, 6));
      for (let i = 0; i < n; i++) { a.fx('zzz'); await hold(rnd(2.4, 3.2)); }
      await P.wakeUp(true);
    });
    /* sentado en una banca balanceando las piernas (esperando) */
    def('bench', 'rest', 120, c => (c.ph === 'pin' && c.idle > 25) || (c.ph === 'lobby' && c.n <= 2 && c.idle > 20) ? 2.6 : (c.ph === 'lobby' || c.ph === 'pin') && c.idle > 14 ? .6 : 0, async () => {
      P.setState('IDLE'); const s = P.spot({ lane: 'L' }); await P.goTo(s.x, s.y); await fit('bench'); await P.front(); await hold(.4);
      a.fx('dust', { n: 2 }); await a.play(C.bench(2 + (Math.random() < .5 ? 1 : 0))); fin();
    }, ['bench']);
    /* un bus pasa por detrás: lo mira y lo saluda */
    def('busWave', 'bus', 30, c => D.busTarget && c.ph !== 'podium' ? (c.ph === 'quiz' ? 1.5 : 5.5) : 0, async () => {
      const b = D.busTarget; if (!b) return; P.setState('GREETING');
      await P.toR(b.dir); await hold(.25); await a.play(C.waveR(1 + (Math.random() < .5 ? 1 : 0))); a.rest('R');
      await hold(.3); await P.front();
    });
    /* viaje en bus: espera en la parada, llega el bus (detrás del panel), sube por la puerta y se despide por la ventanilla; vuelve en otro bus y baja por la puerta */
    def('ride', 'bus', 100, c => (c.ph === 'pin' || c.ph === 'lobby') && c.idle > 8 && D.energy > .12 && D.t - D.lastJoin > 12 && P.rideGeo() ? ((c.ph === 'lobby' && c.n === 0 ? 3 : 1.8) + (D.busTarget ? 1 : 0)) * (D.rides ? (D.t - D.lastRideT > 150 ? 2.5 : 1) : 4) : 0, async () => {
      const g = P.rideGeo(), bus = P.bus, RIDE = P.RIDE, VBW = P.VBW; if (!g) return; const l = L();
      const apply0 = bus.apply; let inWin = false;
      P.setState('RIDING'); D.riding = true; D.rides = (D.rides || 0) + 1; D.lastRideT = D.t;      // la primera vez pesa x4: que se vea pronto
      try {
        if (D.busTarget && Math.random() < .5) await SC.busWave.run();
        await P.goTo(g.xn - g.wait * g.s, g.y); P.setState('RIDING');
        await P.toR(1); await hold(.35); a.fx('alert');
        bus.clipX = l.pr.left; bus.place(l.pr.left + 26, g.y, g.k); bus.show(true, false);
        const arrive = a.tween('x', g.xn, 1.9, 'out', bus);
        fire(C.waveR(1)); await arrive; a.fx('dust', { n: 2 }); bus.front = true;
        await a.tween('dy', 3 * g.k, .12, 'out', bus); await a.tween('dy', 0, .22, 'io', bus);
        await hold(.15); await P.jump('R', .2); await P.runLeg(g.xn + RIDE.f1 * g.s, g.y, { speed: 1.2 });
        a.autoIdle = false; a.stance = 'R'; a.face(1); a.place(g.xn + RIDE.f1 * g.s, g.y);
        await a.play([{ f: 'bus_1', t: .3, fade: .05 }]);
        fire([{ f: 'bus_2', t: .34, fade: .04 }]); await Promise.all([a.tween('x', g.xn + RIDE.f2 * g.s, .3, 'io'), a.tween('lift', RIDE.l2 * g.s, .3, 'out')]);
        fire([{ f: 'bus_3', t: .34, fade: .04 }]); await Promise.all([a.tween('x', g.xn + RIDE.f3 * g.s, .3, 'io'), a.tween('lift', RIDE.l3 * g.s, .3, 'io')]);
        fire([{ f: 'bus_4', t: .6, fade: .04 }]); await Promise.all([a.tween('x', g.xn + RIDE.f4 * g.s, .5, 'io'), a.tween('lift', RIDE.l4 * g.s, .5, 'io'), a.tween('a', 0, .45, 'in', a.mod), a.tween('br', .35, .45, 'lin', a.mod)]);
        a.show(false); a.cancel(); a.lift = 0; D.away = true; P.setState('AWAY'); bus.front = false; bus.apply();
        await hold(.4);
        /* se asoma por la ventanilla y saluda mientras el bus arranca; desaparece al pasar tras el QR / texto */
        const win = g.win && have('bwin');
        const departure = a.tween('x', -(VBW * g.k) - 80, win ? 3.5 : 3.3, win ? 'in' : 'in3', bus);
        if (win) {
          const xL = P.xMinAt(g.y) - P.WID * g.s, wx = () => bus.x + 144 * g.k;
          let started = false;
          a.scaleAt = null; a.setS(g.s); a.stance = 'F'; a.autoIdle = false; a.face(1); a.lift = 0; a.clipL = xL; a.noShadow = true; a._setPose({ f: 'bwin_1', sx: g.ws, sy: g.ws });
          const follow = () => {
            a.place(wx(), bus.y - 64 * g.k + .025 * g.s);
            if (!started && wx() < l.pr.left - .3 * g.s) { started = true; fire(C.bwin(3, g.ws)); }          // empieza a saludar cuando la ventanilla sale de detrás del panel
            if (wx() < xL - .5 * g.s && a.visible) a.show(false);
          };
          bus.apply = function () { apply0.call(bus); follow(); };
          follow(); a.show(true); inWin = true;
        }
        await departure; bus.apply = apply0; bus.show(false);
        if (win) { a.cancel(); a.show(false); inWin = false; a.noShadow = false; a.scaleAt = y => L().sAt(y); a.clipL = -1e9; }
        await hold(rnd(13, 22));                                                      // paseo
        /* regreso: otro bus llega, SETPI aparece en la puerta y baja */
        D.away = false; D.active = D.t;
        a.cancel(); bus.clipX = l.pr.left; bus.place(l.pr.left + 26, g.y, g.k); bus.show(true, false);
        await a.tween('x', g.xn, 1.9, 'out', bus); bus.front = true; bus.apply();
        await a.tween('dy', 3 * g.k, .12, 'out', bus); await a.tween('dy', 0, .22, 'io', bus);
        await hold(.3);
        if (have('bexit')) {
          const x0 = g.xn + RIDE.e1 * g.s; a.autoIdle = false; a.stance = 'R'; a.face(1); a.place(x0, g.y); a.lift = RIDE.el1 * g.s; a.show(true);
          await a.play([{ f: 'bexit_1', t: .12, a: .35 }, { f: 'bexit_1', t: .1, a: .7 }, { f: 'bexit_1', t: .5 }]);
          fire([{ f: 'bexit_2', t: .4, fade: .05 }]); await Promise.all([a.tween('x', g.xn + RIDE.e2 * g.s, .34, 'io'), a.tween('lift', RIDE.el2 * g.s, .34, 'io')]);
          fire([{ f: 'bexit_4', t: .5, fade: .04 }]); await Promise.all([a.tween('x', g.xn + RIDE.e3 * g.s, .42, 'out'), a.tween('lift', .2 * g.s, .2, 'out')]); await a.tween('lift', 0, .22, 'in'); a.fx('dust', { n: 3 });
          await a.play([{ f: 'bexit_3', t: .55, fade: .05 }]);
        } else { const sp = P.spot({ lane: 'L', minDist: 0 }); a.cancel(); await P.enter(sp.x, sp.y, 1.9); }
        a.stance = 'F'; a.rest('F');
        bus.front = false; bus.apply();
        a.tween('x', -(VBW * g.k) - 80, 3.1, 'in3', bus).then(() => bus.show(false)).catch(() => { });     // el bus se va por detrás del contenido
        const sp = P.spot({ lane: 'L', minDist: 0 }); await P.goTo(sp.x, sp.y, { speed: 1.4 });           // SETPI se aparta a la carretera (más cerca de la cámara)
        await P.front(); await hold(.3); await P.wave(2, { force: true });
      } finally { bus.apply = apply0; if (inWin) a.show(false); a.lift = 0; D.riding = false; D.away = false; if (bus) bus.show(false); a.mod.a = 1; a.mod.br = 1; a.clipL = -1e9; a.noShadow = false; if (!a.scaleAt) a.scaleAt = y => L().sAt(y); }
    });

    /* ================= programador ================= */
    D.note = k => { D.last[k] = D.t; D.lastRun = k; D.hist.push(k); if (D.hist.length > 10) D.hist.shift(); D.famHist.push(SC[k] && SC[k].fam); if (D.famHist.length > 4) D.famHist.shift(); D.uses[k] = (D.uses[k] || 0) + 1; };
    D.pick = () => {
      const c = pcx(), cand = [];
      if (D.t - (D.usesT || 0) > 240) { D.usesT = D.t; for (const k in D.uses) D.uses[k] *= .6; }       // se olvida despacio: lo muy usado sigue pesando menos un rato
      for (const k in SC) {
        const s = SC[k]; if (!s.w || D.t - (D.last[k] || -999) < s.cd || k === D.lastRun) continue;
        if (c.hostBusy && k !== 'lookAround' && k !== 'glance') continue;
        if (s.need && !have(...s.need)) continue;
        let w = s.w(c); if (!(w > 0)) continue;
        const recent = D.hist.slice(-6).filter(h => h === k).length; if (recent) w *= Math.pow(.3, recent);
        w /= 1 + (D.uses[k] || 0) * .22;
        const fi = D.famHist.lastIndexOf(s.fam); if (fi >= 0) w *= fi === D.famHist.length - 1 ? .12 : fi === D.famHist.length - 2 ? .45 : .8;
        cand.push([k, w]);
      }
      if (!cand.length) return 'wander';
      let tot = 0; cand.forEach(x => tot += x[1]); let r = Math.random() * tot;
      for (const [k, v] of cand) { if ((r -= v) <= 0) return k; } return cand[0][0];
    };
    /* micro-gestos sueltos durante el descanso (no cuentan como escena) */
    const microBag = shuffleBag(['l', 'r', 'u', 'l', 'r']);
    async function micro() {
      if (!a.visible || a.stance !== 'F' || a.moving || P.asleep() || D.riding) return;
      const m = microBag(); a.autoIdle = false; await a.play(m === 'u' ? C.lookUser() : C.glance(m === 'l' ? -1 : 1)); a.rest('F');
    }
    /* descanso irregular: casi siempre tranquilo, a veces muy corto (encadena) o muy largo; la energía lo alarga o acorta */
    D.rest = async () => {
      const q = D.phase === 'quiz', r = Math.random();
      let sec = (q ? (r < .3 ? rnd(1.4, 3) : rnd(3, 7)) : (r < .16 ? rnd(1.4, 3) : r < .76 ? rnd(4, 9.5) : rnd(11, 19))) * (1.35 - D.energy * .6);
      P.setState('IDLE');
      while (sec > 0) {
        const step = Math.min(sec, rnd(1.2, 3.2)); await a.wait(step); sec -= step;
        if (sec > 2.4 && Math.random() < .22) await micro();
      }
    };

    /* ================= reacciones a eventos de la página ================= */
    /* nuevos jugadores: se agrupan los que llegan juntos y se reacciona con una variante de la bolsa (no siempre igual) */
    let joinAcc = null, joinAt = 0;
    D.onTick = () => { if (joinAt && D.t >= joinAt) flushJoin(); };
    function queueJoin(k, names) {
      if (!joinAcc) joinAcc = { n: 0, names: [], prev: D.players - k };
      joinAcc.n += k; joinAcc.names = joinAcc.names.concat(names);
      if (!joinAt) joinAt = D.t + Math.max(1.4, 7 - (D.t - (D.lastReactJoin || -99)));
    }
    function flushJoin() {
      joinAt = 0; const acc = joinAcc; joinAcc = null;
      if (!acc || D.phase !== 'lobby' || !(a.visible || D.away)) return;
      D.lastReactJoin = D.t; D.interrupt(() => reactJoin(acc), 2, true);
    }
    const joinBag = shuffleBag(['hello', 'thumb', 'clap', 'selfie', 'cheer', 'hop', 'nod']);
    const hiOne = shuffleBag(['¡Hola, @!', '¡Llegó @!', '¡@ ya está dentro!']);
    async function reactJoin(acc) {
      const first = acc.prev <= 0, big = first || acc.n >= 3, names = acc.names.map(firstName).filter(Boolean);
      P.markActive(); D.energy = clamp(D.energy + .25, 0, 1); await P.emerge(); P.setState('REACTING');
      let greeted = false;
      if (big) {
        await P.surprised(); D.lastBigJoin = D.t; await hold(.1);
        if (first) { await P.jump(have('leap') ? 'L' : 'F', .34); a.fx('spark'); await P.celebrate(1); }
        else if (have('cheer')) { await fit('cheer'); await a.play(C.cheer()); fin(); a.fx('spark', { n: 8 }); }
        else await P.celebrate(1);
      } else {
        let v = joinBag(); if (v === 'selfie' && (!have('selfie') || D.players < 2)) v = 'thumb'; if ((v === 'cheer' && !have('cheer')) || (v === 'nod' && !have('nod'))) v = 'clap';
        if (v === 'hello' && !(D.t - (D.lastHello || -99) > 25)) v = 'thumb';
        if (v === 'hello') { D.lastHello = D.t; await P.front(); await P.wave(1, { force: true }); greeted = true; }
        else if (v === 'thumb') await P.thumbs();
        else if (v === 'clap') { if (have('applaud') && Math.random() < .5) { await fit('applaud'); await P.front(); await a.play(C.applaud(3)); fin(); } else await P.clap(2); }
        else if (v === 'selfie') { await fit('selfie'); await P.front(); const p = a.play(C.selfie()); await hold(1); a.fx('flash'); await p; fin(); }
        else if (v === 'cheer') { await fit('cheer'); await P.front(); await a.play(C.cheer()); fin(); }
        else if (v === 'hop') { await P.front(); await P.jump('F', .28); }
        else { await P.front(); await a.play(C.lookUser()); fin(); }
      }
      /* bienvenida con el nombre: escasa (nunca dos seguidas con menos de 14 s) y solo si el nombre llegó */
      if (names.length && D.t - D.lastSayT > 14) {
        const txt = names.length === 1 ? hiOne().replace('@', names[0]) : names.length === 2 ? '¡Hola, ' + names[0] + ' y ' + names[1] + '!' : '¡Hola, ' + names[0] + ', ' + names[1] + ' y ' + (names.length - 2) + ' más!';
        await P.front(); D.lastSayT = D.t; await P.sayNow(txt);
        if (!greeted && Math.random() < .5) await P.wave(1, { force: true }); else await hold(1.9);
        await hold(.5); S.sayClear(a);
      }
    }
    D.onPlayers = function (n, names) {
      const prev = D.players; D.players = n; let fresh = [];
      if (Array.isArray(names)) { fresh = names.filter(x => D.names.indexOf(x) < 0); D.names = names.slice(); }
      if (n > prev) { if (D.phase === 'lobby' && (a.visible || D.away)) queueJoin(n - prev, fresh); D.lastJoin = D.t; }
    };
    D.pinError = (function () {
      const bag = shuffleBag(['shake', 'uy', 'shrug']);
      return function () {
        if ((!a.visible && !D.away) || D.phase !== 'pin') return; P.markActive();
        D.interrupt(async () => {
          P.setState('REACTING'); await P.emerge(); await P.surprised();
          let v = bag(); if (!have(v === 'shake' ? 'no' : v)) v = 'shake';
          if (v === 'uy') { await fit('uy'); await a.play(C.uy()); fin(); } else if (v === 'shrug') { await fit('shrug'); await a.play(C.shrug()); fin(); } else await P.shake(2);
        }, 2, true);
      };
    })();
    /* SIEMPRE llama cb: el reveal real del QR/sala nunca depende de la animación */
    D.unlock = (function () {
      const bag = shuffleBag(['a', 'b', 'c']);
      return function (cb) {
        let done = false; const end = () => { if (done) return; done = true; if (cb) cb(); };
        setTimeout(end, 2300);
        if (!a.visible && !D.away) { end(); return; }
        P.markActive(); D.energy = 1; D.attentive = false; const v = bag();
        D.interrupt(async () => {
          P.setState('CELEBRATING'); await P.emerge(); await P.surprised(); end(); await hold(.05);
          if (v === 'a' || !have('cheer')) { await P.jump('F', .36); await P.celebrate(2); await P.thumbs(); }
          else if (v === 'b') { await fit('cheer'); await a.play(C.cheer()); fin(); a.fx('spark', { n: 10 }); await P.jump(have('leap') ? 'L' : 'F', .32); await P.thumbs(); }
          else { await P.jump('F', .3); await fit('confetti'); const p = a.play(C.confetti()); a.fx('confetti'); await p; fin(); await P.wave(1, { force: true }); }
        }, 3, true);
      };
    })();
    D.click = (function () {
      const bag = shuffleBag(['wave', 'thumb', 'jump', 'cheer', 'uy', 'hello']);
      return function () {
        if (D.state === 'EXITING' || D.state === 'RIDING' || D.prio >= 3) return;
        P.markActive(); D.energy = clamp(D.energy + .12, 0, 1);
        D.interrupt(async () => {
          P.setState('REACTING'); await P.surprised(); await a.wait(.05); let v = bag();
          if ((v === 'cheer' && !have('cheer')) || (v === 'uy' && !have('uy'))) v = 'thumb';
          if (v === 'wave') await P.wave(2, { force: true }); else if (v === 'hello') { await P.front(); await a.play(C.waveW(2)); fin(); }
          else if (v === 'thumb') await P.thumbs(); else if (v === 'cheer') { await fit('cheer'); await a.play(C.cheer()); fin(); }
          else if (v === 'uy') { await fit('uy'); await a.play(C.uy()); fin(); } else await P.jump('F', .28);
        }, 2);
      };
    })();
    a.stage.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('sp-cv')) D.click(); });

    /* ---- la prueba: SETPI se queda y cada pregunta lo ve haciendo algo distinto ---- */
    const qBag = shuffleBag(['think', 'lupa', 'tablet', 'shrug', 'armsx', 'think']);
    const transBag = shuffleBag(['watch', 'watch', 'applaud', 'thumb', 'cheer']);
    const leadBag = shuffleBag(['point', 'trophy', 'leap', 'cheer']);
    const leadTxt = shuffleBag(['¡@ va primero!', '¡@ toma la delantera!', '¡@ lidera!']);
    D.leaderboard = function (top, nJug) {
      const prev = D.top[0] && D.top[0].nombre; D.top = top || []; D.nJug = nJug || D.top.length;
      if (D.phase === 'quiz' && prev && D.top[0] && D.top[0].nombre !== prev && a.visible && D.t - D.lastLeaderT > 6) { D.lastLeaderT = D.t; const nm = firstName(D.top[0].nombre); D.interrupt(() => reactLeader(nm), 2, true); }
    };
    D.quizTick = function (info) {
      const q = D.quiz, was = q.inTrans; q.total = info.total || q.total;
      if (info.idx !== q.idx) {
        q.idx = info.idx; q.inTrans = !!info.inTrans;
        if (D.phase === 'quiz' && a.visible && !q.inTrans && D.prio < 2 && Math.random() < .9) D.interrupt(async () => {
          let id = qBag(); if (!SC[id] || (SC[id].need && !have(...SC[id].need))) id = 'think'; D.note(id); await SC[id].run();
        }, 1, true);
        return;
      }
      q.inTrans = !!info.inTrans;
      /* entre preguntas: mira el podio, o aplaude / celebra un poco, o nada (no siempre hace lo mismo) */
      if (D.phase === 'quiz' && q.inTrans && !was && a.visible && D.prio < 2 && D.t - D.lastLeaderT > 5 && Math.random() < .75) {
        const v = transBag();
        D.interrupt(async () => {
          if (v === 'applaud' && have('applaud')) { await fit('applaud'); await P.front(); await a.play(C.applaud(3)); fin(); }
          else if (v === 'thumb') await P.thumbs();
          else if (v === 'cheer' && have('cheer')) { await fit('cheer'); await P.front(); await a.play(C.cheer()); fin(); }
          else { D.note('watchPodium'); await SC.watchPodium.run(); }
        }, 1, true);
      }
    };
    async function reactLeader(nombre) {
      P.setState('REACTING'); P.markActive(); await P.emerge();
      let v = leadBag(); if ((v === 'trophy' && !have('trophy')) || (v === 'leap' && !have('leap')) || (v === 'cheer' && !have('cheer'))) v = 'point';
      const txt = leadTxt().replace('@', nombre);
      if (v === 'point') { await P.toR(1); await hold(.15); await P.point(1); await P.front(); await P.sayNow(txt); await P.clap(3); await hold(1); }
      else if (v === 'trophy') { await fit('trophy'); await P.front(); a.fx('spark'); await P.sayNow(txt); await a.play(C.trophy()); fin(); await hold(.3); }
      else if (v === 'leap') { await P.front(); await P.sayNow(txt); await P.jump('L', .32); a.fx('spark', { n: 8 }); await hold(1.1); }
      else { await fit('cheer'); await P.front(); await P.sayNow(txt); await a.play(C.cheer()); fin(); await hold(.5); }
      S.sayClear(a); D.lastSayT = D.t;
    }
    const startBag = shuffleBag(['jump', 'cheer', 'talk']);
    async function quizStart() {
      P.setState('REACTING'); await P.emerge(); await P.front(); let v = startBag(); if ((v === 'cheer' && !have('cheer')) || (v === 'talk' && !have('talk'))) v = 'jump';
      await P.sayNow('¡Que empiece la prueba!');
      if (v === 'jump') { await P.jump('F', .3); await hold(1.2); } else if (v === 'cheer') { await fit('cheer'); await a.play(C.cheer()); fin(); await hold(.5); } else { await fit('talk'); await a.play(C.talk()); fin(); await hold(.4); }
      S.sayClear(a);
    }

    /* ---- el final: anuncia con megáfono, muestra las medallas, levanta el trofeo, lanza confeti y pregunta si quedó claro ---- */
    const short = n => String(n || '').trim().split(/\s+/).slice(0, 2).join(' ').slice(0, 20);
    async function stagePos() {                                    // junto al panel del podio, en la carretera (más grande y con aire arriba)
      const l = L(), y = l.oneLane ? l.yU : l.yL, x = l.xMaxAt(y) - .1 * a.S;
      if (P.valid(x, y)) await P.goTo(x, y); else { const s = P.spot({ lane: 'L', minDist: 0 }); await P.goTo(s.x, s.y); }
    }
    async function announce() {
      P.setState('CELEBRATING'); P.markActive(); await P.emerge();
      for (let i = 0; i < 40 && !D.top.length && D.phase === 'podium'; i++) await a.wait(.1);          // espera el último dato del podio
      const T = D.top.filter(Boolean).slice(0, 3), rich = have('mega') && have('present') && have('medal');
      await stagePos(); await fit('mega', 'present', 'medal', 'trophy', 'confetti', 'clear', 'bow'); await P.front();
      if (rich) {
        fire(C.mega()); a.fx('spark', { n: 8 }); await P.say('¡Atención! ¡Terminó la prueba!', 2.7);
        if (T.length) { fire(C.present()); await P.say('Los ganadores son…', 2.4); }
      } else { await P.jump('F', .3); await P.say('¡Terminó la prueba!', 2.3); }
      const lin = ['¡Primer lugar: ', 'Segundo lugar: ', 'Tercer lugar: '];
      for (let i = 0; i < T.length; i++) {
        const txt = lin[i] + short(T[i].nombre) + (i === 0 ? '!' : '');
        if (rich) fire(C.medal(i + 1, 3.6)); await P.sayNow(txt); await hold(clamp(2.2 + T[i].nombre.length * .05, 2.6, 3.8)); S.sayClear(a); D.lastSayT = D.t;
        if (i === 0) { a.fx('spark', { n: 14 }); if (have('trophy')) await a.play(C.trophy()); else { await P.jump('F', .3); await P.celebrate(1); } fin(); }
        else if (i === 1) { if (have('applaud')) await a.play(C.applaud(4)); else await P.clap(2); fin(); }
        else { if (have('applaud') && Math.random() < .6) await a.play(C.applaud(3)); else await P.thumbs(); fin(); }
        await P.front();
      }
      if (have('confetti')) { fire(C.confetti()); a.fx('confetti'); await hold(.8); a.fx('confetti', { n: 20 }); await hold(2); }
      await P.front();
      if (have('clear')) { fire(C.clear.q(3.2)); await P.say('¿Quedó todo claro?', 3.2); await a.play(C.clear.wave(1.1)); await a.play(C.clear.ok(1.2)); } else { fire(C.lookUser()); await P.say('¿Quedó todo claro?', 3.4); }
      if (have('bow')) { await a.play(C.bow()); } fin();
    }
    D.setPhase = function (p) {
      if (D.phase === p) return; D.phase = p; P.markActive(); D.attentive = false;
      if (p === 'quiz') D.interrupt(quizStart, 3, true);
      else if (p === 'podium') D.interrupt(announce, 3, true);
      else D.interrupt(async () => { await P.front(); await P.wave(2, { force: true }); }, 3, true);          // vuelve a la sala / al PIN
    };
  };
})(window);
