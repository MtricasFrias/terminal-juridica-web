/* SETPI — efectos temporales DOM (Z, alerta, confeti, "me gusta", polvo). Nunca son parte del personaje. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  function mk(a, cls, x, y, life, html) {
    if (a.fxN > 28) return null; const e = document.createElement('div'); e.className = 'sp-fx ' + cls;
    e.style.left = x + 'px'; e.style.top = y + 'px'; if (html) e.innerHTML = html; a.layerFx.appendChild(e); a.fxN++;
    setTimeout(() => { e.remove(); a.fxN--; }, life); return e;
  }
  /* globo de texto de SETPI (sin emojis): sobre su cabeza, dentro de los límites libres que da el director */
  S.sayClear = function (a) { if (a.sayEl) { const e = a.sayEl; a.sayEl = null; e.classList.add('out'); setTimeout(() => e.remove(), 260); } };
  S.say = function (a, text, o) {
    o = o || {}; S.sayClear(a);
    const e = document.createElement('div'); e.className = 'sp-say'; e.textContent = text; a.layerFx.appendChild(e); a.sayEl = e;
    let fs = Math.round(a.S * (o.size || .115)); e.style.fontSize = fs + 'px'; e.style.maxWidth = Math.round(Math.min(o.maxW || a.S * 2.7, (o.maxX - o.minX) || 9999)) + 'px';
    const h = a.headPos(), gap = Math.round(a.S * .07);
    for (let i = 0; i < 7; i++) { e.style.fontSize = fs + 'px'; if (e.offsetHeight + gap + h.r * .9 <= (h.y - h.r - (o.minY == null ? 0 : o.minY))) break; fs = Math.round(fs * .88); }
    const w = e.offsetWidth, x = Math.max((o.minX || 0) + w / 2, Math.min(h.x, (o.maxX == null ? 1e9 : o.maxX) - w / 2));
    e.style.left = x.toFixed(1) + 'px'; e.style.top = (h.y - h.r * 1.12 - gap).toFixed(1) + 'px'; e.style.setProperty('--tx', (h.x - x).toFixed(1) + 'px');
    return e;
  };
  S.fx = function (a, kind, o) {
    o = o || {}; const h = a.headPos(), s = a.S;
    if (kind === 'zzz') {
      [0, 1, 2].forEach(i => { const e = mk(a, 'z', h.x + a.facing * (h.r * 1.05 + i * 9), h.y - h.r * .35 - i * 11, 2900, 'Z'); if (e) { e.style.animationDelay = (i * .6) + 's'; e.style.fontSize = Math.round(s * (.11 + i * .04)) + 'px'; } });
    } else if (kind === 'alert') {
      const w = Math.round(s * .34); mk(a, 'alert', h.x, h.y - h.r * 1.28, 950, '<svg viewBox="0 0 60 44" width="' + w + '"><g stroke="#FFC21A" stroke-width="6" stroke-linecap="round" fill="none"><path d="M9 36 L20 21"/><path d="M30 28 L30 6"/><path d="M51 36 L40 21"/></g></svg>');
    } else if (kind === 'spark') {
      const n = o.n || 12, cols = ['#F0A800', '#159BD6', '#00A830', '#D62828', '#ffffff'];
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2, r = s * (.35 + Math.random() * .45);
        const e = mk(a, 'spark', h.x + (Math.random() - .5) * h.r, h.y + h.r * .3, 1300); if (!e) continue;
        const sz = Math.round(s * (.028 + Math.random() * .03)); e.style.width = e.style.height = sz + 'px'; e.style.background = cols[i % cols.length];
        e.style.setProperty('--dx', Math.round(Math.cos(ang) * r) + 'px'); e.style.setProperty('--dy', Math.round(Math.sin(ang) * r - s * .25) + 'px'); e.style.animationDelay = (Math.random() * .12) + 's';
      }
    } else if (kind === 'like') {
      const w = Math.round(s * (o.size || .5)); const e = mk(a, 'like', h.x + a.facing * h.r * 1.5, h.y - h.r * .6, 1600, '<img src="' + (S.base || 'setpi/') + 'f/like_glove.webp" style="width:100%;display:block" alt="">');
      if (e) e.style.setProperty('--w', w + 'px');
    } else if (kind === 'question') {
      const w = Math.round(s * .3); const e = mk(a, 'q', h.x + a.facing * h.r * 1.05, h.y - h.r * 1.5, 2800, '<span>?</span>'); if (e) { e.style.setProperty('--w', w + 'px'); e.style.fontSize = Math.round(w * .78) + 'px'; }
    } else if (kind === 'dust') {
      const n = o.n || 3;
      for (let i = 0; i < n; i++) {
        const dir = (i % 2 ? 1 : -1) * (o.dir || 1), e = mk(a, 'dust', a.x - dir * s * (.12 + i * .05), a.y - s * .03, 750); if (!e) continue;
        const sz = Math.round(s * (.13 + Math.random() * .06)); e.style.width = e.style.height = sz + 'px'; e.style.setProperty('--dx', Math.round(-dir * s * (.08 + Math.random() * .08)) + 'px');
      }
    }
  };
})(window);
