/* Red y lista de jugadores — compartido por la presentación (capacitacion.html) y el celular (cuestionario.html).
   - Poller: consulta periódica que NUNCA se solapa (si una respuesta tarda, no se apilan otras), se pausa con la pestaña oculta,
     retrocede si el servidor falla y se desfasa un poco entre clientes para no golpear todos a la vez al servidor.
   - Roster: lista estable de personas. Solo se crea el chip de quien llega (con su entrada animada); los demás NO se vuelven a pintar
     (antes se rehacía todo cada sondeo y todos los chips "parpadeaban"). Quien deja de aparecer se mantiene `grace` ms por si fue un latido
     perdido, y solo entonces se va (con su salida). Así la lista, el contador y las reacciones de SETPI no oscilan.
   - retry: reintenta llamadas importantes (p. ej. enviar una respuesta) en vez de darlas por perdidas al primer fallo de red. */
(function (g) {
  'use strict';
  const css = document.createElement('style');
  css.textContent = '@keyframes rIn{0%{opacity:0; transform:scale(.6) translateY(8px);} 70%{opacity:1; transform:scale(1.06);} 100%{opacity:1; transform:none;}}' +
    '@keyframes rOut{to{opacity:0; transform:scale(.7);}}.r-nuevo{animation:rIn .4s cubic-bezier(.2,.8,.2,1) both;}.r-sale{animation:rOut .26s ease-in both;}';
  document.head.appendChild(css);

  g.Poller = function (fn, ms, o) {
    o = o || {}; let timer = 0, busy = false, fails = 0, stopped = true;
    const sched = () => { clearTimeout(timer); if (stopped) return; const back = fails ? Math.min(9000, ms * Math.pow(1.7, fails)) : 0; timer = setTimeout(tick, ms + back + Math.random() * ms * .25); };
    async function tick() {
      if (stopped) return;
      if (busy || (document.hidden && !o.hidden)) { sched(); return; }
      busy = true;
      try { await fn(); fails = 0; } catch (e) { fails = Math.min(fails + 1, 6); } finally { busy = false; }
      sched();
    }
    const P = {
      start(now) { if (!stopped) return P; stopped = false; if (now) tick(); else sched(); return P; },
      stop() { stopped = true; clearTimeout(timer); return P; },
      poke() { if (!stopped && !busy) { clearTimeout(timer); tick(); } return P; }
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) P.poke(); });
    return P;
  };

  /* box: contenedor; make(j) -> elemento del chip; key(j) -> id estable; sig(j) -> firma para detectar un cambio real (p. ej. avatar) */
  g.Roster = function (box, o) {
    const map = new Map(), grace = o.grace == null ? 14000 : o.grace, key = o.key, sig = o.sig || (j => ''), first = { v: true };
    return {
      update(list) {
        const now = Date.now(), seen = new Set(); let i = 0;
        list.forEach(j => {
          const k = key(j); seen.add(k); let e = map.get(k);
          if (!e) {
            const el = o.make(j); el.classList.add('r-nuevo'); if (first.v) el.style.animationDelay = Math.min(i * 40, 600) + 'ms';
            box.appendChild(el); e = { el, j, seen: now, sig: sig(j) }; map.set(k, e);
            setTimeout(() => { el.classList.remove('r-nuevo'); el.style.animationDelay = ''; }, 1300);   // la entrada ya se vio: el chip queda quieto
          } else {
            e.seen = now; e.j = j;
            if (e.leaving) { e.leaving = false; e.el.classList.remove('r-sale'); }
            const s = sig(j); if (s !== e.sig) { const el = o.make(j); box.replaceChild(el, e.el); e.el = el; e.sig = s; }
          }
          i++;
        });
        first.v = false;
        map.forEach((e, k) => {
          if (seen.has(k) || now - e.seen <= grace) return;
          map.delete(k); e.el.classList.add('r-sale'); setTimeout(() => { if (e.el.parentNode) e.el.remove(); }, 280);
        });
        return Array.from(map.values()).map(e => e.j);
      },
      clear() { map.clear(); box.innerHTML = ''; first.v = true; },
      get size() { return map.size; }
    };
  };

  /* reintenta fn() (promesa) hasta `tries` veces con espera creciente; `stop()` (opcional) corta los reintentos */
  g.retry = async function (fn, tries, base, stop) {
    let err;
    for (let i = 0; i < (tries || 3); i++) {
      try { return await fn(); } catch (e) { err = e; }
      if (stop && stop()) break;
      await new Promise(r => setTimeout(r, (base || 500) * Math.pow(1.8, i)));
    }
    throw err;
  };
})(window);
