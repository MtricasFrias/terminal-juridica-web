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
      a.clipR = side ? pr.left : 1e9;                                 // el panel va por delante: SETPI no se transparenta detrás de él
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
      if (dy < -.25 * a.S && Math.abs(dx) < -.3 * dy && !o.run && S.Frames.has('back_1')) { await backLeg(x, y); return; }
      if (dy > 0 && Math.abs(dx) < .3 * dy && dy > .25 * a.S && !o.run) {
        await front(); setState('WALKING'); await a.moveTo(x, y, { gait: 'front', speed: a.S * .8, ramp: a.S * .25 }); a.rest('F');
      } else await runLeg(x, y, { diag: Math.abs(dy) > 8, speed: o.speed });
    }
    /* hacia arriba (alejándose de la cámara): camina de ESPALDAS; al llegar gira de caricatura y queda de frente */
    async function backLeg(x, y) {
      setState('WALKING'); await front(); await a.spin('back_1');
      await a.moveTo(x, y, { gait: 'back', speed: a.S * .8, ramp: a.S * .25 });
      await a.spin('idle_a'); a.rest('F');
    }
    /* planifica el camino libre de obstáculos: recto, o con un punto intermedio (evita correr en vertical hacia arriba: no hay frames de espaldas) */
    function plan(x, y) {
      if (clear(a.x, a.y, x, y)) return [{ x, y }];
      const l = L(); let best = null;
      const cost = (x1, y1, x2, y2) => { const d = Math.hypot(x2 - x1, y2 - y1), up = y2 < y1 - 8, steep = Math.abs(x2 - x1) < .55 * Math.abs(y2 - y1); return d + (up && steep ? 40 : 0); };
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
      const J = view === 'R' ? C.jumpR : view === 'L' && C.leap ? C.leap : C.jumpF;
      await a.play(J.crouch);
      if (view === 'R') { fire(J.up); await a.tween('lift', h, .22, 'out'); fire(J.peak); await a.wait(.04); await a.tween('lift', 0, .26, 'in'); }
      else { fire(J.air); await a.tween('lift', h, .24, 'out'); await a.wait(.04); await a.tween('lift', 0, .28, 'in'); }
      a.fx('dust', { n: 3 });
      await a.play(J.land);
      a.rest(view === 'R' ? 'R' : 'F');
    }
    /* saludar: las variantes salen de una bolsa (no se repite una hasta agotarlas) y hay presupuesto: sin forzar, mín. 40 s entre saludos
       y como mucho 3 en 6 min. De frente con una mano (alterna de lado), de frente con la muñeca, o girando a 3/4 con la muñeca. */
    let waveQ = [], waveLast = '';
    const nextWave = () => {
      if (!waveQ.length) { waveQ = ['fl', 'fr', 'w', 'r'].filter(v => v !== 'w' || S.Frames.has('wavew_1')); for (let i = waveQ.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [waveQ[i], waveQ[j]] = [waveQ[j], waveQ[i]]; } if (waveQ[waveQ.length - 1] === waveLast) waveQ.unshift(waveQ.pop()); }
      return waveLast = waveQ.pop();
    };
    const waveOK = () => { D.waveLog = (D.waveLog || []).filter(t => D.t - t < 360); return D.t - (D.lastWave || -99) >= 40 && D.waveLog.length < 3; };
    D.waveOK = waveOK;
    async function wave(n, o) {
      o = o || {}; if (!o.force && !waveOK()) return false;
      D.lastWave = D.t; (D.waveLog = D.waveLog || []).push(D.t); setState('GREETING'); await room(.55);
      const v = nextWave();
      if (v === 'r') { if (a.stance !== 'R') await toR(Math.random() < .5 ? 1 : -1); await a.wait(.12); await a.play(C.waveR(2 + (n > 2 ? 1 : 0))); a.rest('R'); await front(); }
      else {
        await front();
        if (v === 'w') await a.play(C.waveW(2 + (n > 2 ? 1 : 0)));
        else { D.waveSide = -(D.waveSide || 1); await a.play(C.waveF(v === 'fl' ? -1 : 1, 1.5 + .4 * (n || 1))); }
        a.rest('F');
      }
      return true;
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

    const asleep = () => /^(sleep|nod|yawn|sit|wake)/.test(a.pose.f);
    async function wakeUp(natural) {
      setState('SURPRISED'); a.cancel();
      if (asleep()) { if (!natural) a.fx('alert'); await a.play(C.wake()); a.rest('R'); a.face(1); }
      await front();
    }
    async function wakeIfAsleep() { if (asleep()) { a.fx('alert'); await a.play(C.wake()); a.rest('R'); a.face(1); } }

    /* ---- geometría del viaje: la parada está en el carril alto, pegada al borde del panel (la puerta cabe entera a la vista) ---- */
    const RIDE = { wait: .62, f1: .06, f2: .5, f3: .7, f4: .9, l2: .07, l3: .12, l4: .12, e1: .8, e2: .86, e3: 1.02, el1: .12, el2: .06 };   // e*/el*: bajada por la puerta (x y altura del escalón)   // fracciones de S respecto a la trompa del bus
    const VBW = 356;
    function rideGeo() {
      const l = L(); if (!bus || !l.side || l.oneLane) return null;
      let y = l.yU, s = l.SU, xn = l.pr.left - 8 - 1.06 * s;
      const hr = x => Math.min(headroom(x, y), headroom(x + .5 * s, y), headroom(x + s, y));
      /* la ventanilla (SETPI asomado, más alto que de pie) pasa de largo bajo el texto: se mide el aire a todo lo largo del recorrido */
      const wantW = S.Frames.has('bwin_1'), hrW = () => { let h = 1e9; for (let x = xMinAt(y); x <= xn + 1.44 * s; x += .25 * s) h = Math.min(h, headroom(x, y)); return h; };
      /* el escalón sube a SETPI: si arriba no hay aire hasta el texto, la parada baja un poco (más cerca de la cámara = más espacio) */
      for (let i = 0; i < 9 && y < l.yL && hr(xn) < (RIDE.l3 + .06) * s; i++) { y = Math.min(l.yL, y + 14); s = l.sAt(y); xn = l.pr.left - 8 - 1.06 * s; }
      if (hr(xn) < (RIDE.l3 + .03) * s) return null;
      const k = s / 100;
      if (xn - .45 * s < xMinAt(y) || !valid(clamp(xn - RIDE.wait * s, l.xMin, l.xMaxAt(y)), y)) return null;
      const ws = Math.min(.9, ((wantW ? hrW() : -1e9) + .36 * s - 6) / (.69 * s));       // escala con la que SETPI cabe en la ventanilla sin tocar el texto de arriba
      return { y, s, k, xn, win: wantW && ws >= .64, ws };
    }
    D.dbg = { rideGeo, headroom, valid, xMinAt, spot, goTo };
    /* ================= bucle principal: reacciones > comportamiento autónomo ================= */
    D.reaction = null;
    D.interrupt = (fn, prio, needs) => { prio = prio || 1; if (prio < D.prio && D.running) return false; D.reaction = fn; D.reactPrio = prio; D.reactNeeds = !!needs; a.cancel(); return true; };
    D.run = name => D.interrupt(async () => { D.note(name); await D.SC[name].run(); }, 0);
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
          await settle(); await D.rest(); layout();
          const k = D.pick(); D.note(k);
          await D.SC[k].run(); await settle();
          D.energy = clamp(D.energy - .025, .05, 1);
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
    /* el anfitrión enfoca / escribe en el campo del PIN: SETPI se vuelve hacia el panel y mira con atención */
    D.hostFocus = function (on) {
      D.hostT = D.t; if (D.phase !== 'pin' || (!a.visible && !D.away)) return;
      if (on && !D.attentive) {
        D.attentive = true; markActive();
        D.interrupt(async () => { setState('LOOKING'); await emerge(); await toR(1); while (D.attentive) await a.wait(.3); await front(); }, 1, true);
      } else if (!on && D.attentive) { D.attentive = false; D.hostT = D.t - 3; }
    };
    D.hostTyping = function () { D.hostT = D.t; markActive(); };
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
    D.step = dt => { D.t += dt; if (D.onTick) D.onTick(dt); D.energy = clamp(D.energy + (.5 - D.energy) * dt * .004, 0, 1); a.update(dt); sense += dt; if (sense > .25) { sense = 0; senseBuses(); } };   // avance determinista (también para pruebas)
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
    const P = { a, D, L, C, CANCEL, rnd, clamp, WID, bus, setState, fire, front, toR, runLeg, leg, backLeg, goTo, room, space, headroom, hits, box, valid, clear, xMinAt, spot, nearQR, idle, hop, jump, wave, thumbs, clap, surprised, shake, celebrate, point, say, sayNow, bubbleBox, rideGeo, RIDE, VBW, enter, emerge, wakeUp, wakeIfAsleep, asleep, markActive, settle, layout };
    D.P = P; if (S.Scenes) S.Scenes(D, P);
    S.Frames.load(S.base).then(boot);
    return D;
  };
})(window);
