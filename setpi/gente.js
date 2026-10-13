/* SETPI — la gente chica del entorno (diapositiva 19) y la paleta del paletero.
   Personas pequeñas (y de vez en cuando un mini SETPI con sus dibujos reales) que pasean por el fondo de la acera y cruzan por la cebra
   cuando el semáforo peatonal está en verde: llegan y esperan en el borde con el rojo, bajan por la cebra con el verde y otras suben desde abajo.
   Son MUCHO más chicas que SETPI (≈30 % de su alto) para que el protagonista siga siendo él.
   La paleta (PARE / SIGA) la sostiene SETPI en la mano levantada de los dibujos wave_f2 / wave_f3; va por detrás de él para que su guante la agarre. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const PIEL = ['#F2C7A5', '#E3A978', '#C98A5E', '#8E5B3C'], PELO = ['#2B2118', '#4A3326', '#1C1C24', '#7A4A2A', '#C9A24B'];
  const ROPA = ['#14337C', '#D6488E', '#2F6F9F', '#E8EDF5', '#26B67A', '#7C4DA8', '#C9302C', '#F2B01E'], PANT = ['#26324A', '#3A4660', '#5A667A', '#8A6A4A', '#1F4E97'];
  const shade = h => { const n = parseInt(h.slice(1), 16), f = .78; return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join(''); };
  const look = () => ({ piel: pick(PIEL), pelo: pick(PELO), ropa: pick(ROPA), pant: pick(PANT), acc: pick(['', '', 'mochila', 'maletin', 'gorra', 'casco']), falda: Math.random() < .25 });

  /* una persona de 24x52 unidades: 'f' de frente, 'b' de espaldas, 'l' de perfil mirando a la derecha */
  function persona(v, o) {
    const pe = o.piel, ro = o.acc === 'casco' ? '#F2B01E' : o.ropa, pa = o.pant, pl = o.pelo, zp = '#1B2233', ac = o.acc === 'mochila' ? shade(o.ropa) : '#6B4A2E';
    const sombra = '<ellipse cx="12" cy="50.6" rx="7" ry="1.5" fill="rgba(11,18,32,.2)"/>';
    const reflejo = o.acc === 'casco' ? '<rect x="5.4" y="21" width="13.2" height="1.6" fill="#EEF2F7"/>' : '';
    if (v === 'l') {
      return `${sombra}<g class="g-cuerpo">
        <g class="g-pie g-p2"><rect x="10" y="30" width="4.6" height="17" rx="2.3" fill="${shade(pa)}"/><rect x="10" y="45" width="7.2" height="4.2" rx="2.1" fill="${zp}"/></g>
        <g class="g-br g-b2"><rect x="9.8" y="15.5" width="3.6" height="13" rx="1.8" fill="${shade(ro)}"/></g>
        ${o.acc === 'mochila' ? `<rect x="5" y="16" width="5.2" height="11.5" rx="2.4" fill="${ac}"/>` : ''}
        <rect x="8" y="14" width="9.4" height="18.5" rx="4.2" fill="${ro}"/>${reflejo ? '<rect x="8" y="21" width="9.4" height="1.6" fill="#EEF2F7"/>' : ''}
        ${o.falda ? `<path d="M7.6 29 L17.8 29 L19 40 L6.6 40Z" fill="${pa}"/>` : ''}
        <g class="g-pie g-p1"><rect x="10" y="30" width="4.6" height="17" rx="2.3" fill="${pa}"/><rect x="10" y="45" width="7.2" height="4.2" rx="2.1" fill="${zp}"/></g>
        <g class="g-br g-b1"><rect x="10.2" y="15.5" width="3.6" height="13" rx="1.8" fill="${ro}"/><circle cx="12" cy="29.6" r="1.9" fill="${pe}"/></g>
        <circle cx="12.6" cy="8.4" r="5.9" fill="${pe}"/><circle cx="18.2" cy="9.6" r="1.1" fill="${pe}"/>
        <path d="M6.6 8.8 Q6.4 2.4 12.6 2.4 Q17.6 2.6 18 7 Q14.6 5.4 11 6.6 Q9 7.4 8.2 10.4 Q6.6 10.4 6.6 8.8Z" fill="${pl}"/><circle cx="15.8" cy="8.7" r=".85" fill="${zp}"/>
        ${o.acc === 'gorra' ? `<path d="M6.4 6.8 Q12.6 .2 18.4 6.4 Z" fill="${o.ropa}"/><rect x="14" y="5.6" width="6.4" height="1.8" rx=".9" fill="${o.ropa}"/>` : ''}
        ${o.acc === 'casco' ? '<path d="M6.4 7.2 Q6.4 .6 12.6 .6 Q18.6 .8 18.6 7.2 Z" fill="#F2C21B"/><rect x="5.6" y="6.4" width="14" height="1.8" rx=".9" fill="#F2C21B"/>' : ''}
        ${o.acc === 'maletin' ? '<rect x="10.4" y="30.6" width="6.4" height="5" rx="1" fill="#6B4A2E"/>' : ''}
      </g>`;
    }
    const cabeza = v === 'f'
      ? `<circle cx="12" cy="8.4" r="6" fill="${pe}"/><path d="M5.9 8.2 Q5.7 2 12 2 Q18.3 2 18.1 8.2 Q15.6 5.2 12 5.6 Q8.4 5.2 5.9 8.2Z" fill="${pl}"/><circle cx="9.7" cy="9.2" r=".85" fill="${zp}"/><circle cx="14.3" cy="9.2" r=".85" fill="${zp}"/>`
      : `<circle cx="12" cy="8.4" r="6" fill="${pl}"/><rect x="9.6" y="12.6" width="4.8" height="3" rx="1.4" fill="${pe}"/>`;
    const sombrero = o.acc === 'gorra' ? `<path d="M5.6 6.6 Q12 -.4 18.4 6.6 Z" fill="${o.ropa}"/><rect x="5.2" y="5.8" width="13.6" height="1.8" rx=".9" fill="${o.ropa}"/>`
      : o.acc === 'casco' ? '<path d="M5.8 7 Q5.8 .6 12 .6 Q18.2 .6 18.2 7 Z" fill="#F2C21B"/><rect x="5" y="6.2" width="14" height="1.8" rx=".9" fill="#F2C21B"/>' : '';
    return `${sombra}<g class="g-cuerpo">
      <g class="g-pie g-p1"><rect x="7.4" y="30" width="4.3" height="17" rx="2.1" fill="${pa}"/><rect x="6.8" y="45" width="5.6" height="4.2" rx="2.1" fill="${zp}"/></g>
      <g class="g-pie g-p2"><rect x="12.3" y="30" width="4.3" height="17" rx="2.1" fill="${pa}"/><rect x="11.6" y="45" width="5.6" height="4.2" rx="2.1" fill="${zp}"/></g>
      ${o.falda ? `<path d="M5.6 29 L18.4 29 L20.4 40 L3.6 40Z" fill="${pa}"/>` : ''}
      <g class="g-br g-b1"><rect x="2.2" y="15.2" width="3.7" height="13.5" rx="1.85" fill="${ro}"/><circle cx="4.05" cy="29.6" r="2" fill="${pe}"/></g>
      <g class="g-br g-b2"><rect x="18.1" y="15.2" width="3.7" height="13.5" rx="1.85" fill="${ro}"/><circle cx="19.95" cy="29.6" r="2" fill="${pe}"/>${o.acc === 'maletin' && v === 'f' ? '<rect x="17.8" y="30.4" width="6" height="5" rx="1" fill="#6B4A2E"/>' : ''}</g>
      <rect x="5.4" y="14" width="13.2" height="18.5" rx="4.6" fill="${ro}"/>${reflejo}
      ${o.acc === 'mochila' && v === 'b' ? `<rect x="6.6" y="15.4" width="10.8" height="12.4" rx="3.6" fill="${ac}"/>` : ''}
      ${cabeza}${sombrero}
    </g>`;
  }

  S.Gente = function (D, M, root) {
    const capA = root.querySelector('#e-gente-a'), capZ = root.querySelector('#e-gente-z'); if (!capA || !capZ) return null;
    const G = { l: null, list: [], t: 0, hold: false };
    const F = S.Frames, WF = [1, 2, 3, 4, 5, 6].map(i => 'walkf_' + i), WB = [1, 2, 3, 4, 5, 6].map(i => 'back_' + i), WR = [1, 2, 3, 4, 5, 6].map(i => 'run_' + i);
    const dpr = Math.min(2, g.devicePixelRatio || 1);
    let nid = 0, h0 = 60, pl = '', verdeT = 0, tPasea = 3, tGrupo = 2, upN = 0, upT = 0, tUltimoGrupo = -99;
    const W = () => G.l.sr.width, lane = () => G.l.yU - 9, curb = () => G.l.yU + 7, bottom = () => G.l.sr.height + h0 * 1.15 * (G.l.SL / G.l.SU);
    const setpiOK = () => F && F.ok && F.ok.walkf_1 && F.ok.back_1 && F.ok.run_1 && F.ok.idle_a;

    function medidas(p) {
      if (p.setpi) { p.bw = 1.3 * h0; p.bh = 1.25 * h0; p.fy = 1.08 / 1.25; }
      else { p.bw = h0 * 24 / 52; p.bh = h0; p.fy = .95; }
      p.el.style.width = p.bw + 'px'; p.el.style.height = p.bh + 'px'; p.el.style.transformOrigin = '50% ' + (p.fy * 100).toFixed(1) + '%';
      if (p.cv) { p.cv.style.width = p.bw + 'px'; p.cv.style.height = p.bh + 'px'; }
    }
    function vista(p, v) {
      p.v = v; p.fr = '';
      if (p.setpi) return;
      p.el.innerHTML = '<svg viewBox="0 0 24 52" aria-hidden="true">' + persona(v, p.o) + '</svg>'; p.el.className = 'e-pers ' + v + (p.st === 'espera' ? ' espera' : '');
    }
    function mk(o) {
      const p = Object.assign({ id: ++nid, o: look(), setpi: false, x: 0, y: 0, dir: 1, st: '', ph: 0, vel: rnd(.88, 1.14), k: rnd(.94, 1.08), off: 0, delay: 0, fade: 0, v: 'l' }, o);
      p.setpi = !o.sinSetpi && Math.random() < .12 && setpiOK() && !G.list.some(q => q.setpi);      // como mucho un mini SETPI a la vez
      p.el = document.createElement('div'); p.el.className = 'e-pers ' + p.v; p.el.style.setProperty('--gp', (.62 / p.vel).toFixed(2) + 's'); p.el.style.visibility = 'hidden';
      if (p.setpi) { p.el.classList.add('mini'); p.cv = document.createElement('canvas'); p.cv.width = Math.ceil(1.3 * h0 * dpr * 1.3); p.cv.height = Math.ceil(1.25 * h0 * dpr * 1.3); p.ctx = p.cv.getContext('2d'); p.el.appendChild(p.cv); }
      (p.capa).appendChild(p.el); medidas(p); vista(p, p.v); G.list.push(p); pon(p); return p;
    }
    function dibujaSetpi(p) {
      const names = p.v === 'f' ? WF : p.v === 'b' ? WB : WR;
      const f = p.st === 'espera' ? ((Math.floor(G.t / 1.3 + p.id) % 2) ? 'idle_b' : 'idle_a') : names[Math.floor(p.ph) % 6];
      if (p.fr === f) return; const m = F.meta && F.meta[f], im = F.img[f]; if (!m || !F.ok[f]) return; p.fr = f;
      const sc = h0 * m.u * dpr * 1.3, cx = p.cv.width / 2, cy = 1.08 * h0 * dpr * 1.3;
      p.ctx.clearRect(0, 0, p.cv.width, p.cv.height); p.ctx.drawImage(im, cx - m.ax * sc, cy - m.ay * sc, m.w * sc, m.h * sc);
    }
    function pon(p) {
      const l = G.l, f = (l.sAt(p.y) / l.SU) * p.k, sx = p.v === 'l' && p.dir < 0 ? -f : f;
      p.el.style.transform = `translate3d(${(p.x - p.bw / 2).toFixed(1)}px,${(p.y - p.bh * p.fy).toFixed(1)}px,0) scale(${sx.toFixed(3)},${f.toFixed(3)})`;
      p.el.style.zIndex = Math.round(p.y); p.el.style.visibility = ''; if (p.setpi) dibujaSetpi(p);
    }
    const quita = p => { p.el.remove(); p.muerto = true; };
    const mueve = (p, capa) => { p.capa = capa; capa.appendChild(p.el); };
    function offLibre() {
      const ocupados = G.list.filter(q => q.off != null && (q.st === 'cruza' || q.st === 'sube' || q.st === 'espera' || q.st === 'baja')).map(q => q.off);
      for (let i = 0; i < 8; i++) { const o = rnd(-.36, .36); if (ocupados.every(q => Math.abs(q - o) > .17)) return o; }
      return rnd(-.36, .36);
    }

    /* ---- altas ---- */
    function pasea() { const dir = Math.random() < .5 ? 1 : -1; mk({ v: 'l', dir, x: dir > 0 ? -24 : W() + 24, y: lane(), st: 'pasea', capa: capA }); }
    function grupo() {
      const l = G.l, n = pick([1, 1, 2, 2, 3]), dir = Math.random() < .5 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const o = offLibre(), x0 = dir > 0 ? l.qr.right - 26 - i * rnd(18, 34) : l.pr.left + 26 + i * rnd(18, 34);
        mk({ v: 'l', dir, x: x0, y: lane(), st: 'llega', off: o, capa: capA, delay: rnd(.3, 1.6) });
      }
      tUltimoGrupo = G.t;
    }
    function sube() { const l = G.l, p = mk({ v: 'b', x: l.zebra.x, y: bottom(), st: 'sube', off: offLibre(), capa: capZ }); p.x = l.zebra.x + p.off * l.zebra.w; pon(p); }

    G.layout = function (l) {
      const prev = G.l; G.l = l; h0 = l.SU * .30;
      if (!l.zebra) { G.limpia(true); return; }
      G.list.forEach(medidas);
      if (prev && (Math.abs(prev.SU - l.SU) > 2 || Math.abs(prev.sr.width - l.sr.width) > 4)) G.limpia(true);
    };
    const desvanece = p => { if (p.fade) return; p.fade = 1; p.t0 = G.t; p.el.style.transition = 'opacity .45s ease-out'; p.el.style.opacity = '0'; };
    G.limpia = function (ya) { if (ya) { G.list.forEach(quita); G.list = []; } else G.list.forEach(desvanece); };
    G.esperando = () => G.list.filter(p => p.st === 'espera').length;
    /* ráfaga (paletero): suben algunos desde abajo y los que esperan cruzan ya */
    G.rafaga = function () {
      if (!G.l || !G.l.zebra || M.hold) return;
      G.list.forEach(p => { if (p.st === 'espera') p.delay = Math.min(p.delay, verdeT + rnd(.15, .9)); });
      const n = 2 + (Math.random() < .5 ? 1 : 0); for (let i = 0; i < n; i++) setTimeout(() => { if (G.l && G.l.zebra && D.luz === 'verde' && !M.hold) sube(); }, 250 + i * 900);
    };

    G.step = function (dt) {
      const l = G.l; if (!l) return;
      G.t += dt;
      if (M.hold || !l.zebra || l.oneLane) { G.limpia(false); G.list.forEach(p => { if (G.t - p.t0 > .5) quita(p); }); G.list = G.list.filter(p => !p.muerto); return; }
      const lz = D.luz;
      if (lz === 'verde' && pl !== 'verde') { verdeT = 0; upN = pick([0, 1, 1, 2]); upT = rnd(.6, 2.4); }
      if (lz === 'verde') verdeT += dt; pl = lz;
      /* altas */
      tPasea -= dt; if (tPasea <= 0) { if (G.list.filter(p => p.st === 'pasea').length < 2) pasea(); tPasea = rnd(7, 15); }
      tGrupo -= dt; if (tGrupo <= 0) { if ((lz === 'rojo' && D.luzRest > 6 || lz === 'parpadeo') && G.esperando() + G.list.filter(p => p.st === 'llega' || p.st === 'baja').length === 0 && G.t - tUltimoGrupo > 14) grupo(); tGrupo = rnd(2, 5); }
      if (upN > 0) { upT -= dt; if (upT <= 0 && lz === 'verde' && D.luzRest > 5) { sube(); upN--; upT = rnd(1.2, 3); } }
      /* movimiento */
      const z = l.zebra, u = l.SU * .2, apuro = lz === 'verde' ? 1 : 1.5;
      for (const p of G.list) {
        if (p.muerto) continue;
        if (p.fade) { if (G.t - p.t0 > .5) quita(p); continue; }
        const v = u * p.vel, f = l.sAt(p.y) / l.SU;
        let d = 0;
        if (p.st === 'pasea') { p.x += p.dir * v * dt; d = v * dt; if (p.x < -40 || p.x > W() + 40) quita(p); }
        else if (p.st === 'llega') {
          const tx = z.x + p.off * z.w; p.y = lane(); p.x += p.dir * v * dt; d = v * dt;
          if (p.dir > 0 ? p.x >= tx : p.x <= tx) { p.x = tx; p.st = 'baja'; mueve(p, capZ); vista(p, 'f'); }
        } else if (p.st === 'baja') {
          p.x = z.x + p.off * z.w; p.y += v * .8 * dt; d = v * .8 * dt;
          if (p.y >= curb()) { p.y = curb(); p.st = 'espera'; p.el.classList.add('espera'); p.fr = ''; }
        } else if (p.st === 'espera') {
          p.x = z.x + p.off * z.w; p.y = curb();
          if (lz === 'verde' && D.luzRest > 3.4 && verdeT > p.delay) { p.st = 'cruza'; p.el.classList.remove('espera'); p.fr = ''; }
        } else if (p.st === 'cruza') {
          p.x = z.x + p.off * z.w; p.y += v * .95 * apuro * dt; d = v * .95 * apuro * dt; if (p.y > bottom()) quita(p);
        } else if (p.st === 'sube') {
          p.x = z.x + p.off * z.w; p.y -= v * .95 * apuro * dt; d = v * .95 * apuro * dt;
          if (p.y <= curb()) { p.st = 'sale'; p.dir = Math.random() < .5 ? 1 : -1; mueve(p, capA); vista(p, 'l'); }
        } else if (p.st === 'sale') {
          p.x += p.dir * v * dt; d = v * dt; if (p.y > lane()) p.y = Math.max(lane(), p.y - 14 * dt);
          if (p.x < -40 || p.x > W() + 40) quita(p);
        }
        if (p.muerto) continue;
        if (p.setpi && d) p.ph += d / (h0 * f * p.k * (p.v === 'l' ? .8 : .5)) * 6;
        pon(p);
      }
      G.list = G.list.filter(p => !p.muerto);
    };
    return G;
  };

  /* ---- la banca (tablón + patas) como objeto aparte: la misma en todos los cuadros, así no se corta ni aparece y desaparece ---- */
  S.Banca = function (stage, a) {
    const el = document.createElement('div'); el.className = 'sp-banca';
    el.innerHTML = `<svg viewBox="-70 -34 140 40" aria-hidden="true">
      <ellipse cx="0" cy="-.5" rx="58" ry="3.6" fill="rgba(11,18,32,.18)"/>
      <rect x="-45.6" y="-22.5" width="7.4" height="22" rx="1.6" fill="#383F4F" stroke="#222838" stroke-width="1"/><rect x="-44" y="-21.6" width="2.4" height="20" fill="#566078" opacity=".7"/>
      <rect x="38.2" y="-22.5" width="7.4" height="22" rx="1.6" fill="#383F4F" stroke="#222838" stroke-width="1"/><rect x="39.8" y="-21.6" width="2.4" height="20" fill="#566078" opacity=".7"/>
      <rect x="-60" y="-28.4" width="120" height="6.4" rx="2.4" fill="#7F583C" stroke="#3B281C" stroke-width="1"/><rect x="-58" y="-27.6" width="116" height="1.9" rx=".9" fill="#A57852" opacity=".9"/><rect x="-58" y="-24.2" width="116" height="1.6" fill="#4F3524" opacity=".55"/>
    </svg>`;
    stage.insertBefore(el, a.layerA);
    const svg = el.querySelector('svg'), B = { on: false };
    /* se coloca donde están los pies de SETPI (el ancla de los dibujos) y a su escala */
    B.pon = (x, y, Sz) => { const k = Sz / 100; svg.style.width = (140 * k).toFixed(1) + 'px'; svg.style.height = (40 * k).toFixed(1) + 'px'; svg.style.left = (-70 * k).toFixed(1) + 'px'; svg.style.top = (-34 * k).toFixed(1) + 'px'; el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; };
    B.muestra = v => { B.on = v; el.style.opacity = v ? '1' : '0'; };
    return B;
  };

  /* ---- la paleta del paletero (PARE / SIGA) ---- */
  S.Paleta = function (stage, a) {
    const GL = { wave_f2: [-.406, -.5215], wave_f3: [.394, -.63] };             // dónde queda el guante (en alto de SETPI) en cada dibujo de la mano levantada
    const oct = (r, cy) => Array.from({ length: 8 }, (_, i) => { const t = (i * 45 + 22.5) * Math.PI / 180; return (r * Math.cos(t)).toFixed(2) + ',' + (cy + r * Math.sin(t)).toFixed(2); }).join(' ');
    const el = document.createElement('div'); el.className = 'sp-paleta';
    el.innerHTML = `<div class="pa-giro"><svg viewBox="-60 -90 120 130" aria-hidden="true">
      <rect x="-1.9" y="-50" width="3.8" height="66" rx="1.9" fill="#EEF2F7" stroke="#0B1220" stroke-width=".7"/><rect x="-1.9" y="-30" width="3.8" height="5" fill="#D8342C"/><rect x="-1.9" y="-18" width="3.8" height="5" fill="#D8342C"/>
      <g class="pa-disco"><g class="pa-pare"><polygon points="${oct(23, -66)}" fill="#0B1220"/><polygon points="${oct(21.4, -66)}" fill="#fff"/><polygon points="${oct(19.2, -66)}" fill="#D8342C"/><text x="0" y="-62.2" text-anchor="middle" font-family="Barlow,Arial,sans-serif" font-weight="800" font-size="11.4" fill="#fff">PARE</text></g>
      <g class="pa-siga" style="display:none"><circle cx="0" cy="-66" r="22.5" fill="#0B1220"/><circle cx="0" cy="-66" r="21" fill="#fff"/><circle cx="0" cy="-66" r="19" fill="#1FA85A"/><text x="0" y="-62.2" text-anchor="middle" font-family="Barlow,Arial,sans-serif" font-weight="800" font-size="11.4" fill="#fff">SIGA</text></g></g>
    </svg></div>`;
    stage.insertBefore(el, a.layerA);
    const svg = el.querySelector('svg'), disco = el.querySelector('.pa-disco'), pare = el.querySelector('.pa-pare'), siga = el.querySelector('.pa-siga');
    const P = { on: false, cara: 'pare', lado: -1, k: 0, vis: false, flipping: false };
    const mostrar = c => { pare.style.display = c === 'pare' ? '' : 'none'; siga.style.display = c === 'siga' ? '' : 'none'; };
    P.toma = (lado, cara) => { P.on = true; P.lado = lado; P.cara = cara || 'pare'; mostrar(P.cara); };
    P.suelta = () => { P.on = false; P.vis = false; el.style.opacity = '0'; };
    /* da la vuelta a la paleta (giro corto sobre su eje) */
    P.pon = async c => {
      if (c === P.cara) return; P.cara = c;
      if (!disco.animate) { mostrar(c); return; }
      const out = disco.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(.06)' }], { duration: 110, easing: 'cubic-bezier(.55,0,.8,.4)', fill: 'forwards' });
      await new Promise(r => setTimeout(r, 112));
      mostrar(c); disco.animate([{ transform: 'scaleX(.06)' }, { transform: 'scaleX(1)' }], { duration: 170, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
    };
    /* sigue la mano de SETPI cuadro a cuadro (posición exacta con su escala, giro y vaivén) */
    P.sync = () => {
      const gl = P.on && a.visible ? GL[a.pose.f] : null;
      if (!gl) { if (P.vis) { P.vis = false; el.style.opacity = '0'; } return; }
      const m = a.mod, Sz = a.S, fl = a.facing < 0 ? -1 : 1, th = (m.rot || 0) * fl * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
      const lx = gl[0] * Sz * fl * (m.sx || 1), ly = gl[1] * Sz * (m.sy || 1);
      const x = a.x + (m.dx || 0) * Sz * fl + lx * c - ly * s, y = a.y - a.lift + (m.dy || 0) * Sz + lx * s + ly * c;
      const k = Sz / 100 * .86; if (Math.abs(k - P.k) > .004) { P.k = k; svg.style.width = (120 * k).toFixed(1) + 'px'; svg.style.height = (130 * k).toFixed(1) + 'px'; svg.style.left = (-60 * k).toFixed(1) + 'px'; svg.style.top = (-90 * k).toFixed(1) + 'px'; }
      const bal = 3.2 * Math.sin(performance.now() / 1000 * 2.3) * (P.lado < 0 ? 1 : -1);
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${((m.rot || 0) * fl + bal).toFixed(2)}deg)`;
      if (!P.vis) { P.vis = true; el.style.opacity = '1'; }
    };
    return P;
  };
})(window);
