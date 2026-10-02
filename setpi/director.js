/* SETPI — director: máquina de estados + comportamiento autónomo con contexto.
   Estados (D.state): IDLE, WALKING, LOOKING, GREETING, THUMBS_UP, QR_INTERACTION, HIDING, PEEKING, SLEEPING,
   CELEBRATING, REACTING, SURPRISED, JUMPING, RIDING, EXITING, AWAY.   Fases de la sala (D.phase): pin | lobby | quiz | podium.
   Solo OBSERVA la página (PIN, nº de jugadores, inicio/fin del quiz, buses de fondo): nunca la modifica.
   Se mueve por la zona libre (calculada del layout real: nunca tapa QR, título, texto, premios, panel ni botones),
   entra y sale por detrás del panel de la sala. Un solo bucle rAF; se detiene si la diapositiva no está activa. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const CANCEL = S.CANCEL, C = S.C;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const WID = .47;                                                  // semiancho de SETPI de pie (en alto S) + holgura

  S.init = function (cfg) {
    const slide = cfg.slide, stage = cfg.stage;
    S.base = cfg.base || 'setpi/';
    const a = new S.Actor(stage);
    const D = S.dir = { a, state: 'AWAY', phase: 'pin', players: 0, t: 0, last: {}, active: 0, L: null, lastRun: '', energy: .55, attentive: false, hostT: -99, lastJoin: -99, lastBigJoin: -99, prio: 0, ready: false, hist: [], busTarget: null };
    const rel = (r, sr) => ({ left: r.left - sr.left, right: r.right - sr.left, top: r.top - sr.top, bottom: r.bottom - sr.top, w: r.width, h: r.height });
    const L = () => D.L;
    const setState = s => { D.state = s; };
    const bus = S.Bus ? S.Bus(slide, stage, a) : null;
    const fire = (c, o) => a.play(c, o).catch(() => { });          // clip que corre en paralelo (no se espera)

    /* ================= escenario: todo derivado del layout real (nunca px fijos) ================= */
    function layout() {
      const sr = stage.getBoundingClientRect(); if (!sr.width || !sr.height) return false;
      const pr = rel(cfg.panel().getBoundingClientRect(), sr);
      const road = slide.querySelector('.escena-viva line[stroke-dasharray]');
      const nav = document.getElementById('nav'), navTop = nav ? rel(nav.getBoundingClientRect(), sr).top : sr.height;   // la barra inferior nunca tapa sus pies
      const floor = Math.min(road ? rel(road.getBoundingClientRect(), sr).top + 8 : sr.height * 0.88, navTop - 6);
      const qr = rel(cfg.qr.getBoundingClientRect(), sr);
      let textB = 0; const obs = [];
      cfg.content.querySelectorAll(cfg.text).forEach(e => {
        const r = rel(e.getBoundingClientRect(), sr); if (!(r.w > 0)) return; if (r.bottom > textB && r.bottom < qr.top + 4) textB = r.bottom;
        if (e.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(e); let n = 0; [...rg.getClientRects()].forEach(q => { if (q.width > 2 && q.height > 2) { obs.push(rel(q, sr)); n++; } }); if (n) return; }   // texto: una caja por LÍNEA (la 2ª línea corta deja libre el resto)
        obs.push(r);
      });
      const textRect = e => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };   // el enlace ocupa todo el ancho: se mide solo su texto
      obs.push(qr); if (cfg.premio) obs.push(rel(cfg.premio.getBoundingClientRect(), sr)); if (cfg.link) obs.push(rel(textRect(cfg.link), sr));
      const yU = Math.min(qr.bottom - 2, floor - 30);                 // carril alto: pies a la altura del borde inferior del QR
      const H = sr.height, K = 500 / 513;                             // la cabeza queda a K*S sobre los pies
      const SU = clamp((yU - textB - 8) / K, 56, H * 0.27);           // arriba cabe bajo el texto
      const SL = clamp(Math.min(H * 0.29, SU * 1.38), SU, H * 0.34);  // la carretera está más cerca: algo más grande (profundidad)
      const side = pr.left > sr.width * 0.4;                          // panel a la derecha; si se apila (móvil) no hay escondite
      const oneLane = !side;
      const prev = D.L, onY = prev && a.y ? (a.y - prev.yU) / ((prev.yL - prev.yU) || 1) : null;
      D.L = { sr, pr, floor, yU, yL: oneLane ? yU : floor, SU, SL: oneLane ? SU : SL, side, oneLane, qr, obs, K, qrc: [qr.left + qr.w / 2, qr.top + qr.h / 2], pinc: [0, 0] };
      const l = D.L;
      l.xMin = 14 + WID * SU;
      l.sAt = y => l.oneLane ? l.SU : l.SU + (l.SL - l.SU) * clamp((y - l.yU) / ((l.yL - l.yU) || 1), 0, 1);
      l.xMaxAt = y => Math.max(l.xMin + 10, (side ? pr.left : sr.width) - WID * l.sAt(y) - 8);
      l.hideX = () => (side ? pr.left : sr.width) + .62 * l.sAt(l.yL);        // detrás del panel / fuera de pantalla
      l.canHide = side && (l.xMaxAt(l.yL) - xMinAt(l.yL)) >= 0;
      if (cfg.pin) { const p = rel(cfg.pin().getBoundingClientRect(), sr); l.pinc = [p.left + p.w / 2, p.top + p.h / 2]; }
      a.setCap(Math.max(SU, SL, 120));
      a.scaleAt = y => l.sAt(y);
      const ny = onY != null ? clamp(l.yU + onY * (l.yL - l.yU), l.yU, l.yL) : (a.y || l.yL);
      a.setS(l.sAt(ny)); a.place(a.x, ny);
      if (a.x < l.hideX() - 1) a.place(clamp(a.x, xMinAt(ny), Math.max(xMinAt(ny), l.xMaxAt(ny))), ny);   // nunca queda sobre el QR/texto tras un cambio de tamaño
      return true;
    }
    D.layout = layout;
    /* zona libre: borde izquierdo permitido a la altura y (obstáculos que tocan la silueta de SETPI ahí) */
    const box = (x, y, k) => { const s = D.L.sAt(y), w = (k || WID) * s; return { left: x - w, right: x + w, top: y - D.L.K * s, bottom: y }; };
    const hits = (b, m) => D.L.obs.some(o => b.left < o.right + (m || 4) && b.right > o.left - (m || 4) && b.top < o.bottom + (m || 4) && b.bottom > o.top - (m || 4));
    const valid = (x, y) => { const l = D.L; return y >= l.yU - 1 && y <= l.yL + 1 && x >= l.xMin && x <= l.xMaxAt(y) && !hits(box(x, y)); };
    const clear = (x1, y1, x2, y2) => { const N = Math.max(24, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 10)); for (let i = 0; i <= N; i++) { const t = i / N, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; if (hits(box(x, y), 2)) return false; } return true; };
    const xMinAt = y => { const l = D.L; let v = l.xMin; for (let x = l.xMin; x <= l.xMaxAt(y); x += 6) { if (!hits(box(x, y))) { v = x; break; } v = x + 6; } return v; };
    function spot(o) {                                                // punto libre al azar (pesa los carriles: arriba / carretera / en medio)
      o = o || {}; const l = D.L;
      for (let i = 0; i < 60; i++) {
        const r = Math.random(); const y = l.oneLane ? l.yU : (o.lane === 'U' ? l.yU : o.lane === 'L' ? l.yL : r < .3 ? l.yU : r < .62 ? l.yL : rnd(l.yU, l.yL));
        const x0 = xMinAt(y), x1 = l.xMaxAt(y); if (x1 - x0 < 4) continue;
        const x = rnd(x0, x1); if (Math.hypot(x - a.x, y - a.y) < (o.minDist == null ? .6 : o.minDist) * a.S) continue;
        if (valid(x, y) && clear(a.x, a.y, x, y)) return { x, y };
      }
      const y = o.lane === 'U' || l.oneLane ? l.yU : l.yL; return { x: clamp(a.x, xMinAt(y), l.xMaxAt(y)), y };
    }
    const nearQR = () => { const l = D.L, y = l.yU, x = clamp(l.qr.right + WID * l.sAt(y) + 10, l.xMin, l.xMaxAt(y)); return { x, y }; };

    /* ================= primitivas de movimiento ================= */
    const idleFor = () => D.t - D.active;
    const markActive = () => { D.active = D.t; };
    /* de 3/4 a de frente (siempre pasando por el giro real) */
    async function front() { if (a.stance === 'R') { await a.play(C.turnRF()); } a.face(1); a.rest('F'); }
    /* pone a SETPI de 3/4 mirando a dir (+1 derecha / -1 izquierda); si mira al otro lado, pivota por el frente */
    async function toR(dir) {
      if (a.stance === 'F') { a.face(dir); await a.play(C.turnFR()); }
      else if (a.facing !== dir) { await a.play(C.turnRF()); a.face(dir); await a.play(C.turnFR()); }
      a.rest('R');
    }
    /* un tramo recto corriendo (el ciclo de pasos va atado a la distancia, sin patinar) */
    async function runLeg(x, y, o) {
      o = o || {}; const dx = x - a.x;
      if (a.stance === 'F') { a.face(dx >= 0 ? 1 : -1); await a.play(C.turnFR()); }
      else if (Math.abs(dx) > 6 && a.facing !== (dx >= 0 ? 1 : -1) && !o.diag) { await a.play(C.turnRF()); a.face(dx >= 0 ? 1 : -1); await a.play(C.turnFR()); }
      setState('WALKING');
      await a.moveTo(x, y, { speed: a.S * (o.speed || 1.5), gait: 'run' });
      a.rest('R');
    }
    /* un tramo hacia (x,y): casi vertical hacia abajo = de frente caminando hacia la cámara; en cualquier otro caso corre en diagonal */
    async function leg(x, y, o) {
      o = o || {}; const dx = x - a.x, dy = y - a.y;
      if (dy > 0 && Math.abs(dx) < .3 * dy && dy > .25 * a.S && !o.run) {
        await front(); setState('WALKING'); await a.moveTo(x, y, { gait: 'front', speed: a.S * .8, ramp: a.S * .25 }); a.rest('F');
      } else await runLeg(x, y, { diag: Math.abs(dy) > 8, speed: o.speed });
    }
    /* planifica el camino libre de obstáculos: recto, o con un punto intermedio (evita correr en vertical hacia arriba: no hay frames de espaldas) */
    function plan(x, y) {
      if (clear(a.x, a.y, x, y)) return [{ x, y }];
      const l = L(); let best = null;
      const cost = (x1, y1, x2, y2) => { const d = Math.hypot(x2 - x1, y2 - y1), up = y2 < y1 - 8, steep = Math.abs(x2 - x1) < .55 * Math.abs(y2 - y1); return d + (up && steep ? 600 : 0); };
      [a.y, y, l.yU, l.yL, (a.y + y) / 2].forEach(wy => {
        const x0 = xMinAt(wy), x1 = l.xMaxAt(wy); if (x1 - x0 < 4) return;
        for (let i = 0; i <= 16; i++) {
          const wx = x0 + (x1 - x0) * i / 16; if (!valid(wx, wy) || !clear(a.x, a.y, wx, wy) || !clear(wx, wy, x, y)) continue;
          const c = cost(a.x, a.y, wx, wy) + cost(wx, wy, x, y); if (!best || c < best.c) best = { c, wx, wy };
        }
      });
      return best ? [{ x: best.wx, y: best.wy }, { x, y }] : [{ x: clamp(Math.max(xMinAt(l.yL), xMinAt(l.yU)) + .2 * l.SL, l.xMin, l.xMaxAt(a.y)), y: a.y }, { x: clamp(Math.max(xMinAt(l.yL), xMinAt(l.yU)) + .2 * l.SL, l.xMin, l.xMaxAt(y)), y }, { x, y }];
    }
    async function goTo(x, y, o) {
      o = o || {}; const l = L();
      if (o.free) { await runLeg(x, y, o); return; }
      y = clamp(y, l.yU, l.yL); x = clamp(x, l.xMin, Math.max(l.xMin, l.xMaxAt(y)));
      if (Math.hypot(x - a.x, y - a.y) < 6) return;
      for (const w of plan(x, y)) { if (Math.hypot(w.x - a.x, w.y - a.y) > 6) await leg(w.x, w.y, o); }
    }
    /* los gestos con brazos abiertos necesitan más ancho: si hay QR/texto pegado, se corre a un sitio libre antes de empezar */
    async function room(k) {
      const l = L(); k = k || .52; if (a.x > l.xMaxAt(a.y) + 4 || !hits(box(a.x, a.y, k), 2)) return;
      let best = null;
      for (let x = xMinAt(a.y); x <= l.xMaxAt(a.y); x += 6) if (!hits(box(x, a.y, k), 2)) { const d = Math.abs(x - a.x); if (!best || d < best.d) best = { x, d }; }
      if (best && best.d > 3) await goTo(best.x, a.y);
    }
    /* altura libre sobre la cabeza (px) hasta el texto/QR de arriba: los saltos nunca llegan a tocarlo */
    const headroom = (x, y) => { const l = D.L, sz = l.sAt(y), top = y - l.K * sz, w = .5 * sz; let h = 1e9; l.obs.forEach(o => { if (x + w > o.left && x - w < o.right && o.bottom <= top + 4) h = Math.min(h, top - o.bottom - 3); }); return h; };
    async function space(need) {
      if (headroom(a.x, a.y) >= need) return true;
      for (let i = 0; i < 40; i++) { const sp = spot({ lane: i % 3 ? 'L' : undefined, minDist: 0 }); if (headroom(sp.x, sp.y) >= need && valid(sp.x, sp.y)) { await goTo(sp.x, sp.y); return true; } }
      return false;
    }
    const idle = async sec => { setState('IDLE'); await a.wait(sec); };
    const hop = async (h, dur) => { await a.tween('lift', h, dur * .5, 'out'); await a.tween('lift', 0, dur * .5, 'in'); };
    /* salto con anticipación / aire / caída / amortiguación */
    async function jump(view, h) {
      h = (h || .32) * a.S; await space(h * 1.1); await room(); h = Math.min(h, headroom(a.x, a.y)); if (h < .08 * a.S) return; setState('JUMPING');
      const J = view === 'R' ? C.jumpR : C.jumpF;
      await a.play(J.crouch);
      if (view === 'R') { fire(J.up); await a.tween('lift', h, .22, 'out'); fire(J.peak); await a.wait(.04); await a.tween('lift', 0, .26, 'in'); }
      else { fire(J.air); await a.tween('lift', h, .24, 'out'); await a.wait(.04); await a.tween('lift', 0, .28, 'in'); }
      a.fx('dust', { n: 3 });
      await a.play(J.land);
      a.rest(view === 'R' ? 'R' : 'F');
    }
    /* saludar: nunca dos saludos seguidos (mín. 14 s entre uno y otro, salvo la llegada y la despedida); de frente con una mano
       (alterna de lado cada vez) o girando a 3/4 para saludar moviendo la muñeca */
    async function wave(n, o) {
      if (!(o && o.force) && D.t - (D.lastWave || -99) < 14) return;
      D.lastWave = D.t; setState('GREETING'); await room();
      if (a.stance === 'R') await a.play(C.waveR(2 + (n > 2 ? 1 : 0)));
      else if (Math.random() < .35) { await toR(Math.random() < .5 ? 1 : -1); await a.wait(.15); await a.play(C.waveR(3)); a.rest('R'); await front(); }
      else { D.waveSide = -(D.waveSide || 1); await a.play(C.waveF(D.waveSide, 1.5 + .4 * (n || 1))); }
      a.rest(a.stance);
    }
    async function thumbs() { setState('THUMBS_UP'); await room(); await front(); a.fx('like'); await a.play(C.likeF()); a.rest('F'); }
    async function clap(n) { setState('CELEBRATING'); await front(); await a.play(C.clap(n)); a.rest('F'); }
    async function surprised(fx) { setState('SURPRISED'); await room(); await front(); if (fx !== false) a.fx('alert'); await a.play(C.surprised()); a.rest('F'); }
    async function shake(n) { await front(); await a.play(C.shake(n)); a.rest('F'); }
    async function celebrate(times) {
      setState('CELEBRATING'); await space(.3 * a.S); await room(); await front(); a.fx('spark');
      const hm = Math.max(0, Math.min(1, headroom(a.x, a.y) / (.3 * a.S)));
      for (let i = 0; i < (times || 1); i++) { fire(C.celebrate()); await hop(.26 * a.S * hm, .5); a.fx('spark', { n: 6 }); await hop(.2 * a.S * hm, .42); }
      await a.play([{ f: 'idle_a', t: .08, fade: .06 }]); a.rest('F');
    }
    async function point(k) { a.rest(a.stance); await a.play(C.pointR(k || 1)); a.rest('R'); }
    const doneAway = () => { a.show(false); setState('AWAY'); };
    /* globo de texto sobre su cabeza (sin emojis). Si arriba no hay aire hasta el texto de la página, se mueve a un sitio con espacio. */
    /* límites libres para el globo: ni sobre el QR/texto de la página ni sobre el panel */
    function bubbleBox() {
      const l = L(), top = a.y - l.K * a.S, band = [top - .7 * a.S, top];
      let minX = 8, maxX = (l.side ? l.pr.left : l.sr.width) - 8, minY = 6;
      l.obs.forEach(o => {
        if (o.bottom > band[0] - 4 && o.top < band[1]) { if (o.right <= a.x) minX = Math.max(minX, o.right + 8); else if (o.left >= a.x) maxX = Math.min(maxX, o.left - 8); }
        if (o.right > a.x - .8 * a.S && o.left < a.x + .8 * a.S && o.bottom <= top + 4) minY = Math.max(minY, o.bottom + 4);
      });
      return { minX, maxX, minY, maxW: Math.max(a.S * 1.2, Math.min(a.S * 2.7, maxX - minX)) };
    }
    async function say(text, secs) {
      await space(a.S * .5); S.say(a, text, bubbleBox());
      await a.wait(secs || clamp(1.5 + text.length * .07, 1.9, 4.2));
      S.sayClear(a);
    }
    async function sayNow(text) { await space(a.S * .5); return S.say(a, text, bubbleBox()); }

    /* ================= comportamientos autónomos ================= */
    const BEH = {
      /* mirar alrededor (de frente) */
      lookAround: async () => { setState('LOOKING'); await front(); await a.play(C.around()); a.rest('F'); },
      /* pasea sin más: va a otro punto y vuelve de frente al público */
      wander: async () => { const s = spot(); await goTo(s.x, s.y); if (a.stance === 'R' && D.energy > .55 && Math.random() < .28) await jump('R', .24); await front(); },
      /* saluda al público */
      greet: async () => { if (Math.random() < .5) { const s = spot(); await goTo(s.x, s.y); } await front(); await wave(2 + (Math.random() < .4 ? 1 : 0)); },
      /* me gusta */
      thumbs: async () => { if (Math.random() < .5) { const s = spot(); await goTo(s.x, s.y); } await thumbs(); },
      /* aplaude */
      clap: async () => { await clap(3); },
      /* saltito de alegría */
      play: async () => { await front(); await jump('F', .3); if (Math.random() < .5) { await a.wait(.25); await jump('F', .24); } },
      /* QR: mira → camina → se detiene → mira → señala → vuelve a señalar → reacción positiva → se aleja */
      inviteQR: async () => {
        const l = L(), q = nearQR();
        setState('QR_INTERACTION');
        await toR(l.qrc[0] > a.x ? 1 : -1); await a.wait(.55);                           // mira hacia el QR
        await goTo(q.x, q.y); setState('QR_INTERACTION');
        await toR(-1); await a.wait(.4);                                                 // se detiene de cara al QR
        await point(2);                                                                  // señala (rebote)
        await front(); await a.play(C.lookUser()); a.rest('F');                          // mira al usuario
        await toR(-1); await point(1);                                                   // vuelve a señalar
        const rr = Math.random(); if (rr < .4) await thumbs(); else if (rr < .75) await clap(2); else { await toR(-1); await jump('R', .26); }   // reacción positiva pequeña
        await a.wait(.3); const s = spot({ minDist: 1 }); await goTo(s.x, s.y);          // se aleja
      },
      /* antes del PIN: se acerca al candado, niega con la cabeza y señala el campo del PIN */
      lookLock: async () => {
        const l = L(), q = nearQR(); setState('LOOKING');
        await goTo(q.x, q.y); await toR(-1); await a.wait(.6);                           // mira el candado
        await front(); await shake(2);                                                    // "aún no"
        await toR(1); await a.wait(.35); setState('QR_INTERACTION'); await point(2);     // señala hacia el panel
        await front(); await a.play(C.lookUser()); a.rest('F');
      },
      /* esconderse detrás del panel de la sala y asomarse (capas reales: el panel va por delante) */
      peekaboo: async () => {
        const l = L(); if (!l.canHide) return BEH.lookAround();
        const y = l.oneLane ? l.yU : (Math.random() < .5 ? l.yL : rnd(l.yU, l.yL)); setState('HIDING');
        await goTo(l.xMaxAt(y) - .08 * a.S, y); await toR(1); await a.wait(.35);
        const hideX = l.hideX(); await runLeg(hideX, y, { speed: .95 });                  // entra detrás del panel
        await a.wait(rnd(.9, 1.6));
        const n = Math.random() < .5 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          setState('PEEKING'); a.face(1); a.stance = 'R'; a.autoIdle = false; a.setS(l.sAt(y));
          const edge = l.pr.left + 4, half = a.S * .72, v = i === 0 ? 1 : 2;
          a.place(edge + half, y); fire(C.peek(v)); await a.tween('x', edge, .42, 'out');      // asoma deslizándose por el borde del panel
          await a.wait(v === 1 ? 1.05 : 1.35); await a.tween('x', edge + half, .38, 'in');   // se mete
          await a.wait(rnd(.7, 1.3));
        }
        a.place(hideX, y); a.face(-1); a.stance = 'R';
        await runLeg(l.xMaxAt(y) - .1 * a.S, y, { speed: 1.1 });                          // sale corriendo por debajo del panel
        await toR(-1); await front(); await wave(1);
      },
      /* esconderse detrás del QR (la tarjeta va por debajo de SETPI: se recorta en su borde) y asomarse */
      peekQR: async () => {
        const l = L(), y = l.yU, edge = l.qr.right + 3; setState('HIDING');
        try {
          await goTo(edge + .55 * l.SU, y); await toR(-1); await a.wait(.3);
          a.clipL = edge; await runLeg(edge - .6 * a.S, y, { speed: .95 });          // se mete detrás de la tarjeta del QR
          await a.wait(rnd(.9, 1.5));
          const n = Math.random() < .5 ? 1 : 2, half = a.S * .72;
          for (let i = 0; i < n; i++) {
            setState('PEEKING'); a.face(-1); a.stance = 'R'; a.autoIdle = false; a.clipL = edge;
            a.place(edge - half, y); fire(C.peekQR(i === 0 ? 1 : 2)); await a.tween('x', edge, .42, 'out');
            await a.wait(i === 0 ? 1.05 : 1.35); await a.tween('x', edge - half, .38, 'in'); await a.wait(rnd(.7, 1.2));
          }
          a.place(edge - .6 * a.S, y); a.face(1); a.stance = 'R'; a.rest('R');
          await runLeg(edge + .62 * a.S, y, { speed: 1.1 });                           // sale corriendo hacia la derecha
        } finally { a.clipL = -1e9; }
        await toR(1); await front(); await wave(1);
      },
      /* dormir esperando: se sienta → bosteza → cabecea → duerme (Z temporales) → despierta */
      nap: async () => {
        setState('SLEEPING');
        if (Math.random() < .6) { const s = spot({ lane: 'L' }); await goTo(s.x, s.y); }
        await front(); await a.wait(.5);
        await a.play(C.sit()); await a.play(C.yawn()); await a.play(C.nod());
        a.loop(C.sleepLoop()); const n = Math.floor(rnd(3, 6));
        for (let i = 0; i < n; i++) { a.fx('zzz'); await a.wait(rnd(2.4, 3.2)); }
        await wakeUp(true);
      },
      /* viaje en bus: espera en la parada, llega el bus (detrás del panel), sube por la puerta y se va; vuelve corriendo */
      ride: async () => {
        const g = rideGeo(); if (!g) return; const l = L();
        setState('RIDING'); D.riding = true;
        try {
          if (D.busTarget && Math.random() < .5) await BEH.busWave();                 // primero saluda al bus que pasa por el fondo
          await goTo(g.xn - RIDE.wait * g.s, g.y); setState('RIDING');
          await toR(1); await a.wait(.35); a.fx('alert');                             // mira hacia donde llegan los buses
          bus.clipX = l.pr.left; bus.place(l.pr.left + 26, g.y, g.k); bus.show(true, false);
          const arrive = a.tween('x', g.xn, 1.9, 'out', bus);                          // el bus llega frenando
          fire(C.waveR(1)); await arrive; a.fx('dust', { n: 2 }); bus.front = true;
          await a.tween('dy', 3 * g.k, .12, 'out', bus); await a.tween('dy', 0, .22, 'io', bus);   // cabeceo al frenar
          await a.wait(.15); await jump('R', .2); await runLeg(g.xn + RIDE.f1 * g.s, g.y, { speed: 1.2 });          // salta de alegría y corre a la puerta
          // sube: frame a frame, con el desplazamiento y la altura del escalón
          a.autoIdle = false; a.stance = 'R'; a.face(1); a.place(g.xn + RIDE.f1 * g.s, g.y);
          await a.play([{ f: 'bus_1', t: .3, fade: .05 }]);
          fire([{ f: 'bus_2', t: .34, fade: .04 }]); await Promise.all([a.tween('x', g.xn + RIDE.f2 * g.s, .3, 'io'), a.tween('lift', RIDE.l2 * g.s, .3, 'out')]);
          fire([{ f: 'bus_3', t: .34, fade: .04 }]); await Promise.all([a.tween('x', g.xn + RIDE.f3 * g.s, .3, 'io'), a.tween('lift', RIDE.l3 * g.s, .3, 'io')]);
          fire([{ f: 'bus_4', t: .6, fade: .04 }]); await Promise.all([a.tween('x', g.xn + RIDE.f4 * g.s, .5, 'io'), a.tween('lift', RIDE.l4 * g.s, .5, 'io'), a.tween('a', 0, .45, 'in', a.mod), a.tween('br', .35, .45, 'lin', a.mod)]);
          a.show(false); a.cancel(); a.lift = 0; D.away = true; setState('AWAY'); bus.front = false; bus.apply();
          await a.wait(.5);
          await a.tween('x', -(VBW * g.k) - 80, 2.9, 'in3', bus); bus.show(false);    // el bus se va hacia la izquierda, por detrás del contenido
          await a.wait(rnd(13, 22));                                                    // paseo
          D.away = false; D.active = D.t; const sp = spot({ lane: 'L', minDist: 0 });
          await enter(sp.x, sp.y, 1.9); await front(); await wave(2, { force: true });   // vuelve corriendo por detrás del panel
        } finally { D.riding = false; D.away = false; if (bus) bus.show(false); a.mod.a = 1; a.mod.br = 1; }
      },
      /* analizando una pregunta: "?" sobre la cabeza y mira alrededor pensando */
      think: async () => { setState('THINKING'); await front(); a.fx('question'); await a.play(C.around()); a.rest('F'); await a.wait(rnd(.4, 1)); if (Math.random() < .45) { a.fx('question'); await a.play(C.lookUser()); a.rest('F'); } },
      /* mira el podio (el panel está a su derecha) */
      watchPodium: async () => { setState('WATCHING'); await toR(1); await a.wait(rnd(1.6, 2.6)); await front(); },
      /* un bus pasa por detrás: lo mira y lo saluda */
      busWave: async () => {
        const b = D.busTarget; if (!b) return; setState('GREETING');
        await toR(b.dir); await a.wait(.25); await a.play(C.waveR(1 + (Math.random() < .5 ? 1 : 0))); a.rest('R');
        await a.wait(.3); await front();
      }
    };
    const asleep = () => /^(sleep|nod|yawn|sit|wake)/.test(a.pose.f);
    async function wakeUp(natural) {
      setState('SURPRISED'); a.cancel();
      if (asleep()) { if (!natural) a.fx('alert'); await a.play(C.wake()); a.rest('R'); a.face(1); }
      await front();
    }
    async function wakeIfAsleep() { if (asleep()) { a.fx('alert'); await a.play(C.wake()); a.rest('R'); a.face(1); } }

    /* ---- geometría del viaje: la parada está en el carril alto, pegada al borde del panel (la puerta cabe entera a la vista) ---- */
    const RIDE = { wait: .62, f1: .06, f2: .5, f3: .7, f4: .9, l2: .07, l3: .12, l4: .12 };   // fracciones de S respecto a la trompa del bus
    const VBW = 356;
    function rideGeo() {
      const l = L(); if (!bus || !l.side || l.oneLane) return null;
      let y = l.yU, s = l.SU, xn = l.pr.left - 8 - 1.06 * s;
      /* el escalón sube a SETPI: si arriba no hay aire hasta el texto, la parada baja un poco (más cerca de la cámara = más espacio) */
      const hr = x => Math.min(headroom(x, y), headroom(x + .5 * s, y), headroom(x + s, y)), need = (RIDE.l3 + .06) * s;
      if (hr(xn) < need) { y = Math.min(l.yL, y + (need - hr(xn)) * 1.5); s = l.sAt(y); xn = l.pr.left - 8 - 1.06 * s; if (hr(xn) < (RIDE.l3 + .03) * s) return null; }
      const k = s / 100;
      if (xn - .45 * s < xMinAt(y) || !valid(clamp(xn - RIDE.wait * s, l.xMin, l.xMaxAt(y)), y)) return null;
      return { y, s, k, xn };
    }
    D.dbg = { rideGeo, headroom, valid, xMinAt, spot, goTo };
    /* ---- elección: cada comportamiento declara SUS condiciones ---- */
    const COOL = { think: 7, watchPodium: 6, lookAround: 16, wander: 9, greet: 45, thumbs: 38, clap: 45, play: 40, inviteQR: 44, lookLock: 30, peekaboo: 45, peekQR: 60, nap: 140, busWave: 18, ride: 110 };
    function weights() {
      const l = L(), ph = D.phase, n = D.players, idle = idleFor(), W = {}, hostBusy = D.t - D.hostT < 7;
      const qrOpen = ph === 'lobby';
      if (ph === 'quiz') { const q = D.quiz; return q.inTrans ? { watchPodium: 4, wander: .6, thumbs: .5 } : { think: 5, lookAround: 1.2, wander: .6, thumbs: .4 }; }
      if (hostBusy) return { lookAround: .6 };                                  // el anfitrión escribe el PIN: SETPI no estorba
      W.lookAround = ph === 'podium' ? 1 : 2.2;
      W.wander = ph === 'podium' ? 1.2 : 2.6;
      W.greet = ph === 'pin' ? 1.5 : ph === 'lobby' ? (n > 0 ? 2.4 : 1.6) : 3;
      if (ph !== 'pin') W.thumbs = ph === 'podium' ? 3 : (n >= 2 ? 2 + (D.t - D.lastJoin < 25 ? 2 : 0) : .8);
      if (ph === 'podium' || (qrOpen && n >= 3)) W.clap = ph === 'podium' ? 3 : 1.4;
      if (D.energy > .5 && ph !== 'podium') W.play = .9 + (D.energy - .5) * 3;
      if (ph === 'pin') W.lookLock = idle > 10 ? 3.4 : 1.2;                          // mira el candado, señala el PIN
      if (qrOpen) W.inviteQR = (n === 0 ? 4.2 : n <= 2 ? 2.4 : .5) * (idle > 14 ? 1.5 : 1);   // invita a escanear cuando falta gente
      if (l.canHide && ph !== 'podium') W.peekaboo = n <= 3 ? 2.6 : 1.2;
      if (ph !== 'podium' && valid(clamp(l.qr.right + 3 + .55 * l.SU, l.xMin, l.xMaxAt(l.yU)), l.yU)) W.peekQR = 1.9;
      if ((ph === 'pin' && idle > 45) || (qrOpen && n === 0 && idle > 38) || (D.energy < .25 && idle > 25)) W.nap = 5 + Math.min(6, (idle - 30) / 6);
      if (D.busTarget && ph !== 'podium') W.busWave = 5.5;
      if (ph !== 'podium' && idle > 20 && D.energy > .3 && D.t - D.lastJoin > 30 && (ph === 'pin' ? idle > 25 : idle > 15) && rideGeo()) W.ride = (qrOpen && n === 0 ? 3 : 1.5) + (D.busTarget ? 1 : 0);
      return W;
    }
    function choose() {
      const W = weights(); let tot = 0; const c = [];
      for (const k in W) {
        if (!W[k] || !BEH[k] || D.t - (D.last[k] || -999) < COOL[k] || k === D.lastRun) continue;
        let w = W[k]; const recent = D.hist.slice(-3).filter(h => h === k).length; if (recent) w *= .35;
        tot += w; c.push([k, w]);
      }
      if (!c.length) return 'wander';
      let r = Math.random() * tot; for (const [k, v] of c) { if ((r -= v) <= 0) return k; } return c[0][0];
    }

    /* ================= bucle principal: reacciones > comportamiento autónomo ================= */
    D.reaction = null;
    D.interrupt = (fn, prio, needs) => { prio = prio || 1; if (prio < D.prio && D.running) return false; D.reaction = fn; D.reactPrio = prio; D.reactNeeds = !!needs; a.cancel(); return true; };
    D.run = name => D.interrupt(async () => { D.last[name] = D.t; D.lastRun = name; await BEH[name](); }, 0);
    async function main() {
      for (;;) {
        try {
          if (D.reaction) {
            const r = D.reaction; D.reaction = null; D.prio = D.reactPrio || 1; D.running = true; layout();
            try { if (D.reactNeeds && !a.visible) { D.away = false; const sp = spot({ lane: 'L', minDist: 0 }); await enter(sp.x, sp.y, 1.9); } await wakeIfAsleep(); await r(); } finally { D.running = false; D.prio = 0; }
            await settle(); setState(a.visible ? 'IDLE' : 'AWAY'); continue;
          }
          if (!a.visible && !D.riding && D.ready) { const sp = spot({ lane: 'L', minDist: 0 }); D.away = false; await enter(sp.x, sp.y, 1.8); continue; }   // red de seguridad: nada lo esconde ya, vuelve
          if (!a.visible) { await a.wait(.5); continue; }
          if (D.attentive) { await a.wait(.4); continue; }
          // reposo: respira y parpadea; la duración depende de la energía (cansado = más quieto)
          await settle(); await idle(rnd(2.6, 7.5) * (1.35 - D.energy * .6)); layout();
          const k = choose(); D.lastRun = k; D.last[k] = D.t; D.hist.push(k); if (D.hist.length > 8) D.hist.shift();
          await BEH[k](); await settle();
          D.energy = clamp(D.energy - .04, .05, 1);
        } catch (e) { if (e !== CANCEL) { console.error('[SETPI]', e); await a.wait(1).catch(() => { }); } }
      }
    }
    /* siempre vuelve a la pose neutra de frente con su salida (nunca un salto brusco) */
    async function settle() { S.sayClear(a); a.cancel(); a.lift = 0; if (!a.visible) return; if (asleep()) { await a.play(C.wake()); a.rest('R'); a.face(1); } if (a.stance === 'R') await front(); else { a.face(1); a.rest('F'); } }

    /* ================= reacciones a eventos de la página ================= */
    /* si estaba escondido detrás del panel, sale corriendo por debajo */
    async function emerge() { const l = L(); if (a.x > l.xMaxAt(a.y) + 4) { a.face(-1); a.stance = 'R'; await runLeg(l.xMaxAt(a.y) - .1 * a.S, a.y, { speed: 1.2 }); } }
    /* entra corriendo desde detrás del panel (o por el borde derecho si el panel está apilado) */
    async function enter(tx, ty, speed) {
      const l = L(); a.cancel(); a.stance = 'R'; a.face(-1); a.setS(l.sAt(ty)); a.place(l.hideX(), ty); a.show(true); a.rest('R');
      await runLeg(tx, ty, { speed: speed || 1.7 });
    }
    async function reactJoin(prev, n) {
      markActive(); D.energy = clamp(D.energy + .25, 0, 1); await emerge(); setState('REACTING');
      const big = (prev === 0 || n - prev >= 3) && D.t - D.lastBigJoin > 8;
      await surprised();
      if (big) {
        D.lastBigJoin = D.t; await a.wait(.12); await jump('F', .34); a.fx('spark');
        await celebrate(prev === 0 ? 2 : 1); await front(); await wave(2);
      } else {
        await a.wait(.08);
        if (n >= 4) { await clap(3); await thumbs(); }
        else if (Math.random() < .5) { await thumbs(); } else { await clap(2); }
      }
    }
    D.onPlayers = function (n) {
      const prev = D.players; D.players = n;
      if (n > prev && D.phase === 'lobby' && (a.visible || D.away) && D.t - D.lastJoin > 3.5) { D.lastJoin = D.t; D.interrupt(() => reactJoin(prev, n), 2, true); }
      else if (n > prev) D.lastJoin = D.t;
    };
    D.pinError = function () {
      if ((!a.visible && !D.away) || D.phase !== 'pin') return; markActive();
      D.interrupt(async () => { setState('REACTING'); await emerge(); await surprised(); await shake(2); }, 2, true);
    };
    /* SIEMPRE llama cb: el reveal real del QR/sala nunca depende de la animación */
    D.unlock = function (cb) {
      let done = false; const fin = () => { if (done) return; done = true; if (cb) cb(); };
      setTimeout(fin, 2300);
      if (!a.visible && !D.away) { fin(); return; }
      markActive(); D.energy = 1; D.attentive = false;
      D.interrupt(async () => { setState('CELEBRATING'); await emerge(); await surprised(); fin(); await a.wait(.05); await jump('F', .36); await celebrate(2); await thumbs(); }, 3, true);
    };
    /* el anfitrión enfoca / escribe en el campo del PIN: SETPI se vuelve hacia el panel y mira con atención */
    D.hostFocus = function (on) {
      D.hostT = D.t; if (D.phase !== 'pin' || (!a.visible && !D.away)) return;
      if (on && !D.attentive) {
        D.attentive = true; markActive();
        D.interrupt(async () => { setState('LOOKING'); await emerge(); await toR(1); while (D.attentive) await a.wait(.3); await front(); }, 1, true);
      } else if (!on && D.attentive) { D.attentive = false; D.hostT = D.t - 3; }
    };
    D.hostTyping = function () { D.hostT = D.t; markActive(); };
    /* ---- la prueba: SETPI se queda, piensa con "?" en cada pregunta, mira el podio y celebra a quien va ganando ---- */
    D.top = []; D.quiz = { idx: -1, inTrans: false, total: 10 }; D.lastLeaderT = -99;
    D.leaderboard = function (top, nJug) {
      const prev = D.top[0] && D.top[0].nombre; D.top = top || []; D.nJug = nJug || D.top.length;
      if (D.phase === 'quiz' && prev && D.top[0] && D.top[0].nombre !== prev && a.visible && D.t - D.lastLeaderT > 6) { D.lastLeaderT = D.t; const nm = D.top[0].nombre; D.interrupt(() => reactLeader(nm), 2, true); }
    };
    /* el panel avisa cada 0,2 s en qué pregunta va y si está en la pausa entre preguntas */
    D.quizTick = function (info) {
      const q = D.quiz, was = q.inTrans; q.total = info.total || q.total;
      if (info.idx !== q.idx) { q.idx = info.idx; q.inTrans = !!info.inTrans; if (D.phase === 'quiz' && a.visible && !q.inTrans && D.prio < 2) D.interrupt(() => BEH.think(), 1, true); return; }
      q.inTrans = !!info.inTrans;
      if (D.phase === 'quiz' && q.inTrans && !was && a.visible && D.prio < 2 && D.t - D.lastLeaderT > 5) D.interrupt(() => BEH.watchPodium(), 1, true);
    };
    async function reactLeader(nombre) {
      setState('REACTING'); markActive(); await emerge(); await toR(1); await a.wait(.15); await point(1); await front();
      await sayNow('¡' + nombre + ' va primero!'); await clap(3); await a.wait(1.1); S.sayClear(a); if (Math.random() < .5) await thumbs();
    }
    async function quizStart() {
      setState('REACTING'); await emerge(); await front(); await jump('F', .3); await sayNow('¡Que empiece la prueba!'); await a.wait(1.9); S.sayClear(a);
    }
    /* al terminar: dice en texto quién ganó el 1.º, 2.º y 3.º y luego pregunta si quedó todo claro */
    async function announceWinners() {
      setState('CELEBRATING'); markActive(); await emerge();
      for (let i = 0; i < 40 && !D.top.length && D.phase === 'podium'; i++) await a.wait(.1);          // espera el último dato del podio
      const T = D.top.filter(Boolean).slice(0, 3);
      await front(); await jump('F', .3);
      if (T.length) {
        await say('¡Terminó la prueba! Los ganadores son…', 2.3);
        const lin = ['¡Primer lugar: ', 'Segundo lugar: ', 'Tercer lugar: '];
        for (let i = 0; i < T.length; i++) {
          await say(lin[i] + T[i].nombre + (i === 0 ? '!' : ''), clamp(1.6 + T[i].nombre.length * .06, 2.2, 3.4));
          if (i === 0) { await jump('F', .3); await celebrate(1); } else if (i === 1) await clap(2); else await thumbs();
        }
      }
      await front(); fire(C.lookUser()); await say('¿Quedó todo claro?', 3.4);
    }
    D.setPhase = function (p) {
      if (D.phase === p) return; D.phase = p; markActive(); D.attentive = false;
      if (p === 'quiz') D.interrupt(quizStart, 3, true);
      else if (p === 'podium') D.interrupt(announceWinners, 3, true);
      else D.interrupt(async () => { await front(); await wave(2, { force: true }); }, 3, true);          // vuelve a la sala / al PIN
    };
    stage.addEventListener('click', e => {
      if (!e.target.classList || !e.target.classList.contains('sp-cv')) return;
      if (D.state === 'EXITING' || D.state === 'RIDING' || D.prio >= 3) return;
      markActive(); D.energy = clamp(D.energy + .12, 0, 1);
      D.interrupt(async () => { setState('REACTING'); await surprised(); await a.wait(.05); const r = Math.random(); if (r < .4) await wave(2); else if (r < .75) await thumbs(); else await jump('F', .28); }, 2);
    });
    if (cfg.pin) { const p = cfg.pin(); if (p) { p.addEventListener('focus', () => D.hostFocus(true)); p.addEventListener('blur', () => D.hostFocus(false)); p.addEventListener('input', () => D.hostTyping()); } }

    /* ================= buses de fondo (solo se observan) ================= */
    const busEls = (cfg.buses || ['.ev-bus1', '.ev-bus2']).map((s, i) => ({ el: slide.querySelector(s), dir: i === 0 ? 1 : -1, was: false })).filter(b => b.el);
    D.buses = busEls;
    function senseBuses() {
      const l = D.L; if (!l) return; const sr = l.sr; let best = null;
      busEls.forEach(b => {
        const r = b.el.getBoundingClientRect(); const cx = r.left + r.width / 2 - sr.left; b.cx = cx; b.vis = cx > 30 && cx < (l.side ? l.pr.left - 20 : sr.width - 20);
        if (b.vis && !b.was) { b.was = true; b.seen = D.t; } if (!b.vis) b.was = false;
        if (b.vis && Math.abs(cx - a.x) > .8 * a.S && D.t - b.seen < 14) { if (!best || Math.abs(cx - a.x) < Math.abs(best.cx - a.x)) best = { cx, dir: cx > a.x ? 1 : -1, b }; }
      });
      D.busTarget = best;
    }

    /* ================= bucle rAF (se detiene si no se ve; un vigilante lo reanuda al volver) ================= */
    let last = 0, chain = 0, wall = 0, sense = 0;
    const reduced = g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isActive = () => !document.hidden && slide.classList.contains('activa');
    D.step = dt => { D.t += dt; D.energy = clamp(D.energy + (.5 - D.energy) * dt * .004, 0, 1); a.update(dt); sense += dt; if (sense > .25) { sense = 0; senseBuses(); } };   // avance determinista (también para pruebas)
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
    if ('ResizeObserver' in g) new ResizeObserver(() => { if (isActive() && D.L && a.cvW) layout(); }).observe(stage);
    /* al entrar en la diapositiva SETPI llega corriendo desde detrás del panel */
    let wasActive = slide.classList.contains('activa');
    new MutationObserver(() => {
      const now = slide.classList.contains('activa');
      if (now && !wasActive && D.ready && D.phase !== 'quiz') D.intro();
      wasActive = now;
    }).observe(slide, { attributes: true, attributeFilter: ['class'] });
    D.intro = function () {
      if (!D.ready) return; layout(); const l = L(); a.cancel(); a.show(false);
      D.interrupt(async () => {
        setState('REACTING'); const s = spot({ lane: 'L', minDist: 0 }); await enter(s.x, s.y, 1.7); await front(); await wave(2, { force: true });
      }, 1);
    };
    function boot() {
      if (!layout()) { setTimeout(boot, 300); return; }
      const l = L(), s = spot({ lane: 'L', minDist: 0 }); a.place(s.x, s.y); a.rest('F'); a.show(true); D.state = 'IDLE'; D.ready = true;
      if (reduced) { a.update(0); return; }
      kick(); main();
      setTimeout(layout, 1500);                                       // tras las animaciones de entrada de la diapositiva
      if (slide.classList.contains('activa')) setTimeout(() => { if (D.state === 'IDLE' && !D.reaction) D.intro(); }, 400);
    }
    S.Frames.load(S.base).then(boot);
    return D;
  };
})(window);
