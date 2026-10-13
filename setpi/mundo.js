/* SETPI — el mundo de la calle (diapositiva 19): semáforo peatonal con cuenta regresiva y tráfico de la avenida lejana.
   Los vehículos pasan DETRÁS de SETPI (lejos, más pequeños). Con el semáforo peatonal en rojo los carros avanzan y SETPI se queda en la acera;
   con el verde los carros se detienen antes de la cebra y SETPI puede cruzar y hacer cosas sobre ella. Durante el juego la calle queda despejada. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const wheels = (x1, x2, y, r) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="#141E2C"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#141E2C"/><circle cx="${x1}" cy="${y}" r="${r * .4}" fill="#96A0AF"/><circle cx="${x2}" cy="${y}" r="${r * .4}" fill="#96A0AF"/>`;
  const SPR = {
    bus: c => ({ r: 62 / 28, svg: `<svg viewBox="0 0 62 28" aria-hidden="true"><rect x="1" y="2" width="60" height="22" rx="5" fill="${c}"/><rect x="1" y="14.5" width="60" height="3" fill="#D6488E"/>${[5, 14, 23, 32, 41].map(x => `<rect x="${x}" y="6" width="7.5" height="7" rx="1.5" fill="#CDE5F7"/>`).join("")}<rect x="50" y="5.5" width="8.5" height="9" rx="1.5" fill="#AACDEC"/><circle cx="60.5" cy="19.5" r="1.6" fill="#FFE282"/>${wheels(12, 49, 24.4, 3.4)}</svg>` }),
    auto: c => ({ r: 2, svg: `<svg viewBox="0 0 44 22" aria-hidden="true"><path d="M2 16 Q2 12 6 11 L12 5 Q13.5 3.5 16 3.5 L29 3.5 Q31.5 3.5 33 5 L38 11 Q42 12 42 16 L42 18 L2 18Z" fill="${c}"/><path d="M14.5 5.6 L22 5.2 L22 11 L10.8 11 Z" fill="#CDE5F7"/><path d="M24 5.2 L29 5.4 L34 11 L24 11 Z" fill="#CDE5F7"/>${wheels(11, 33, 18.2, 3.6)}</svg>` }),
    taxi: () => ({ r: 2, svg: `<svg viewBox="0 0 44 22" aria-hidden="true"><path d="M2 16 Q2 12 6 11 L12 5 Q13.5 3.5 16 3.5 L29 3.5 Q31.5 3.5 33 5 L38 11 Q42 12 42 16 L42 18 L2 18Z" fill="#F2B01E"/><rect x="18" y="1" width="8" height="3" rx="1" fill="#0B1220"/><path d="M14.5 5.6 L22 5.2 L22 11 L10.8 11 Z" fill="#CDE5F7"/><path d="M24 5.2 L29 5.4 L34 11 L24 11 Z" fill="#CDE5F7"/><rect x="2" y="13.6" width="40" height="1.4" fill="#0B1220" opacity=".55"/>${wheels(11, 33, 18.2, 3.6)}</svg>` })
  };
  S.Mundo = function (D) {
    const root = document.getElementById("esc19"), box = document.getElementById("e-trafico"); if (!root || !box) return null;
    const num = root.querySelector(".s-n");
    const M = { luz: "rojo", rest: 8, hold: false, veh: [], l: null, spawnT: [1.2, 2.4], lastN: "", on: true };
    const DUR = { rojo: 16, verde: 12, parpadeo: 3.6 };
    D.luz = "rojo"; D.luzRest = M.rest;
    const lane = i => M.l && (i === 0 ? { dir: 1, y: M.l.yU - 50 } : { dir: -1, y: M.l.yU - 29 });
    function mk(tipo, i, x) {
      const sp = tipo === "bus" ? SPR.bus(pick(["#3D85C6", "#D6488E", "#2A62B8"])) : tipo === "taxi" ? SPR.taxi() : SPR.auto(pick(["#EEF2F7", "#C9302C", "#2F6F9F", "#56637A", "#F6F8FB"]));
      const el = document.createElement("div"); el.className = "e-veh"; el.innerHTML = sp.svg; box.appendChild(el);
      const v = { el, tipo, lane: i, r: sp.r, x, vx: 0, sc: tipo === "bus" ? .46 : .26, vel: (i === 0 ? .8 : 1) * rnd(.85, 1.15), seen: -99, was: false };
      M.veh.push(v); size(v); return v;
    }
    function size(v) { const h = M.l.SU * v.sc; v.h = h; v.w = h * v.r; v.el.style.width = v.w + "px"; }
    function put(v) {
      const L = lane(v.lane), top = L.y - v.h;
      v.el.style.transform = L.dir > 0 ? `translate3d(${v.x.toFixed(1)}px,${top.toFixed(1)}px,0)` : `translate3d(${(v.x + v.w).toFixed(1)}px,${top.toFixed(1)}px,0) scaleX(-1)`;
    }
    function zona() { const l = M.l, z = l.zebra; if (!z) return null; return { a: z.x - z.w / 2 - 34, b: z.x + z.w / 2 + 34 }; }
    function spawn() {
      const i = Math.random() < .5 ? 0 : 1, L = lane(i), W = M.l.sr.width, same = M.veh.filter(v => v.lane === i);
      const tipo = Math.random() < .3 ? "bus" : Math.random() < .3 ? "taxi" : "auto";
      const probe = M.l.SU * (tipo === "bus" ? .46 * 62 / 28 : .52);
      const x = L.dir > 0 ? -probe - 30 : W + 30;
      if (same.some(v => L.dir > 0 ? v.x < probe + 70 : v.x + v.w > W - probe - 70)) return false;
      mk(tipo, i, x); return true;
    }
    M.layout = function (l) {
      const first = !M.l; M.l = l; M.veh.forEach(size);
      if (first) for (let k = 0; k < 7; k++) { const i = k % 2, tipo = Math.random() < .3 ? "bus" : Math.random() < .3 ? "taxi" : "auto"; const v = mk(tipo, i, rnd(.05, .95) * l.sr.width); if (M.veh.some(o => o !== v && o.lane === i && Math.abs(o.x - v.x) < (o.w + v.w) * .8 + 40)) { v.el.remove(); M.veh.pop(); } }
      M.veh.forEach(put);
    };
    M.buses = () => M.veh.filter(v => v.tipo === "bus").map(v => { const l = M.l; v.cx = v.x + v.w / 2; v.dir = lane(v.lane).dir; v.vis = v.cx > 30 && v.cx < (l.side ? l.pr.left - 20 : l.sr.width - 20); return v; });
    M.fase = ph => { const h = ph === "quiz" || ph === "podium"; if (h === M.hold) return; M.hold = h; if (h) { M.luz = "verde"; D.luz = "verde"; root.dataset.luz = "verde"; num.textContent = "--"; } else { M.luz = "rojo"; M.rest = 7; } };
    M.step = function (dt) {
      if (!M.l) return;
      /* semáforo peatonal */
      if (!M.hold) {
        M.rest -= dt;
        if (M.rest <= 0) { M.luz = M.luz === "rojo" ? "verde" : M.luz === "verde" ? "parpadeo" : "rojo"; M.rest = DUR[M.luz] * rnd(.92, 1.08); }
        if (root.dataset.luz !== M.luz) root.dataset.luz = M.luz;
        const n = Math.max(0, Math.ceil(M.rest)) + ""; if (n !== M.lastN) { M.lastN = n; num.textContent = n; }
      }
      D.luz = M.luz; D.luzRest = M.hold ? 99 : M.rest;
      /* tráfico */
      const stop = !M.hold && (M.luz === "verde" || M.luz === "parpadeo"), Z = zona(), W = M.l.sr.width;
      for (let i = 0; i < 2; i++) {
        const L = lane(i), d = L.dir, arr = M.veh.filter(v => v.lane === i).sort((p, q) => d > 0 ? q.x - p.x : p.x - q.x);
        arr.forEach((v, k) => {
          let vt = (W * .115) * v.vel;
          const lead = arr[k - 1];
          if (lead) { const gap = d > 0 ? lead.x - (v.x + v.w) : v.x - (lead.x + lead.w); if (gap < 14) vt = 0; else if (gap < 120) vt = Math.min(vt, lead.vx + (gap - 14) * 1.4); }
          if (stop && Z) { const front = d > 0 ? v.x + v.w : v.x, dist = d > 0 ? Z.a - front : front - Z.b; if (dist >= -2 && dist < 140) vt = Math.min(vt, dist <= 4 ? 0 : dist * 1.6); }
          v.vx += Math.max(-dt * 260, Math.min(dt * 130, vt - v.vx)); v.x += d * v.vx * dt;
        });
      }
      M.veh = M.veh.filter(v => { const d = lane(v.lane).dir, out = d > 0 ? v.x > W + 40 : v.x + v.w < -40; if (out) v.el.remove(); return !out; });
      M.veh.forEach(put);
      M.spawnT[0] -= dt; if (!M.hold && M.spawnT[0] <= 0) { if (spawn()) M.spawnT[0] = rnd(1.4, 4.2); else M.spawnT[0] = .6; }
    };
    return M;
  };
})(window);
