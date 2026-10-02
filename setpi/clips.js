/* SETPI — biblioteca de clips. Cada clip es una lista de dibujos reales con su tiempo (s).
   Cada animación tiene ENTRADA, MANTENER/BUCLE y SALIDA, y siempre empieza/termina en una pose neutra
   (idle_a de frente o turn_34 de 3/4) para que ningún cambio de acción salte.
   Props por frame: f (dibujo), t (segundos), fade (fundido corto con el frame anterior), dx/dy (fracción del alto S),
   rot (grados), sx/sy (escala), a (alfa). */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const T = (f, t, o) => Object.assign({ f: f, t: t }, o);
  const rep = (arr, n) => { let r = []; for (let i = 0; i < n; i++) r = r.concat(arr); return r; };

  const C = S.C = {
    /* ---- giros de vista (neutro <-> neutro) ---- */
    turnFR: () => [T('turn_f', .07, { fade: .05 }), T('turn_34', .1)],                 // de frente -> 3/4
    turnRF: () => [T('turn_34', .06), T('turn_f', .09), T('idle_a', .05, { fade: .05 })],  // 3/4 -> de frente

    /* ---- saludar ---- */
    /* un SOLO saludo, con una sola mano, lento: sube, se mantiene con un balanceo suave y baja. (side -1 = mano izquierda, 1 = derecha;
       los saludos se reparten en el tiempo y alternan de lado entre uno y otro, nunca dentro del mismo) */
    waveF: (side, hold) => { const f = side < 0 ? 'wave_f2' : 'wave_f3'; return [T('wave_f1', .26, { fade: .1 }), T(f, .24, { fade: .1 }), T(f, hold || 1.8, { sway: { a: 1.4, p: 1.3 } }), T('wave_f4', .24, { fade: .1 }), T('idle_a', .08, { fade: .1 })]; },
    /* saludo de 3/4: la misma mano mueve la muñeca despacio (dos dibujos reales, ~.4 s cada uno) */
    waveR: n => [T('wave34_1', .24, { fade: .08 })].concat(rep([T('wave34_2', .4), T('wave34_3', .4)], n || 2), [T('wave34_2', .3), T('wave34_1', .22), T('turn_34', .08, { fade: .08 })]),

    /* ---- dar me gusta ---- */
    likeF: () => [T('like_f1', .11, { fade: .06 }), T('like_f2', .12), T('like_f3', .5), T('like_f2', .16), T('like_f4', .14), T('idle_a', .06, { fade: .06 })],

    /* ---- señalar (3/4) ---- */
    pointR: k => [T('point_1', .12, { fade: .05 }), T('point_2', .13)].concat(rep([T('point_3', .2), T('point_2', .2)], k || 1), [T('point_1', .12), T('turn_34', .06, { fade: .05 })]),
    lookUser: () => [T('lookuser_1', .16, { fade: .06 }), T('lookuser_2', .5), T('lookuser_1', .2), T('idle_a', .06, { fade: .06 })],

    /* ---- reacciones de frente ---- */
    surprised: () => [T('surp_1', .14, { fade: .05 }), T('surp_2', .46), T('surp_1', .2), T('idle_a', .06, { fade: .06 })],
    shake: n => [T('no_2', .11, { fade: .05 })].concat(rep([T('no_1', .13), T('no_3', .13)], n || 2), [T('no_2', .18), T('idle_a', .06, { fade: .06 })]),
    clap: n => [T('clap_1', .1, { fade: .05 })].concat(rep([T('clap_2', .1), T('clap_3', .11)], n || 3), [T('clap_2', .1), T('clap_1', .12), T('idle_a', .06, { fade: .06 })]),
    around: () => [T('around_2', .18, { fade: .06 }), T('around_1', .7), T('around_2', .16), T('around_3', .7), T('around_2', .24), T('idle_a', .06, { fade: .06 })],

    /* ---- dormir (de pie -> sentarse -> bostezo -> cabeceo -> dormido) y despertar ---- */
    sit: () => [T('sit_1', .2, { fade: .06 }), T('sit_2', .26, { fade: .05 })],
    yawn: () => [T('yawn_1', .34, { fade: .05 }), T('yawn_2', .3), T('yawn_3', .8), T('yawn_2', .28), T('yawn_1', .3)],
    nod: () => [T('nod_1', .55, { fade: .05 }), T('nod_2', .5), T('nod_3', .9), T('nod_2', .3), T('nod_3', 1.0)],
    sleepLoop: () => [T('sleep_1', 1.25, { fade: .08 }), T('sleep_2', 1.25, { fade: .08 })],
    wake: () => [T('wake_1', .42, { fade: .05 }), T('wake_2', .28, { fade: .05 }), T('turn_34', .1, { fade: .06 })],

    /* ---- saltar / celebrar ---- */
    jumpF: { crouch: [T('jumpf_1', .2, { fade: .04 })], air: [T('jumpf_2', .1, { fade: .03 })], land: [T('jumpf_3', .16, { fade: .03 }), T('idle_a', .06, { fade: .06 })] },
    jumpR: { crouch: [T('jump34_1', .2, { fade: .04 })], up: [T('jump34_2', .1, { fade: .03 })], peak: [T('jump34_3', .1, { fade: .03 })], land: [T('jump34_4', .16, { fade: .03 }), T('turn_34', .06, { fade: .06 })] },
    celebrate: () => [T('cele_1', .14, { fade: .05 }), T('cele_2', .14, { dx: .07 }), T('cele_3', .14, { dx: .09 }), T('cele_2', .14, { dx: .07 }), T('cele_1', .14), T('cele_3', .14, { dx: .09 })],   // dx: la cabeza no baila de lado a lado

    /* ---- asomarse detrás del panel ---- */
    /* asomarse por la derecha del QR: los peek_* en espejo (pared a la izquierda) y spy_2 (perfil, pared a la izquierda) */
    peekQR: v => v === 2 ? [T('peek_1', .3, { fade: .05, face: -1 }), T('spy_2', .85, { face: 1 }), T('peek_1', .3, { face: -1 }), T('peek_2', .5), T('peek_3', .5)] : [T('peek_1', .3, { fade: .05, face: -1 }), T('peek_2', .9), T('peek_1', .25), T('peek_3', .55)],
    peek: v => v === 2 ? [T('peek_1', .3, { fade: .05 }), T('spy_1', .8), T('peek_1', .3), T('peek_2', .5), T('peek_3', .5)] : [T('peek_1', .3, { fade: .05 }), T('peek_2', .9), T('peek_1', .25), T('peek_3', .55)]
  };
  /* ---- V.2: más repertorio (cada clip empieza y termina en la pose neutra de frente) ---- */
  const N = 'idle_a', END = () => T(N, .06, { fade: .08 });
  Object.assign(C, {
    hold: (f, t, o) => [T(f, t, Object.assign({ fade: .08 }, o))],
    /* saludo de frente con la muñeca (3 dibujos reales) */
    waveW: n => [T('wavew_1', .24, { fade: .08 })].concat(rep([T('wavew_2', .34), T('wavew_3', .34)], n || 2), [T('wavew_2', .26), T('wavew_1', .2), END()]),
    glance: side => [T('around_2', .14, { fade: .06 }), T(side < 0 ? 'around_1' : 'around_3', .8), T('around_2', .2), END()],
    /* sala de espera */
    watch: n => { const r = [T('watch_1', .5, { fade: .08 }), T('watch_2', .95)]; for (let i = 1; i < (n || 1); i++) r.push(T('watch_1', .6), T('watch_2', .85)); return r.concat([T('watch_3', 1.15, { fade: .08 }), T('watch_1', .4), END()]); },
    selfie: () => [T('selfie_1', .5, { fade: .08 }), T('selfie_2', .6, { fade: .05 }), T('selfie_3', 1.1, { fade: .06 }), T('selfie_1', .4, { fade: .06 }), END()],
    dance: loops => { const o = []; for (let i = 0; i < (loops || 2); i++) for (let k = 1; k <= 6; k++) o.push(T('dance_' + k, .24, { fade: k === 1 && i === 0 ? .08 : .04, dy: k % 2 ? 0 : -.012 })); return o.concat([T('dance_1', .22, { fade: .04 }), END()]); },
    stretch: () => [T('stretch_1', .8, { fade: .08 }), T('stretch_1', .5), T('stretch_2', .95, { fade: .08 }), T('stretch_1', .45, { fade: .08 }), T('stretch_3', .85, { fade: .08 }), END()],
    search: side => [T('search_1', .4, { fade: .08, face: side }), T('search_2', 1.0, { face: side }), T('search_1', .45, { face: side }), T('search_2', .7, { face: -side }), END()],
    bench: n => { const r = [T('bench_1', .5, { fade: .16 })]; for (let i = 0; i < (n || 3); i++) r.push(T('bench_2', .5), T('bench_1', .45), T('bench_3', .5), T('bench_1', .45)); return r.concat([T('bench_1', .35), END()]); },
    /* analizar / revisar */
    think: () => [T('think_1', .85, { fade: .08 }), T('think_2', 1.05), T('think_3', .95), T('think_2', .75), T('think_1', .6), END()],
    lupa: () => [T('lupa_1', .75, { fade: .08 }), T('lupa_2', 1.25), T('lupa_1', .5), T('lupa_2', .95), T('lupa_3', 1.15, { fade: .06 }), END()],
    tablet: () => [T('tablet_1', .75, { fade: .08 }), T('tablet_2', 1.3), T('tablet_1', .5), T('tablet_2', .85), T('tablet_3', 1.05, { fade: .06 }), END()],
    shrug: () => [T('shrug_1', .95, { fade: .08 }), T('shrug_2', .35), T('shrug_1', .85), END()],
    armsx: n => [T('armsx_1', .4, { fade: .08 })].concat(rep([T('armsx_2', .38), T('armsx_1', .38)], n || 3), [END()]),
    cheer: () => [T('cheer_1', .45, { fade: .08 }), T('cheer_2', .4), T('cheer_1', .35), T('cheer_2', .4), T('cheer_1', .35), END()],
    uy: () => [T('uy_1', .3, { fade: .06 }), T('uy_2', .5), T('uy_1', .22), T('uy_2', .5), T('uy_1', .3), END()],
    /* presentar / anunciar */
    present: () => [T('present_1', .35, { fade: .08 }), T('present_2', .85), T('present_3', .9), T('present_2', .6), T('present_1', .4), END()],
    talk: () => [T('talk_1', .55, { fade: .08 }), T('talk_2', .6), T('talk_1', .45), T('talk_3', .8), END()],
    mega: () => [T('mega_1', .4, { fade: .08 }), T('mega_2', .6), T('mega_3', .7), T('mega_2', .5), T('mega_1', .3), END()],
    medal: (n, secs) => [T('medal_' + n, .3, { fade: .1 }), T('medal_' + n, secs || 1.8, { sway: { a: 1.1, p: 1.7 } })],
    applaud: n => [T('applaud_1', .12, { fade: .06 })].concat(rep([T('applaud_2', .11), T('applaud_3', .12)], n || 4), [T('applaud_1', .12), END()]),
    leap: { crouch: [T('leap_1', .2, { fade: .04 })], air: [T('leap_2', .1, { fade: .03 })], land: [T('leap_3', .18, { fade: .03 }), END()] },
    trophy: () => [T('trophy_1', .5, { fade: .1 }), T('trophy_2', .45, { fade: .06 }), T('trophy_3', 1.25, { fade: .06, sway: { a: 1.4, p: 1.4 } }), T('trophy_4', .55, { fade: .06 }), END()],
    confetti: () => [T('confetti_1', .3, { fade: .08 }), T('confetti_2', .6, { fade: .05 }), T('confetti_3', .6, { fade: .05 }), T('confetti_2', .45, { fade: .05 }), END()],
    bow: () => [T('bow_1', .45, { fade: .08 }), T('bow_2', .85, { fade: .06 }), T('bow_3', .75, { fade: .06 }), END()],
    clear: { q: t => [T('clear_1', t || 2, { fade: .08 })], wave: t => [T('clear_2', .3, { fade: .08 }), T('clear_2', t || 1.2, { sway: { a: 1.2, p: 1.2 } })], ok: t => [T('clear_3', t || 1.4, { fade: .08 })] },
    /* viaje en bus: saludando por la ventanilla y bajando por la puerta */
    bwin: (n, sc) => { sc = sc || .9; return [T('bwin_1', .3, { fade: .1, sx: sc, sy: sc })].concat(rep([T('bwin_2', .34, { sx: sc, sy: sc }), T('bwin_3', .34, { sx: sc, sy: sc })], n || 3)); }
  });
})(window);
