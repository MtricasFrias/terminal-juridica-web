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
    waveF: n => [T('wave_f1', .12, { fade: .06 })].concat(rep([T('wave_f2', .13), T('wave_f3', .13), T('wave_f2', .13), T('wave_f3', .13)], n || 2), [T('wave_f4', .14), T('idle_a', .06, { fade: .06 })]),
    waveR: n => [T('wave34_1', .1, { fade: .05 })].concat(rep([T('wave34_2', .15), T('wave34_3', .15)], (n || 2) + 1), [T('wave34_1', .12), T('turn_34', .06, { fade: .05 })]),

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
})(window);
