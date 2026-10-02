/* SETPI — biblioteca de clips. Cada clip = lista de POSES discretas (cambio de pose real, no solo mover una imagen).
   pose = { f: frame real, arm: {a: grados, thumb: bool} | null, dy: px de lienzo, tilt: grados, eyes: 'open'|'closed' }
   f ∈ walk_1..6 | look_3 | stand | look | alert | stand_noarm (torso sin brazo derecho; el brazo es la pieza arm_r real).
   Cada animación tiene entrada (enter) / bucle (loop) / salida (exit) para que nunca se "salte" de una pose a otra. */
(function (g) {
  'use strict';
  const S = g.Setpi = g.Setpi || {};
  const A = (a, x) => Object.assign({ f: 'stand_noarm', arm: { a: a, thumb: false } }, x);
  const T = (a, x) => Object.assign({ f: 'stand_noarm', arm: { a: a, thumb: true } }, x);
  const F = (f, x) => Object.assign({ f: f }, x);
  const WALK = ['walk_1', 'walk_2', 'walk_3', 'walk_4', 'walk_5', 'walk_6'].map(f => F(f));
  const hop = (f, ys, x) => ys.map(y => F(f, Object.assign({ dy: y }, x)));

  S.CLIPS = {
    stand: { fps: 1, frames: [F('stand')] },
    // --- caminar ---
    walk_enter: { fps: 8, frames: [F('look_3')] },
    walk_loop: { fps: 9, loop: true, frames: WALK },
    walk_exit: { fps: 8, frames: [F('look_3'), F('stand')] },
    // --- mirar / sorpresa ---
    look_enter: { fps: 8, frames: [F('stand'), F('look')] },
    look_exit: { fps: 8, frames: [F('look'), F('stand')] },
    alert: { fps: 14, frames: hop('alert', [0, -8, -16, -20, -12, -4, 0, -3, 0]) },
    relax: { fps: 6, frames: [F('alert'), F('look'), F('stand')] },
    shake_no: { fps: 9, frames: [F('look'), F('stand', { tilt: -2 }), F('look'), F('stand', { tilt: 2 }), F('look'), F('stand')] },
    // --- saludar ---
    wave_enter: { fps: 12, frames: [A(0), A(-22), A(-55), A(-90), A(-112), A(-128)] },
    wave_loop: { fps: 11, frames: [A(-128), A(-148), A(-128), A(-108), A(-128), A(-148), A(-128), A(-108), A(-128)] },
    wave_exit: { fps: 12, frames: [A(-110), A(-80), A(-45), A(-18), A(0)] },
    // --- me gusta (pulgar real: el guante forma el pulgar) ---
    thumb_enter: { fps: 12, frames: [A(0), A(-30), A(-62), T(-84), T(-98)] },
    thumb_hold: { fps: 9, frames: [T(-98), T(-102, { dy: -3 }), T(-98), T(-94, { dy: -2 }), T(-98), T(-102, { dy: -3 }), T(-98)] },
    thumb_exit: { fps: 12, frames: [T(-88), A(-60), A(-30), A(0)] },
    // --- señalar ---
    point_enter: { fps: 12, frames: [A(0), A(-38), A(-78), A(-104)] },
    point_hold: { fps: 8, frames: [A(-104), A(-110), A(-104)] },
    point_exit: { fps: 12, frames: [A(-80), A(-40), A(-12), A(0)] },
    // --- celebrar (brazo arriba + salto) ---
    celebrate: { fps: 12, frames: [A(-60), A(-120, { dy: 2 }), A(-165, { dy: -12 }), A(-172, { dy: -24 }), A(-168, { dy: -14 }), A(-160, { dy: -2 }), A(-172, { dy: -18 }), A(-176, { dy: -26 }), A(-170, { dy: -12 }), A(-165, { dy: 0 })] },
    celebrate_exit: { fps: 9, frames: [A(-120), A(-70), A(-30), A(0)] },
    // --- dormir / despertar (de pie, cabeza cae, ojos cerrados) ---
    sleep_enter: { fps: 6, frames: [F('look'), F('stand', { eyes: 'closed' }), F('stand', { eyes: 'closed', tilt: 1.5, dy: 2 }), F('stand', { eyes: 'closed', tilt: 3, dy: 4 }), F('stand', { eyes: 'closed', tilt: 4.5, dy: 6 })] },
    sleep_loop: { fps: 1.4, loop: true, frames: [F('stand', { eyes: 'closed', tilt: 4.5, dy: 6 }), F('stand', { eyes: 'closed', tilt: 5.5, dy: 8 })] },
    wake: { fps: 6, frames: [F('stand', { eyes: 'closed', tilt: 3, dy: 4 }), F('stand', { tilt: 1.5, dy: 2 }), F('look', { tilt: 0 }), F('stand')] }
  };
  S.WALK_FRAMES = WALK.map(p => p.f);
})(window);
