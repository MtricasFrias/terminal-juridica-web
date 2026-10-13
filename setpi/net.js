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

  /* ---- hora del servidor: celulares y presentación calculan "en qué pregunta vamos" con la MISMA hora (la del servidor), no con el reloj de cada aparato ---- */
  g.Reloj = (function () {
    let off = 0; const muestras = [];
    return {
      muestra(srv, t0, t1) {
        if (!srv || !(t1 >= t0)) return;
        muestras.push({ o: srv - (t0 + t1) / 2, rtt: t1 - t0 }); if (muestras.length > 12) muestras.shift();
        off = muestras.reduce((m, x) => (x.rtt < m.rtt ? x : m), muestras[0]).o;       // la muestra de menor latencia es la más fiable
      },
      now() { return Date.now() + off; },
      get off() { return off; }
    };
  })();

  /* ---- consulta con tiempo límite: una respuesta que nunca llega ya no deja el sondeo "pegado" para siempre ---- */
  g.llamar = async function (url, fn, args, ms) {
    const t0 = Date.now(), c = new AbortController(), tm = setTimeout(() => c.abort(), ms || 20000); let r;
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn, args }), redirect: 'follow', signal: c.signal });
      r = await resp.json();
    } catch (e) { throw new Error('Sin conexión con el servidor.'); } finally { clearTimeout(tm); }
    if (r && r.srv) g.Reloj.muestra(r.srv, t0, Date.now());
    if (r && r.ok === false) throw new Error(r.error || 'No se pudo conectar con el servidor.');
    return r;
  };

  /* ---- aviso discreto cuando se pierde la señal (y se retoma solo): nunca borra lo que ya se ve ---- */
  const Red = g.Red = { ok: true };
  const bd = document.createElement('div'); bd.className = 'red-badge'; bd.setAttribute('role', 'status'); bd.textContent = 'Reconectando…';
  const bs = document.createElement('style');
  bs.textContent = '.red-badge{position:fixed; left:12px; bottom:12px; z-index:99999; background:rgba(11,31,92,.92); color:#fff; padding:7px 14px; border-radius:999px; font:700 12px Barlow,system-ui,sans-serif; opacity:0; transform:translateY(8px); transition:opacity .25s ease-out, transform .25s ease-out; pointer-events:none;}.red-badge.on{opacity:1; transform:none;}';
  document.head.appendChild(bs);
  function redSet(ok) { if (Red.ok === ok) return; Red.ok = ok; if (!bd.isConnected && document.body) document.body.appendChild(bd); bd.classList.toggle('on', !ok); document.dispatchEvent(new CustomEvent('red', { detail: { ok } })); }

  g.Poller = function (fn, ms, o) {
    o = o || {}; let timer = 0, busy = false, fails = 0, stopped = true;
    const sched = () => { clearTimeout(timer); if (stopped) return; const back = fails ? Math.min(9000, ms * Math.pow(1.7, fails)) : 0; timer = setTimeout(tick, ms + back + Math.random() * ms * .25); };
    async function tick() {
      if (stopped) return;
      if (busy || (document.hidden && !o.hidden)) { sched(); return; }
      busy = true;
      try { await fn(); fails = 0; redSet(true); } catch (e) { fails = Math.min(fails + 1, 6); if (fails >= 2) redSet(false); } finally { busy = false; }
      sched();
    }
    const P = {
      start(now) { if (!stopped) return P; stopped = false; if (now) tick(); else sched(); return P; },
      stop() { stopped = true; clearTimeout(timer); return P; },
      poke() { if (!stopped && !busy) { clearTimeout(timer); tick(); } return P; }
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) P.poke(); });
    window.addEventListener('online', () => P.poke());
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
