/* SETPI — escena de la diapositiva 19 (la calle del SETP de día).
   Formas planas y nítidas. escena19() devuelve el HTML; esc19Layout(l) la ancla a los carriles reales y dibuja la cebra. */
(function (g) {
  'use strict';
  const nube = (x, y, w, dur, delay, op) => `<div class="e-nube" style="top:${y}vh; width:${w}vw; animation-duration:${dur}s; animation-delay:${delay}s; opacity:${op}"><svg viewBox="0 0 120 50" aria-hidden="true"><path d="M18 42 Q2 42 5 29 Q8 18 22 21 Q26 6 43 8 Q55 1 66 12 Q80 8 88 21 Q106 18 108 33 Q110 43 94 43 Z" fill="#fff"/></svg></div>`;
  const ave = (y, dur, delay, inv, s) => `<div class="e-ave${inv ? " inv" : ""}" style="top:${y}vh; animation-duration:${dur}s; animation-delay:${delay}s; width:${s}"><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M1 9 Q7 -1 13 9"/><path d="M13 9 Q19 -1 25 9"/></svg></div>`;
  const avion = `<div class="e-avion" aria-hidden="true"><svg viewBox="0 0 90 30"><rect x="6" y="11" width="68" height="9" rx="4.5" fill="#F4F7FB"/><path d="M60 11 L82 5 L84 8 L72 14 Z" fill="#D2DCEA"/><path d="M34 15 L50 3 L55 3 L47 16 Z" fill="#E1E8F2"/><path d="M34 17 L50 28 L55 28 L47 16 Z" fill="#C7D3E3"/><rect x="62" y="13" width="8" height="2.6" rx="1.3" fill="#9FD3F5"/><circle cx="76" cy="14.5" r="3.2" fill="#E1E8F2"/></svg><i class="e-estela"></i></div>`;
  function ciudad() {
    const edif = [[18, 74, 96, 0], [104, 54, 134, 1], [168, 90, 82, 2], [266, 62, 152, 0], [336, 92, 108, 1], [438, 58, 128, 2], [506, 104, 90, 0], [640, 50, 118, 1], [1170, 66, 122, 2], [1244, 84, 98, 0], [1338, 58, 142, 1], [1404, 98, 86, 2], [1514, 72, 114, 0]];
    const col = ["#7CA7D0", "#6C99C6", "#8FB4D8"]; let v = "";
    edif.forEach(([x, w, h, c], i) => {
      const y = 240 - h; v += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col[c]}"/>`;
      for (let r = 0; r < Math.floor((h - 10) / 22); r++) for (let k = 0; k < Math.floor((w - 8) / 20); k++) v += `<rect x="${x + 7 + k * 20}" y="${y + 10 + r * 22}" width="9" height="11" rx="1" fill="${((i * 7 + r * 3 + k * 5) % 4) === 0 ? "#FFFFFF" : "#DCEEFB"}" opacity=".8"${((i * 5 + r * 2 + k * 3) % 7) === 0 ? ' class="e-v"' : ''}/>`;
    });
    const cols = [0, 1, 2, 3, 4].map(k => `<rect x="${742 + k * 30}" y="150" width="11" height="70" fill="#E4D6B4"/>`).join("");
    const arbol = (x, y, c, r) => `<g transform="translate(${x},${y})"><rect class="ev-arbol" x="-4" y="${r * 1.25}" width="8" height="${r * 1.7}" rx="3" fill="#5C7C8E"/><circle class="ev-arbol" cx="0" cy="${r * .7}" r="${r}" fill="${c}"/><circle class="ev-arbol" cx="${-r * .8}" cy="${r * 1.25}" r="${r * .68}" fill="${c}"/><circle class="ev-arbol" cx="${r * .8}" cy="${r * 1.25}" r="${r * .68}" fill="${c}"/></g>`;
    return `<svg class="e-ciudad" viewBox="0 0 1600 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <polygon points="0,140 190,96 380,130 580,78 790,120 1000,88 1200,126 1410,84 1600,118 1600,240 0,240" fill="#A9CCE9"/>
      <polygon points="0,180 220,140 440,172 700,128 930,166 1180,132 1420,170 1600,146 1600,240 0,240" fill="#93BBE0"/>
      ${v}
      <rect x="726" y="212" width="196" height="9" fill="#EFE4C8"/>${cols}
      <polygon points="722,150 926,150 824,116" fill="#F3E9CF"/><rect x="726" y="150" width="196" height="6" fill="#E4D6B4"/>
      ${arbol(1100, 160, "#E873A9", 24)}${arbol(300, 176, "#E873A9", 20)}${arbol(620, 186, "#6BAA74", 17)}${arbol(1480, 168, "#6BAA74", 19)}
    </svg>`;
  }
  const poste = c => `<svg class="e-prop ${c}" viewBox="0 0 26 120" aria-hidden="true"><rect x="11" y="16" width="4" height="104" rx="2" fill="#7D8DAA"/><path d="M13 18 Q13 6 4 6" stroke="#7D8DAA" stroke-width="3.5" fill="none" stroke-linecap="round"/><rect x="0" y="4" width="10" height="5" rx="2.5" fill="#FFF6D6"/></svg>`;
  /* paradero tipo III (señal vertical tipo banderín) como el del SETP: cabecera amarilla, tablero azul con el bus, módulos de rutas, pie con el logo y poste con placa de mapa */
  const paradero = `<svg class="e-prop e-paradero" viewBox="0 0 68 400" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <rect x="31" y="200" width="6" height="190" fill="#E9EEF6" stroke="#9AA8C0" stroke-width="1"/>
    <path d="M2 18 Q2 0 20 0 L48 0 Q66 0 66 18 Z" fill="#F2C21B"/><text x="34" y="13" text-anchor="middle" font-family="Barlow,sans-serif" font-weight="800" font-size="9" fill="#0B1F5C">PARADERO</text>
    <rect x="2" y="18" width="64" height="98" fill="#14337C"/>
    <rect x="12" y="25" width="44" height="44" rx="2" fill="#F4F4EE"/>
    <g transform="translate(16,38)"><rect x="0" y="0" width="36" height="14" rx="3" fill="none" stroke="#0B1220" stroke-width="2"/><rect x="3" y="3" width="6" height="5" fill="#0B1220"/><rect x="11" y="3" width="6" height="5" fill="#0B1220"/><rect x="19" y="3" width="6" height="5" fill="#0B1220"/><rect x="27" y="3" width="6" height="5" fill="#0B1220"/><circle cx="8" cy="15" r="3" fill="#0B1220"/><circle cx="28" cy="15" r="3" fill="#0B1220"/></g>
    <text x="34" y="88" text-anchor="middle" font-family="Barlow,sans-serif" font-weight="700" font-size="9.5" fill="#fff">Terminal</text><text x="34" y="100" text-anchor="middle" font-family="Barlow,sans-serif" font-weight="700" font-size="9.5" fill="#fff">Jurídica</text>
    ${[0, 1, 2, 3, 4, 5].map(i => `<g transform="translate(2,${118 + i * 11})"><rect width="64" height="11" fill="#F3F3EE"/><rect y="10" width="64" height="1" fill="#CBCBC2"/><text x="5" y="8.2" font-family="Barlow,sans-serif" font-weight="800" font-size="7.5" fill="#0B1F5C">${[1, 2, 3, 6, 8, 10][i]}</text><path d="M16 3 L20 5.5 L16 8 Z" fill="#E1A21B"/><rect x="24" y="3" width="${[30, 36, 26, 33, 22, 38][i]}" height="2" rx="1" fill="#9AA3B2"/><rect x="24" y="6.4" width="${[20, 14, 28, 18, 30, 16][i]}" height="1.6" rx=".8" fill="#C5CAD4"/></g>`).join("")}
    <path d="M2 184 L66 184 L66 192 Q66 202 54 202 L14 202 Q2 202 2 192 Z" fill="#F2C21B"/>
    <rect x="12" y="186" width="44" height="13" rx="3" fill="#fff"/><image href="img/setp-logo-color.png" x="15" y="187.5" width="38" height="10" preserveAspectRatio="xMidYMid meet"/>
    <rect x="13" y="214" width="42" height="34" rx="3" fill="#fff" stroke="#14337C" stroke-width="2"/><path d="M17 238 Q26 224 33 232 T51 220 M20 222 L30 244 M42 218 L38 244" stroke="#8FA6C6" stroke-width="1.2" fill="none"/>
    <rect x="22" y="392" width="24" height="6" rx="2" fill="#9AA8C0"/>
  </svg>`;
  const semaforo = `<div class="e-semaforo"><div class="s-caja"><div class="s-lente"><b class="s-n">--</b></div><div class="s-lente"><svg viewBox="0 0 20 28" aria-hidden="true"><g class="s-rojo"><circle cx="10" cy="4.5" r="3"/><rect x="5.5" y="9" width="9" height="9" rx="2.4"/><rect x="5.8" y="18" width="3.4" height="9" rx="1.3"/><rect x="10.8" y="18" width="3.4" height="9" rx="1.3"/></g><g class="s-verde"><circle cx="11.5" cy="4.5" r="3"/><path d="M7 10 L15 10 L16.5 18 L12.5 18 L11.5 14 L9.5 18 L5.5 18 Z"/><path d="M5.2 18 L9.2 18 L6.8 27 L3.4 27 Z"/><path d="M12.6 18 L16.2 18 L17.8 27 L14.4 27 Z"/></g></svg></div></div><i class="s-poste"></i></div>`;
  g.escena19 = function () {
    return `<div class="escena-viva esc19" id="esc19" data-luz="rojo" aria-hidden="true">
      <div class="e-sol"></div>
      ${nube(0, 6, 11, 150, -40, .95)}${nube(0, 15, 7, 210, -120, .8)}${nube(0, 3, 9, 180, -10, .85)}${nube(0, 20, 12, 240, -190, .7)}${nube(0, 11, 6, 170, -90, .75)}
      ${ave(9, 26, -4, false, "clamp(16px,1.5vw,30px)")}${ave(14, 34, -18, true, "clamp(13px,1.2vw,24px)")}${ave(6, 30, -11, false, "clamp(12px,1.1vw,22px)")}${ave(18, 40, -27, true, "clamp(15px,1.4vw,28px)")}${ave(11, 46, -33, false, "clamp(11px,1vw,20px)")}
      ${avion}
      ${ciudad()}
      <div class="e-avenida"><i class="e-av-linea"></i></div><div class="e-trafico" id="e-trafico"></div>
      <div class="e-acera"></div><div class="e-calle"></div><div class="e-linea"></div>
      ${poste("e-poste")}${poste("e-poste2")}${paradero}${semaforo}
      <svg class="e-cebra" id="e-cebra" aria-hidden="true"></svg><div class="e-podo"></div>
    </div>`;
  };
  /* la llama el director cada vez que mide el escenario */
  g.esc19Layout = function (l) {
    const e = document.getElementById("esc19"); if (!e) return; const s = e.style;
    s.setProperty("--yU", l.yU + "px"); s.setProperty("--yF", l.yL + "px"); s.setProperty("--su", l.SU + "px"); s.setProperty("--pl", (l.side ? l.pr.left : l.sr.width) + "px");
    s.setProperty("--px", (l.paradero ? l.paradero.x : l.pr.left - 160) + "px");
    /* el banderín del paradero nunca se mete debajo del titular LED: si coinciden en horizontal, se achica para que quepa bajo él */
    const led = document.querySelector(".s19-led"), er = e.getBoundingClientRect(), px = l.paradero ? l.paradero.x : l.pr.left - 160; let ph = l.SU * 1.9;
    if (led) { const r = led.getBoundingClientRect(); if (px + l.SU * .17 > r.left - er.left && px - l.SU * .17 < r.right - er.left) ph = Math.max(l.SU * .9, Math.min(ph, l.yU - (r.bottom - er.top) - 10)); }
    s.setProperty("--ph", ph.toFixed(0) + "px");
    const z = l.zebra, cz = document.getElementById("e-cebra");
    e.classList.toggle("sin-cebra", !z); if (!z || !cz) return;
    s.setProperty("--zx", z.x + "px"); s.setProperty("--zw", z.w + "px");
    /* cebra en perspectiva: las franjas se hacen más gruesas y anchas hacia la cámara */
    const W = z.w, H = (l.yL - l.yU) + 24, n = 6; let y = 0, bars = ""; const f = [1, 1.18, 1.38, 1.6, 1.84, 2.1], tot = f.reduce((a, b) => a + b, 0) * 1.9, k = H / tot;
    for (let i = 0; i < n; i++) { const t = f[i] * k, y2 = y + t, i1 = .1 * W * (1 - y / H), i2 = .1 * W * (1 - y2 / H); bars += `<polygon points="${i1.toFixed(1)},${y.toFixed(1)} ${(W - i1).toFixed(1)},${y.toFixed(1)} ${(W - i2).toFixed(1)},${y2.toFixed(1)} ${i2.toFixed(1)},${y2.toFixed(1)}" fill="#F7F9FC" opacity=".95"/>`; y = y2 + f[i] * k * .9; }
    cz.setAttribute("viewBox", `0 0 ${W} ${H}`); cz.setAttribute("width", W); cz.setAttribute("height", H); cz.innerHTML = bars;
  };
})(window);
