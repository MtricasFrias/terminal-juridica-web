/* SETPI — el bus de la parada (primer plano). Vectorial, mismo estilo plano de los buses del fondo (azul + franja rosa),
   mira a la izquierda y tiene la puerta delantera a la altura de SETPI. Dos capas:
     - atrás  (z=0, detrás del contenido de la diapositiva): carrocería, interior oscuro de la puerta, ruedas.
     - delante (z=2, encima de SETPI): marco de la puerta, barandas amarillas y borde del escalón,
       para que SETPI suba "dentro" de la puerta sin tapar nunca el texto ni el QR.
   Unidades del dibujo: 100 = alto de SETPI de pie. El tamaño real lo da k = S/100. Solo se ve durante el viaje. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const NS = 'http://www.w3.org/2000/svg';
  const VB = { x: -12, y: 0, w: 356, h: 172 };         // el suelo está en y=156
  const BODY = '#2A62B8', BODY2 = '#1F4E97', PINK = '#D6488E', GLASS = '#86B6E6', DARK = '#0D1623';
  const wheel = cx => '<circle cx="' + cx + '" cy="142" r="15" fill="#141E2C"/><circle cx="' + cx + '" cy="142" r="6.4" fill="#96A0AF"/><circle cx="' + cx + '" cy="142" r="2.4" fill="#141E2C"/>';
  const BACK =
    '<ellipse cx="170" cy="157" rx="176" ry="6" fill="rgba(3,10,32,.45)"/>' +
    '<rect x="0" y="2" width="332" height="142" rx="16" fill="' + BODY + '"/>' +
    '<rect x="0" y="2" width="332" height="28" rx="16" fill="' + BODY2 + '" opacity=".55"/>' +
    '<rect x="116" y="96" width="216" height="9" fill="' + PINK + '"/>' +
    '<rect x="0" y="136" width="332" height="10" rx="4" fill="#233447"/>' +
    '<rect x="6" y="16" width="28" height="58" rx="5" fill="' + GLASS + '"/><rect x="6" y="16" width="28" height="58" rx="5" fill="none" stroke="' + BODY2 + '" stroke-width="2"/>' +
    '<rect x="42" y="6" width="196" height="14" rx="3" fill="#0b1220"/><text x="140" y="17" text-anchor="middle" font-family="Barlow,Arial,sans-serif" font-weight="800" font-size="11" letter-spacing="1" fill="#FFC21A">SETP · TRANS MUSICAL</text>' +
    '<rect x="40" y="24" width="66" height="120" rx="6" fill="' + DARK + '"/>' +
    '<rect x="40" y="24" width="66" height="120" rx="6" fill="url(#spbi)"/>' +
    '<rect x="40" y="130" width="66" height="14" fill="#2c3a4d"/>' +
    '<rect x="47" y="30" width="4.5" height="114" rx="2" fill="#F2B01E"/><rect x="95" y="30" width="4.5" height="114" rx="2" fill="#F2B01E"/><rect x="40" y="142" width="66" height="4" fill="#F2B01E"/>' +
    '<rect x="116" y="28" width="56" height="64" rx="6" fill="' + GLASS + '"/>' +                     /* ventanilla grande tras la puerta (SETPI se asoma aquí) */
    [0, 1, 2, 3].map(i => '<rect x="' + (180 + i * 38) + '" y="28" width="32" height="64" rx="5" fill="' + GLASS + '"/>').join('') +
    wheel(142) + wheel(262) +
    '<path d="M121 140 a21 21 0 0 1 42 0 Z" fill="' + BODY2 + '" opacity=".0"/>' +
    '<rect x="-2" y="108" width="8" height="14" rx="3" fill="#FFE282"/>' +
    '<rect x="-9" y="44" width="9" height="16" rx="3" fill="#233447"/>';
  const FRONT =
    '<rect x="34" y="20" width="78" height="8" rx="3" fill="' + BODY2 + '"/>' +
    '<rect x="34" y="24" width="8" height="122" rx="3" fill="' + BODY + '"/><rect x="104" y="24" width="8" height="122" rx="3" fill="' + BODY + '"/>' +
    '<rect x="47" y="30" width="4.5" height="114" rx="2" fill="#F2B01E"/><rect x="95" y="30" width="4.5" height="114" rx="2" fill="#F2B01E"/>' +
    '<rect x="40" y="142" width="66" height="4" fill="#F2B01E"/>';
  const DEFS = '<defs><linearGradient id="spbi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1623"/><stop offset="1" stop-color="#26364b"/></linearGradient></defs>';

  function mkSvg(inner, cls) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', cls); s.setAttribute('viewBox', VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h);
    s.setAttribute('aria-hidden', 'true'); s.innerHTML = DEFS + inner; return s;
  }
  S.Bus = function (slide, stage, actor) {
    const back = document.createElement('div'); back.className = 'sp-busback'; back.appendChild(mkSvg(BACK, 'sp-bus'));
    const front = document.createElement('div'); front.className = 'sp-busfront'; front.appendChild(mkSvg(FRONT, 'sp-bus'));
    const road = slide.querySelector('.escena-viva'); slide.insertBefore(back, road ? road.nextSibling : stage);
    stage.insertBefore(front, actor.layerFx);
    const B = { x: 0, y: 0, k: 1, on: false, dy: 0, front: true, clipX: Infinity };
    B.apply = () => {
      [back, front].forEach(e => {
        const sv = e.firstChild, w = VB.w * B.k, h = VB.h * B.k, left = B.x + VB.x * B.k;
        sv.style.width = w + 'px'; sv.style.height = h + 'px';
        e.style.transform = 'translate3d(' + left.toFixed(1) + 'px,' + (B.y - 156 * B.k + B.dy).toFixed(1) + 'px,0)';
        sv.style.clipPath = B.clipX < left + w ? 'inset(0 ' + Math.max(0, left + w - B.clipX).toFixed(1) + 'px 0 0)' : 'none';   // el panel de la sala va por delante: el bus no se transparenta
      });
      back.style.visibility = B.on ? 'visible' : 'hidden'; front.style.visibility = B.on && B.front ? 'visible' : 'hidden';
    };
    /* x = posición de la trompa (borde izquierdo del bus), y = suelo, k = px por unidad (S/100) */
    B.place = (x, y, k) => { B.x = x; B.y = y; if (k) B.k = k; B.apply(); };
    B.show = (v, withFront) => { B.on = v; B.front = withFront !== false; B.apply(); };
    B.door = () => ({ x0: B.x + 40 * B.k, x1: B.x + 106 * B.k, floor: B.y - 12 * B.k });   // hueco de la puerta
    return B;
  };
})(window);
