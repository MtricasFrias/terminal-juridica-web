/* Iconos vectoriales planos (estilo caricatura: contorno azul marino grueso + colores planos). Reemplazan a TODOS los emojis de las páginas.
   Uso: Ico("trofeo") -> <svg class="ico">…</svg>, del tamaño del texto (1.15em). Ico("trofeo", {s: 28}) para px fijos. */
(function (g) {
  'use strict';
  const N = '#0B1F5C', GO = '#F6B91D', GD = '#C98A00', BL = '#2A62B8', LB = '#CDE5F7', GR = '#1FA35C', RD = '#D6432C', PK = '#D6488E', WH = '#fff', GY = '#9AA6B8';
  const st = (w) => ' stroke="' + N + '" stroke-width="' + (w || 3) + '" stroke-linejoin="round" stroke-linecap="round"';
  const I = {
    trofeo: '<path d="M14 6h20v12a10 10 0 0 1-20 0z" fill="' + GO + '"' + st() + '/><path d="M14 10H8c-1.5 0-2 1-2 2 0 6 4 10 9 10.5M34 10h6c1.5 0 2 1 2 2 0 6-4 10-9 10.5" fill="none"' + st() + '/><rect x="21" y="28" width="6" height="8" fill="' + GD + '"' + st(2.5) + '/><rect x="14" y="36" width="20" height="7" rx="3" fill="' + BL + '"' + st(2.5) + '/><path d="M19 11v8" stroke="' + WH + '" stroke-width="3" stroke-linecap="round" opacity=".8"/>',
    regalo: '<rect x="7" y="20" width="34" height="21" rx="3" fill="' + PK + '"' + st() + '/><rect x="5" y="14" width="38" height="9" rx="3" fill="#E96AA8"' + st() + '/><rect x="21.5" y="14" width="5" height="27" fill="' + GO + '"' + st(2) + '/><path d="M24 14c-4-9-12-8-10-3 1.500 4 8 3 10 3zM24 14c4-9 12-8 10-3-1.500 4-8 3-10 3z" fill="' + GO + '"' + st(2.5) + '/>',
    libro: '<path d="M24 11c-5-4-12-4-18-2v28c6-2 13-2 18 2 5-4 12-4 18-2V9c-6-2-13-2-18 2z" fill="' + WH + '"' + st() + '/><path d="M24 11v28" fill="none"' + st() + '/><path d="M10 17c4-1 8-1 11 1M10 24c4-1 8-1 11 1M27 18c3-2 7-2 11-1M27 25c3-2 7-2 11-1" fill="none" stroke="' + BL + '" stroke-width="2.5" stroke-linecap="round"/>',
    equipo: '<circle cx="16" cy="15" r="6.500" fill="' + GO + '"' + st() + '/><circle cx="33" cy="17" r="5.500" fill="' + LB + '"' + st() + '/><path d="M4 40c0-8 5-13 12-13s12 5 12 13z" fill="' + BL + '"' + st() + '/><path d="M28 40c0-6 3-10 8-10s9 4 9 10z" fill="' + PK + '"' + st() + '/>',
    brujula: '<circle cx="24" cy="24" r="18" fill="' + WH + '"' + st() + '/><circle cx="24" cy="24" r="13" fill="' + LB + '" stroke="' + BL + '" stroke-width="2"/><path d="M24 11l5 13-5 13-5-13z" fill="' + RD + '"' + st(2) + '/><path d="M24 24l5 0-5 13-5-13z" fill="' + WH + '"' + st(2) + '/><circle cx="24" cy="24" r="2.500" fill="' + N + '"/>',
    idea: '<path d="M24 5c-8 0-13 6-13 12 0 5 3 8 5 11 1 1.500 1.500 3 1.500 5h13c0-2 .5-3.500 1.500-5 2-3 5-6 5-11 0-6-5-12-13-12z" fill="' + GO + '"' + st() + '/><rect x="18" y="36" width="12" height="4" rx="2" fill="' + GY + '"' + st(2.500) + '/><rect x="20" y="41" width="8" height="3" rx="1.500" fill="' + N + '"/><path d="M18 14c2-3 4-3.500 6-3.500" fill="none" stroke="' + WH + '" stroke-width="3" stroke-linecap="round" opacity=".85"/>',
    alerta: '<path d="M24 5L44 41H4z" fill="' + GO + '"' + st() + '/><path d="M24 17v13" fill="none"' + st(4) + '/><circle cx="24" cy="35.500" r="2.500" fill="' + N + '"/>',
    balanza: '<path d="M24 8v32M13 40h22" fill="none"' + st() + '/><path d="M8 14h32" fill="none"' + st() + '/><circle cx="24" cy="8" r="3.500" fill="' + GO + '"' + st(2.500) + '/><path d="M8 14l-5 14h10zM40 14l-5 14h10z" fill="' + LB + '"' + st(2.500) + '/><path d="M3 28a5 5 0 0 0 10 0zM35 28a5 5 0 0 0 10 0z" fill="' + BL + '"' + st(2.500) + '/>',
    carta: '<rect x="5" y="10" width="38" height="28" rx="4" fill="' + WH + '"' + st() + '/><path d="M6 13l18 14 18-14" fill="none"' + st() + '/><circle cx="37" cy="14" r="5" fill="' + RD + '"' + st(2.500) + '/>',
    mesa: '<rect x="9" y="8" width="30" height="35" rx="4" fill="' + WH + '"' + st() + '/><rect x="16" y="4" width="16" height="9" rx="3" fill="' + GO + '"' + st(2.500) + '/><path d="M15 21h18M15 28h18M15 35h11" fill="none" stroke="' + BL + '" stroke-width="3" stroke-linecap="round"/>',
    carpetas: '<path d="M5 12h13l4 5h21v23H5z" fill="' + GD + '"' + st() + '/><path d="M5 20h38v20H5z" fill="' + GO + '"' + st() + '/><path d="M12 28h24" fill="none" stroke="' + WH + '" stroke-width="3" stroke-linecap="round" opacity=".8"/>',
    listo: '<circle cx="24" cy="24" r="19" fill="' + GR + '"' + st() + '/><path d="M14 25l8 8 13-16" fill="none" stroke="' + WH + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    equis: '<circle cx="24" cy="24" r="19" fill="' + RD + '"' + st() + '/><path d="M16 16l16 16M32 16L16 32" fill="none" stroke="' + WH + '" stroke-width="5" stroke-linecap="round"/>',
    chincheta: '<path d="M24 44S10 30 10 19a14 14 0 0 1 28 0c0 11-14 25-14 25z" fill="' + RD + '"' + st() + '/><circle cx="24" cy="19" r="5.500" fill="' + WH + '"' + st(2.500) + '/>',
    candado: '<path d="M14 21v-6a10 10 0 0 1 20 0v6" fill="none"' + st(4) + '/><rect x="9" y="21" width="30" height="21" rx="5" fill="' + GO + '"' + st() + '/><circle cx="24" cy="30" r="3.500" fill="' + N + '"/><path d="M24 32v5" fill="none"' + st(3) + '/>',
    llave: '<circle cx="15" cy="17" r="9" fill="' + GO + '"' + st() + '/><circle cx="15" cy="17" r="3.500" fill="' + N + '"/><path d="M22 24l18 18M33 35l5-5M38 40l4-4" fill="none"' + st(4.500) + '/>',
    reloj: '<circle cx="24" cy="26" r="17" fill="' + WH + '"' + st() + '/><rect x="19" y="3" width="10" height="5" rx="2" fill="' + N + '"/><path d="M24 15v11l7 5" fill="none"' + st(3.500) + '/><path d="M38 12l4 4" fill="none"' + st(3.500) + '/>',
    pantalla: '<path d="M5 17V6h11M32 6h11v11M43 31v11H32M16 42H5V31" fill="none" stroke="currentColor" stroke-width="4.500" stroke-linecap="round" stroke-linejoin="round"/>',
    play: '<path d="M13 8l26 16-26 16z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>',
    flecha: '<path d="M14 34L34 14M18 14h16v16" fill="none" stroke="currentColor" stroke-width="4.500" stroke-linecap="round" stroke-linejoin="round"/>',
    jugadores: '<circle cx="17" cy="16" r="7" fill="' + GO + '"' + st() + '/><circle cx="34" cy="19" r="6" fill="' + LB + '"' + st() + '/><path d="M4 42c0-9 5-14 13-14s13 5 13 14z" fill="' + BL + '"' + st() + '/><path d="M29 42c0-6 3-11 9-11s8 5 8 11z" fill="' + PK + '"' + st() + '/>',
    bus: '<rect x="4" y="9" width="40" height="27" rx="6" fill="' + BL + '"' + st() + '/><rect x="9" y="14" width="9" height="9" rx="2" fill="' + LB + '"/><rect x="21" y="14" width="9" height="9" rx="2" fill="' + LB + '"/><rect x="33" y="14" width="7" height="9" rx="2" fill="' + LB + '"/><rect x="4" y="27" width="40" height="4" fill="' + PK + '"/><circle cx="14" cy="38" r="5" fill="' + N + '"/><circle cx="34" cy="38" r="5" fill="' + N + '"/>'
  };
  g.Ico = function (name, o) {
    const s = o && o.s ? o.s + 'px' : '1.15em';
    return '<svg class="ico" viewBox="0 0 48 48" width="' + (o && o.s ? o.s : '') + '" height="' + (o && o.s ? o.s : '') + '" style="width:' + s + ';height:' + s + '" aria-hidden="true" focusable="false">' + (I[name] || '') + '</svg>';
  };
  const css = document.createElement('style'); css.textContent = '.ico{display:inline-block; vertical-align:-.22em; flex:none; overflow:visible;}'; document.head.appendChild(css);
})(window);
