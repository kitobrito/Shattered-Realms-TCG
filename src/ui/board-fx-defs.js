// What brings each realm board to life (src/ui/circle-fx.js draws these; the masks, sprites and
// clean plates are cut by tools/board-fx.py from tools/board_fx_spec.py). Positions are in the
// painting's own pixels: landscape 1024x572, portrait 459x1024. Layers draw back to front.
//
// Every board follows the same plan, from the ground up:
//   1. ground     sheen and texture on the big surfaces (snow, sand, water, stone)
//   2. growth     each tuft, twig, reed or frond swaying on its own root (sprites)
//   3. features   the board's moving landmarks (streams, lava, ice, fungus, pools)
//   4. corners    the four props, each with an idle life and a tap reaction (pokes)
//   5. air        weather and particles: snow, embers, spores, motes, mist, cloud shadows
// `wind` sets the gusts that roll across the board (direction, how often, how fast).

const SNOW = [244, 248, 255];
const FROST = [190, 228, 255];

export const BOARD_FX = {
  // ---- Eels: a flooded river cave, lit by its own electricity ------------------------------
  // ---- Eels: a flooded river cave lit by its own electricity ---------------------------------
  // The painting is one flat image, so nothing is cut out: the eels, lily pads and hanging vines
  // move by bending the painting's own pixels in place (type 'bend'), with fields that fade to
  // nothing at their edges. Each eel bends along its own spine (head -> tail): a wave runs down
  // the body, the head nearly still, the tail swaying most; the coiled eel in the rock pool rests
  // and only stirs now and then, the swimmers in the open water never quite stop.
  // Layers, back to front: ambient water (flow, caustics, gliding light on the painted streaks),
  // living creatures (eels, pads, vines), details (ripples, bubbles, drips, spores), lighting
  // (fungus and glass glows), air (specks, haze). The middle of the board stays calm and clear.
  'eels-land': {
    layers: [
      // 1. Ambient water. The shallows move: two copies of the water slide past each other, a
      // slow sheen rolls across, and a web of caustic light drifts over the submerged stones.
      { id: 'waterFlow', type: 'flow', mask: 'water', dir: [-1, 0.3], dist: 9, period: 4.2, alpha: 0.55 },
      { id: 'water', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'x', band: 150, speed: 9 }, alpha: [0, 0.2], gain: 0.55 },
      { id: 'water2', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'y', band: 90, speed: 5 }, alpha: [0, 0.14], gain: 0.45 },
      { id: 'caustics', type: 'caustics', mask: 'water', cell: 20, scale: 1.1, speed: 4.5, alpha: 0.16, color: [200, 250, 255] },
      // The painted streaks of light in the water: a soft glint travels along them, slowly, in two
      // directions at once, like light catching moving water (they never flash on and off).
      { id: 'cracks', type: 'mask', mask: 'cracks', anim: { kind: 'wave', along: 'x', band: 120, speed: 7 }, alpha: [0, 0.32], gain: 0.5, kickDur: 1.6 },
      { id: 'cracks2', type: 'mask', mask: 'cracks', anim: { kind: 'wave', along: 'y', band: 80, speed: 4 }, alpha: [0, 0.22], gain: 0.4, kickDur: 1.6 },
      // 2. Living creatures. The five eels (spines measured on the painting, head first).
      { id: 'eels', type: 'bend', fps: 30, items: [
        // The big eel coiled in the rock pool: rests, breathes, and now and then shifts its coils.
        { kind: 'eel', spine: [[196, 482], [188, 487], [172, 492], [155, 500], [140, 508], [125, 516], [110, 522], [92, 524], [75, 520], [62, 508], [55, 490], [57, 470], [65, 455], [80, 444], [100, 438], [120, 440], [138, 448], [155, 456], [170, 460], [184, 456]],
          r: [7, 2], amp: 1.5, waves: 0.9, period: 5.5, rest: 0.25, still: 0.3, head: 0.04, falloff: 6, burstEvery: [12, 24], burstLen: 4 },
        // Two small swimmers at the left edge of the shallows.
        { kind: 'eel', spine: [[195, 324], [185, 320], [173, 313], [163, 306], [152, 304], [140, 305], [128, 302], [121, 295], [118, 285]],
          r: [3.5, 1.5], amp: 2.3, waves: 1.3, period: 2.6, rest: 0.6, still: 0.2, head: 0.15, falloff: 5, drift: 0.5, driftPeriod: 6, burstEvery: [6, 12], burstLen: 2.5 },
        { kind: 'eel', spine: [[162, 344], [150, 343], [138, 344], [125, 346], [115, 350], [110, 355]],
          r: [3, 1.2], amp: 2.0, waves: 1.1, period: 2.2, rest: 0.65, still: 0.2, head: 0.15, falloff: 5, drift: 0.4, driftPeriod: 5, burstEvery: [5, 11], burstLen: 2 },
        // The eel gliding down out of the dark at the top.
        { kind: 'eel', spine: [[533, 143], [542, 135], [552, 126], [562, 118], [572, 114], [578, 108], [580, 98], [581, 90], [586, 83], [590, 80]],
          r: [4, 1.5], amp: 2.4, waves: 1.2, period: 2.9, rest: 0.55, still: 0.2, head: 0.12, falloff: 6, drift: 0.6, driftPeriod: 7, burstEvery: [7, 14], burstLen: 3 },
        // The eel by the lily pads on the right.
        { kind: 'eel', spine: [[880, 292], [893, 294], [905, 293], [913, 287], [918, 280], [925, 276], [933, 275], [940, 277], [944, 279]],
          r: [4, 1.5], amp: 2.2, waves: 1.1, period: 3.2, rest: 0.5, still: 0.25, head: 0.1, falloff: 6, drift: 0.4, driftPeriod: 8, burstEvery: [8, 16], burstLen: 3 },
      ] },
      // Every lily pad rides the water on its own: a slow bob, a slight tilt, a drift (sub-pixel to ~1 px).
      { id: 'pads', type: 'bend', fps: 24, items: [
        { kind: 'pad', at: [394, 174, 17], period: 5.0, bob: 0.65, tilt: 0.015, sway: 0.44 },
        { kind: 'pad', at: [431, 184, 13], period: 5.1, bob: 0.66, tilt: 0.009, sway: 0.45 },
        { kind: 'pad', at: [366, 202, 11], period: 5.4, bob: 0.73, tilt: 0.009, sway: 0.39 },
        { kind: 'pad', at: [332, 172, 11], period: 4.0, bob: 0.73, tilt: 0.014, sway: 0.31 },
        { kind: 'pad', at: [310, 202, 9], period: 6.4, bob: 0.79, tilt: 0.013, sway: 0.48 },
        { kind: 'pad', at: [335, 204, 9], period: 4.2, bob: 0.46, tilt: 0.012, sway: 0.32 },
        { kind: 'pad', at: [320, 251, 12], period: 4.3, bob: 0.53, tilt: 0.008, sway: 0.44 },
        { kind: 'pad', at: [406, 236, 17], period: 4.9, bob: 0.74, tilt: 0.012, sway: 0.49 },
        { kind: 'pad', at: [362, 312, 7], period: 5.1, bob: 0.68, tilt: 0.012, sway: 0.38 },
        { kind: 'pad', at: [626, 155, 13], period: 6.4, bob: 0.8, tilt: 0.015, sway: 0.51 },
        { kind: 'pad', at: [672, 181, 13], period: 4.6, bob: 0.53, tilt: 0.01, sway: 0.32 },
        { kind: 'pad', at: [702, 172, 9], period: 5.8, bob: 0.59, tilt: 0.015, sway: 0.42 },
        { kind: 'pad', at: [712, 209, 12], period: 6.3, bob: 0.75, tilt: 0.008, sway: 0.36 },
        { kind: 'pad', at: [686, 224, 11], period: 6.2, bob: 0.61, tilt: 0.016, sway: 0.42 },
        { kind: 'pad', at: [710, 232, 9], period: 4.0, bob: 0.67, tilt: 0.014, sway: 0.38 },
        { kind: 'pad', at: [760, 274, 13], period: 4.0, bob: 0.57, tilt: 0.016, sway: 0.53 },
        { kind: 'pad', at: [802, 292, 17], period: 4.1, bob: 0.54, tilt: 0.009, sway: 0.32 },
        { kind: 'pad', at: [834, 292, 9], period: 5.9, bob: 0.51, tilt: 0.012, sway: 0.43 },
        { kind: 'pad', at: [854, 326, 15], period: 4.3, bob: 0.71, tilt: 0.009, sway: 0.49 },
        { kind: 'pad', at: [888, 330, 9], period: 4.1, bob: 0.6, tilt: 0.01, sway: 0.38 },
        { kind: 'pad', at: [820, 344, 16], period: 6.3, bob: 0.73, tilt: 0.01, sway: 0.57 },
        { kind: 'pad', at: [362, 456, 17], period: 4.3, bob: 0.59, tilt: 0.015, sway: 0.49 },
        { kind: 'pad', at: [404, 458, 17], period: 4.1, bob: 0.8, tilt: 0.01, sway: 0.38 },
        { kind: 'pad', at: [345, 485, 10], period: 5.8, bob: 0.57, tilt: 0.01, sway: 0.32 },
        { kind: 'pad', at: [379, 502, 15], period: 4.0, bob: 0.65, tilt: 0.01, sway: 0.48 },
        { kind: 'pad', at: [602, 444, 13], period: 4.8, bob: 0.61, tilt: 0.016, sway: 0.45 },
        { kind: 'pad', at: [680, 456, 13], period: 5.3, bob: 0.75, tilt: 0.009, sway: 0.35 },
        { kind: 'pad', at: [556, 476, 11], period: 6.2, bob: 0.74, tilt: 0.01, sway: 0.36 },
        { kind: 'pad', at: [575, 465, 11], period: 5.7, bob: 0.78, tilt: 0.01, sway: 0.59 },
        { kind: 'pad', at: [727, 494, 16], period: 6.1, bob: 0.66, tilt: 0.011, sway: 0.33 },
        { kind: 'pad', at: [330, 225, 8], period: 3.9, bob: 0.79, tilt: 0.01, sway: 0.51 },
        { kind: 'pad', at: [300, 172, 7], period: 4.5, bob: 0.74, tilt: 0.013, sway: 0.39 },
        { kind: 'pad', at: [425, 142, 6], period: 4.3, bob: 0.7, tilt: 0.009, sway: 0.37 },
        { kind: 'pad', at: [862, 237, 10], period: 5.3, bob: 0.75, tilt: 0.013, sway: 0.38 },
      ] },
      // The thin strands hanging from the vine across the top sway a little (the thick roots stay still).
      { id: 'vines', type: 'bend', fps: 24, items: [
        { kind: 'hang', box: [446, 26, 476, 82], amp: 1.1, period: 5.2, waves: 0.5 },
        { kind: 'hang', box: [500, 38, 530, 116], amp: 1.5, period: 6.1, waves: 0.6 },
        { kind: 'hang', box: [581, 38, 611, 106], amp: 1.3, period: 5.6, waves: 0.55 },
        { kind: 'hang', box: [610, 34, 640, 86], amp: 1.0, period: 4.8, waves: 0.5 },
      ] },
      // 3. Details. Rings spread now and then across the open water, around the pads, from the
      // painted ripple centre and the water-wheel; tiny rings trail off the swimming eels' tails and ahead of their snouts.
      { id: 'ripples', type: 'particles', kind: 'ripple', area: { mask: 'water' }, rate: 0.35, max: 3, color: [190, 245, 255], size: [12, 22], life: [2.4, 3.6], alpha: 0.28 },
      { id: 'padRipples', type: 'particles', kind: 'ripple', from: [[394, 174, 0, 18], [431, 184, 0, 14], [366, 202, 0, 12], [332, 172, 0, 12], [310, 202, 0, 10], [335, 204, 0, 10], [320, 251, 0, 13], [406, 236, 0, 18], [362, 312, 0, 8], [626, 155, 0, 14], [672, 181, 0, 14], [702, 172, 0, 10], [712, 209, 0, 13], [686, 224, 0, 12], [710, 232, 0, 10], [760, 274, 0, 14], [802, 292, 0, 18], [834, 292, 0, 10], [854, 326, 0, 16], [888, 330, 0, 10], [820, 344, 0, 17], [362, 456, 0, 18], [404, 458, 0, 18], [345, 485, 0, 11], [379, 502, 0, 16], [602, 444, 0, 14], [680, 456, 0, 14], [556, 476, 0, 12], [575, 465, 0, 12], [727, 494, 0, 17], [330, 225, 0, 9], [300, 172, 0, 8], [425, 142, 0, 7], [862, 237, 0, 11]], rate: 0.3, max: 3, color: [190, 245, 255], size: [5, 9], life: [1.8, 2.6], alpha: 0.22 },
      { id: 'centreRipples', type: 'particles', kind: 'ripple', from: [[575, 400, 0]], rate: 0.22, max: 2, color: [210, 250, 255], size: [30, 44], life: [3.5, 4.5], alpha: 0.24 },
      { id: 'eelRipples', type: 'particles', kind: 'ripple', from: [[114, 277, 3], [104, 361, 3], [952, 283, 3], [206, 330, 4], [172, 352, 4], [868, 296, 4]], rate: 0.35, max: 4, color: [190, 245, 255], size: [4, 7], life: [1.4, 2], alpha: 0.24 },
      { id: 'wheelRipples', type: 'particles', kind: 'ripple', from: [[815, 470, 12], [845, 540, 14]], rate: 0.5, max: 3, color: [190, 245, 255], size: [8, 14], life: [1.6, 2.4], alpha: 0.26 },
      // Bubbles rise from the eels' mouths, the pool, under the wheel, and here and there from the bottom.
      { id: 'bubbles', type: 'particles', kind: 'bubble', from: [[197, 480, 2], [196, 323, 1], [163, 343, 1], [532, 144, 1], [879, 292, 1], [812, 470, 10], [300, 300, 30], [700, 380, 40]], rate: 0.6, max: 7, color: [210, 250, 255], size: [0.9, 1.8], life: [1.6, 2.8], speed: 0.7 },
      // Water drips off the wheel's paddles into the stream.
      { id: 'wheelDrips', type: 'particles', kind: 'drip', from: [[858, 520, 6], [905, 548, 6], [948, 560, 5], [972, 532, 4]], rate: 0.7, max: 5, color: [190, 240, 255], size: [0.7, 1.1], life: [2, 3], fall: 16, splashColor: [190, 245, 255] },
      // Drops fall from the tips of the hanging strands.
      { id: 'vineDrips', type: 'particles', kind: 'drip', from: [[461, 78, 2], [514, 112, 2], [597, 102, 2]], rate: 0.12, max: 2, color: [170, 240, 255], size: [0.6, 1], life: [3, 5], fall: 26, splashColor: [170, 240, 255] },
      // 4. Lighting. Each fungus cluster breathes on its own slow rhythm and lights the rock and
      // roots around it; spores drift up from them now and then. The glass insulators glow too.
      { id: 'shroom1', type: 'mask', mask: 'shroom1', anim: { kind: 'flicker', speed: 0.32 }, alpha: [0.06, 0.34], bloom: 0.45, kickDur: 2 },
      { id: 'shroom2', type: 'mask', mask: 'shroom2', anim: { kind: 'flicker', speed: 0.27 }, alpha: [0.06, 0.3], bloom: 0.45, kickDur: 2 },
      { id: 'shroom3', type: 'mask', mask: 'shroom3', anim: { kind: 'flicker', speed: 0.36 }, alpha: [0.05, 0.3], bloom: 0.4, kickDur: 2 },
      { id: 'shroom4', type: 'mask', mask: 'shroom4', anim: { kind: 'flicker', speed: 0.3 }, alpha: [0.06, 0.32], bloom: 0.45, kickDur: 2 },
      { id: 'shroom5', type: 'mask', mask: 'shroom5', anim: { kind: 'flicker', speed: 0.25 }, alpha: [0.05, 0.28], bloom: 0.4, kickDur: 2 },
      { id: 'shroom6', type: 'mask', mask: 'shroom6', anim: { kind: 'flicker', speed: 0.34 }, alpha: [0.05, 0.26], bloom: 0.4, kickDur: 2 },
      { id: 'shroomLight', type: 'glow', points: [[370, 40, 46], [423, 97, 34], [520, 38, 40], [742, 22, 34], [815, 66, 30], [714, 85, 24]], color: [90, 220, 255], anim: 'flicker', speed: 0.3, alpha: [0.03, 0.1], kickDur: 2 },
      { id: 'spores', type: 'particles', kind: 'mote', from: [[370, 45, 22], [423, 100, 14], [520, 42, 40], [742, 28, 14], [815, 70, 12]], rate: 0.5, max: 7, color: [140, 240, 255], size: [0.5, 1.1], life: [4, 7], alpha: 0.6, speed: 0.4 },
      { id: 'glass', type: 'mask', mask: 'glass', anim: { kind: 'flicker', speed: 0.4 }, alpha: [0.08, 0.36], bloom: 0.5, kickDur: 2 },
      { id: 'glassHalo', type: 'glow', points: [[905, 32, 34], [882, 82, 28], [982, 105, 32], [945, 143, 24]], color: [90, 255, 210], anim: 'flicker', speed: 0.4, alpha: [0.02, 0.08], kickDur: 2 },
      // The rod (top left): a spark wakes on it only when tapped.
      { id: 'rodGlow', type: 'glow', points: [[112, 70, 34]], color: [140, 220, 255], anim: 'pulse', period: 7, alpha: [0, 0.04], kickDur: 1.6 },
      { id: 'rodBolt', type: 'lightning', every: [9999, 9999], color: [170, 235, 255], zones: [
        { from: [60, 0, 160, 10], to: [100, 40, 130, 70], jag: 14, flash: [112, 60, 40] },
      ] },
      { id: 'rodSparks', type: 'particles', kind: 'glint', from: [[112, 60, 18]], rate: 0, max: 16, color: [220, 245, 255], size: [1, 2], life: [0.3, 0.7] },
      // The water-wheel's painted sparks crackle softly; a warm glint where they fly.
      { id: 'sparks', type: 'mask', mask: 'sparks', anim: { kind: 'flicker', speed: 5 }, alpha: [0.04, 0.26], bloom: 0.4, kickDur: 1.5 },
      { id: 'wheelGlow', type: 'glow', points: [[835, 405, 26]], color: [255, 190, 90], anim: 'flicker', speed: 3, alpha: [0.03, 0.1], kickDur: 1.5 },
      { id: 'wheelSparks', type: 'particles', kind: 'ember', from: [[835, 405, 12]], rate: 0.5, max: 6, color: [255, 210, 110], size: [0.5, 1], life: [0.4, 0.9], speed: 1.2 },
      // A tapped Chain across the water (also played when a Chain goes off in a match).
      { id: 'zap', type: 'lightning', every: [9999, 9999], color: [120, 230, 255], zones: [
        { from: [440, 200, 520, 240], to: [600, 300, 680, 360], jag: 22, flash: [560, 280, 50] },
        { from: [600, 190, 660, 220], to: [520, 330, 580, 390], jag: 22, flash: [580, 290, 50] },
      ] },
      // 5. Air. A few specks drifting at different depths in the dark, a thin haze among the roots.
      { type: 'fog', area: [-40, -20, 1060, 150], count: 5, size: [90, 150], speed: 2, color: [40, 110, 140], alpha: 0.05 },
      { type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 0.7, max: 10, color: [150, 230, 255], size: [0.4, 1], life: [5, 9], alpha: 0.45, speed: 0.35 },
    ],
    pokes: [
      { area: [50, 10, 180, 165], sound: 'crack', strike: 'rodBolt', kick: ['rodGlow'], flare: [170, 235, 255], glyph: '⚡', burst: { layer: 'rodSparks', n: 14, spread: 24 } },
      { area: [860, 0, 1015, 170], sound: 'chime', kick: ['glass', 'glassHalo'], flare: [90, 255, 200], glyph: '✨' },
      { area: [330, 5, 450, 115], sound: 'chime', kick: ['shroom1', 'shroom2', 'shroomLight'], flare: [90, 220, 255], glyph: '✨', burst: { layer: 'spores', n: 8, spread: 26 } },
      { area: [40, 405, 215, 545], sound: 'splash', rustle: 80, flare: [255, 240, 120], glyph: '⚡', burst: { layer: 'bubbles', n: 5, at: [197, 480], spread: 4 } },
      { area: [790, 375, 1005, 570], sound: 'grind', kick: ['wheelGlow', 'sparks'], flare: [255, 190, 90], glyph: '⚙️', burst: { layer: 'wheelSparks', n: 10, spread: 14 } },
      { area: [430, 190, 710, 410], sound: 'crack', strike: 'zap', kick: ['cracks', 'cracks2', 'caustics'], flare: [120, 230, 255], glyph: '⚡', burst: { layer: 'ripples', n: 2 } },
    ],
    // Match events (cosmetic): when a Chain goes off, light runs through the water and it stirs.
    reactions: {
      chain: { kick: ['cracks', 'cracks2', 'caustics', 'shroomLight'], burst: [{ layer: 'ripples', n: 2 }, { layer: 'centreRipples', n: 1 }] },
    },
  },
  'eels-portrait': {
    layers: [
      // The same flooded cave, stood on end for phones. Same layers as the landscape board, every
      // position measured again on this painting.
      // 1. Ambient water.
      { id: 'waterFlow', type: 'flow', mask: 'water', dir: [0.2, 1], dist: 9, period: 4.2, alpha: 0.55 },
      { id: 'water', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'y', band: 150, speed: 9 }, alpha: [0, 0.2], gain: 0.55 },
      { id: 'water2', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'x', band: 90, speed: 5 }, alpha: [0, 0.14], gain: 0.45 },
      { id: 'caustics', type: 'caustics', mask: 'water', cell: 20, scale: 1.1, speed: 4.5, alpha: 0.16, color: [200, 250, 255] },
      { id: 'cracks', type: 'mask', mask: 'cracks', anim: { kind: 'wave', along: 'y', band: 120, speed: 7 }, alpha: [0, 0.32], gain: 0.5, kickDur: 1.6 },
      { id: 'cracks2', type: 'mask', mask: 'cracks', anim: { kind: 'wave', along: 'x', band: 80, speed: 4 }, alpha: [0, 0.22], gain: 0.4, kickDur: 1.6 },
      // 2. Living creatures: six eels (spines head first).
      { id: 'eels', type: 'bend', fps: 30, items: [
        // Top left, the eel doubled back on itself in its basin.
        { kind: 'eel', spine: [[46, 182], [44, 170], [40, 158], [33, 145], [26, 130], [20, 115], [16, 98], [18, 80], [25, 65], [38, 55], [50, 52], [62, 56], [72, 65], [78, 80], [80, 95], [78, 110], [72, 125], [70, 140], [70, 160]],
          r: [6, 2], amp: 1.5, waves: 0.9, period: 5.5, rest: 0.25, still: 0.3, head: 0.04, falloff: 6, burstEvery: [12, 24], burstLen: 4 },
        // The two young eels in the dark pool at the top.
        { kind: 'eel', spine: [[169, 158], [168, 148], [166, 138], [164, 128], [162, 118], [158, 110]],
          r: [3, 1.2], amp: 2.0, waves: 1.1, period: 2.2, rest: 0.65, still: 0.2, head: 0.15, falloff: 5, drift: 0.4, driftPeriod: 5, burstEvery: [5, 11], burstLen: 2 },
        { kind: 'eel', spine: [[189, 184], [190, 175], [194, 166], [200, 158], [205, 148], [207, 138], [208, 128], [212, 120], [220, 113], [226, 110]],
          r: [3.5, 1.5], amp: 2.3, waves: 1.3, period: 2.6, rest: 0.6, still: 0.2, head: 0.15, falloff: 5, drift: 0.5, driftPeriod: 6, burstEvery: [6, 12], burstLen: 2.5 },
        // The eel slipping through the roots on the right.
        { kind: 'eel', spine: [[358, 528], [364, 536], [371, 544], [378, 553], [382, 562], [388, 570], [398, 574], [408, 574]],
          r: [3.5, 1.5], amp: 2.2, waves: 1.1, period: 3.2, rest: 0.5, still: 0.25, head: 0.1, falloff: 6, drift: 0.4, driftPeriod: 8, burstEvery: [8, 16], burstLen: 3 },
        // The small eel nosing along the left bank.
        { kind: 'eel', spine: [[100, 793], [92, 792], [84, 792], [76, 794], [68, 796], [60, 798]],
          r: [3, 1.5], amp: 2.0, waves: 1.0, period: 2.8, rest: 0.6, still: 0.2, head: 0.15, falloff: 5, drift: 0.4, driftPeriod: 6, burstEvery: [6, 13], burstLen: 2 },
        // Bottom left, the big eel coiled in the rock pool.
        { kind: 'eel', spine: [[126, 928], [115, 931], [103, 935], [92, 940], [82, 948], [72, 955], [62, 962], [50, 966], [36, 964], [24, 955], [16, 940], [16, 922], [22, 905], [34, 892], [50, 886], [65, 887], [80, 893], [95, 899], [108, 902], [118, 902]],
          r: [7, 2], amp: 1.5, waves: 0.9, period: 6, rest: 0.25, still: 0.3, head: 0.04, falloff: 6, burstEvery: [14, 26], burstLen: 4 },
      ] },
      // Every lily pad rides the water on its own.
      { id: 'pads', type: 'bend', fps: 24, items: [
        { kind: 'pad', at: [205, 60, 6], period: 4.8, bob: 0.50, tilt: 0.013, sway: 0.32 },
        { kind: 'pad', at: [230, 62, 6], period: 5.3, bob: 0.58, tilt: 0.008, sway: 0.44 },
        { kind: 'pad', at: [222, 78, 5], period: 4.1, bob: 0.60, tilt: 0.009, sway: 0.33 },
        { kind: 'pad', at: [240, 90, 5], period: 5.1, bob: 0.74, tilt: 0.009, sway: 0.36 },
        { kind: 'pad', at: [155, 84, 7], period: 5.6, bob: 0.78, tilt: 0.013, sway: 0.41 },
        { kind: 'pad', at: [260, 305, 10], period: 6.4, bob: 0.47, tilt: 0.015, sway: 0.38 },
        { kind: 'pad', at: [300, 300, 9], period: 4.4, bob: 0.49, tilt: 0.010, sway: 0.53 },
        { kind: 'pad', at: [276, 325, 7], period: 4.5, bob: 0.65, tilt: 0.013, sway: 0.40 },
        { kind: 'pad', at: [304, 320, 9], period: 5.4, bob: 0.47, tilt: 0.008, sway: 0.36 },
        { kind: 'pad', at: [330, 296, 8], period: 5.7, bob: 0.60, tilt: 0.011, sway: 0.46 },
        { kind: 'pad', at: [338, 322, 15], period: 5.1, bob: 0.55, tilt: 0.014, sway: 0.50 },
        { kind: 'pad', at: [300, 345, 8], period: 4.6, bob: 0.65, tilt: 0.012, sway: 0.55 },
        { kind: 'pad', at: [275, 397, 18], period: 5.8, bob: 0.55, tilt: 0.016, sway: 0.33 },
        { kind: 'pad', at: [332, 386, 20], period: 5.0, bob: 0.71, tilt: 0.009, sway: 0.44 },
        { kind: 'pad', at: [324, 423, 12], period: 4.1, bob: 0.68, tilt: 0.014, sway: 0.46 },
        { kind: 'pad', at: [361, 416, 7], period: 6.2, bob: 0.56, tilt: 0.014, sway: 0.47 },
        { kind: 'pad', at: [365, 367, 8], period: 5.4, bob: 0.61, tilt: 0.015, sway: 0.56 },
        { kind: 'pad', at: [230, 370, 6], period: 5.2, bob: 0.68, tilt: 0.008, sway: 0.50 },
        { kind: 'pad', at: [202, 356, 10], period: 5.6, bob: 0.80, tilt: 0.015, sway: 0.38 },
        { kind: 'pad', at: [28, 370, 18], period: 5.0, bob: 0.68, tilt: 0.008, sway: 0.43 },
        { kind: 'pad', at: [68, 397, 17], period: 4.4, bob: 0.49, tilt: 0.008, sway: 0.52 },
        { kind: 'pad', at: [48, 345, 10], period: 4.3, bob: 0.54, tilt: 0.011, sway: 0.54 },
        { kind: 'pad', at: [65, 350, 10], period: 4.2, bob: 0.61, tilt: 0.012, sway: 0.55 },
        { kind: 'pad', at: [58, 550, 9], period: 6.0, bob: 0.75, tilt: 0.010, sway: 0.42 },
        { kind: 'pad', at: [68, 575, 9], period: 4.9, bob: 0.76, tilt: 0.016, sway: 0.34 },
        { kind: 'pad', at: [85, 600, 13], period: 4.4, bob: 0.53, tilt: 0.010, sway: 0.44 },
        { kind: 'pad', at: [75, 678, 16], period: 5.5, bob: 0.54, tilt: 0.008, sway: 0.42 },
        { kind: 'pad', at: [44, 727, 16], period: 4.9, bob: 0.65, tilt: 0.016, sway: 0.49 },
        { kind: 'pad', at: [37, 624, 6], period: 5.3, bob: 0.67, tilt: 0.013, sway: 0.32 },
        { kind: 'pad', at: [351, 621, 11], period: 6.2, bob: 0.72, tilt: 0.015, sway: 0.52 },
        { kind: 'pad', at: [330, 672, 12], period: 5.0, bob: 0.59, tilt: 0.009, sway: 0.48 },
        { kind: 'pad', at: [290, 685, 12], period: 4.2, bob: 0.47, tilt: 0.010, sway: 0.35 },
        { kind: 'pad', at: [298, 711, 16], period: 4.9, bob: 0.47, tilt: 0.008, sway: 0.34 },
        { kind: 'pad', at: [338, 697, 8], period: 4.3, bob: 0.58, tilt: 0.008, sway: 0.54 },
        { kind: 'pad', at: [248, 763, 13], period: 5.5, bob: 0.50, tilt: 0.010, sway: 0.40 },
        { kind: 'pad', at: [236, 800, 14], period: 4.9, bob: 0.49, tilt: 0.015, sway: 0.58 },
        { kind: 'pad', at: [45, 800, 8], period: 5.2, bob: 0.62, tilt: 0.009, sway: 0.33 },
        { kind: 'pad', at: [215, 905, 10], period: 4.9, bob: 0.54, tilt: 0.015, sway: 0.35 },
        { kind: 'pad', at: [250, 905, 14], period: 4.1, bob: 0.78, tilt: 0.012, sway: 0.34 },
        { kind: 'pad', at: [230, 940, 15], period: 5.4, bob: 0.46, tilt: 0.012, sway: 0.57 },
        { kind: 'pad', at: [275, 905, 10], period: 6.2, bob: 0.69, tilt: 0.010, sway: 0.40 },
        { kind: 'pad', at: [200, 930, 7], period: 4.4, bob: 0.72, tilt: 0.012, sway: 0.52 },
      ] },
      // 3. Details: rings across the water, around the pads, from the painted ripple centre, off
      // the eels and where the wheel meets the stream.
      { id: 'ripples', type: 'particles', kind: 'ripple', area: { mask: 'water' }, rate: 0.3, max: 3, color: [190, 245, 255], size: [10, 18], life: [2.4, 3.6], alpha: 0.28 },
      { id: 'padRipples', type: 'particles', kind: 'ripple', from: [[205, 60, 0, 7], [230, 62, 0, 7], [222, 78, 0, 6], [240, 90, 0, 6], [155, 84, 0, 8], [260, 305, 0, 11], [300, 300, 0, 10], [276, 325, 0, 8], [304, 320, 0, 10], [330, 296, 0, 9], [338, 322, 0, 16], [300, 345, 0, 9], [275, 397, 0, 19], [332, 386, 0, 21], [324, 423, 0, 13], [361, 416, 0, 8], [365, 367, 0, 9], [230, 370, 0, 7], [202, 356, 0, 11], [28, 370, 0, 19], [68, 397, 0, 18], [48, 345, 0, 11], [65, 350, 0, 11], [58, 550, 0, 10], [68, 575, 0, 10], [85, 600, 0, 14], [75, 678, 0, 17], [44, 727, 0, 17], [37, 624, 0, 7], [351, 621, 0, 12], [330, 672, 0, 13], [290, 685, 0, 13], [298, 711, 0, 17], [338, 697, 0, 9], [248, 763, 0, 14], [236, 800, 0, 15], [45, 800, 0, 9], [215, 905, 0, 11], [250, 905, 0, 15], [230, 940, 0, 16], [275, 905, 0, 11], [200, 930, 0, 8]], rate: 0.3, max: 3, color: [190, 245, 255], size: [5, 9], life: [1.8, 2.6], alpha: 0.22 },
      { id: 'centreRipples', type: 'particles', kind: 'ripple', from: [[127, 572, 0]], rate: 0.22, max: 2, color: [210, 250, 255], size: [26, 38], life: [3.5, 4.5], alpha: 0.24 },
      { id: 'eelRipples', type: 'particles', kind: 'ripple', from: [[171, 168, 3], [187, 194, 3], [231, 107, 3], [108, 792, 3], [414, 576, 3]], rate: 0.3, max: 3, color: [190, 245, 255], size: [4, 7], life: [1.4, 2], alpha: 0.24 },
      { id: 'wheelRipples', type: 'particles', kind: 'ripple', from: [[318, 880, 10], [300, 915, 10]], rate: 0.5, max: 3, color: [190, 245, 255], size: [8, 13], life: [1.6, 2.4], alpha: 0.26 },
      { id: 'bubbles', type: 'particles', kind: 'bubble', from: [[47, 184, 2], [169, 160, 1], [189, 186, 1], [128, 927, 2], [101, 793, 1], [320, 885, 8], [200, 420, 30], [180, 700, 30]], rate: 0.6, max: 7, color: [210, 250, 255], size: [0.9, 1.8], life: [1.6, 2.8], speed: 0.7 },
      { id: 'wheelDrips', type: 'particles', kind: 'drip', from: [[334, 856, 4], [324, 873, 4]], rate: 0.6, max: 4, color: [190, 240, 255], size: [0.7, 1.1], life: [2, 3], fall: 12, splashColor: [190, 245, 255] },
      // 4. Lighting: the fungus down the right wall breathes cluster by cluster; spores drift off it.
      { id: 'shroom1', type: 'mask', mask: 'shroom1', anim: { kind: 'flicker', speed: 0.32 }, alpha: [0.06, 0.34], bloom: 0.45, kickDur: 2 },
      { id: 'shroom2', type: 'mask', mask: 'shroom2', anim: { kind: 'flicker', speed: 0.27 }, alpha: [0.06, 0.3], bloom: 0.45, kickDur: 2 },
      { id: 'shroom3', type: 'mask', mask: 'shroom3', anim: { kind: 'flicker', speed: 0.36 }, alpha: [0.05, 0.3], bloom: 0.4, kickDur: 2 },
      { id: 'shroom4', type: 'mask', mask: 'shroom4', anim: { kind: 'flicker', speed: 0.3 }, alpha: [0.06, 0.32], bloom: 0.45, kickDur: 2 },
      { id: 'shroom5', type: 'mask', mask: 'shroom5', anim: { kind: 'flicker', speed: 0.25 }, alpha: [0.05, 0.28], bloom: 0.4, kickDur: 2 },
      { id: 'shroomLight', type: 'glow', points: [[442, 358, 34], [397, 412, 24], [430, 540, 34], [432, 716, 26], [424, 806, 20]], color: [90, 220, 255], anim: 'flicker', speed: 0.3, alpha: [0.03, 0.1], kickDur: 2 },
      { id: 'spores', type: 'particles', kind: 'mote', from: [[442, 358, 14], [397, 412, 10], [430, 540, 20], [432, 716, 14]], rate: 0.5, max: 7, color: [140, 240, 255], size: [0.5, 1.1], life: [4, 7], alpha: 0.6, speed: 0.4 },
      // The rod (top right): a spark wakes on it only when tapped.
      { id: 'rodGlow', type: 'glow', points: [[410, 95, 30]], color: [140, 220, 255], anim: 'pulse', period: 7, alpha: [0, 0.04], kickDur: 1.6 },
      { id: 'rodBolt', type: 'lightning', every: [9999, 9999], color: [170, 235, 255], zones: [
        { from: [380, 0, 459, 10], to: [415, 50, 430, 65], jag: 12, flash: [420, 60, 34] },
      ] },
      { id: 'rodSparks', type: 'particles', kind: 'glint', from: [[420, 60, 16]], rate: 0, max: 16, color: [220, 245, 255], size: [1, 2], life: [0.3, 0.7] },
      // The water-wheel's painted sparks crackle softly.
      { id: 'sparks', type: 'mask', mask: 'sparks', anim: { kind: 'flicker', speed: 5 }, alpha: [0.04, 0.26], bloom: 0.4, kickDur: 1.5 },
      { id: 'wheelGlow', type: 'glow', points: [[402, 858, 22]], color: [255, 190, 90], anim: 'flicker', speed: 3, alpha: [0.03, 0.1], kickDur: 1.5 },
      { id: 'wheelSparks', type: 'particles', kind: 'ember', from: [[402, 858, 10]], rate: 0.5, max: 6, color: [255, 210, 110], size: [0.5, 1], life: [0.4, 0.9], speed: 1.2 },
      { id: 'zap', type: 'lightning', every: [9999, 9999], color: [120, 230, 255], zones: [
        { from: [200, 480, 260, 520], to: [260, 640, 320, 700], jag: 18, flash: [260, 590, 50] },
        { from: [280, 500, 330, 540], to: [190, 620, 250, 680], jag: 18, flash: [240, 580, 50] },
      ] },
      // 5. Air.
      { type: 'fog', area: [-20, -20, 480, 220], count: 3, size: [80, 130], speed: 2, color: [40, 110, 140], alpha: 0.05 },
      { type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 0.7, max: 10, color: [150, 230, 255], size: [0.4, 1], life: [5, 9], alpha: 0.45, speed: 0.35 },
    ],
    pokes: [
      { area: [340, 30, 459, 175], sound: 'crack', strike: 'rodBolt', kick: ['rodGlow'], flare: [170, 235, 255], glyph: '⚡', burst: { layer: 'rodSparks', n: 14, spread: 22 } },
      { area: [0, 35, 110, 205], sound: 'splash', rustle: 70, flare: [255, 240, 120], glyph: '⚡', burst: { layer: 'bubbles', n: 5, at: [47, 184], spread: 4 } },
      { area: [0, 860, 145, 995], sound: 'splash', rustle: 70, flare: [255, 240, 120], glyph: '⚡', burst: { layer: 'bubbles', n: 5, at: [128, 927], spread: 4 } },
      { area: [380, 320, 459, 600], sound: 'chime', kick: ['shroom1', 'shroom2', 'shroom3', 'shroomLight'], flare: [90, 220, 255], glyph: '✨', burst: { layer: 'spores', n: 8, spread: 26 } },
      { area: [300, 815, 459, 1010], sound: 'grind', kick: ['wheelGlow', 'sparks'], flare: [255, 190, 90], glyph: '⚙️', burst: { layer: 'wheelSparks', n: 10, spread: 14 } },
      { area: [180, 470, 340, 730], sound: 'crack', strike: 'zap', kick: ['cracks', 'cracks2', 'caustics'], flare: [120, 230, 255], glyph: '⚡', burst: { layer: 'ripples', n: 2 } },
    ],
    reactions: {
      chain: { kick: ['cracks', 'cracks2', 'caustics', 'shroomLight'], burst: [{ layer: 'ripples', n: 2 }, { layer: 'centreRipples', n: 1 }] },
    },
  },
  // ---- Ice Age: a half-thawed tundra ----------------------------------------------------
  'ice-age-land': {
    wind: { dir: 1, every: [5, 10], speed: [170, 260], width: [150, 260], lean: 0.35 },
    layers: [
      // 1. Ground. Cloud shadows slide over the tundra; a slow sheen of pale sun crosses the snow.
      { type: 'fog', area: [-420, -160, 1440, 730], count: 3, size: [230, 330], speed: 7, leftward: 0, color: [26, 36, 56], alpha: 0.075, gustPush: 0 },
      { id: 'snow', type: 'mask', mask: 'snow', anim: { kind: 'wave', along: 'x', band: 340, speed: 22 }, alpha: [0, 0.16], gain: 0.55 },
      // 3. The frozen streams: light wavers in the water under the ice, two currents crossing.
      { id: 'streamFlow', type: 'flow', mask: 'stream', dir: [-1, 0.55], dist: 16, period: 3.2, alpha: 0.9 },
      { id: 'stream', type: 'mask', mask: 'stream', anim: { kind: 'wave', along: 'x', band: 70, speed: 16 }, alpha: [0, 0.42], gain: 0.7 },
      { id: 'stream2', type: 'mask', mask: 'stream', anim: { kind: 'wave', along: 'y', band: 46, speed: 9 }, alpha: [0, 0.3], gain: 0.5 },
      { type: 'particles', kind: 'glint', area: { mask: 'stream' }, rate: 2.2, max: 10, color: [235, 250, 255], size: [0.9, 1.7], life: [0.5, 1.1] },
      // Now and then the ice cracks with a white flash along a stream.
      { id: 'cracks', type: 'lightning', every: [11, 22], color: [200, 235, 255], zones: [
        { from: [300, 20, 380, 50], to: [400, 50, 470, 90], jag: 10, flash: [380, 55, 22] },
        { from: [40, 250, 110, 280], to: [140, 220, 200, 250], jag: 10, flash: [120, 250, 22] },
        { from: [270, 90, 300, 110], to: [320, 60, 360, 80], jag: 8, flash: [310, 85, 18] },
      ] },
      // 2. Growth. Every dry grass tuft and bare twig sways on its own root; the gusts bend them in turn.
      { id: 'grass', type: 'sprites', mask: 'grass', bend: 0.07, gustBend: 0.26, period: [2.4, 3.8] },
      { id: 'twigs', type: 'sprites', mask: 'twigs', bend: 0.025, gustBend: 0.09, period: [3.4, 5.6] },
      // Snow sparkles where the sun catches it.
      { type: 'particles', kind: 'glint', area: { mask: 'snow' }, rate: 3.2, max: 16, color: [255, 255, 255], size: [0.8, 1.5], life: [0.4, 0.9] },
      // 4. Corners.
      // Top left, the mammoth skull: frost glints on the bone, dust settles around it; tapped, it
      // rattles and a cold blue light wakes in its eye sockets.
      { id: 'skull', type: 'echo', box: [44, 18, 202, 166], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.3, period: 0.35, pivot: [118, 130] } },
      { type: 'particles', kind: 'glint', area: { mask: 'bone' }, rate: 0.6, max: 3, color: [255, 250, 235], size: [0.8, 1.4], life: [0.6, 1.2] },
      { id: 'dust', type: 'particles', kind: 'mote', area: [30, 10, 215, 175], rate: 0.9, max: 9, color: [255, 245, 225], size: [0.5, 1.1], life: [3, 6], alpha: 0.45, speed: 0.6 },
      { id: 'eyes', type: 'glow', points: [[92, 50, 9], [76, 66, 7]], color: [140, 215, 255], anim: 'pulse', period: 2.2, alpha: [0, 0.03], kickDur: 2.6 },
      // Top right, the ice crystals: light refracts up through them, they pulse, a halo breathes.
      { id: 'halo', type: 'glow', points: [[922, 70, 52]], color: [140, 205, 255], anim: 'pulse', period: 4.5, alpha: [0.05, 0.16], kickDur: 2 },
      { id: 'crystal', type: 'mask', mask: 'crystal', anim: { kind: 'pulse', period: 3.6 }, alpha: [0.12, 0.5], bloom: 0.55, kickDur: 2 },
      { id: 'refract', type: 'mask', mask: 'crystal', anim: { kind: 'wave', along: 'y', band: 55, speed: 18 }, alpha: [0, 0.75], gain: 0.8 },
      { id: 'sparkles', type: 'particles', kind: 'glint', area: { mask: 'crystal' }, rate: 1.4, max: 6, color: [220, 245, 255], size: [1, 1.9], life: [0.5, 1] },
      // Bottom left, the stone fire ring: cold ash breathes off it and a last ember winks; tapped,
      // the fire catches for a few seconds and sparks fly. The spear rattles on the ground.
      { id: 'ash', type: 'particles', kind: 'smoke', from: [[110, 482, 18]], rate: 0.5, max: 5, color: [150, 150, 160], size: [5, 9], life: [2.5, 4], alpha: 0.12, speed: 0.5 },
      { id: 'warm', type: 'glow', points: [[110, 484, 16]], color: [255, 110, 40], anim: 'pulse', period: 5, alpha: [0, 0.1], kickDur: 4 },
      { id: 'fire', type: 'flames', points: [[110, 494, 36, 34]], tongues: 5, idle: 0, kickDur: 4.5 },
      { id: 'embers', type: 'particles', kind: 'ember', from: [[110, 484, 16]], rate: 0.12, max: 3, color: [255, 120, 40], size: [0.6, 1.2], life: [1.2, 2.4], speed: 0.8 },
      { id: 'spear', type: 'echo', box: [124, 450, 226, 557], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [176, 504] } },
      // Bottom right, the painted rock: a damp sheen drifts across the stone; tapped, the ochre
      // handprints pulse with a ritual glow to a drumbeat.
      { id: 'sheen', type: 'mask', mask: 'rock', anim: { kind: 'wave', along: 'x', band: 120, speed: 11 }, alpha: [0, 0.22], gain: 0.45 },
      { id: 'hands', type: 'mask', mask: 'hands', anim: { kind: 'pulse', period: 6 }, alpha: [0, 0.14], bloom: 0.9, kickDur: 3 },
      { id: 'handGlow', type: 'glow', points: [[905, 468, 60]], color: [255, 80, 45], anim: 'pulse', period: 6, alpha: [0, 0.03], kickDur: 3 },
      { id: 'ochre', type: 'particles', kind: 'mote', area: [850, 430, 960, 505], rate: 0, max: 24, color: [255, 120, 80], size: [0.7, 1.4], life: [1, 2], alpha: 0.8, speed: 1.4 },
      // 5. Air. Mist creeps along the streams; snow flurries drift across at three depths.
      { type: 'fog', area: [-60, 170, 280, 350], count: 6, size: [50, 90], speed: 4, color: [225, 236, 248], alpha: 0.12 },
      { type: 'fog', area: [230, -30, 540, 140], count: 5, size: [50, 90], speed: 4, color: [225, 236, 248], alpha: 0.11 },
      { id: 'flurry', type: 'particles', kind: 'snow', area: [-60, -20, 1024, 572], rate: 6, max: 70, color: SNOW, size: [1.2, 2.6], life: [5, 9], drift: 16, gustPush: 80 },
    ],
    pokes: [
      { area: [44, 15, 205, 165], sound: 'rattle', kick: ['skull', 'eyes'], flare: FROST, glyph: '🦴', burst: { layer: 'dust', n: 10, spread: 30 } },
      { area: [860, 5, 985, 132], sound: 'chime', kick: ['crystal', 'halo', 'refract'], flare: FROST, glyph: '❄️', burst: { layer: 'sparkles', n: 12, spread: 40 } },
      { area: [62, 430, 165, 530], sound: 'ignite', kick: ['fire', 'warm'], flare: [255, 150, 60], glyph: '🔥', burst: { layer: 'embers', n: 22, at: [110, 484], spread: 18 } },
      { area: [124, 450, 226, 557], sound: 'clink', kick: ['spear'], flare: [230, 220, 200] },
      { area: [805, 410, 988, 548], sound: 'drum', kick: ['hands', 'handGlow'], flare: [255, 90, 60], glyph: '✋', burst: { layer: 'ochre', n: 20, at: [905, 468], spread: 45 } },
      { area: [245, 0, 515, 140], sound: 'crack', strike: 'cracks', zone: 0, kick: ['stream'], flare: FROST },
      { area: [0, 175, 255, 345], sound: 'crack', strike: 'cracks', zone: 1, kick: ['stream'], flare: FROST },
    ],
  },
  'ice-age-portrait': {
    wind: { dir: 1, every: [5, 10], speed: [110, 170], width: [120, 220], lean: 0.12 },
    layers: [
      { type: 'fog', area: [-300, -200, 760, 1220], count: 3, size: [180, 260], speed: 6, leftward: 0, color: [26, 36, 56], alpha: 0.075, gustPush: 0 },
      { id: 'snow', type: 'mask', mask: 'snow', anim: { kind: 'wave', along: 'y', band: 420, speed: 26 }, alpha: [0, 0.16], gain: 0.55 },
      { id: 'streamFlow', type: 'flow', mask: 'stream', dir: [-1, 0.5], dist: 12, period: 3.2, alpha: 0.9 },
      { id: 'stream', type: 'mask', mask: 'stream', anim: { kind: 'wave', along: 'x', band: 60, speed: 14 }, alpha: [0, 0.42], gain: 0.7 },
      { id: 'stream2', type: 'mask', mask: 'stream', anim: { kind: 'wave', along: 'y', band: 40, speed: 8 }, alpha: [0, 0.3], gain: 0.5 },
      { type: 'particles', kind: 'glint', area: { mask: 'stream' }, rate: 2, max: 9, color: [235, 250, 255], size: [0.9, 1.6], life: [0.5, 1.1] },
      { id: 'cracks', type: 'lightning', every: [11, 22], color: [200, 235, 255], zones: [
        { from: [150, 20, 190, 40], to: [220, 40, 260, 70], jag: 8, flash: [205, 45, 18] },
        { from: [10, 150, 40, 170], to: [80, 130, 130, 150], jag: 8, flash: [70, 150, 18] },
        { from: [10, 830, 40, 850], to: [60, 810, 110, 830], jag: 8, flash: [55, 830, 18] },
      ] },
      { id: 'grass', type: 'sprites', mask: 'grass', bend: 0.07, gustBend: 0.26, period: [2.4, 3.8] },
      { id: 'twigs', type: 'sprites', mask: 'twigs', bend: 0.025, gustBend: 0.09, period: [3.4, 5.6] },
      { type: 'particles', kind: 'glint', area: { mask: 'snow' }, rate: 3.2, max: 16, color: [255, 255, 255], size: [0.8, 1.4], life: [0.4, 0.9] },
      { id: 'skull', type: 'echo', box: [18, 10, 114, 102], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.3, period: 0.35, pivot: [66, 76] } },
      { type: 'particles', kind: 'glint', area: { mask: 'bone' }, rate: 0.5, max: 3, color: [255, 250, 235], size: [0.8, 1.3], life: [0.6, 1.2] },
      { id: 'dust', type: 'particles', kind: 'mote', area: [10, 5, 125, 110], rate: 0.7, max: 7, color: [255, 245, 225], size: [0.5, 1], life: [3, 6], alpha: 0.45, speed: 0.6 },
      { id: 'eyes', type: 'glow', points: [[44, 34, 6], [36, 44, 5]], color: [140, 215, 255], anim: 'pulse', period: 2.2, alpha: [0, 0.03], kickDur: 2.6 },
      { id: 'halo', type: 'glow', points: [[412, 44, 34]], color: [140, 205, 255], anim: 'pulse', period: 4.5, alpha: [0.05, 0.16], kickDur: 2 },
      { id: 'crystal', type: 'mask', mask: 'crystal', anim: { kind: 'pulse', period: 3.6 }, alpha: [0.12, 0.5], bloom: 0.55, kickDur: 2 },
      { id: 'refract', type: 'mask', mask: 'crystal', anim: { kind: 'wave', along: 'y', band: 40, speed: 14 }, alpha: [0, 0.75], gain: 0.8 },
      { id: 'sparkles', type: 'particles', kind: 'glint', area: { mask: 'crystal' }, rate: 1.2, max: 5, color: [220, 245, 255], size: [1, 1.8], life: [0.5, 1] },
      // Two fire rings (top and bottom of the left edge) and two painted rocks on the right.
      { id: 'ash', type: 'particles', kind: 'smoke', from: [[62, 291, 10], [47, 970, 10]], rate: 0.6, max: 6, color: [150, 150, 160], size: [4, 7], life: [2.5, 4], alpha: 0.12, speed: 0.5 },
      { id: 'warm', type: 'glow', points: [[62, 292, 10]], color: [255, 110, 40], anim: 'pulse', period: 5, alpha: [0, 0.1], kickDur: 4 },
      { id: 'warm2', type: 'glow', points: [[47, 971, 10]], color: [255, 110, 40], anim: 'pulse', period: 5.5, alpha: [0, 0.1], kickDur: 4 },
      { id: 'fire', type: 'flames', points: [[62, 298, 22, 24]], tongues: 4, idle: 0, kickDur: 4.5 },
      { id: 'fire2', type: 'flames', points: [[47, 977, 20, 22]], tongues: 4, idle: 0, kickDur: 4.5 },
      { id: 'embers', type: 'particles', kind: 'ember', from: [[62, 292, 10], [47, 971, 9]], rate: 0.15, max: 3, color: [255, 120, 40], size: [0.6, 1.1], life: [1.2, 2.4], speed: 0.7 },
      { id: 'spear', type: 'echo', box: [70, 272, 125, 336], feather: 5, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [97, 304] } },
      { id: 'spear2', type: 'echo', box: [55, 940, 100, 1016], feather: 5, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [77, 978] } },
      { id: 'sheen', type: 'mask', mask: 'rock', anim: { kind: 'wave', along: 'y', band: 90, speed: 10 }, alpha: [0, 0.22], gain: 0.45 },
      { id: 'hands', type: 'mask', mask: 'hands', anim: { kind: 'pulse', period: 6 }, alpha: [0, 0.14], bloom: 0.9, kickDur: 3 },
      { id: 'handGlow', type: 'glow', points: [[420, 615, 40], [402, 965, 40]], color: [255, 80, 45], anim: 'pulse', period: 6, alpha: [0, 0.03], kickDur: 3 },
      { id: 'ochre', type: 'particles', kind: 'mote', area: [384, 592, 459, 640], rate: 0, max: 24, color: [255, 120, 80], size: [0.7, 1.3], life: [1, 2], alpha: 0.8, speed: 1.4 },
      { type: 'fog', area: [100, -30, 300, 100], count: 4, size: [40, 70], speed: 3, color: [225, 236, 248], alpha: 0.11 },
      { type: 'fog', area: [-60, 90, 170, 220], count: 4, size: [40, 70], speed: 3, color: [225, 236, 248], alpha: 0.11 },
      { type: 'fog', area: [-60, 770, 150, 900], count: 4, size: [40, 70], speed: 3, color: [225, 236, 248], alpha: 0.11 },
      { id: 'flurry', type: 'particles', kind: 'snow', area: [-40, -20, 459, 1024], rate: 7, max: 70, color: SNOW, size: [1.1, 2.4], life: [5, 9], drift: 12, gustPush: 60 },
    ],
    pokes: [
      { area: [18, 8, 116, 104], sound: 'rattle', kick: ['skull', 'eyes'], flare: FROST, glyph: '🦴', burst: { layer: 'dust', n: 8, spread: 22 } },
      { area: [374, 2, 454, 84], sound: 'chime', kick: ['crystal', 'halo', 'refract'], flare: FROST, glyph: '❄️', burst: { layer: 'sparkles', n: 10, spread: 26 } },
      { area: [24, 258, 92, 322], sound: 'ignite', kick: ['fire', 'warm'], flare: [255, 150, 60], glyph: '🔥', burst: { layer: 'embers', n: 18, at: [62, 292], spread: 10 } },
      { area: [10, 938, 76, 1004], sound: 'ignite', kick: ['fire2', 'warm2'], flare: [255, 150, 60], glyph: '🔥', burst: { layer: 'embers', n: 18, at: [47, 971], spread: 10 } },
      { area: [92, 272, 128, 338], sound: 'clink', kick: ['spear'], flare: [230, 220, 200] },
      { area: [76, 940, 102, 1018], sound: 'clink', kick: ['spear2'], flare: [230, 220, 200] },
      { area: [372, 584, 459, 664], sound: 'drum', kick: ['hands', 'handGlow'], flare: [255, 90, 60], glyph: '✋', burst: { layer: 'ochre', n: 18, at: [420, 615], spread: 28 } },
      { area: [356, 930, 448, 1010], sound: 'drum', kick: ['hands', 'handGlow'], flare: [255, 90, 60], glyph: '✋', burst: { layer: 'ochre', n: 18, at: [402, 965], spread: 28 } },
      { area: [135, 0, 268, 88], sound: 'crack', strike: 'cracks', zone: 0, kick: ['stream'], flare: FROST },
      { area: [0, 108, 142, 202], sound: 'crack', strike: 'cracks', zone: 1, kick: ['stream'], flare: FROST },
      { area: [0, 788, 118, 884], sound: 'crack', strike: 'cracks', zone: 2, kick: ['stream'], flare: FROST },
    ],
  },

  // ---- Acidic: an acid cavern -------------------------------------------------------------
  'acidic-land': {
    wind: null,
    layers: [
      // Ground: the acid pools breathe and their surfaces creep; the puddles on the crust glow.
      { id: 'poolFlow', type: 'flow', mask: 'pools', dir: [1, 0.25], dist: 14, period: 4, alpha: 0.9, glow: 0.35, glowPeriod: 3 },
      { id: 'pools', type: 'mask', mask: 'pools', anim: { kind: 'wave', along: 'x', band: 90, speed: 14 }, alpha: [0.05, 0.45], gain: 0.7 },
      { id: 'glow', type: 'mask', mask: 'glow', anim: { kind: 'pulse', period: 3.2 }, alpha: [0.1, 0.55], bloom: 0.8, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'pools' }, rate: 7, max: 34, color: [190, 255, 90], size: [1, 2.6], life: [0.5, 1.2] },
      { type: 'particles', kind: 'glint', area: { mask: 'glow' }, rate: 1.5, max: 6, color: [230, 255, 170], size: [0.8, 1.5], life: [0.4, 0.8] },
      // Slime drips from the stalactites and the ledges, splashing into the pools below.
      { id: 'drips', type: 'particles', kind: 'drip', from: [[940, 112, 2], [905, 98, 2], [986, 62, 2], [316, 64, 2], [44, 255, 2], [104, 250, 2], [728, 470, 2], [698, 480, 2], [758, 488, 2], [402, 496, 2]],
        rate: 2.2, max: 10, color: [150, 255, 60], size: [1, 1.6], life: [3, 4], fall: 34, splashColor: [180, 255, 90] },
      // Steam vents breathe toxic fumes.
      { id: 'steam', type: 'particles', kind: 'smoke', from: [[452, 64, 10], [822, 72, 10], [952, 282, 12], [448, 520, 14], [968, 210, 10]], rate: 2.2, max: 22, color: [140, 210, 120], size: [6, 11], life: [2.5, 4], alpha: 0.16, speed: 0.6 },
      // Corners. Top left, the flask: it bubbles and glows; tapped, it boils over.
      { id: 'flask', type: 'mask', mask: 'flask', anim: { kind: 'pulse', period: 2.4 }, alpha: [0.15, 0.5], bloom: 0.7, kickDur: 2 },
      { id: 'fbub', type: 'particles', kind: 'bubble', from: [[84, 84, 12]], rate: 3, max: 10, color: [200, 255, 120], size: [0.8, 1.6], life: [0.4, 0.9] },
      // Bottom left, the skull: green light glows in its sockets; tapped, it rattles.
      { id: 'skull', type: 'echo', box: [30, 440, 152, 548], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.3, period: 0.35, pivot: [90, 520] } },
      { id: 'eyes', type: 'glow', points: [[70, 482, 8], [100, 482, 8]], color: [140, 255, 80], anim: 'pulse', period: 3, alpha: [0.05, 0.25], kickDur: 2.5 },
      // Bottom right, the crystal: it pulses from inside, light runs up it, glints flash.
      { id: 'halo', type: 'glow', points: [[940, 478, 52]], color: [120, 255, 90], anim: 'pulse', period: 4, alpha: [0.08, 0.2], kickDur: 2 },
      { id: 'crystal', type: 'mask', mask: 'crystal', anim: { kind: 'pulse', period: 3.4 }, alpha: [0.15, 0.55], bloom: 0.6, kickDur: 2 },
      { id: 'refract', type: 'mask', mask: 'crystal', anim: { kind: 'wave', along: 'y', band: 50, speed: 18 }, alpha: [0, 0.7], gain: 0.8 },
      { id: 'sparkles', type: 'particles', kind: 'glint', area: { mask: 'crystal' }, rate: 1.4, max: 6, color: [220, 255, 190], size: [1, 1.8], life: [0.5, 1] },
      // Air: toxic haze over the pools and green motes rising.
      { type: 'fog', area: [-60, 220, 220, 420], count: 6, size: [50, 90], speed: 4, color: [90, 200, 70], alpha: 0.1, blend: 'lighter' },
      { type: 'fog', area: [820, 260, 1084, 420], count: 6, size: [50, 90], speed: 4, color: [90, 200, 70], alpha: 0.1, blend: 'lighter' },
      { type: 'fog', area: [200, 30, 860, 140], count: 7, size: [60, 110], speed: 3, color: [90, 200, 70], alpha: 0.07, blend: 'lighter' },
      { id: 'motes', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2.5, max: 26, color: [170, 255, 90], size: [0.6, 1.3], life: [3, 6], alpha: 0.7, speed: 0.8 },
    ],
    pokes: [
      { area: [36, 8, 126, 128], sound: 'bloop', kick: ['flask'], flare: [150, 255, 80], glyph: '🧪', burst: { layer: 'fbub', n: 16, at: [84, 80], spread: 14 } },
      { area: [28, 438, 154, 550], sound: 'rattle', kick: ['skull', 'eyes'], flare: [150, 255, 80], glyph: '💀', burst: { layer: 'motes', n: 10, at: [90, 490], spread: 30 } },
      { area: [878, 398, 1002, 550], sound: 'chime', kick: ['crystal', 'halo', 'refract'], flare: [150, 255, 90], glyph: '💎', burst: { layer: 'sparkles', n: 12, spread: 40 } },
      { area: [850, 0, 1024, 170], sound: 'drip', kick: ['glow'], flare: [150, 255, 80], burst: { layer: 'drips', n: 4, at: [940, 112], spread: 30 } },
      { area: [380, 170, 720, 410], sound: 'squelch', kick: ['glow', 'pools'], flare: [150, 255, 80] },
    ],
  },
  'acidic-portrait': {
    wind: null,
    layers: [
      { id: 'poolFlow', type: 'flow', mask: 'pools', dir: [0.25, 1], dist: 12, period: 4, alpha: 0.9, glow: 0.35, glowPeriod: 3 },
      { id: 'pools', type: 'mask', mask: 'pools', anim: { kind: 'wave', along: 'y', band: 90, speed: 14 }, alpha: [0.05, 0.45], gain: 0.7 },
      { id: 'glow', type: 'mask', mask: 'glow', anim: { kind: 'pulse', period: 3.2 }, alpha: [0.1, 0.55], bloom: 0.8, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'pools' }, rate: 6, max: 30, color: [190, 255, 90], size: [1, 2.4], life: [0.5, 1.2] },
      { type: 'particles', kind: 'glint', area: { mask: 'glow' }, rate: 1.5, max: 6, color: [230, 255, 170], size: [0.8, 1.5], life: [0.4, 0.8] },
      { id: 'drips', type: 'particles', kind: 'drip', from: [[56, 196, 2], [100, 196, 2], [400, 64, 2], [420, 120, 2], [250, 912, 2], [272, 922, 2], [62, 714, 2]],
        rate: 1.8, max: 8, color: [150, 255, 60], size: [1, 1.5], life: [3, 4], fall: 30, splashColor: [180, 255, 90] },
      { id: 'steam', type: 'particles', kind: 'smoke', from: [[218, 80, 10], [430, 250, 10], [410, 800, 10], [60, 760, 10]], rate: 1.8, max: 18, color: [140, 210, 120], size: [5, 9], life: [2.5, 4], alpha: 0.16, speed: 0.6 },
      { id: 'flask', type: 'mask', mask: 'flask', anim: { kind: 'pulse', period: 2.4 }, alpha: [0.15, 0.5], bloom: 0.7, kickDur: 2 },
      { id: 'fbub', type: 'particles', kind: 'bubble', from: [[58, 76, 10]], rate: 2.5, max: 8, color: [200, 255, 120], size: [0.8, 1.5], life: [0.4, 0.9] },
      { id: 'skull', type: 'echo', box: [16, 404, 100, 502], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.3, period: 0.35, pivot: [58, 486] } },
      { id: 'skull2', type: 'echo', box: [16, 912, 100, 1012], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.3, period: 0.35, pivot: [58, 996] } },
      { id: 'eyes', type: 'glow', points: [[46, 446, 6], [68, 446, 6], [44, 954, 6], [66, 954, 6]], color: [140, 255, 80], anim: 'pulse', period: 3, alpha: [0.05, 0.25], kickDur: 2.5 },
      { id: 'halo', type: 'glow', points: [[400, 620, 36], [396, 950, 36]], color: [120, 255, 90], anim: 'pulse', period: 4, alpha: [0.08, 0.2], kickDur: 2 },
      { id: 'crystal', type: 'mask', mask: 'crystal', anim: { kind: 'pulse', period: 3.4 }, alpha: [0.15, 0.55], bloom: 0.6, kickDur: 2 },
      { id: 'refract', type: 'mask', mask: 'crystal', anim: { kind: 'wave', along: 'y', band: 44, speed: 16 }, alpha: [0, 0.7], gain: 0.8 },
      { id: 'sparkles', type: 'particles', kind: 'glint', area: { mask: 'crystal' }, rate: 1.4, max: 6, color: [220, 255, 190], size: [1, 1.7], life: [0.5, 1] },
      { type: 'fog', area: [-60, 180, 120, 340], count: 4, size: [40, 70], speed: 3, color: [90, 200, 70], alpha: 0.1, blend: 'lighter' },
      { type: 'fog', area: [-60, 720, 120, 900], count: 4, size: [40, 70], speed: 3, color: [90, 200, 70], alpha: 0.1, blend: 'lighter' },
      { type: 'fog', area: [340, 240, 520, 400], count: 4, size: [40, 70], speed: 3, color: [90, 200, 70], alpha: 0.1, blend: 'lighter' },
      { id: 'motes', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2.5, max: 24, color: [170, 255, 90], size: [0.6, 1.2], life: [3, 6], alpha: 0.7, speed: 0.8 },
    ],
    pokes: [
      { area: [26, 20, 90, 110], sound: 'bloop', kick: ['flask'], flare: [150, 255, 80], glyph: '🧪', burst: { layer: 'fbub', n: 14, at: [58, 72], spread: 10 } },
      { area: [14, 402, 102, 504], sound: 'rattle', kick: ['skull', 'eyes'], flare: [150, 255, 80], glyph: '💀', burst: { layer: 'motes', n: 8, at: [58, 450], spread: 24 } },
      { area: [14, 910, 102, 1014], sound: 'rattle', kick: ['skull2', 'eyes'], flare: [150, 255, 80], glyph: '💀', burst: { layer: 'motes', n: 8, at: [58, 960], spread: 24 } },
      { area: [366, 554, 438, 696], sound: 'chime', kick: ['crystal', 'halo', 'refract'], flare: [150, 255, 90], glyph: '💎', burst: { layer: 'sparkles', n: 10, spread: 30 } },
      { area: [354, 884, 438, 1016], sound: 'chime', kick: ['crystal', 'halo', 'refract'], flare: [150, 255, 90], glyph: '💎', burst: { layer: 'sparkles', n: 10, spread: 30 } },
    ],
  },

  // ---- Aliens: inside a crashed hive ship -------------------------------------------------
  'aliens-land': {
    wind: null,
    layers: [
      // Ground: light pulses along the bioluminescent veins, like blood through a body.
      { id: 'veins', type: 'mask', mask: 'veins', anim: { kind: 'wave', along: 'x', band: 160, speed: 34 }, alpha: [0.05, 0.6], gain: 0.8, kickDur: 2 },
      { id: 'veins2', type: 'mask', mask: 'veins', anim: { kind: 'pulse', period: 4.2 }, alpha: [0, 0.25], bloom: 0.5 },
      // The egg clusters breathe; something inside shifts now and then.
      { id: 'eggs', type: 'echo', box: [82, 42, 232, 162], feather: 10, motion: { kind: 'breathe', amp: 1.2, period: 3.6, pivot: [157, 150] } },
      { id: 'eggs2', type: 'echo', box: [268, 58, 322, 112], feather: 6, motion: { kind: 'breathe', amp: 1.4, period: 3.1, pivot: [295, 105] } },
      { id: 'eggs3', type: 'echo', box: [900, 272, 1024, 420], feather: 10, motion: { kind: 'breathe', amp: 1, period: 4.1, pivot: [962, 400] } },
      { id: 'eggs4', type: 'echo', box: [618, 496, 722, 572], feather: 8, motion: { kind: 'breathe', amp: 1.1, period: 3.4, pivot: [670, 560] } },
      // Top right: the glowing membrane bulb throbs.
      { id: 'bulbHalo', type: 'glow', points: [[952, 42, 58]], color: [80, 240, 255], anim: 'pulse', period: 3, alpha: [0.08, 0.24], kickDur: 2 },
      { id: 'bulb', type: 'mask', mask: 'bulb', anim: { kind: 'pulse', period: 3 }, alpha: [0.1, 0.55], bloom: 0.7, kickDur: 2 },
      // The scout probe hovers, its eye blinking.
      { id: 'probe', type: 'echo', box: [758, 72, 852, 172], feather: 8, motion: { kind: 'drift', amp: 2.4, speed: 0.5, kickAmp: 6 } },
      { id: 'probeEye', type: 'glow', points: [[803, 126, 7]], color: [120, 255, 255], anim: 'blink', period: 3.5, alpha: [0.3, 0.9], kickDur: 1.5 },
      // Bottom left: the cracked stasis pod leaks a cold glow and vapour.
      { id: 'pod', type: 'glow', points: [[176, 420, 16]], color: [90, 255, 200], anim: 'pulse', period: 2.6, alpha: [0.1, 0.4], kickDur: 2 },
      { id: 'vapour', type: 'particles', kind: 'smoke', from: [[176, 418, 10]], rate: 0.9, max: 8, color: [150, 230, 220], size: [5, 9], life: [2, 3.5], alpha: 0.16, speed: 0.6 },
      // Bottom right: the spore sac swells and glows, puffing spores.
      { id: 'sacBody', type: 'echo', box: [806, 390, 940, 510], feather: 10, motion: { kind: 'breathe', amp: 2.2, period: 2.4, pivot: [873, 450] } },
      { id: 'sac', type: 'mask', mask: 'sac', anim: { kind: 'pulse', period: 2.4 }, alpha: [0.15, 0.6], bloom: 0.8, kickDur: 2 },
      { id: 'spores', type: 'particles', kind: 'mote', from: [[873, 450, 30]], rate: 1.2, max: 14, color: [170, 255, 160], size: [0.7, 1.5], life: [3, 5], alpha: 0.75, speed: 1.2 },
      // Air: drifting cyan motes and a low teal haze.
      { type: 'fog', area: [-60, 0, 1084, 572], count: 10, size: [70, 130], speed: 3, color: [60, 200, 190], alpha: 0.06, blend: 'lighter' },
      { id: 'motes', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2.5, max: 26, color: [120, 255, 230], size: [0.6, 1.3], life: [3, 6], alpha: 0.6, speed: 0.7 },
    ],
    pokes: [
      { area: [80, 40, 234, 164], sound: 'squelch', kick: ['eggs'], flare: [140, 255, 200], glyph: '🥚', burst: { layer: 'motes', n: 10, at: [157, 100], spread: 40 } },
      { area: [756, 70, 854, 174], sound: 'beep', kick: ['probe', 'probeEye'], flare: [120, 255, 255], glyph: '🛸' },
      { area: [112, 366, 248, 494], sound: 'hiss', kick: ['pod'], flare: [90, 255, 200], burst: { layer: 'vapour', n: 6, at: [176, 418], spread: 8 } },
      { area: [804, 388, 942, 512], sound: 'squelch', kick: ['sac', 'sacBody'], flare: [170, 255, 160], glyph: '🦠', burst: { layer: 'spores', n: 18, at: [873, 450], spread: 20 } },
      { area: [880, 0, 1024, 95], sound: 'beam', kick: ['bulb', 'bulbHalo', 'veins'], flare: [80, 240, 255] },
    ],
  },
  'aliens-portrait': {
    wind: null,
    layers: [
      { id: 'veins', type: 'mask', mask: 'veins', anim: { kind: 'wave', along: 'y', band: 180, speed: 36 }, alpha: [0.05, 0.6], gain: 0.8, kickDur: 2 },
      { id: 'veins2', type: 'mask', mask: 'veins', anim: { kind: 'pulse', period: 4.2 }, alpha: [0, 0.25], bloom: 0.5 },
      { id: 'eggs', type: 'echo', box: [48, 58, 162, 188], feather: 8, motion: { kind: 'breathe', amp: 1.2, period: 3.6, pivot: [105, 176] } },
      { id: 'eggs2', type: 'echo', box: [0, 640, 100, 742], feather: 8, motion: { kind: 'breathe', amp: 1.1, period: 3.2, pivot: [50, 730] } },
      { id: 'eggs3', type: 'echo', box: [376, 688, 436, 752], feather: 6, motion: { kind: 'breathe', amp: 1.2, period: 4, pivot: [406, 744] } },
      { id: 'bulbHalo', type: 'glow', points: [[410, 60, 44]], color: [80, 240, 255], anim: 'pulse', period: 3, alpha: [0.08, 0.24], kickDur: 2 },
      { id: 'bulb', type: 'mask', mask: 'bulb', anim: { kind: 'pulse', period: 3 }, alpha: [0.1, 0.55], bloom: 0.7, kickDur: 2 },
      { id: 'probe', type: 'echo', box: [300, 105, 390, 195], feather: 8, motion: { kind: 'drift', amp: 2.2, speed: 0.5, kickAmp: 6 } },
      { id: 'probeEye', type: 'glow', points: [[345, 152, 6]], color: [120, 255, 255], anim: 'blink', period: 3.5, alpha: [0.3, 0.9], kickDur: 1.5 },
      { id: 'pod', type: 'glow', points: [[96, 890, 13]], color: [90, 255, 200], anim: 'pulse', period: 2.6, alpha: [0.1, 0.4], kickDur: 2 },
      { id: 'vapour', type: 'particles', kind: 'smoke', from: [[96, 888, 8]], rate: 0.8, max: 7, color: [150, 230, 220], size: [4, 8], life: [2, 3.5], alpha: 0.16, speed: 0.6 },
      { id: 'sacBody', type: 'echo', box: [306, 840, 440, 980], feather: 10, motion: { kind: 'breathe', amp: 2.2, period: 2.4, pivot: [373, 910] } },
      { id: 'sac', type: 'mask', mask: 'sac', anim: { kind: 'pulse', period: 2.4 }, alpha: [0.15, 0.6], bloom: 0.8, kickDur: 2 },
      { id: 'spores', type: 'particles', kind: 'mote', from: [[373, 910, 26]], rate: 1.2, max: 14, color: [170, 255, 160], size: [0.7, 1.4], life: [3, 5], alpha: 0.75, speed: 1.2 },
      { type: 'fog', area: [-60, 0, 520, 1024], count: 10, size: [60, 110], speed: 3, color: [60, 200, 190], alpha: 0.06, blend: 'lighter' },
      { id: 'motes', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2.5, max: 24, color: [120, 255, 230], size: [0.6, 1.2], life: [3, 6], alpha: 0.6, speed: 0.7 },
    ],
    pokes: [
      { area: [46, 56, 164, 190], sound: 'squelch', kick: ['eggs'], flare: [140, 255, 200], glyph: '🥚', burst: { layer: 'motes', n: 10, at: [105, 120], spread: 36 } },
      { area: [298, 103, 392, 197], sound: 'beep', kick: ['probe', 'probeEye'], flare: [120, 255, 255], glyph: '🛸' },
      { area: [36, 820, 156, 960], sound: 'hiss', kick: ['pod'], flare: [90, 255, 200], burst: { layer: 'vapour', n: 6, at: [96, 888], spread: 8 } },
      { area: [304, 838, 442, 982], sound: 'squelch', kick: ['sac', 'sacBody'], flare: [170, 255, 160], glyph: '🦠', burst: { layer: 'spores', n: 16, at: [373, 910], spread: 18 } },
      { area: [360, 12, 452, 118], sound: 'beam', kick: ['bulb', 'bulbHalo', 'veins'], flare: [80, 240, 255] },
    ],
  },

  // ---- Bees: inside a giant hive -----------------------------------------------------------
  'bees-land': {
    wind: null,
    layers: [
      // Ground: warm light drifts over the comb; honey glistens.
      { type: 'rays', beams: [[300, 0, 18, 560, 120], [720, 0, -14, 560, 120]], color: [255, 210, 120], alpha: [0.03, 0.09], period: 9 },
      { id: 'honeyFlow', type: 'flow', mask: 'honey', dir: [0, 1], dist: 10, period: 5, alpha: 0.85, glow: 0.18, glowPeriod: 4 },
      { id: 'honey', type: 'mask', mask: 'honey', anim: { kind: 'wave', along: 'x', band: 220, speed: 18 }, alpha: [0, 0.32], gain: 0.6, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'comb' }, rate: 2.5, max: 12, color: [255, 245, 200], size: [0.8, 1.5], life: [0.4, 0.9] },
      { id: 'drips', type: 'particles', kind: 'drip', from: [[578, 78, 2], [470, 62, 2], [860, 72, 2], [822, 350, 2], [208, 240, 2], [690, 195, 2], [645, 195, 2], [108, 400, 2], [985, 255, 2], [138, 142, 1]],
        rate: 1.6, max: 8, color: [255, 170, 30], size: [1, 1.7], life: [3.5, 5], fall: 22, splashColor: [255, 200, 80] },
      // Every painted bee crawls and twitches on its own spot.
      { id: 'crawl', type: 'crawlers', boxes: [[699, 38, 720, 72], [725, 56, 757, 80], [668, 58, 691, 85], [719, 94, 749, 119], [280, 177, 307, 203], [864, 220, 909, 264], [88, 227, 114, 260], [141, 241, 168, 270], [910, 250, 953, 276], [85, 275, 126, 298], [910, 275, 936, 308], [49, 320, 72, 356], [498, 322, 529, 343], [95, 356, 117, 376], [161, 364, 196, 390], [234, 417, 254, 444], [267, 422, 299, 452], [365, 459, 395, 492], [783, 470, 816, 507], [746, 471, 784, 506], [317, 479, 349, 508], [249, 490, 288, 521], [303, 531, 329, 566], [325, 541, 356, 573]], amp: 1.5, feather: 4 },
      // Corners. Top right, the paper wasp nest: wasps come and go from its mouth.
      { id: 'wasps', type: 'particles', kind: 'bee', area: [820, 0, 1024, 200], rate: 0.25, max: 3, color: [210, 170, 40], stripe: [20, 15, 10], size: [2.4, 3], life: [6, 10], speed: 1.2 },
      { id: 'nest', type: 'echo', box: [866, 10, 994, 152], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.4, pivot: [930, 20] } },
      // Top left, the honey dipper drips; bottom left, the jar glows warm; bottom right, the grub breathes in its cell.
      { id: 'dipper', type: 'particles', kind: 'drip', from: [[138, 142, 1]], rate: 0.35, max: 2, color: [255, 170, 30], size: [1.4, 2], life: [3, 4], fall: 26, splashColor: [255, 200, 80] },
      { id: 'jar', type: 'mask', mask: 'jar', anim: { kind: 'wave', along: 'y', band: 60, speed: 10 }, alpha: [0.05, 0.5], gain: 0.7, kickDur: 2 },
      { id: 'jarGlow', type: 'glow', points: [[88, 500, 40]], color: [255, 170, 50], anim: 'pulse', period: 4, alpha: [0.05, 0.16], kickDur: 2 },
      { id: 'grub', type: 'echo', box: [896, 448, 972, 538], feather: 8, motion: { kind: 'breathe', amp: 1.6, period: 2.8, pivot: [934, 493], kickAmp: 3 } },
      // Air: bees in flight, pollen motes in the warm light.
      { id: 'bees', type: 'particles', kind: 'bee', area: [60, 40, 960, 540], rate: 0.6, max: 7, color: [255, 200, 40], size: [2.2, 2.8], life: [7, 13] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2.5, max: 26, color: [255, 220, 120], size: [0.6, 1.3], life: [3, 6], alpha: 0.6, speed: 0.7 },
    ],
    pokes: [
      { area: [16, 10, 168, 152], sound: 'drip', kick: ['honey'], flare: [255, 190, 60], glyph: '🍯', burst: { layer: 'dipper', n: 3, at: [138, 142], spread: 3 } },
      { area: [864, 8, 996, 154], sound: 'buzz', kick: ['nest'], flare: [255, 200, 60], glyph: '🐝', burst: { layer: 'wasps', n: 6, at: [915, 120], spread: 10 } },
      { area: [46, 438, 130, 550], sound: 'clink', kick: ['jar', 'jarGlow'], flare: [255, 180, 60], glyph: '🍯' },
      { area: [882, 432, 984, 550], sound: 'squelch', kick: ['grub'], flare: [255, 230, 180], glyph: '🐛' },
      { area: [180, 150, 840, 470], sound: 'buzz', rustle: 80, flare: [255, 200, 60], burst: { layer: 'bees', n: 3, spread: 20 } },
    ],
  },
  'bees-portrait': {
    wind: null,
    layers: [
      { type: 'rays', beams: [[150, 0, 10, 1000, 110], [320, 0, -8, 1000, 110]], color: [255, 210, 120], alpha: [0.03, 0.09], period: 9 },
      { id: 'honeyFlow', type: 'flow', mask: 'honey', dir: [0, 1], dist: 10, period: 5, alpha: 0.85, glow: 0.18, glowPeriod: 4 },
      { id: 'honey', type: 'mask', mask: 'honey', anim: { kind: 'wave', along: 'y', band: 260, speed: 20 }, alpha: [0, 0.32], gain: 0.6, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'comb' }, rate: 2.5, max: 12, color: [255, 245, 200], size: [0.8, 1.4], life: [0.4, 0.9] },
      { id: 'drips', type: 'particles', kind: 'drip', from: [[25, 250, 2], [100, 300, 2], [110, 770, 2], [80, 775, 2], [370, 385, 2], [355, 390, 2], [200, 215, 2]],
        rate: 1.4, max: 7, color: [255, 170, 30], size: [1, 1.6], life: [3.5, 5], fall: 22, splashColor: [255, 200, 80] },
      { id: 'crawl', type: 'crawlers', boxes: [[376, 293, 393, 311], [353, 323, 372, 351], [391, 357, 427, 401], [92, 652, 116, 679], [19, 662, 57, 689], [350, 661, 375, 688], [376, 685, 404, 710], [413, 709, 446, 753], [31, 724, 57, 744], [322, 757, 355, 781], [400, 763, 432, 800], [384, 787, 407, 811], [100, 812, 134, 837], [190, 914, 223, 940]], amp: 1.4, feather: 4 },
      { id: 'wasps', type: 'particles', kind: 'bee', area: [290, 0, 459, 200], rate: 0.25, max: 3, color: [210, 170, 40], stripe: [20, 15, 10], size: [2.2, 2.8], life: [6, 10], speed: 1.2 },
      { id: 'nest', type: 'echo', box: [338, 12, 447, 142], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.4, pivot: [392, 20] } },
      { id: 'dipper', type: 'particles', kind: 'drip', from: [[80, 122, 1]], rate: 0.35, max: 2, color: [255, 170, 30], size: [1.3, 1.9], life: [3, 4], fall: 24, splashColor: [255, 200, 80] },
      { id: 'jar', type: 'mask', mask: 'jar', anim: { kind: 'wave', along: 'y', band: 60, speed: 10 }, alpha: [0.05, 0.5], gain: 0.7, kickDur: 2 },
      { id: 'jarGlow', type: 'glow', points: [[66, 945, 36]], color: [255, 170, 50], anim: 'pulse', period: 4, alpha: [0.05, 0.16], kickDur: 2 },
      { id: 'grub', type: 'echo', box: [356, 908, 426, 990], feather: 8, motion: { kind: 'breathe', amp: 1.6, period: 2.8, pivot: [391, 949], kickAmp: 3 } },
      { id: 'bees', type: 'particles', kind: 'bee', area: [30, 60, 430, 960], rate: 0.6, max: 6, color: [255, 200, 40], size: [2.1, 2.7], life: [7, 13] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2.5, max: 24, color: [255, 220, 120], size: [0.6, 1.2], life: [3, 6], alpha: 0.6, speed: 0.7 },
    ],
    pokes: [
      { area: [8, 8, 124, 134], sound: 'drip', kick: ['honey'], flare: [255, 190, 60], glyph: '🍯', burst: { layer: 'dipper', n: 3, at: [80, 122], spread: 3 } },
      { area: [336, 10, 449, 144], sound: 'buzz', kick: ['nest'], flare: [255, 200, 60], glyph: '🐝', burst: { layer: 'wasps', n: 6, at: [378, 115], spread: 10 } },
      { area: [28, 888, 106, 992], sound: 'clink', kick: ['jar', 'jarGlow'], flare: [255, 180, 60], glyph: '🍯' },
      { area: [343, 893, 437, 997], sound: 'squelch', kick: ['grub'], flare: [255, 230, 180], glyph: '🐛' },
    ],
  },

  // ---- Demons: the shore of a lake of fire -------------------------------------------------
  'demons-land': {
    wind: null,
    layers: [
      // Features: the lava river flows, its hot core churns, heat pulses run downstream.
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [0.35, 1], dist: 20, period: 3.4, alpha: 0.95, glow: 0.3, glowPeriod: 2.2 },
      { id: 'lava', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'y', band: 120, speed: 30 }, alpha: [0.05, 0.55], gain: 0.85, kickDur: 2 },
      { id: 'hot', type: 'mask', mask: 'hot', anim: { kind: 'flicker', speed: 2.5 }, alpha: [0.2, 0.75], bloom: 0.8, kickDur: 2 },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 9, max: 60, color: [255, 130, 40], size: [0.7, 1.5], life: [1.2, 2.6], speed: 1 },
      { type: 'particles', kind: 'bubble', area: { mask: 'hot' }, rate: 3, max: 14, color: [255, 220, 120], size: [1, 2.2], life: [0.4, 0.9] },
      { type: 'particles', kind: 'smoke', area: { mask: 'lava' }, rate: 1.5, max: 16, color: [60, 30, 25], size: [8, 14], life: [3, 5], alpha: 0.18, speed: 0.5 },
      // Corners. Top left, the ram skull: embers glow in its sockets; tapped, they blaze.
      { id: 'skull', type: 'echo', box: [38, 14, 162, 132], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.35, pivot: [100, 120] } },
      { id: 'eyes', type: 'glow', points: [[104, 82, 7], [126, 80, 7]], color: [255, 60, 30], anim: 'flicker', alpha: [0.15, 0.5], kickDur: 2.5 },
      // Top right, the ritual candles flicker; tapped, they flare.
      { id: 'candles', type: 'glow', points: [[853, 60, 9], [867, 48, 9], [890, 40, 9], [908, 26, 9], [925, 32, 9], [902, 84, 9], [934, 78, 9], [870, 90, 8]], color: [255, 180, 70], anim: 'flicker', alpha: [0.35, 0.9], kickDur: 2 },
      { id: 'wicks', type: 'flames', points: [[853, 64, 5, 9], [867, 52, 5, 9], [890, 44, 5, 9], [908, 30, 5, 9], [925, 36, 5, 9], [902, 88, 5, 9], [934, 82, 5, 9]], tongues: 2, alpha: 0.9 },
      // Bottom left, the chained grimoire: its chains catch the light; tapped, they rattle and it glows.
      { id: 'book', type: 'mask', mask: 'book', anim: { kind: 'wave', along: 'x', band: 70, speed: 14 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2, blend: 'lighter' },
      { id: 'bookGlow', type: 'glow', points: [[124, 478, 46]], color: [255, 50, 30], anim: 'pulse', period: 5, alpha: [0, 0.06], kickDur: 2.5 },
      // Bottom right, the cauldron of hellfire boils, steams and spits sparks.
      { id: 'brew', type: 'mask', mask: 'cauldron', anim: { kind: 'flicker', speed: 3 }, alpha: [0.3, 0.85], bloom: 0.9, kickDur: 2 },
      { id: 'brewBub', type: 'particles', kind: 'bubble', from: [[884, 440, 30]], rate: 6, max: 18, color: [255, 200, 90], size: [1.2, 2.6], life: [0.4, 0.9] },
      { id: 'brewSteam', type: 'particles', kind: 'smoke', from: [[884, 432, 26]], rate: 1.6, max: 10, color: [140, 60, 40], size: [7, 12], life: [2, 3.5], alpha: 0.2, speed: 0.7 },
      { id: 'brewSparks', type: 'particles', kind: 'spark', from: [[884, 436, 24]], rate: 1.2, max: 10, color: [255, 160, 50], size: [0.8, 1.4], life: [0.6, 1.2] },
      // Air: ash falls, embers drift, a red haze breathes over the river.
      { type: 'fog', area: [100, 150, 820, 572], count: 9, size: [80, 140], speed: 4, color: [200, 60, 20], alpha: 0.07, blend: 'lighter' },
      { type: 'particles', kind: 'ash', area: [0, -10, 1024, 572], rate: 3, max: 30, color: [90, 80, 80], size: [0.8, 1.6], life: [5, 9], speed: 0.6 },
      { id: 'embers', type: 'particles', kind: 'ember', area: [0, 0, 1024, 572], rate: 1.5, max: 14, color: [255, 140, 50], size: [0.6, 1.2], life: [2, 4], speed: 0.7 },
    ],
    pokes: [
      { area: [36, 12, 164, 134], sound: 'growl', kick: ['skull', 'eyes'], flare: [255, 80, 30], glyph: '💀', burst: { layer: 'embers', n: 12, at: [114, 82], spread: 20 } },
      { area: [834, 12, 950, 128], sound: 'whoosh', kick: ['candles'], flare: [255, 180, 70], glyph: '🕯️' },
      { area: [64, 410, 184, 547], sound: 'rattle', kick: ['book', 'bookGlow'], flare: [255, 60, 30], glyph: '📕' },
      { area: [818, 400, 954, 524], sound: 'bloop', kick: ['brew'], flare: [255, 140, 40], glyph: '🔥', burst: [{ layer: 'brewSparks', n: 16, at: [884, 436], spread: 20 }, { layer: 'brewBub', n: 10, at: [884, 440], spread: 24 }] },
      { area: [170, 100, 470, 470], sound: 'hiss', kick: ['lava', 'hot', 'lavaFlow'], flare: [255, 120, 30] },
    ],
  },
  'demons-portrait': {
    wind: null,
    layers: [
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [0.2, 1], dist: 16, period: 3.4, alpha: 0.95, glow: 0.3, glowPeriod: 2.2 },
      { id: 'lava', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'y', band: 120, speed: 30 }, alpha: [0.05, 0.55], gain: 0.85, kickDur: 2 },
      { id: 'hot', type: 'mask', mask: 'hot', anim: { kind: 'flicker', speed: 2.5 }, alpha: [0.2, 0.75], bloom: 0.8, kickDur: 2 },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 7, max: 45, color: [255, 130, 40], size: [0.7, 1.4], life: [1.2, 2.6], speed: 1 },
      { type: 'particles', kind: 'bubble', area: { mask: 'hot' }, rate: 2.5, max: 12, color: [255, 220, 120], size: [1, 2], life: [0.4, 0.9] },
      { type: 'particles', kind: 'smoke', area: { mask: 'lava' }, rate: 1.2, max: 12, color: [60, 30, 25], size: [7, 12], life: [3, 5], alpha: 0.18, speed: 0.5 },
      { id: 'skull', type: 'echo', box: [28, 28, 138, 138], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.35, pivot: [84, 126] } },
      { id: 'eyes', type: 'glow', points: [[84, 96, 6], [104, 94, 6]], color: [255, 60, 30], anim: 'flicker', alpha: [0.15, 0.5], kickDur: 2.5 },
      { id: 'candles', type: 'glow', points: [[352, 72, 7], [366, 62, 7], [384, 56, 7], [400, 44, 7], [414, 50, 7], [394, 92, 7], [418, 92, 7]], color: [255, 180, 70], anim: 'flicker', alpha: [0.35, 0.9], kickDur: 2 },
      { id: 'wicks', type: 'flames', points: [[352, 76, 4, 8], [366, 66, 4, 8], [384, 60, 4, 8], [400, 48, 4, 8], [414, 54, 4, 8], [394, 96, 4, 8], [418, 96, 4, 8]], tongues: 2, alpha: 0.9 },
      { id: 'book', type: 'mask', mask: 'book', anim: { kind: 'wave', along: 'x', band: 70, speed: 14 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2, blend: 'lighter' },
      { id: 'bookGlow', type: 'glow', points: [[102, 926, 44]], color: [255, 50, 30], anim: 'pulse', period: 5, alpha: [0, 0.06], kickDur: 2.5 },
      { id: 'brew', type: 'mask', mask: 'cauldron', anim: { kind: 'flicker', speed: 3 }, alpha: [0.3, 0.85], bloom: 0.9, kickDur: 2 },
      { id: 'brewBub', type: 'particles', kind: 'bubble', from: [[375, 880, 26]], rate: 5, max: 16, color: [255, 200, 90], size: [1.1, 2.4], life: [0.4, 0.9] },
      { id: 'brewSteam', type: 'particles', kind: 'smoke', from: [[375, 872, 22]], rate: 1.4, max: 9, color: [140, 60, 40], size: [6, 11], life: [2, 3.5], alpha: 0.2, speed: 0.7 },
      { id: 'brewSparks', type: 'particles', kind: 'spark', from: [[375, 876, 20]], rate: 1, max: 9, color: [255, 160, 50], size: [0.8, 1.3], life: [0.6, 1.2] },
      { type: 'fog', area: [-40, 150, 500, 900], count: 8, size: [70, 120], speed: 3, color: [200, 60, 20], alpha: 0.07, blend: 'lighter' },
      { type: 'particles', kind: 'ash', area: [0, -10, 459, 1024], rate: 3, max: 28, color: [90, 80, 80], size: [0.8, 1.5], life: [5, 9], speed: 0.6 },
      { id: 'embers', type: 'particles', kind: 'ember', area: [0, 0, 459, 1024], rate: 1.5, max: 14, color: [255, 140, 50], size: [0.6, 1.1], life: [2, 4], speed: 0.7 },
    ],
    pokes: [
      { area: [26, 26, 140, 140], sound: 'growl', kick: ['skull', 'eyes'], flare: [255, 80, 30], glyph: '💀', burst: { layer: 'embers', n: 10, at: [94, 96], spread: 18 } },
      { area: [336, 34, 436, 122], sound: 'whoosh', kick: ['candles'], flare: [255, 180, 70], glyph: '🕯️' },
      { area: [44, 856, 160, 994], sound: 'rattle', kick: ['book', 'bookGlow'], flare: [255, 60, 30], glyph: '📕' },
      { area: [320, 850, 430, 954], sound: 'bloop', kick: ['brew'], flare: [255, 140, 40], glyph: '🔥', burst: [{ layer: 'brewSparks', n: 14, at: [375, 876], spread: 18 }, { layer: 'brewBub', n: 8, at: [375, 880], spread: 20 }] },
    ],
  },

  // ---- Dinosaurs: a prehistoric riverbank -------------------------------------------------
  'dinosaurs-land': {
    wind: { dir: 1, every: [6, 11], speed: [150, 230], width: [160, 280], lean: 0.3 },
    layers: [
      // Ground: cloud shadows cross the sand; the river runs and sparkles in the sunset.
      { type: 'fog', area: [-420, -160, 1440, 730], count: 3, size: [230, 330], speed: 8, leftward: 0, color: [60, 40, 20], alpha: 0.07, gustPush: 0 },
      { id: 'riverFlow', type: 'flow', mask: 'river', dir: [1, 0.35], dist: 22, period: 2.8, alpha: 0.95 },
      { id: 'river', type: 'mask', mask: 'river', anim: { kind: 'wave', along: 'x', band: 70, speed: 40 }, alpha: [0, 0.4], gain: 0.7, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'river' }, rate: 5, max: 20, color: [255, 240, 200], size: [0.9, 1.8], life: [0.3, 0.8] },
      // Growth: every clump of ferns and palms ripples out from its roots; gusts sweep through.
      { id: 'jungleL', type: 'warp', box: [0, 110, 175, 440], base: 'left', mask: 'leaves', amp: 2.2, period: 4.2, wave: 2.4 },
      { id: 'jungleT', type: 'warp', box: [190, 0, 570, 140], base: 'top', mask: 'leaves', amp: 2, period: 4.6, wave: 2 },
      { id: 'jungleB', type: 'warp', box: [180, 420, 900, 572], base: 'bottom', mask: 'leaves', amp: 2.4, period: 3.8, wave: 2.6 },
      { id: 'jungleR', type: 'warp', box: [790, 160, 1024, 440], base: 'right', mask: 'leaves', amp: 2.2, period: 4.4, wave: 2.4 },
      { id: 'fern', type: 'warp', box: [856, 16, 1002, 160], base: 'top', mask: 'leaves', amp: 2.6, period: 3.4, wave: 1.6 },
      // Corners. Top left, the nest: now and then an egg wobbles as something inside stirs.
      { id: 'eggs', type: 'echo', box: [56, 44, 146, 112], feather: 6, autoKick: [5, 10], motion: { kind: 'rock', amp: 0, kickAmp: 2.4, period: 0.22, pivot: [100, 100] } },
      // Top right, the volcano smokes and its crater glows; bottom right, the small vent too.
      { id: 'crater', type: 'mask', mask: 'lava', anim: { kind: 'flicker', speed: 2 }, alpha: [0.2, 0.8], bloom: 0.9, kickDur: 2 },
      { id: 'plume', type: 'particles', kind: 'smoke', from: [[742, 16, 8], [944, 466, 6]], rate: 2.4, max: 26, color: [120, 110, 110], size: [7, 13], life: [3, 5.5], alpha: 0.22, speed: 0.8 },
      { id: 'sparks', type: 'particles', kind: 'spark', from: [[742, 20, 6], [944, 470, 5]], rate: 0.6, max: 10, color: [255, 150, 50], size: [0.8, 1.4], life: [0.6, 1.2] },
      // Bottom left, the old bone; tapped, dust puffs off it.
      { id: 'bone', type: 'echo', box: [52, 438, 152, 518], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [100, 480] } },
      { id: 'dust', type: 'particles', kind: 'smoke', from: [[100, 482, 30]], rate: 0, max: 12, color: [200, 170, 120], size: [5, 9], life: [1.2, 2], alpha: 0.3, speed: 0.6 },
      // Air: pterosaurs glide across the sunset; dragonflies dart over the river; pollen drifts.
      { type: 'flyers', area: [380, 0, 1024, 70], every: [8, 15], speed: [40, 65], size: [6, 9], color: [60, 35, 25], flap: 5 },
      { type: 'particles', kind: 'fly', from: [[520, 120, 30], [660, 175, 30], [930, 150, 30]], rate: 0.8, max: 6, color: [80, 220, 255], size: [1.2, 1.8], life: [4, 7] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2, max: 20, color: [255, 230, 150], size: [0.6, 1.2], life: [3, 6], alpha: 0.6, speed: 0.7 },
    ],
    pokes: [
      { area: [40, 36, 152, 128], sound: 'crack', kick: ['eggs'], flare: [255, 230, 180], glyph: '🥚' },
      { area: [680, 0, 800, 70], sound: 'rumble', kick: ['crater'], flare: [255, 120, 40], glyph: '🌋', burst: [{ layer: 'sparks', n: 18, at: [742, 20], spread: 6 }, { layer: 'plume', n: 6, at: [742, 16], spread: 6 }] },
      { area: [880, 430, 1000, 545], sound: 'rumble', kick: ['crater'], flare: [255, 120, 40], glyph: '🌋', burst: [{ layer: 'sparks', n: 14, at: [944, 470], spread: 6 }, { layer: 'plume', n: 5, at: [944, 466], spread: 6 }] },
      { area: [50, 436, 154, 520], sound: 'rattle', kick: ['bone'], flare: [255, 230, 180], glyph: '🦴', burst: { layer: 'dust', n: 8, spread: 20 } },
      { area: [430, 40, 1024, 205], sound: 'splash', kick: ['river', 'riverFlow'], flare: [200, 240, 255] },
      { area: [856, 16, 1002, 160], sound: 'rustle', kick: ['fern'], flare: [160, 255, 120], glyph: '🌿' },
    ],
  },
  'dinosaurs-portrait': {
    wind: { dir: 1, every: [6, 11], speed: [110, 170], width: [140, 240], lean: 0.12 },
    layers: [
      { type: 'fog', area: [-300, -200, 760, 1220], count: 3, size: [180, 260], speed: 7, leftward: 0, color: [60, 40, 20], alpha: 0.07, gustPush: 0 },
      { id: 'riverFlow', type: 'flow', mask: 'river', dir: [0.2, 1], dist: 20, period: 2.8, alpha: 0.95 },
      { id: 'river', type: 'mask', mask: 'river', anim: { kind: 'wave', along: 'y', band: 70, speed: 40 }, alpha: [0, 0.4], gain: 0.7, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'river' }, rate: 4, max: 16, color: [230, 250, 255], size: [0.9, 1.7], life: [0.3, 0.8] },
      { id: 'jungleL', type: 'warp', box: [0, 120, 150, 880], base: 'left', mask: 'leaves', amp: 2, period: 4.2, wave: 2.4 },
      { id: 'jungleT', type: 'warp', box: [100, 0, 459, 160], base: 'top', mask: 'leaves', amp: 2, period: 4.6, wave: 2 },
      { id: 'jungleR', type: 'warp', box: [350, 130, 459, 570], base: 'right', mask: 'leaves', amp: 2, period: 4.4, wave: 2.4 },
      { id: 'jungleR2', type: 'warp', box: [290, 600, 459, 860], base: 'right', mask: 'leaves', amp: 2, period: 4, wave: 2.4 },
      { id: 'jungleB', type: 'warp', box: [100, 900, 459, 1024], base: 'bottom', mask: 'leaves', amp: 2.2, period: 3.8, wave: 2.6 },
      { id: 'eggs', type: 'echo', box: [56, 64, 124, 126], feather: 6, autoKick: [5, 10], motion: { kind: 'rock', amp: 0, kickAmp: 2.4, period: 0.22, pivot: [90, 118] } },
      { id: 'crater', type: 'mask', mask: 'lava', anim: { kind: 'flicker', speed: 2 }, alpha: [0.2, 0.8], bloom: 0.9, kickDur: 2 },
      { id: 'plume', type: 'particles', kind: 'smoke', from: [[388, 880, 6]], rate: 1.6, max: 18, color: [120, 110, 110], size: [6, 11], life: [3, 5.5], alpha: 0.22, speed: 0.8 },
      { id: 'sparks', type: 'particles', kind: 'spark', from: [[388, 884, 5]], rate: 0.5, max: 8, color: [255, 150, 50], size: [0.8, 1.3], life: [0.6, 1.2] },
      { id: 'bone', type: 'echo', box: [40, 872, 150, 966], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [95, 920] } },
      { id: 'dust', type: 'particles', kind: 'smoke', from: [[95, 920, 26]], rate: 0, max: 10, color: [200, 170, 120], size: [5, 8], life: [1.2, 2], alpha: 0.3, speed: 0.6 },
      { type: 'flyers', area: [0, 0, 459, 60], every: [9, 16], speed: [35, 55], size: [5, 8], color: [60, 35, 25], flap: 5 },
      { type: 'particles', kind: 'fly', from: [[360, 330, 24], [380, 520, 24]], rate: 0.6, max: 4, color: [80, 220, 255], size: [1.1, 1.7], life: [4, 7] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2, max: 20, color: [255, 230, 150], size: [0.6, 1.1], life: [3, 6], alpha: 0.6, speed: 0.7 },
    ],
    pokes: [
      { area: [36, 46, 144, 152], sound: 'crack', kick: ['eggs'], flare: [255, 230, 180], glyph: '🥚' },
      { area: [320, 846, 432, 962], sound: 'rumble', kick: ['crater'], flare: [255, 120, 40], glyph: '🌋', burst: [{ layer: 'sparks', n: 14, at: [388, 884], spread: 6 }, { layer: 'plume', n: 5, at: [388, 880], spread: 6 }] },
      { area: [38, 870, 152, 968], sound: 'rattle', kick: ['bone'], flare: [255, 230, 180], glyph: '🦴', burst: { layer: 'dust', n: 8, spread: 18 } },
      { area: [310, 240, 459, 700], sound: 'splash', kick: ['river', 'riverFlow'], flare: [200, 240, 255] },
    ],
  },

  // ---- Divine: a temple floating above the clouds -----------------------------------------
  'divine-land': {
    wind: { dir: 1, every: [7, 12], speed: [120, 180], width: [180, 300], lean: 0.2 },
    layers: [
      // Light: shafts of dawn sunlight sweep slowly across the temple, motes glitter in them.
      { id: 'rays', type: 'rays', beams: [[330, 0, 22, 620, 120], [700, 0, -20, 620, 110], [130, 0, 30, 520, 80], [880, 0, -26, 520, 80]], color: [255, 236, 190], alpha: [0.05, 0.2], period: 7, kickDur: 2 },
      { type: 'particles', kind: 'mote', area: [150, 0, 900, 572], rate: 4, max: 40, color: [255, 245, 210], size: [0.5, 1.2], life: [3, 6], alpha: 0.75, speed: 0.6 },
      // The gold inlay gleams as light runs across it; the three suns turn slowly.
      { id: 'gold', type: 'mask', mask: 'gold', anim: { kind: 'wave', along: 'x', band: 200, speed: 46 }, alpha: [0, 0.55], gain: 0.75, kickDur: 2 },
      { id: 'sun', type: 'echo', box: [440, 200, 584, 344], round: true, feather: 10, motion: { kind: 'spin', speed: 5 } },
      { id: 'sunL', type: 'echo', box: [140, 230, 250, 340], round: true, feather: 8, motion: { kind: 'spin', speed: -4 } },
      { id: 'sunR', type: 'echo', box: [776, 222, 886, 332], round: true, feather: 8, motion: { kind: 'spin', speed: -4 } },
      { id: 'sunGlow', type: 'glow', points: [[512, 272, 60], [195, 285, 40], [831, 277, 40]], color: [255, 220, 120], anim: 'pulse', period: 4, alpha: [0.08, 0.25], kickDur: 2 },
      // The angel wings around both hero frames beat slowly; the halos shine.
      { id: 'wingsOL', type: 'warp', box: [352, 4, 466, 128], base: 'right', amp: 2.4, period: 3.2, wave: 1.4 },
      { id: 'wingsOR', type: 'warp', box: [556, 4, 670, 128], base: 'left', amp: 2.4, period: 3.2, wave: 1.4 },
      { id: 'wingsML', type: 'warp', box: [348, 400, 462, 520], base: 'right', amp: 2.4, period: 3.4, wave: 1.4 },
      { id: 'wingsMR', type: 'warp', box: [558, 400, 672, 520], base: 'left', amp: 2.4, period: 3.4, wave: 1.4 },
      { id: 'halos', type: 'glow', points: [[452, 20, 22], [508, 14, 26], [565, 24, 22], [510, 420, 26]], color: [255, 235, 160], anim: 'pulse', period: 2.6, alpha: [0.1, 0.4], kickDur: 2 },
      // Corners. Top left, the golden bell sways on its chain; tapped, it rings and swings.
      { id: 'bell', type: 'echo', box: [22, 0, 150, 142], feather: 8, motion: { kind: 'rock', amp: 1.6, period: 3.6, pivot: [72, 0], kickAmp: 6 } },
      // Top right, the white feather stirs in the breeze.
      { id: 'feather', type: 'echo', box: [866, 8, 1004, 138], feather: 8, motion: { kind: 'rock', amp: 2.2, period: 4.2, pivot: [990, 30], kickAmp: 5 } },
      // Bottom left, incense curls up from the censer.
      { id: 'incense', type: 'particles', kind: 'wisp', from: [[78, 458, 6]], rate: 2.2, max: 18, color: [255, 240, 230], size: [3, 6], life: [2.5, 4.5], alpha: 0.3, speed: 0.8 },
      { id: 'censer', type: 'glow', points: [[78, 505, 16]], color: [255, 170, 80], anim: 'flicker', alpha: [0.1, 0.35], kickDur: 2 },
      // Bottom right, the star crystal pulses and throws sparkles.
      { id: 'star', type: 'mask', mask: 'star', anim: { kind: 'pulse', period: 2.8 }, alpha: [0.15, 0.6], bloom: 0.9, kickDur: 2 },
      { id: 'starGlow', type: 'glow', points: [[944, 492, 50]], color: [200, 220, 255], anim: 'pulse', period: 2.8, alpha: [0.08, 0.25], kickDur: 2 },
      { id: 'sparkles', type: 'particles', kind: 'glint', area: { mask: 'star' }, rate: 2, max: 8, color: [255, 255, 255], size: [1, 2], life: [0.5, 1] },
      // Air: clouds drift by at the edges, feathers float down.
      { type: 'fog', area: [-120, 120, 230, 600], count: 7, size: [70, 130], speed: 6, color: [255, 210, 200], alpha: 0.16 },
      { type: 'fog', area: [800, 100, 1150, 600], count: 7, size: [70, 130], speed: 6, color: [255, 210, 200], alpha: 0.16 },
      { id: 'feathers', type: 'particles', kind: 'petal', area: [0, -20, 1024, 300], rate: 0.5, max: 6, color: [255, 252, 245], size: [2, 3.2], life: [7, 11], speed: 0.6 },
    ],
    pokes: [
      { area: [20, 0, 152, 144], sound: 'chime', kick: ['bell', 'rays'], flare: [255, 220, 120], glyph: '🔔' },
      { area: [864, 6, 1006, 140], sound: 'flutter', kick: ['feather'], flare: [255, 255, 255], glyph: '🪶', burst: { layer: 'feathers', n: 3, at: [930, 70], spread: 30 } },
      { area: [34, 452, 124, 552], sound: 'whoosh', kick: ['censer'], flare: [255, 200, 120], burst: { layer: 'incense', n: 10, at: [78, 458], spread: 6 } },
      { area: [878, 428, 1008, 558], sound: 'chime', kick: ['star', 'starGlow'], flare: [210, 225, 255], glyph: '✨', burst: { layer: 'sparkles', n: 14, spread: 40 } },
      { area: [440, 200, 584, 344], sound: 'beam', kick: ['sun', 'sunGlow', 'gold'], flare: [255, 220, 120], glyph: '☀️' },
    ],
  },
  'divine-portrait': {
    wind: { dir: 1, every: [7, 12], speed: [100, 150], width: [160, 260], lean: 0.1 },
    layers: [
      { id: 'rays', type: 'rays', beams: [[120, 0, 16, 1000, 100], [340, 0, -14, 1000, 100], [20, 100, 24, 700, 70]], color: [255, 236, 190], alpha: [0.05, 0.2], period: 7, kickDur: 2 },
      { type: 'particles', kind: 'mote', area: [40, 0, 420, 1024], rate: 4, max: 40, color: [255, 245, 210], size: [0.5, 1.1], life: [3, 6], alpha: 0.75, speed: 0.6 },
      { id: 'gold', type: 'mask', mask: 'gold', anim: { kind: 'wave', along: 'y', band: 260, speed: 52 }, alpha: [0, 0.55], gain: 0.75, kickDur: 2 },
      { id: 'sun', type: 'echo', box: [158, 438, 302, 582], round: true, feather: 10, motion: { kind: 'spin', speed: 5 } },
      { id: 'sunGlow', type: 'glow', points: [[230, 510, 56], [230, 300, 40], [230, 700, 40]], color: [255, 220, 120], anim: 'pulse', period: 4, alpha: [0.08, 0.25], kickDur: 2 },
      { id: 'wingsOL', type: 'warp', box: [128, 102, 192, 232], base: 'right', amp: 2, period: 3.2, wave: 1.4 },
      { id: 'wingsOR', type: 'warp', box: [268, 102, 332, 232], base: 'left', amp: 2, period: 3.2, wave: 1.4 },
      { id: 'wingsML', type: 'warp', box: [128, 704, 192, 862], base: 'right', amp: 2, period: 3.4, wave: 1.4 },
      { id: 'wingsMR', type: 'warp', box: [268, 704, 332, 862], base: 'left', amp: 2, period: 3.4, wave: 1.4 },
      { id: 'halos', type: 'glow', points: [[232, 118, 28], [232, 880, 26], [232, 730, 26]], color: [255, 235, 160], anim: 'pulse', period: 2.6, alpha: [0.1, 0.4], kickDur: 2 },
      { id: 'bell', type: 'echo', box: [22, 8, 128, 150], feather: 8, motion: { kind: 'rock', amp: 1.6, period: 3.6, pivot: [42, 8], kickAmp: 6 } },
      { id: 'feather', type: 'echo', box: [332, 22, 442, 172], feather: 8, motion: { kind: 'rock', amp: 2.2, period: 4.2, pivot: [430, 40], kickAmp: 5 } },
      { id: 'incense', type: 'particles', kind: 'wisp', from: [[50, 888, 5]], rate: 2, max: 16, color: [255, 240, 230], size: [2.5, 5], life: [2.5, 4.5], alpha: 0.3, speed: 0.8 },
      { id: 'censer', type: 'glow', points: [[50, 930, 14]], color: [255, 170, 80], anim: 'flicker', alpha: [0.1, 0.35], kickDur: 2 },
      { id: 'star', type: 'mask', mask: 'star', anim: { kind: 'pulse', period: 2.8 }, alpha: [0.15, 0.6], bloom: 0.9, kickDur: 2 },
      { id: 'starGlow', type: 'glow', points: [[392, 940, 44]], color: [200, 220, 255], anim: 'pulse', period: 2.8, alpha: [0.08, 0.25], kickDur: 2 },
      { id: 'sparkles', type: 'particles', kind: 'glint', area: { mask: 'star' }, rate: 2, max: 8, color: [255, 255, 255], size: [1, 1.9], life: [0.5, 1] },
      { type: 'fog', area: [-100, 150, 80, 1000], count: 7, size: [60, 110], speed: 5, color: [255, 210, 200], alpha: 0.16 },
      { type: 'fog', area: [380, 150, 560, 1000], count: 7, size: [60, 110], speed: 5, color: [255, 210, 200], alpha: 0.16 },
      { id: 'feathers', type: 'particles', kind: 'petal', area: [0, -20, 459, 500], rate: 0.5, max: 6, color: [255, 252, 245], size: [1.8, 3], life: [7, 11], speed: 0.6 },
    ],
    pokes: [
      { area: [20, 6, 130, 152], sound: 'chime', kick: ['bell', 'rays'], flare: [255, 220, 120], glyph: '🔔' },
      { area: [330, 20, 444, 174], sound: 'flutter', kick: ['feather'], flare: [255, 255, 255], glyph: '🪶', burst: { layer: 'feathers', n: 3, at: [390, 90], spread: 30 } },
      { area: [14, 882, 94, 1002], sound: 'whoosh', kick: ['censer'], flare: [255, 200, 120], burst: { layer: 'incense', n: 10, at: [50, 888], spread: 5 } },
      { area: [336, 876, 448, 1004], sound: 'chime', kick: ['star', 'starGlow'], flare: [210, 225, 255], glyph: '✨', burst: { layer: 'sparkles', n: 12, spread: 34 } },
      { area: [158, 438, 302, 582], sound: 'beam', kick: ['sun', 'sunGlow', 'gold'], flare: [255, 220, 120], glyph: '☀️' },
    ],
  },

  // ---- Dragons: a dragon's volcanic lair ---------------------------------------------------
  'dragons-land': {
    wind: null,
    layers: [
      // Features: lava moves in every crack and pool, its heat pulsing; embers lift off it.
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [1, 0.4], dist: 14, period: 3, alpha: 0.95, glow: 0.35, glowPeriod: 1.9 },
      { id: 'lava', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'x', band: 110, speed: 26 }, alpha: [0.05, 0.55], gain: 0.85, kickDur: 2 },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 8, max: 50, color: [255, 130, 40], size: [0.7, 1.5], life: [1.2, 2.6], speed: 1 },
      { type: 'particles', kind: 'smoke', from: [[76, 350, 10], [26, 160, 10], [266, 22, 10], [980, 200, 10], [306, 46, 14]], rate: 2, max: 20, color: [90, 80, 80], size: [8, 13], life: [3, 5], alpha: 0.2, speed: 0.6 },
      // The hoard: firelight ripples over the gold, coins and gems glint.
      { id: 'coins', type: 'mask', mask: 'coins', anim: { kind: 'wave', along: 'x', band: 180, speed: 36 }, alpha: [0, 0.5], gain: 0.7, kickDur: 2 },
      { id: 'glints', type: 'particles', kind: 'glint', area: { mask: 'coins' }, rate: 6, max: 24, color: [255, 245, 200], size: [0.9, 1.8], life: [0.3, 0.8] },
      // Corners. Top left, the crown sparkles. Top right, the brazier of blue dragonfire roars.
      { id: 'crown', type: 'particles', kind: 'glint', area: [86, 32, 176, 104], rate: 1.6, max: 6, color: [255, 220, 255], size: [1, 1.8], life: [0.4, 0.9] },
      { id: 'blue', type: 'flames', points: [[880, 100, 38, 44]], tongues: 5, palette: [[200, 240, 255], [60, 140, 255], [40, 20, 160]], alpha: 0.6, kickDur: 2 },
      { id: 'blueGlow', type: 'glow', points: [[880, 80, 60]], color: [90, 150, 255], anim: 'flicker', alpha: [0.15, 0.4], kickDur: 2 },
      { id: 'blueSparks', type: 'particles', kind: 'spark', from: [[880, 70, 20]], rate: 1.5, max: 12, color: [140, 190, 255], size: [0.8, 1.4], life: [0.6, 1.2] },
      // Bottom left, the dragon egg: it glows from within and rocks now and then, about to hatch.
      { id: 'egg', type: 'echo', box: [46, 416, 158, 548], feather: 8, autoKick: [6, 11], motion: { kind: 'rock', amp: 0, kickAmp: 2.2, period: 0.25, pivot: [102, 540] } },
      { id: 'eggGlow', type: 'mask', mask: 'egg', anim: { kind: 'pulse', period: 2.4 }, alpha: [0.05, 0.4], bloom: 0.8, kickDur: 2, blend: 'lighter' },
      { id: 'eggHeat', type: 'glow', points: [[102, 482, 50]], color: [255, 80, 30], anim: 'pulse', period: 2.4, alpha: [0.08, 0.25], kickDur: 2 },
      // Bottom right, the dragonscale shield; tapped, it rings.
      { id: 'shield', type: 'echo', box: [824, 392, 1002, 562], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [913, 550] } },
      // Air: heat haze and drifting embers.
      { type: 'fog', area: [-60, 0, 1084, 572], count: 9, size: [80, 140], speed: 3, color: [220, 80, 20], alpha: 0.06, blend: 'lighter' },
      { id: 'embers', type: 'particles', kind: 'ember', area: [0, 0, 1024, 572], rate: 1.5, max: 14, color: [255, 140, 50], size: [0.6, 1.2], life: [2, 4], speed: 0.7 },
    ],
    pokes: [
      { area: [84, 28, 178, 106], sound: 'coin', kick: ['coins'], flare: [255, 220, 120], glyph: '👑', burst: { layer: 'glints', n: 10, at: [130, 70], spread: 40 } },
      { area: [816, 8, 950, 140], sound: 'whoosh', kick: ['blue', 'blueGlow'], flare: [120, 170, 255], glyph: '🔥', burst: { layer: 'blueSparks', n: 18, at: [880, 70], spread: 16 } },
      { area: [44, 414, 160, 550], sound: 'crack', kick: ['egg', 'eggGlow', 'eggHeat'], flare: [255, 100, 40], glyph: '🥚' },
      { area: [822, 390, 1004, 564], sound: 'clink', kick: ['shield'], flare: [255, 200, 140], glyph: '🛡️' },
      { area: [140, 120, 420, 460], sound: 'coin', kick: ['coins'], flare: [255, 220, 120], burst: { layer: 'glints', n: 12, spread: 60 } },
    ],
  },
  'dragons-portrait': {
    wind: null,
    layers: [
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [0.4, 1], dist: 12, period: 3, alpha: 0.95, glow: 0.35, glowPeriod: 1.9 },
      { id: 'lava', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'y', band: 120, speed: 28 }, alpha: [0.05, 0.55], gain: 0.85, kickDur: 2 },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 6, max: 40, color: [255, 130, 40], size: [0.7, 1.4], life: [1.2, 2.6], speed: 1 },
      { type: 'particles', kind: 'smoke', from: [[24, 180, 10], [20, 780, 10], [440, 300, 10]], rate: 1.4, max: 14, color: [90, 80, 80], size: [7, 12], life: [3, 5], alpha: 0.2, speed: 0.6 },
      { id: 'coins', type: 'mask', mask: 'coins', anim: { kind: 'wave', along: 'y', band: 200, speed: 40 }, alpha: [0, 0.5], gain: 0.7, kickDur: 2 },
      { id: 'glints', type: 'particles', kind: 'glint', area: { mask: 'coins' }, rate: 5, max: 20, color: [255, 245, 200], size: [0.9, 1.7], life: [0.3, 0.8] },
      { id: 'crown', type: 'particles', kind: 'glint', area: [22, 36, 100, 104], rate: 1.4, max: 5, color: [255, 220, 255], size: [1, 1.7], life: [0.4, 0.9] },
      { id: 'blue', type: 'flames', points: [[388, 98, 34, 40]], tongues: 5, palette: [[200, 240, 255], [60, 140, 255], [40, 20, 160]], alpha: 0.6, kickDur: 2 },
      { id: 'blueGlow', type: 'glow', points: [[388, 80, 52]], color: [90, 150, 255], anim: 'flicker', alpha: [0.15, 0.4], kickDur: 2 },
      { id: 'blueSparks', type: 'particles', kind: 'spark', from: [[388, 70, 18]], rate: 1.4, max: 10, color: [140, 190, 255], size: [0.8, 1.3], life: [0.6, 1.2] },
      { id: 'egg', type: 'echo', box: [34, 868, 126, 992], feather: 8, autoKick: [6, 11], motion: { kind: 'rock', amp: 0, kickAmp: 2.2, period: 0.25, pivot: [80, 984] } },
      { id: 'eggGlow', type: 'mask', mask: 'egg', anim: { kind: 'pulse', period: 2.4 }, alpha: [0.05, 0.4], bloom: 0.8, kickDur: 2, blend: 'lighter' },
      { id: 'eggHeat', type: 'glow', points: [[80, 930, 46]], color: [255, 80, 30], anim: 'pulse', period: 2.4, alpha: [0.08, 0.25], kickDur: 2 },
      { id: 'shield', type: 'echo', box: [298, 858, 452, 1012], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [375, 1000] } },
      { type: 'fog', area: [-60, 0, 520, 1024], count: 9, size: [70, 120], speed: 3, color: [220, 80, 20], alpha: 0.06, blend: 'lighter' },
      { id: 'embers', type: 'particles', kind: 'ember', area: [0, 0, 459, 1024], rate: 1.5, max: 14, color: [255, 140, 50], size: [0.6, 1.1], life: [2, 4], speed: 0.7 },
    ],
    pokes: [
      { area: [18, 32, 102, 108], sound: 'coin', kick: ['coins'], flare: [255, 220, 120], glyph: '👑', burst: { layer: 'glints', n: 10, at: [60, 70], spread: 34 } },
      { area: [330, 18, 446, 152], sound: 'whoosh', kick: ['blue', 'blueGlow'], flare: [120, 170, 255], glyph: '🔥', burst: { layer: 'blueSparks', n: 16, at: [388, 70], spread: 14 } },
      { area: [32, 866, 128, 994], sound: 'crack', kick: ['egg', 'eggGlow', 'eggHeat'], flare: [255, 100, 40], glyph: '🥚' },
      { area: [296, 856, 454, 1014], sound: 'clink', kick: ['shield'], flare: [255, 200, 140], glyph: '🛡️' },
    ],
  },

  // ---- Fungus: a glowing fungal cavern ------------------------------------------------------
  'fungus-land': {
    wind: null,
    layers: [
      // Ground: pulses of light run along the mycelium threads.
      { id: 'threads', type: 'mask', mask: 'threads', anim: { kind: 'wave', along: 'x', band: 140, speed: 40 }, alpha: [0, 0.7], gain: 0.85, kickDur: 2 },
      // The giant mushrooms breathe, each colour glowing on its own rhythm.
      { id: 'capP', type: 'echo', box: [0, 140, 178, 302], feather: 10, motion: { kind: 'breathe', amp: 1.2, period: 4.4, pivot: [60, 300] } },
      { id: 'capP2', type: 'echo', box: [128, 0, 302, 84], feather: 10, motion: { kind: 'breathe', amp: 1, period: 5, pivot: [214, 84] } },
      { id: 'capT', type: 'echo', box: [798, 74, 918, 202], feather: 10, motion: { kind: 'breathe', amp: 1.3, period: 3.8, pivot: [860, 200] } },
      { id: 'capT2', type: 'echo', box: [678, 0, 832, 72], feather: 10, motion: { kind: 'breathe', amp: 1, period: 4.6, pivot: [755, 72] } },
      { id: 'capO', type: 'echo', box: [922, 158, 1024, 342], feather: 10, motion: { kind: 'breathe', amp: 1.2, period: 4.1, pivot: [975, 340] } },
      { id: 'capO2', type: 'echo', box: [688, 458, 812, 562], feather: 10, motion: { kind: 'breathe', amp: 1.3, period: 3.6, pivot: [750, 560] } },
      { id: 'violet', type: 'mask', mask: 'violet', anim: { kind: 'pulse', period: 3.4 }, alpha: [0.08, 0.5], bloom: 0.8, kickDur: 2 },
      { id: 'teal', type: 'mask', mask: 'teal', anim: { kind: 'pulse', period: 4.1, phase: 1.3 }, alpha: [0.08, 0.5], bloom: 0.8, kickDur: 2 },
      { id: 'orange', type: 'mask', mask: 'orange', anim: { kind: 'pulse', period: 3.7, phase: 2.4 }, alpha: [0.05, 0.4], bloom: 0.7, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'teal' }, rate: 2, max: 8, color: [180, 255, 255], size: [0.8, 1.5], life: [0.5, 1] },
      // Corners. Top left, the tiny toadstools twinkle with fireflies.
      { id: 'toads', type: 'glow', points: [[48, 38, 9], [70, 30, 8], [92, 44, 8], [60, 60, 7], [100, 70, 7]], color: [255, 220, 150], anim: 'flicker', alpha: [0.15, 0.55], kickDur: 2 },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[70, 50, 30], [250, 140, 40], [820, 250, 40]], rate: 1, max: 8, color: [255, 240, 140], size: [1.2, 1.8], life: [4, 7] },
      // Top right, the puffball breathes out clouds of spores.
      { id: 'puff', type: 'particles', kind: 'smoke', from: [[912, 50, 8]], rate: 0.9, max: 10, color: [210, 200, 190], size: [6, 11], life: [2.5, 4], alpha: 0.3, speed: 0.6 },
      { id: 'puffball', type: 'echo', box: [924, 14, 1000, 112], feather: 6, motion: { kind: 'breathe', amp: 1.6, period: 2.6, pivot: [962, 108], kickAmp: 4 } },
      // Bottom left, the snail inches along its log; tapped, it pulls into its shell.
      { id: 'snail', type: 'echo', box: [60, 440, 148, 500], feather: 6, motion: { kind: 'drift', amp: 2.2, speed: 0.12 } },
      // Bottom right, the purple pod drips glowing ooze.
      { id: 'pod', type: 'mask', mask: 'violet', anim: { kind: 'wave', along: 'y', band: 60, speed: 14 }, alpha: [0, 0.4], gain: 0.6, kickDur: 2 },
      { id: 'ooze', type: 'particles', kind: 'drip', from: [[916, 522, 2], [936, 546, 2], [962, 516, 2]], rate: 0.9, max: 5, color: [220, 110, 255], size: [1.2, 1.8], life: [3, 4], fall: 18, splashColor: [230, 150, 255] },
      // Air: spores of every colour drift up through the cavern.
      { type: 'fog', area: [-60, 120, 1084, 572], count: 9, size: [80, 140], speed: 3, color: [120, 90, 200], alpha: 0.07, blend: 'lighter' },
      { id: 'spores', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 4, max: 40, color: [200, 170, 255], size: [0.6, 1.4], life: [4, 7], alpha: 0.75, speed: 0.6 },
      { id: 'spores2', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2.5, max: 26, color: [140, 255, 230], size: [0.6, 1.2], life: [4, 7], alpha: 0.7, speed: 0.6 },
    ],
    pokes: [
      { area: [22, 12, 118, 108], sound: 'chime', kick: ['toads'], flare: [255, 220, 150], glyph: '🍄', burst: { layer: 'flies', n: 5, at: [70, 50], spread: 20 } },
      { area: [900, 12, 1002, 114], sound: 'poof', kick: ['puffball'], flare: [230, 220, 210], glyph: '💨', burst: { layer: 'puff', n: 10, at: [920, 50], spread: 12 } },
      { area: [58, 438, 150, 502], sound: 'squelch', kick: ['snail'], flare: [255, 230, 180], glyph: '🐌' },
      { area: [898, 410, 982, 554], sound: 'drip', kick: ['pod', 'violet'], flare: [220, 120, 255], burst: { layer: 'ooze', n: 4, at: [936, 530], spread: 20 } },
      { area: [0, 140, 178, 302], sound: 'mushroom', kick: ['capP', 'violet'], flare: [230, 100, 255], burst: { layer: 'spores', n: 16, at: [80, 200], spread: 40 } },
      { area: [798, 74, 918, 202], sound: 'mushroom', kick: ['capT', 'teal'], flare: [100, 255, 240], burst: { layer: 'spores2', n: 16, at: [860, 130], spread: 40 } },
      { area: [922, 158, 1024, 342], sound: 'mushroom', kick: ['capO', 'orange'], flare: [255, 160, 60], burst: { layer: 'spores', n: 12, at: [975, 220], spread: 30 } },
    ],
  },
  'fungus-portrait': {
    wind: null,
    layers: [
      { id: 'threads', type: 'mask', mask: 'threads', anim: { kind: 'wave', along: 'y', band: 160, speed: 44 }, alpha: [0, 0.7], gain: 0.85, kickDur: 2 },
      { id: 'capP', type: 'echo', box: [0, 150, 112, 252], feather: 8, motion: { kind: 'breathe', amp: 1.2, period: 4.4, pivot: [40, 252] } },
      { id: 'capT', type: 'echo', box: [368, 108, 459, 218], feather: 8, motion: { kind: 'breathe', amp: 1.3, period: 3.8, pivot: [420, 218] } },
      { id: 'capO', type: 'echo', box: [392, 248, 459, 382], feather: 8, motion: { kind: 'breathe', amp: 1.2, period: 4.1, pivot: [430, 380] } },
      { id: 'capP2', type: 'echo', box: [0, 668, 118, 762], feather: 8, motion: { kind: 'breathe', amp: 1.2, period: 4.6, pivot: [40, 762] } },
      { id: 'capT2', type: 'echo', box: [338, 722, 432, 842], feather: 8, motion: { kind: 'breathe', amp: 1.2, period: 3.9, pivot: [385, 842] } },
      { id: 'capO2', type: 'echo', box: [262, 918, 352, 1002], feather: 8, motion: { kind: 'breathe', amp: 1.3, period: 3.6, pivot: [305, 1000] } },
      { id: 'violet', type: 'mask', mask: 'violet', anim: { kind: 'pulse', period: 3.4 }, alpha: [0.08, 0.5], bloom: 0.8, kickDur: 2 },
      { id: 'teal', type: 'mask', mask: 'teal', anim: { kind: 'pulse', period: 4.1, phase: 1.3 }, alpha: [0.08, 0.5], bloom: 0.8, kickDur: 2 },
      { id: 'orange', type: 'mask', mask: 'orange', anim: { kind: 'pulse', period: 3.7, phase: 2.4 }, alpha: [0.05, 0.4], bloom: 0.7, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'teal' }, rate: 2, max: 8, color: [180, 255, 255], size: [0.8, 1.4], life: [0.5, 1] },
      { id: 'toads', type: 'glow', points: [[30, 38, 8], [52, 30, 7], [74, 44, 7], [44, 62, 6], [84, 70, 6], [44, 820, 9]], color: [255, 220, 150], anim: 'flicker', alpha: [0.15, 0.55], kickDur: 2 },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[55, 50, 26], [100, 300, 30], [360, 600, 30]], rate: 1, max: 8, color: [255, 240, 140], size: [1.1, 1.7], life: [4, 7] },
      { id: 'puff', type: 'particles', kind: 'smoke', from: [[366, 52, 7]], rate: 0.9, max: 10, color: [210, 200, 190], size: [5, 10], life: [2.5, 4], alpha: 0.3, speed: 0.6 },
      { id: 'puffball', type: 'echo', box: [380, 14, 452, 108], feather: 6, motion: { kind: 'breathe', amp: 1.6, period: 2.6, pivot: [416, 104], kickAmp: 4 } },
      { id: 'snail', type: 'echo', box: [38, 910, 102, 958], feather: 6, motion: { kind: 'drift', amp: 2, speed: 0.12 } },
      { id: 'pod', type: 'mask', mask: 'violet', anim: { kind: 'wave', along: 'y', band: 60, speed: 14 }, alpha: [0, 0.4], gain: 0.6, kickDur: 2 },
      { id: 'ooze', type: 'particles', kind: 'drip', from: [[380, 980, 2], [402, 996, 2], [418, 970, 2]], rate: 0.9, max: 5, color: [220, 110, 255], size: [1.1, 1.7], life: [3, 4], fall: 16, splashColor: [230, 150, 255] },
      { type: 'fog', area: [-60, 120, 520, 1024], count: 9, size: [70, 120], speed: 3, color: [120, 90, 200], alpha: 0.07, blend: 'lighter' },
      { id: 'spores', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 4, max: 40, color: [200, 170, 255], size: [0.6, 1.3], life: [4, 7], alpha: 0.75, speed: 0.6 },
      { id: 'spores2', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2.5, max: 26, color: [140, 255, 230], size: [0.6, 1.1], life: [4, 7], alpha: 0.7, speed: 0.6 },
    ],
    pokes: [
      { area: [8, 12, 102, 104], sound: 'chime', kick: ['toads'], flare: [255, 220, 150], glyph: '🍄', burst: { layer: 'flies', n: 5, at: [55, 50], spread: 18 } },
      { area: [356, 12, 454, 110], sound: 'poof', kick: ['puffball'], flare: [230, 220, 210], glyph: '💨', burst: { layer: 'puff', n: 10, at: [372, 52], spread: 10 } },
      { area: [36, 908, 104, 960], sound: 'squelch', kick: ['snail'], flare: [255, 230, 180], glyph: '🐌' },
      { area: [362, 888, 438, 1008], sound: 'drip', kick: ['pod', 'violet'], flare: [220, 120, 255], burst: { layer: 'ooze', n: 4, at: [400, 985], spread: 16 } },
    ],
  },

  // ---- Ghosts: the flooded hall of a haunted manor -----------------------------------------
  'ghosts-land': {
    wind: null,
    layers: [
      // Light: cold moonlight slants in through the broken windows.
      { id: 'rays', type: 'rays', beams: [[260, 0, 18, 460, 70], [760, 0, -16, 460, 70], [640, 0, -8, 380, 50]], color: [170, 220, 255], alpha: [0.04, 0.14], period: 8 },
      // The black water ripples; the floating candles bob and drift, their flames dance.
      { id: 'candles', type: 'crawlers', boxes: [[438, 187, 454, 221], [551, 198, 567, 232], [447, 203, 463, 237], [359, 210, 375, 244], [614, 210, 630, 244], [659, 225, 675, 259], [576, 226, 592, 260], [397, 232, 413, 266], [334, 282, 350, 316], [317, 284, 333, 318], [728, 285, 744, 319], [685, 292, 701, 326], [591, 316, 607, 350], [602, 327, 618, 361], [370, 337, 386, 371], [527, 340, 543, 374], [678, 355, 694, 389], [598, 375, 614, 409], [392, 381, 408, 415]], amp: 1.1, feather: 3 },
      { id: 'flames', type: 'flames', points: [[446, 196, 5, 8], [559, 207, 5, 8], [455, 212, 5, 8], [367, 219, 5, 8], [622, 219, 5, 8], [667, 234, 5, 8], [584, 235, 5, 8], [405, 241, 5, 8], [342, 291, 5, 8], [325, 293, 5, 8], [736, 294, 5, 8], [693, 301, 5, 8], [599, 325, 5, 8], [610, 336, 5, 8], [378, 346, 5, 8], [535, 349, 5, 8], [686, 364, 5, 8], [606, 384, 5, 8], [400, 390, 5, 8]], tongues: 2, alpha: 0.75 },
      { id: 'candleGlow', type: 'glow', points: [[446, 193, 16], [559, 204, 16], [455, 209, 16], [367, 216, 16], [622, 216, 16], [667, 231, 16], [584, 232, 16], [405, 238, 16], [342, 288, 16], [325, 290, 16], [736, 291, 16], [693, 298, 16], [599, 322, 16], [610, 333, 16], [378, 343, 16], [535, 346, 16], [686, 361, 16], [606, 381, 16], [400, 387, 16]], color: [255, 190, 110], anim: 'flicker', alpha: [0.2, 0.55], kickDur: 2 },
      { id: 'ripples', type: 'particles', kind: 'drip', from: [[446, 217, 4], [559, 228, 4], [455, 233, 4], [367, 240, 4], [622, 240, 4], [667, 255, 4], [584, 256, 4], [405, 262, 4], [342, 312, 4], [325, 314, 4], [736, 315, 4], [693, 322, 4], [599, 346, 4], [610, 357, 4], [378, 367, 4], [535, 370, 4], [686, 385, 4], [606, 405, 4], [400, 411, 4]], rate: 2.2, max: 8, color: [0, 0, 0], size: [0.1, 0.1], life: [1.4, 1.8], fall: 1, splashColor: [170, 230, 255] },
      { type: 'particles', kind: 'glint', area: [260, 180, 760, 420], rate: 3, max: 12, color: [200, 240, 255], size: [0.8, 1.5], life: [0.4, 0.9] },
      // Corners. Top left, the candelabra's flames gutter and smoke.
      { id: 'candelabra', type: 'glow', points: [[45, 80, 12], [56, 26, 12], [76, 18, 12], [112, 40, 12], [143, 38, 12], [154, 70, 12], [100, 70, 12]], color: [255, 190, 110], anim: 'flicker', alpha: [0.3, 0.8], kickDur: 2 },
      { id: 'cflames', type: 'flames', points: [[45, 84, 6, 10], [56, 30, 6, 10], [76, 22, 6, 10], [112, 44, 6, 10], [143, 42, 6, 10], [154, 74, 6, 10], [100, 74, 6, 10]], tongues: 2, alpha: 0.85 },
      { id: 'csmoke', type: 'particles', kind: 'wisp', from: [[56, 18, 4], [112, 32, 4], [143, 30, 4]], rate: 1, max: 8, color: [200, 210, 230], size: [2, 4], life: [2, 3.5], alpha: 0.2, speed: 0.6 },
      // Top right, the haunted portrait: now and then a face glows in the cracked glass.
      { id: 'face', type: 'glow', points: [[930, 105, 34]], color: [140, 255, 220], anim: 'pulse', period: 7, alpha: [0, 0.12], autoKick: [9, 16], kickDur: 2.5 },
      { id: 'portrait', type: 'echo', box: [862, 8, 1006, 188], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [934, 10] } },
      // Bottom left, the music box: its tiny dancers turn and the gears spin.
      { id: 'dancers', type: 'echo', box: [94, 448, 158, 498], feather: 6, motion: { kind: 'rock', amp: 3, period: 2.2, pivot: [126, 496], kickAmp: 6 } },
      { id: 'gear', type: 'echo', box: [66, 466, 110, 510], round: true, feather: 4, motion: { kind: 'spin', speed: 40 } },
      { id: 'notes', type: 'particles', kind: 'mote', from: [[110, 440, 20]], rate: 0, max: 14, color: [200, 255, 240], size: [1, 1.8], life: [1.5, 2.5], alpha: 0.8, speed: 1.2 },
      // Bottom right, the empty rocking chair rocks by itself.
      { id: 'chair', type: 'echo', box: [848, 372, 1012, 532], feather: 8, motion: { kind: 'rock', amp: 2.4, period: 2.6, pivot: [930, 530], kickAmp: 4 } },
      // Air: ghosts drift through the hall, a cold mist curls over the water.
      { id: 'ghosts', type: 'particles', kind: 'spirit', area: [120, 120, 900, 470], rate: 0.12, max: 2, color: [170, 240, 255], size: [6, 9], life: [9, 14], alpha: 0.32 },
      { type: 'fog', area: [-80, 140, 1104, 572], count: 12, size: [80, 150], speed: 5, color: [120, 190, 220], alpha: 0.1 },
      { type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2, max: 20, color: [180, 240, 255], size: [0.6, 1.2], life: [3, 6], alpha: 0.6, speed: 0.6 },
    ],
    pokes: [
      { area: [28, 10, 168, 178], sound: 'whoosh', kick: ['candelabra'], flare: [255, 190, 110], glyph: '🕯️', burst: { layer: 'csmoke', n: 6, at: [100, 30], spread: 40 } },
      { area: [860, 6, 1008, 190], sound: 'groan', kick: ['face', 'portrait'], flare: [140, 255, 220], glyph: '👻', burst: { layer: 'ghosts', n: 1, at: [930, 140], spread: 4 } },
      { area: [8, 362, 188, 558], sound: 'chime', kick: ['dancers', 'gear'], flare: [200, 255, 240], glyph: '🎵', burst: { layer: 'notes', n: 10, at: [120, 440], spread: 20 } },
      { area: [846, 370, 1014, 534], sound: 'knock', kick: ['chair'], flare: [170, 230, 255], glyph: '🪑' },
      { area: [260, 180, 760, 420], sound: 'splash', kick: ['candleGlow'], rustle: 90, flare: [170, 230, 255] },
    ],
  },
  'ghosts-portrait': {
    wind: null,
    layers: [
      { id: 'rays', type: 'rays', beams: [[120, 0, 12, 700, 60], [330, 0, -10, 700, 60]], color: [170, 220, 255], alpha: [0.04, 0.14], period: 8 },
      { id: 'candles', type: 'crawlers', boxes: [[170, 206, 186, 240], [259, 215, 275, 249], [178, 228, 194, 262], [108, 230, 124, 264], [307, 240, 323, 274], [279, 250, 295, 284], [344, 258, 360, 292], [138, 259, 154, 293], [101, 328, 117, 362], [370, 328, 386, 362], [114, 337, 130, 371], [335, 346, 351, 380], [288, 389, 304, 423], [239, 404, 255, 438], [123, 407, 139, 441], [353, 420, 369, 454], [293, 444, 309, 478], [107, 481, 123, 515], [121, 490, 137, 524], [284, 542, 300, 576], [238, 559, 254, 593], [125, 564, 141, 598], [348, 570, 364, 604], [289, 603, 305, 637], [141, 609, 157, 643]], amp: 1.1, feather: 3 },
      { id: 'flames', type: 'flames', points: [[178, 215, 4, 7], [267, 224, 4, 7], [186, 237, 4, 7], [116, 239, 4, 7], [315, 249, 4, 7], [287, 259, 4, 7], [352, 267, 4, 7], [146, 268, 4, 7], [109, 337, 4, 7], [378, 337, 4, 7], [122, 346, 4, 7], [343, 355, 4, 7], [296, 398, 4, 7], [247, 413, 4, 7], [131, 416, 4, 7], [361, 429, 4, 7], [301, 453, 4, 7], [115, 490, 4, 7], [129, 499, 4, 7], [292, 551, 4, 7], [246, 568, 4, 7], [133, 573, 4, 7], [356, 579, 4, 7], [297, 612, 4, 7], [149, 618, 4, 7]], tongues: 2, alpha: 0.75 },
      { id: 'candleGlow', type: 'glow', points: [[178, 212, 13], [267, 221, 13], [186, 234, 13], [116, 236, 13], [315, 246, 13], [287, 256, 13], [352, 264, 13], [146, 265, 13], [109, 334, 13], [378, 334, 13], [122, 343, 13], [343, 352, 13], [296, 395, 13], [247, 410, 13], [131, 413, 13], [361, 426, 13], [301, 450, 13], [115, 487, 13], [129, 496, 13], [292, 548, 13], [246, 565, 13], [133, 570, 13], [356, 576, 13], [297, 609, 13], [149, 615, 13]], color: [255, 190, 110], anim: 'flicker', alpha: [0.2, 0.55], kickDur: 2 },
      { id: 'ripples', type: 'particles', kind: 'drip', from: [[178, 232, 4], [267, 241, 4], [186, 254, 4], [116, 256, 4], [315, 266, 4], [287, 276, 4], [352, 284, 4], [146, 285, 4], [109, 354, 4], [378, 354, 4], [122, 363, 4], [343, 372, 4], [296, 415, 4], [247, 430, 4], [131, 433, 4], [361, 446, 4], [301, 470, 4], [115, 507, 4], [129, 516, 4], [292, 568, 4], [246, 585, 4], [133, 590, 4], [356, 596, 4], [297, 629, 4], [149, 635, 4]], rate: 2.2, max: 8, color: [0, 0, 0], size: [0.1, 0.1], life: [1.4, 1.8], fall: 1, splashColor: [170, 230, 255] },
      { type: 'particles', kind: 'glint', area: [80, 180, 400, 640], rate: 3, max: 12, color: [200, 240, 255], size: [0.8, 1.4], life: [0.4, 0.9] },
      { id: 'candelabra', type: 'glow', points: [[22, 70, 10], [40, 26, 10], [62, 38, 10], [74, 64, 10], [94, 46, 10]], color: [255, 190, 110], anim: 'flicker', alpha: [0.3, 0.8], kickDur: 2 },
      { id: 'cflames', type: 'flames', points: [[22, 74, 5, 9], [40, 30, 5, 9], [62, 42, 5, 9], [74, 68, 5, 9], [94, 50, 5, 9]], tongues: 2, alpha: 0.85 },
      { id: 'face', type: 'glow', points: [[392, 80, 26]], color: [140, 255, 220], anim: 'pulse', period: 7, alpha: [0, 0.12], autoKick: [9, 16], kickDur: 2.5 },
      { id: 'portrait', type: 'echo', box: [346, 14, 446, 140], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [396, 16] } },
      { id: 'dancers', type: 'echo', box: [62, 930, 108, 968], feather: 5, motion: { kind: 'rock', amp: 3, period: 2.2, pivot: [85, 966], kickAmp: 6 } },
      { id: 'notes', type: 'particles', kind: 'mote', from: [[80, 920, 16]], rate: 0, max: 12, color: [200, 255, 240], size: [1, 1.7], life: [1.5, 2.5], alpha: 0.8, speed: 1.2 },
      { id: 'chair', type: 'echo', box: [356, 880, 456, 1000], feather: 6, motion: { kind: 'rock', amp: 2.4, period: 2.6, pivot: [406, 998], kickAmp: 4 } },
      { id: 'ghosts', type: 'particles', kind: 'spirit', area: [40, 150, 420, 700], rate: 0.12, max: 2, color: [170, 240, 255], size: [5, 8], life: [9, 14], alpha: 0.32 },
      { type: 'fog', area: [-80, 150, 540, 1024], count: 12, size: [70, 130], speed: 5, color: [120, 190, 220], alpha: 0.1 },
      { type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2, max: 20, color: [180, 240, 255], size: [0.6, 1.1], life: [3, 6], alpha: 0.6, speed: 0.6 },
    ],
    pokes: [
      { area: [6, 6, 110, 140], sound: 'whoosh', kick: ['candelabra'], flare: [255, 190, 110], glyph: '🕯️' },
      { area: [344, 12, 448, 142], sound: 'groan', kick: ['face', 'portrait'], flare: [140, 255, 220], glyph: '👻', burst: { layer: 'ghosts', n: 1, at: [396, 110], spread: 4 } },
      { area: [20, 880, 140, 1000], sound: 'chime', kick: ['dancers'], flare: [200, 255, 240], glyph: '🎵', burst: { layer: 'notes', n: 10, at: [80, 920], spread: 16 } },
      { area: [354, 878, 458, 1002], sound: 'knock', kick: ['chair'], flare: [170, 230, 255], glyph: '🪑' },
    ],
  },

  // ---- Lycanthropes: a moonlit forest clearing ------------------------------------------------
  'lycanthropes-land': {
    wind: { dir: 1, every: [6, 11], speed: [140, 220], width: [160, 260], lean: 0.3 },
    layers: [
      // Light: the full moon glows, clouds slip across it, its beams sweep the clearing.
      { id: 'moon', type: 'mask', mask: 'moon', anim: { kind: 'pulse', period: 6 }, alpha: [0.03, 0.22], bloom: 0.4, kickDur: 3 },
      { id: 'moonHalo', type: 'glow', points: [[140, 72, 70]], color: [200, 220, 255], anim: 'pulse', period: 6, alpha: [0.04, 0.14], kickDur: 3 },
      { type: 'fog', area: [0, 20, 320, 130], count: 3, size: [40, 70], speed: 6, leftward: 0, color: [10, 14, 30], alpha: 0.35, gustPush: 0 },
      { id: 'beams', type: 'rays', beams: [[150, 70, -38, 520, 90], [180, 60, -50, 520, 70]], color: [200, 220, 255], alpha: [0.04, 0.15], period: 9 },
      // Growth: every grass tuft sways; gusts roll through the clearing.
      { id: 'grass', type: 'sprites', mask: 'grass', bend: 0.07, gustBend: 0.24, period: [2.4, 3.8] },
      // In the dark between the trees, wolf eyes blink and watch.
      { id: 'eyes', type: 'glow', points: [[457, 38, 4], [467, 38, 4], [577, 46, 4], [590, 46, 4], [18, 270, 4], [30, 270, 4], [990, 325, 4], [1003, 325, 4]], color: [255, 230, 90], anim: 'blink', pair: true, period: 5, alpha: [0.3, 0.95], kickDur: 2 },
      // Corners. Top right, the broken chains; bottom left, the wolf skull; bottom right, the torn cloak stirs.
      { id: 'chains', type: 'echo', box: [752, 72, 918, 202], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [835, 80] } },
      { id: 'chainGlint', type: 'particles', kind: 'glint', area: [760, 80, 910, 195], rate: 0.8, max: 3, color: [220, 230, 255], size: [0.8, 1.4], life: [0.4, 0.8] },
      { id: 'skull', type: 'echo', box: [108, 412, 212, 498], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [160, 494] } },
      { id: 'cloak', type: 'warp', box: [778, 392, 968, 508], base: 'right', mask: 'cloak', amp: 1.8, period: 3.4, wave: 1.6 },
      // Air: leaves drift down, fireflies wander, silver mist hangs low.
      { id: 'leaves', type: 'particles', kind: 'petal', area: [0, -20, 1024, 200], rate: 0.8, max: 10, color: [190, 120, 50], size: [1.6, 2.6], life: [7, 11], speed: 0.6 },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[300, 200, 60], [700, 300, 60], [500, 450, 60]], rate: 1, max: 8, color: [220, 255, 150], size: [1.1, 1.7], life: [4, 7] },
      { type: 'fog', area: [-80, 300, 1104, 600], count: 10, size: [90, 160], speed: 4, color: [180, 200, 230], alpha: 0.09 },
    ],
    pokes: [
      { area: [96, 30, 186, 116], sound: 'hoot', kick: ['moon', 'moonHalo'], flare: [210, 225, 255], glyph: '🌕' },
      { area: [750, 70, 920, 204], sound: 'rattle', kick: ['chains'], flare: [220, 230, 255], glyph: '⛓️' },
      { area: [106, 410, 214, 500], sound: 'growl', kick: ['skull', 'eyes'], flare: [255, 230, 120], glyph: '🐺' },
      { area: [776, 390, 970, 510], sound: 'rustle', kick: ['cloak'], flare: [200, 60, 60] },
      { area: [400, 0, 640, 80], sound: 'growl', kick: ['eyes'], flare: [255, 230, 90], glyph: '🐺' },
    ],
  },
  'lycanthropes-portrait': {
    wind: { dir: 1, every: [6, 11], speed: [110, 170], width: [140, 220], lean: 0.12 },
    layers: [
      { id: 'moon', type: 'mask', mask: 'moon', anim: { kind: 'pulse', period: 6 }, alpha: [0.03, 0.22], bloom: 0.4, kickDur: 3 },
      { id: 'moonHalo', type: 'glow', points: [[68, 62, 60]], color: [200, 220, 255], anim: 'pulse', period: 6, alpha: [0.04, 0.14], kickDur: 3 },
      { type: 'fog', area: [0, 20, 200, 110], count: 3, size: [34, 60], speed: 5, leftward: 0, color: [10, 14, 30], alpha: 0.35, gustPush: 0 },
      { id: 'beams', type: 'rays', beams: [[70, 60, -22, 900, 80], [90, 60, -32, 900, 60]], color: [200, 220, 255], alpha: [0.04, 0.15], period: 9 },
      { id: 'grass', type: 'sprites', mask: 'grass', bend: 0.07, gustBend: 0.24, period: [2.4, 3.8] },
      { id: 'eyes', type: 'glow', points: [[203, 30, 3.5], [213, 30, 3.5], [400, 32, 3.5], [411, 32, 3.5], [436, 600, 3.5], [446, 600, 3.5]], color: [255, 230, 90], anim: 'blink', pair: true, period: 5, alpha: [0.3, 0.95], kickDur: 2 },
      { id: 'chains', type: 'echo', box: [342, 106, 424, 194], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [383, 110] } },
      { id: 'chains2', type: 'echo', box: [326, 768, 414, 934], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [370, 772] } },
      { id: 'cloak', type: 'warp', box: [52, 792, 132, 952], base: 'top', mask: 'cloak', amp: 1.8, period: 3.4, wave: 1.6 },
      { id: 'leaves', type: 'particles', kind: 'petal', area: [0, -20, 459, 300], rate: 0.8, max: 10, color: [190, 120, 50], size: [1.5, 2.4], life: [7, 11], speed: 0.6 },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[150, 300, 50], [300, 520, 50], [200, 700, 50]], rate: 1, max: 8, color: [220, 255, 150], size: [1.1, 1.6], life: [4, 7] },
      { type: 'fog', area: [-80, 400, 540, 1024], count: 10, size: [80, 140], speed: 4, color: [180, 200, 230], alpha: 0.09 },
    ],
    pokes: [
      { area: [30, 26, 108, 100], sound: 'hoot', kick: ['moon', 'moonHalo'], flare: [210, 225, 255], glyph: '🌕' },
      { area: [340, 104, 426, 196], sound: 'rattle', kick: ['chains'], flare: [220, 230, 255], glyph: '⛓️' },
      { area: [324, 766, 416, 936], sound: 'rattle', kick: ['chains2'], flare: [220, 230, 255], glyph: '⛓️' },
      { area: [50, 790, 134, 954], sound: 'rustle', kick: ['cloak'], flare: [200, 60, 60] },
    ],
  },

  // ---- Plants: an overgrown sunlit garden ----------------------------------------------------
  'plants-land': {
    wind: { dir: 1, every: [5, 9], speed: [150, 230], width: [170, 280], lean: 0.3 },
    layers: [
      // Light: dappled sunlight through the canopy shifts, shafts of light breathe.
      { id: 'rays', type: 'rays', beams: [[260, 0, 24, 520, 110], [640, 0, 16, 520, 90], [460, 0, 6, 420, 70]], color: [255, 245, 190], alpha: [0.05, 0.16], period: 8 },
      { type: 'fog', area: [100, 60, 900, 520], count: 8, size: [40, 80], speed: 5, color: [255, 250, 200], alpha: 0.07, blend: 'lighter' },
      // Growth: every edge of the garden ripples in the breeze, gusts sweep through.
      { id: 'leftG', type: 'warp', box: [0, 160, 240, 572], base: 'left', mask: 'leaves', amp: 2.2, period: 4.2, wave: 2.4 },
      { id: 'topG', type: 'warp', box: [200, 0, 830, 120], base: 'top', mask: 'leaves', amp: 2, period: 4.6, wave: 2 },
      { id: 'rightG', type: 'warp', box: [820, 120, 1024, 420], base: 'right', mask: 'leaves', amp: 2.4, period: 4, wave: 2.4 },
      { id: 'botG', type: 'warp', box: [200, 470, 790, 572], base: 'bottom', mask: 'leaves', amp: 2, period: 3.8, wave: 2.6 },
      // Corners. Top left, the giant pink flower opens and closes gently, shedding petals.
      { id: 'flower', type: 'echo', box: [52, 26, 206, 172], feather: 10, motion: { kind: 'breathe', amp: 1.6, period: 4.5, pivot: [128, 99], kickAmp: 4 } },
      { id: 'petals', type: 'particles', kind: 'petal', from: [[128, 99, 50]], rate: 0.5, max: 8, color: [255, 140, 200], size: [1.8, 2.8], life: [5, 8], speed: 0.6 },
      // Top right, a bird hops in the nest on the stump.
      { id: 'nest', type: 'echo', box: [852, 52, 940, 108], feather: 6, autoKick: [5, 9], motion: { kind: 'bob', amp: 0, kickAmp: 2, period: 0.3 } },
      // Bottom left, the watering can drips.
      { id: 'can', type: 'particles', kind: 'drip', from: [[234, 462, 2], [226, 470, 2]], rate: 0.5, max: 3, color: [170, 220, 255], size: [1, 1.5], life: [3, 4], fall: 26, splashColor: [190, 230, 255] },
      // Bottom right, the pond ripples, the frog croaks and the lily pads bob.
      { id: 'pondFlow', type: 'flow', mask: 'pond', dir: [1, 0.3], dist: 8, period: 3, alpha: 0.9 },
      { id: 'pond', type: 'mask', mask: 'pond', anim: { kind: 'wave', along: 'x', band: 60, speed: 18 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { id: 'frog', type: 'echo', box: [852, 456, 932, 512], feather: 6, autoKick: [6, 12], motion: { kind: 'breathe', amp: 1, period: 1.4, kickAmp: 4 } },
      { id: 'ripples', type: 'particles', kind: 'drip', from: [[840, 500, 40], [960, 470, 40], [930, 540, 40]], rate: 1.2, max: 5, color: [0, 0, 0], size: [0.1, 0.1], life: [1.4, 1.8], fall: 1, splashColor: [200, 240, 255] },
      // Air: butterflies flutter, pollen and petals drift on the breeze.
      { id: 'flies', type: 'particles', kind: 'fly', from: [[60, 250, 50], [960, 380, 40], [700, 140, 60]], rate: 0.6, max: 6, color: [180, 120, 255], size: [2, 2.6], life: [5, 8] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 3, max: 30, color: [255, 250, 190], size: [0.6, 1.2], life: [3, 6], alpha: 0.7, speed: 0.7 },
      { id: 'drift', type: 'particles', kind: 'petal', area: [0, -20, 1024, 300], rate: 0.6, max: 8, color: [255, 170, 210], size: [1.4, 2.2], life: [7, 11], speed: 0.6 },
    ],
    pokes: [
      { area: [50, 24, 208, 174], sound: 'rustle', kick: ['flower'], flare: [255, 140, 200], glyph: '🌸', burst: { layer: 'petals', n: 8, spread: 40 } },
      { area: [840, 20, 960, 140], sound: 'flutter', kick: ['nest'], flare: [255, 230, 180], glyph: '🐦' },
      { area: [30, 380, 250, 540], sound: 'drip', kick: ['leftG'], flare: [190, 230, 255], burst: { layer: 'can', n: 4, at: [230, 466], spread: 4 } },
      { area: [790, 420, 1024, 572], sound: 'splash', kick: ['pond', 'frog', 'pondFlow'], flare: [200, 240, 255], glyph: '🐸', burst: { layer: 'ripples', n: 4, at: [890, 490], spread: 40 } },
    ],
  },
  'plants-portrait': {
    wind: { dir: 1, every: [5, 9], speed: [110, 170], width: [140, 240], lean: 0.12 },
    layers: [
      { id: 'rays', type: 'rays', beams: [[150, 0, 14, 900, 100], [320, 0, 8, 900, 80]], color: [255, 245, 190], alpha: [0.05, 0.16], period: 8 },
      { type: 'fog', area: [40, 100, 420, 900], count: 8, size: [40, 70], speed: 5, color: [255, 250, 200], alpha: 0.07, blend: 'lighter' },
      { id: 'leftG', type: 'warp', box: [0, 220, 110, 900], base: 'left', mask: 'leaves', amp: 2, period: 4.2, wave: 2.4 },
      { id: 'rightG', type: 'warp', box: [380, 220, 459, 840], base: 'right', mask: 'leaves', amp: 2, period: 4, wave: 2.4 },
      { id: 'topG', type: 'warp', box: [0, 0, 459, 100], base: 'top', mask: 'leaves', amp: 1.8, period: 4.6, wave: 2 },
      { id: 'flower', type: 'echo', box: [30, 112, 136, 220], feather: 8, motion: { kind: 'breathe', amp: 1.6, period: 4.5, pivot: [83, 166], kickAmp: 4 } },
      { id: 'petals', type: 'particles', kind: 'petal', from: [[83, 166, 40]], rate: 0.5, max: 8, color: [255, 140, 200], size: [1.6, 2.6], life: [5, 8], speed: 0.6 },
      { id: 'nest', type: 'echo', box: [356, 128, 424, 172], feather: 6, autoKick: [5, 9], motion: { kind: 'bob', amp: 0, kickAmp: 2, period: 0.3 } },
      { id: 'can', type: 'particles', kind: 'drip', from: [[176, 946, 2]], rate: 0.5, max: 3, color: [170, 220, 255], size: [1, 1.4], life: [3, 4], fall: 22, splashColor: [190, 230, 255] },
      { id: 'pondFlow', type: 'flow', mask: 'pond', dir: [1, 0.3], dist: 8, period: 3, alpha: 0.9 },
      { id: 'pond', type: 'mask', mask: 'pond', anim: { kind: 'wave', along: 'x', band: 60, speed: 18 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { id: 'frog', type: 'echo', box: [384, 862, 430, 900], feather: 5, autoKick: [6, 12], motion: { kind: 'breathe', amp: 1, period: 1.4, kickAmp: 4 } },
      { id: 'ripples', type: 'particles', kind: 'drip', from: [[340, 900, 30], [420, 950, 30]], rate: 1, max: 4, color: [0, 0, 0], size: [0.1, 0.1], life: [1.4, 1.8], fall: 1, splashColor: [200, 240, 255] },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[40, 400, 40], [420, 400, 30], [200, 600, 60]], rate: 0.6, max: 6, color: [180, 120, 255], size: [1.8, 2.4], life: [5, 8] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 3, max: 30, color: [255, 250, 190], size: [0.6, 1.1], life: [3, 6], alpha: 0.7, speed: 0.7 },
      { id: 'drift', type: 'particles', kind: 'petal', area: [0, -20, 459, 500], rate: 0.6, max: 8, color: [255, 170, 210], size: [1.3, 2], life: [7, 11], speed: 0.6 },
    ],
    pokes: [
      { area: [28, 110, 138, 222], sound: 'rustle', kick: ['flower'], flare: [255, 140, 200], glyph: '🌸', burst: { layer: 'petals', n: 8, spread: 34 } },
      { area: [340, 90, 440, 200], sound: 'flutter', kick: ['nest'], flare: [255, 230, 180], glyph: '🐦' },
      { area: [10, 830, 190, 990], sound: 'drip', kick: ['leftG'], flare: [190, 230, 255], burst: { layer: 'can', n: 4, at: [176, 946], spread: 4 } },
      { area: [300, 830, 459, 1000], sound: 'splash', kick: ['pond', 'frog', 'pondFlow'], flare: [200, 240, 255], glyph: '🐸', burst: { layer: 'ripples', n: 4, at: [380, 910], spread: 30 } },
    ],
  },

  // ---- Radioactive: an abandoned nuclear plant ------------------------------------------------
  'radioactive-land': {
    wind: null,
    layers: [
      // Features: the glowing sludge creeps and churns, bubbles, and gives off a toxic shimmer.
      { id: 'sludgeFlow', type: 'flow', mask: 'sludge', dir: [0.3, 1], dist: 14, period: 3.6, alpha: 0.95, glow: 0.35, glowPeriod: 2.6 },
      { id: 'sludge', type: 'mask', mask: 'sludge', anim: { kind: 'wave', along: 'y', band: 120, speed: 24 }, alpha: [0.05, 0.45], gain: 0.8, kickDur: 2 },
      { id: 'hot', type: 'mask', mask: 'hot', anim: { kind: 'pulse', period: 2.2 }, alpha: [0.15, 0.6], bloom: 0.9, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'sludge' }, rate: 6, max: 30, color: [190, 255, 90], size: [1, 2.4], life: [0.5, 1.2] },
      // The barrel pours, the broken pipe dribbles sludge.
      { id: 'pour', type: 'particles', kind: 'drip', from: [[176, 128, 4], [186, 136, 4]], rate: 4, max: 10, color: [150, 255, 60], size: [1.4, 2.2], life: [3, 4], fall: 30, splashColor: [180, 255, 90] },
      { id: 'pipe', type: 'particles', kind: 'drip', from: [[862, 450, 3], [870, 456, 3]], rate: 3, max: 8, color: [150, 255, 60], size: [1.2, 2], life: [3, 4], fall: 60, splashColor: [180, 255, 90] },
      // Top right, the caged work lamp flickers and buzzes, sometimes cutting out.
      { id: 'lamp', type: 'mask', mask: 'lamp', anim: { kind: 'flicker', speed: 6 }, alpha: [0.1, 0.7], bloom: 1, kickDur: 1.5 },
      { id: 'lampGlow', type: 'glow', points: [[848, 98, 70]], color: [255, 200, 110], anim: 'flicker', alpha: [0.08, 0.3], kickDur: 1.5 },
      { id: 'lampSway', type: 'echo', box: [810, 40, 890, 140], feather: 6, motion: { kind: 'rock', amp: 1.2, period: 3.4, pivot: [870, 40], kickAmp: 4 } },
      // Bottom left, the Geiger counter's needle twitches; tapped, it clicks wildly.
      { id: 'needle', type: 'glow', points: [[130, 462, 6]], color: [255, 80, 60], anim: 'blink', period: 1.1, alpha: [0.2, 0.9], kickDur: 2 },
      { id: 'gauge', type: 'echo', box: [94, 432, 176, 496], feather: 6, autoKick: [3, 7], motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.15, pivot: [135, 492] } },
      // Air: radioactive motes drift, a sickly haze breathes, a hazard light pulses.
      { type: 'fog', area: [-60, 0, 260, 572], count: 6, size: [60, 110], speed: 3, color: [90, 220, 60], alpha: 0.1, blend: 'lighter' },
      { type: 'fog', area: [760, 0, 1084, 572], count: 6, size: [60, 110], speed: 3, color: [90, 220, 60], alpha: 0.1, blend: 'lighter' },
      { id: 'motes', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 3, max: 30, color: [170, 255, 90], size: [0.6, 1.4], life: [3, 6], alpha: 0.75, speed: 0.7 },
    ],
    pokes: [
      { area: [80, 40, 210, 160], sound: 'splash', kick: ['sludge', 'hot'], flare: [150, 255, 80], glyph: '☢️', burst: { layer: 'pour', n: 6, at: [180, 130], spread: 6 } },
      { area: [790, 30, 910, 200], sound: 'beep', kick: ['lamp', 'lampGlow', 'lampSway'], flare: [255, 210, 120], glyph: '💡' },
      { area: [50, 420, 200, 540], sound: 'beep', kick: ['needle', 'gauge'], flare: [255, 100, 60], glyph: '☢️' },
      { area: [840, 380, 1000, 572], sound: 'drip', kick: ['sludge'], flare: [150, 255, 80], burst: { layer: 'pipe', n: 5, at: [866, 452], spread: 4 } },
    ],
  },
  'radioactive-portrait': {
    wind: null,
    layers: [
      { id: 'sludgeFlow', type: 'flow', mask: 'sludge', dir: [0.2, 1], dist: 12, period: 3.6, alpha: 0.95, glow: 0.35, glowPeriod: 2.6 },
      { id: 'sludge', type: 'mask', mask: 'sludge', anim: { kind: 'wave', along: 'y', band: 120, speed: 24 }, alpha: [0.05, 0.45], gain: 0.8, kickDur: 2 },
      { id: 'hot', type: 'mask', mask: 'hot', anim: { kind: 'pulse', period: 2.2 }, alpha: [0.15, 0.6], bloom: 0.9, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'sludge' }, rate: 5, max: 26, color: [190, 255, 90], size: [1, 2.2], life: [0.5, 1.2] },
      { id: 'pour', type: 'particles', kind: 'drip', from: [[78, 140, 4]], rate: 3.5, max: 8, color: [150, 255, 60], size: [1.3, 2], life: [3, 4], fall: 26, splashColor: [180, 255, 90] },
      { id: 'pipe', type: 'particles', kind: 'drip', from: [[386, 878, 3]], rate: 3, max: 8, color: [150, 255, 60], size: [1.2, 1.9], life: [3, 4], fall: 60, splashColor: [180, 255, 90] },
      { id: 'lamp', type: 'mask', mask: 'lamp', anim: { kind: 'flicker', speed: 6 }, alpha: [0.1, 0.7], bloom: 1, kickDur: 1.5 },
      { id: 'lampGlow', type: 'glow', points: [[400, 122, 60]], color: [255, 200, 110], anim: 'flicker', alpha: [0.08, 0.3], kickDur: 1.5 },
      { id: 'needle', type: 'glow', points: [[72, 912, 5]], color: [255, 80, 60], anim: 'blink', period: 1.1, alpha: [0.2, 0.9], kickDur: 2 },
      { id: 'gauge', type: 'echo', box: [40, 880, 112, 940], feather: 5, autoKick: [3, 7], motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.15, pivot: [76, 938] } },
      { type: 'fog', area: [-60, 0, 120, 1024], count: 6, size: [50, 90], speed: 3, color: [90, 220, 60], alpha: 0.1, blend: 'lighter' },
      { type: 'fog', area: [360, 0, 520, 1024], count: 6, size: [50, 90], speed: 3, color: [90, 220, 60], alpha: 0.1, blend: 'lighter' },
      { id: 'motes', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 3, max: 28, color: [170, 255, 90], size: [0.6, 1.3], life: [3, 6], alpha: 0.75, speed: 0.7 },
    ],
    pokes: [
      { area: [10, 50, 130, 180], sound: 'splash', kick: ['sludge', 'hot'], flare: [150, 255, 80], glyph: '☢️', burst: { layer: 'pour', n: 6, at: [78, 140], spread: 5 } },
      { area: [350, 60, 450, 190], sound: 'beep', kick: ['lamp', 'lampGlow'], flare: [255, 210, 120], glyph: '💡' },
      { area: [20, 870, 140, 980], sound: 'beep', kick: ['needle', 'gauge'], flare: [255, 100, 60], glyph: '☢️' },
    ],
  },

  // ---- Robots: a steampunk robot foundry ----------------------------------------------------
  'robots-land': {
    wind: null,
    layers: [
      // Features: both conveyor tracks run, light pulses down them like moving belts.
      { id: 'beltFlow', type: 'flow', mask: 'tracks', dir: [0, 1], dist: 18, period: 0.9, alpha: 0.95 },
      { id: 'tracks', type: 'mask', mask: 'tracks', anim: { kind: 'wave', along: 'y', band: 90, speed: 70 }, alpha: [0.1, 0.65], gain: 0.85, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'tracks' }, rate: 4, max: 14, color: [190, 240, 255], size: [0.8, 1.5], life: [0.3, 0.7] },
      // The furnaces and lamps flicker with firelight.
      { id: 'furnace', type: 'mask', mask: 'furnace', anim: { kind: 'flicker', speed: 3 }, alpha: [0.2, 0.75], bloom: 0.9, kickDur: 2 },
      { id: 'furnaceGlow', type: 'glow', points: [[930, 255, 70], [728, 40, 30], [320, 40, 30]], color: [255, 150, 60], anim: 'flicker', alpha: [0.1, 0.32], kickDur: 2 },
      // Corners. Top left, the big gear turns; sparks fly from the grinder.
      { id: 'gear', type: 'echo', box: [146, 24, 302, 158], round: true, feather: 6, motion: { kind: 'spin', speed: 18 } },
      { id: 'sparks', type: 'particles', kind: 'spark', from: [[140, 150, 6], [210, 210, 6], [910, 120, 6], [860, 410, 6], [70, 380, 6]], rate: 5, max: 40, color: [255, 190, 80], size: [0.7, 1.3], life: [0.4, 0.9] },
      // Top right, the steam valve hisses.
      { id: 'steam', type: 'particles', kind: 'smoke', from: [[790, 64, 8], [770, 40, 6]], rate: 2, max: 16, color: [220, 225, 235], size: [6, 10], life: [1.5, 2.5], alpha: 0.24, speed: 0.9 },
      { id: 'valve', type: 'echo', box: [784, 32, 828, 76], round: true, feather: 4, motion: { kind: 'spin', speed: 0 } },
      // Bottom left, the little repair bot hops on the spot, its eye blinking.
      { id: 'bot', type: 'echo', box: [86, 400, 190, 540], feather: 6, motion: { kind: 'bob', amp: 1.6, period: 0.9, kickAmp: 4 } },
      { id: 'botEye', type: 'glow', points: [[134, 424, 6]], color: [120, 220, 255], anim: 'blink', period: 3, alpha: [0.3, 0.9], kickDur: 1.5 },
      // Bottom right, the toolbox; tapped, the wrench clanks.
      { id: 'tools', type: 'echo', box: [810, 410, 960, 540], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.3, period: 0.3, pivot: [885, 538] } },
      // Air: heat shimmer and drifting embers from the furnaces.
      { type: 'fog', area: [-60, 0, 1084, 572], count: 8, size: [80, 140], speed: 3, color: [255, 160, 80], alpha: 0.05, blend: 'lighter' },
      { id: 'embers', type: 'particles', kind: 'ember', from: [[930, 255, 40], [728, 40, 10]], rate: 1.5, max: 14, color: [255, 150, 60], size: [0.6, 1.2], life: [1.5, 3], speed: 0.8 },
    ],
    pokes: [
      { area: [140, 18, 308, 164], sound: 'grind', kick: ['gear'], flare: [255, 210, 140], glyph: '⚙️', burst: { layer: 'sparks', n: 16, at: [224, 92], spread: 30 } },
      { area: [750, 20, 870, 140], sound: 'hiss', kick: ['valve'], flare: [230, 235, 245], burst: { layer: 'steam', n: 10, at: [790, 60], spread: 8 } },
      { area: [80, 396, 196, 544], sound: 'beep', kick: ['bot', 'botEye'], flare: [120, 220, 255], glyph: '🤖' },
      { area: [806, 406, 964, 544], sound: 'clink', kick: ['tools'], flare: [255, 210, 140], glyph: '🔧' },
      { area: [860, 160, 1000, 340], sound: 'whoosh', kick: ['furnace', 'furnaceGlow'], flare: [255, 150, 60], glyph: '🔥', burst: { layer: 'embers', n: 12, at: [930, 255], spread: 20 } },
      { area: [340, 90, 690, 572], sound: 'beam', kick: ['tracks', 'beltFlow'], flare: [120, 220, 255] },
    ],
  },
  'robots-portrait': {
    wind: null,
    layers: [
      { id: 'beltFlow', type: 'flow', mask: 'tracks', dir: [0, 1], dist: 18, period: 0.9, alpha: 0.95 },
      { id: 'tracks', type: 'mask', mask: 'tracks', anim: { kind: 'wave', along: 'y', band: 110, speed: 80 }, alpha: [0.1, 0.65], gain: 0.85, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'tracks' }, rate: 4, max: 14, color: [190, 240, 255], size: [0.8, 1.4], life: [0.3, 0.7] },
      { id: 'furnace', type: 'mask', mask: 'furnace', anim: { kind: 'flicker', speed: 3 }, alpha: [0.2, 0.75], bloom: 0.9, kickDur: 2 },
      { id: 'gear', type: 'echo', box: [6, 18, 100, 104], round: true, feather: 5, motion: { kind: 'spin', speed: 18 } },
      { id: 'sparks', type: 'particles', kind: 'spark', from: [[40, 140, 6], [430, 270, 6], [20, 700, 6], [440, 880, 6]], rate: 4, max: 30, color: [255, 190, 80], size: [0.7, 1.2], life: [0.4, 0.9] },
      { id: 'steam', type: 'particles', kind: 'smoke', from: [[408, 52, 6]], rate: 1.8, max: 14, color: [220, 225, 235], size: [5, 9], life: [1.5, 2.5], alpha: 0.24, speed: 0.9 },
      { id: 'bot', type: 'echo', box: [34, 896, 104, 1000], feather: 5, motion: { kind: 'bob', amp: 1.5, period: 0.9, kickAmp: 4 } },
      { id: 'botEye', type: 'glow', points: [[66, 914, 5]], color: [120, 220, 255], anim: 'blink', period: 3, alpha: [0.3, 0.9], kickDur: 1.5 },
      { id: 'tools', type: 'echo', box: [356, 906, 456, 990], feather: 5, motion: { kind: 'rock', amp: 0, kickAmp: 1.3, period: 0.3, pivot: [406, 988] } },
      { type: 'fog', area: [-60, 0, 520, 1024], count: 8, size: [70, 120], speed: 3, color: [255, 160, 80], alpha: 0.05, blend: 'lighter' },
    ],
    pokes: [
      { area: [4, 14, 104, 108], sound: 'grind', kick: ['gear'], flare: [255, 210, 140], glyph: '⚙️', burst: { layer: 'sparks', n: 14, at: [52, 60], spread: 26 } },
      { area: [370, 14, 450, 100], sound: 'hiss', flare: [230, 235, 245], burst: { layer: 'steam', n: 10, at: [408, 52], spread: 8 } },
      { area: [30, 892, 108, 1004], sound: 'beep', kick: ['bot', 'botEye'], flare: [120, 220, 255], glyph: '🤖' },
      { area: [352, 902, 458, 994], sound: 'clink', kick: ['tools'], flare: [255, 210, 140], glyph: '🔧' },
    ],
  },

  // ---- Sharks: a sunlit shallow sea ------------------------------------------------------------
  'sharks-land': {
    wind: null,
    layers: [
      // Light: the caustic net of sunlight dances over the sand and through the water.
      { id: 'causticFlow', type: 'flow', mask: 'caustics', dir: [1, 0.5], dist: 10, period: 2.2, alpha: 0.9, glow: 0.3, glowPeriod: 1.7 },
      { id: 'caustics', type: 'mask', mask: 'caustics', anim: { kind: 'wave', along: 'x', band: 70, speed: 30 }, alpha: [0, 0.45], gain: 0.75, kickDur: 2 },
      { id: 'water', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'y', band: 90, speed: 14 }, alpha: [0, 0.3], gain: 0.55 },
      { id: 'rays', type: 'rays', beams: [[520, 0, 12, 600, 90], [690, 0, 6, 600, 70], [140, 0, 18, 560, 80]], color: [210, 250, 255], alpha: [0.04, 0.14], period: 6 },
      // Sharks circle: their shadows glide over the sand.
      { id: 'sharks', type: 'particles', kind: 'shadow', area: [0, 0, 1024, 572], rate: 0.12, max: 3, color: [10, 50, 60], size: [9, 13], life: [16, 26], alpha: 0.24, speed: 1 },
      // Growth: the kelp and coral fronds sway with the current.
      { id: 'kelpB', type: 'warp', box: [300, 420, 1024, 572], base: 'bottom', mask: 'kelp', amp: 2.6, period: 3.4, wave: 2.6 },
      { id: 'kelpR', type: 'warp', box: [880, 100, 1024, 420], base: 'right', mask: 'kelp', amp: 2.4, period: 3.8, wave: 2.4 },
      { id: 'kelpT', type: 'warp', box: [360, 0, 880, 160], base: 'top', mask: 'kelp', amp: 2.2, period: 4, wave: 2.2 },
      { id: 'kelpL', type: 'warp', box: [0, 200, 240, 420], base: 'left', mask: 'kelp', amp: 2.2, period: 4.2, wave: 2.2 },
      // Corners. Bottom left, the giant clam breathes and its pearl gleams; bottom middle, the
      // anemone's tentacles wave; top right, the anchor's weed sways.
      { id: 'clam', type: 'echo', box: [82, 390, 222, 530], feather: 8, motion: { kind: 'breathe', amp: 1.2, period: 4, pivot: [150, 520], kickAmp: 4 } },
      { id: 'pearl', type: 'mask', mask: 'pearl', anim: { kind: 'pulse', period: 3 }, alpha: [0.2, 0.7], bloom: 1, kickDur: 2 },
      { id: 'pearlGlint', type: 'particles', kind: 'glint', from: [[156, 458, 6]], rate: 0.6, max: 2, color: [255, 255, 255], size: [1.2, 2], life: [0.5, 1] },
      { id: 'anemone', type: 'warp', box: [660, 424, 780, 540], base: 'bottom', amp: 2.6, period: 2.6, wave: 3.2 },
      { id: 'anchor', type: 'warp', box: [778, 56, 940, 230], base: 'top', mask: 'kelp', amp: 2, period: 3.6, wave: 2 },
      // Air (water): bubbles stream up, fish dart, motes of sand drift.
      { id: 'bubbles', type: 'particles', kind: 'bubble', from: [[156, 450, 14], [720, 470, 20], [900, 520, 30], [550, 160, 20]], rate: 3, max: 30, color: [220, 250, 255], size: [1, 2.4], life: [1.5, 3], speed: 2 },
      { id: 'fish', type: 'particles', kind: 'fly', from: [[600, 120, 40], [200, 300, 40], [950, 300, 30]], rate: 0.8, max: 8, color: [255, 200, 90], size: [1.4, 2], life: [5, 8] },
      { type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2, max: 20, color: [230, 250, 255], size: [0.6, 1.1], life: [3, 6], alpha: 0.55, speed: 0.6 },
    ],
    pokes: [
      { area: [80, 388, 224, 532], sound: 'splash', kick: ['clam', 'pearl'], flare: [220, 230, 255], glyph: '🦪', burst: { layer: 'bubbles', n: 10, at: [156, 450], spread: 12 } },
      { area: [656, 420, 784, 544], sound: 'squelch', kick: ['anemone'], flare: [255, 120, 90], burst: { layer: 'bubbles', n: 8, at: [720, 470], spread: 18 } },
      { area: [776, 54, 942, 232], sound: 'clink', kick: ['anchor'], flare: [200, 240, 255], glyph: '⚓' },
      { area: [0, 0, 300, 200], sound: 'splash', flare: [200, 240, 255], glyph: '🦈', burst: { layer: 'sharks', n: 1, at: [150, 100], spread: 10 } },
      { area: [240, 160, 860, 420], sound: 'splash', kick: ['caustics', 'causticFlow'], flare: [210, 250, 255], burst: { layer: 'bubbles', n: 6, spread: 10 } },
    ],
  },
  'sharks-portrait': {
    wind: null,
    layers: [
      { id: 'causticFlow', type: 'flow', mask: 'caustics', dir: [0.5, 1], dist: 10, period: 2.2, alpha: 0.9, glow: 0.3, glowPeriod: 1.7 },
      { id: 'caustics', type: 'mask', mask: 'caustics', anim: { kind: 'wave', along: 'y', band: 80, speed: 30 }, alpha: [0, 0.45], gain: 0.75, kickDur: 2 },
      { id: 'water', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'y', band: 90, speed: 14 }, alpha: [0, 0.3], gain: 0.55 },
      { id: 'rays', type: 'rays', beams: [[120, 0, 10, 1000, 80], [330, 0, 6, 1000, 70]], color: [210, 250, 255], alpha: [0.04, 0.14], period: 6 },
      { id: 'sharks', type: 'particles', kind: 'shadow', area: [0, 0, 459, 1024], rate: 0.12, max: 3, color: [10, 50, 60], size: [8, 12], life: [16, 26], alpha: 0.24, speed: 1 },
      { id: 'kelpL', type: 'warp', box: [0, 200, 130, 900], base: 'left', mask: 'kelp', amp: 2.2, period: 4.2, wave: 2.2 },
      { id: 'kelpR', type: 'warp', box: [330, 100, 459, 900], base: 'right', mask: 'kelp', amp: 2.2, period: 3.8, wave: 2.4 },
      { id: 'kelpB', type: 'warp', box: [100, 880, 459, 1024], base: 'bottom', mask: 'kelp', amp: 2.4, period: 3.4, wave: 2.6 },
      { id: 'clam', type: 'echo', box: [36, 876, 128, 970], feather: 6, motion: { kind: 'breathe', amp: 1.2, period: 4, pivot: [82, 966], kickAmp: 4 } },
      { id: 'pearl', type: 'mask', mask: 'pearl', anim: { kind: 'pulse', period: 3 }, alpha: [0.2, 0.7], bloom: 1, kickDur: 2 },
      { id: 'anemone', type: 'warp', box: [268, 916, 340, 990], base: 'bottom', amp: 2.4, period: 2.6, wave: 3.2 },
      { id: 'anchor', type: 'warp', box: [350, 30, 430, 120], base: 'top', mask: 'kelp', amp: 1.8, period: 3.6, wave: 2 },
      { id: 'bubbles', type: 'particles', kind: 'bubble', from: [[80, 920, 12], [300, 950, 16], [40, 500, 20], [420, 400, 20]], rate: 3, max: 28, color: [220, 250, 255], size: [1, 2.2], life: [1.5, 3], speed: 2 },
      { id: 'fish', type: 'particles', kind: 'fly', from: [[60, 300, 30], [400, 600, 30], [80, 700, 30]], rate: 0.8, max: 8, color: [255, 200, 90], size: [1.3, 1.9], life: [5, 8] },
      { type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2, max: 20, color: [230, 250, 255], size: [0.6, 1], life: [3, 6], alpha: 0.55, speed: 0.6 },
    ],
    pokes: [
      { area: [34, 874, 130, 972], sound: 'splash', kick: ['clam', 'pearl'], flare: [220, 230, 255], glyph: '🦪', burst: { layer: 'bubbles', n: 10, at: [80, 920], spread: 10 } },
      { area: [264, 912, 344, 994], sound: 'squelch', kick: ['anemone'], flare: [255, 120, 90], burst: { layer: 'bubbles', n: 8, at: [300, 950], spread: 14 } },
      { area: [346, 26, 434, 124], sound: 'clink', kick: ['anchor'], flare: [200, 240, 255], glyph: '⚓' },
      { area: [0, 0, 160, 160], sound: 'splash', flare: [200, 240, 255], glyph: '🦈', burst: { layer: 'sharks', n: 1, at: [80, 80], spread: 8 } },
    ],
  },

  // ---- Ultraterrestrials: an impossible pocket dimension ----------------------------------------
  'ultraterrestrials-land': {
    wind: null,
    layers: [
      // Ground: an iridescent sheen rolls across the crystal plane; stars twinkle in its reflection.
      { id: 'plane', type: 'mask', mask: 'plane', anim: { kind: 'wave', along: 'x', band: 260, speed: 34 }, alpha: [0, 0.22], gain: 0.5, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'stars' }, rate: 6, max: 26, color: [255, 250, 255], size: [0.8, 1.6], life: [0.4, 1] },
      // The impossible shapes drift and turn in the void; the staircases loop slowly.
      { id: 'tri1', type: 'echo', box: [446, 54, 520, 136], feather: 6, motion: { kind: 'drift', amp: 3, speed: 0.3 } },
      { id: 'tri2', type: 'echo', box: [540, 22, 620, 104], feather: 6, motion: { kind: 'drift', amp: 3, speed: 0.26 } },
      { id: 'tri3', type: 'echo', box: [668, 26, 740, 102], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'tri4', type: 'echo', box: [866, 228, 990, 318], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'tri5', type: 'echo', box: [954, 306, 1024, 400], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'tri6', type: 'echo', box: [272, 480, 360, 560], feather: 6, motion: { kind: 'drift', amp: 3, speed: 0.27 } },
      { id: 'tri7', type: 'echo', box: [656, 456, 740, 536], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'stairs', type: 'echo', box: [70, 258, 184, 386], feather: 8, motion: { kind: 'rock', amp: 1.2, period: 7, pivot: [127, 322] } },
      // Corners. Top left, the hourglass runs upward: sand streams up through its neck.
      { id: 'sand', type: 'particles', kind: 'mote', from: [[106, 94, 2]], rate: 6, max: 20, color: [255, 220, 140], size: [0.6, 1], life: [0.6, 1], alpha: 0.9, speed: 2.5 },
      { id: 'hourglass', type: 'echo', box: [60, 20, 152, 134], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 3, period: 0.4, pivot: [106, 77] } },
      // Top right, the spiral portal turns and pulses.
      { id: 'portal', type: 'echo', box: [868, 14, 976, 120], round: true, feather: 10, motion: { kind: 'spin', speed: 30 } },
      { id: 'portalGlow', type: 'glow', points: [[922, 67, 62]], color: [255, 120, 220], anim: 'pulse', period: 2.4, alpha: [0.1, 0.32], kickDur: 2 },
      { id: 'pull', type: 'vortex', center: [922, 67], rx: 70, ry: 60, count: 26, speed: 1.2, color: [255, 180, 255], alpha: 0.22 },
      // Bottom left, the crystal shards shimmer through the spectrum.
      { id: 'crystal', type: 'mask', mask: 'crystal', anim: { kind: 'wave', along: 'y', band: 50, speed: 22 }, alpha: [0.05, 0.75], gain: 0.85, kickDur: 2 },
      { id: 'crystalGlow', type: 'glow', points: [[118, 466, 56]], color: [180, 255, 240], anim: 'pulse', period: 3.2, alpha: [0.08, 0.26], kickDur: 2 },
      // Bottom right, the impossible cube turns slowly on its corner.
      { id: 'cube', type: 'echo', box: [884, 424, 978, 518], round: true, feather: 6, motion: { kind: 'spin', speed: 9 } },
      // Air: gold stardust streams through the void.
      { type: 'stream', path: [[-20, 200], [180, 160], [260, 60], [400, 20], [600, 40], [780, 90], [1044, 60]], count: 40, speed: 22, width: 18, color: [255, 220, 150], alpha: 0.3, size: [0.8, 1.6], tail: 10 },
      { type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 3, max: 30, color: [230, 210, 255], size: [0.6, 1.3], life: [3, 6], alpha: 0.7, speed: 0.6 },
    ],
    pokes: [
      { area: [56, 16, 156, 138], sound: 'chime', kick: ['hourglass'], flare: [255, 220, 140], glyph: '⏳', burst: { layer: 'sand', n: 14, at: [106, 94], spread: 4 } },
      { area: [864, 10, 980, 124], sound: 'whoosh', kick: ['portal', 'portalGlow'], flare: [255, 140, 230], glyph: '🌀' },
      { area: [60, 394, 180, 532], sound: 'chime', kick: ['crystal', 'crystalGlow'], flare: [180, 255, 240], glyph: '💎' },
      { area: [880, 420, 982, 522], sound: 'beam', kick: ['cube'], flare: [230, 210, 255], glyph: '🧊' },
    ],
  },
  'ultraterrestrials-portrait': {
    wind: null,
    layers: [
      { id: 'plane', type: 'mask', mask: 'plane', anim: { kind: 'wave', along: 'y', band: 300, speed: 40 }, alpha: [0, 0.22], gain: 0.5, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'stars' }, rate: 6, max: 26, color: [255, 250, 255], size: [0.8, 1.5], life: [0.4, 1] },
      { id: 'tri1', type: 'echo', box: [140, 20, 232, 110], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'tri2', type: 'echo', box: [370, 320, 440, 400], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'tri3', type: 'echo', box: [20, 600, 100, 690], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'tri4', type: 'echo', box: [196, 880, 262, 950], feather: 6, motion: { kind: 'shimmer', amp: 0.28, period: 4.5 } },
      { id: 'sand', type: 'particles', kind: 'mote', from: [[76, 92, 2]], rate: 6, max: 20, color: [255, 220, 140], size: [0.6, 1], life: [0.6, 1], alpha: 0.9, speed: 2.5 },
      { id: 'hourglass', type: 'echo', box: [30, 30, 122, 156], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 3, period: 0.4, pivot: [76, 93] } },
      { id: 'portal', type: 'echo', box: [318, 24, 440, 146], round: true, feather: 10, motion: { kind: 'spin', speed: 30 } },
      { id: 'portalGlow', type: 'glow', points: [[379, 85, 66]], color: [255, 120, 220], anim: 'pulse', period: 2.4, alpha: [0.1, 0.32], kickDur: 2 },
      { id: 'pull', type: 'vortex', center: [379, 85], rx: 74, ry: 70, count: 24, speed: 1.2, color: [255, 180, 255], alpha: 0.22 },
      { id: 'crystal', type: 'mask', mask: 'crystal', anim: { kind: 'wave', along: 'y', band: 50, speed: 22 }, alpha: [0.05, 0.75], gain: 0.85, kickDur: 2 },
      { id: 'crystalGlow', type: 'glow', points: [[90, 882, 50]], color: [180, 255, 240], anim: 'pulse', period: 3.2, alpha: [0.08, 0.26], kickDur: 2 },
      { id: 'cube', type: 'echo', box: [334, 826, 440, 932], round: true, feather: 6, motion: { kind: 'spin', speed: 9 } },
      { type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 3, max: 30, color: [230, 210, 255], size: [0.6, 1.2], life: [3, 6], alpha: 0.7, speed: 0.6 },
    ],
    pokes: [
      { area: [26, 26, 126, 160], sound: 'chime', kick: ['hourglass'], flare: [255, 220, 140], glyph: '⏳', burst: { layer: 'sand', n: 14, at: [76, 92], spread: 4 } },
      { area: [314, 20, 444, 150], sound: 'whoosh', kick: ['portal', 'portalGlow'], flare: [255, 140, 230], glyph: '🌀' },
      { area: [36, 816, 144, 944], sound: 'chime', kick: ['crystal', 'crystalGlow'], flare: [180, 255, 240], glyph: '💎' },
      { area: [330, 822, 444, 936], sound: 'beam', kick: ['cube'], flare: [230, 210, 255], glyph: '🧊' },
    ],
  },

  // ---- Vampires: a gothic castle courtyard under a red moon ------------------------------------
  'vampires-land': {
    wind: { dir: -1, every: [7, 12], speed: [120, 180], width: [160, 260], lean: 0.25 },
    layers: [
      // Light: the blood moon glows over the wall; red light washes across the wet cobbles.
      { id: 'moonGlow', type: 'glow', points: [[512, 0, 150]], color: [255, 60, 60], anim: 'pulse', period: 6, alpha: [0.1, 0.25], kickDur: 3 },
      { id: 'rays', type: 'rays', beams: [[440, 0, 10, 560, 80], [590, 0, -10, 560, 80]], color: [255, 90, 90], alpha: [0.03, 0.1], period: 8 },
      // The stained glass of both hero frames pulses like a heartbeat; blood shimmers and creeps.
      { id: 'bloodFlow', type: 'flow', mask: 'blood', dir: [1, 0.2], dist: 8, period: 4, alpha: 0.9, glow: 0.25, glowPeriod: 1.1 },
      { id: 'blood', type: 'mask', mask: 'blood', anim: { kind: 'pulse', period: 1.1 }, alpha: [0.05, 0.4], bloom: 0.6, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: [100, 160, 920, 480], rate: 2.5, max: 10, color: [255, 200, 200], size: [0.8, 1.4], life: [0.4, 0.8] },
      // Growth: the rose vines stir; petals fall and drift across the courtyard.
      { id: 'rosesL', type: 'warp', box: [0, 140, 140, 440], base: 'left', mask: 'roses', amp: 1.8, period: 4.4, wave: 2.4 },
      { id: 'rosesR', type: 'warp', box: [890, 150, 1024, 400], base: 'right', mask: 'roses', amp: 1.8, period: 4, wave: 2.4 },
      { id: 'rosesB', type: 'warp', box: [130, 480, 860, 572], base: 'bottom', mask: 'roses', amp: 1.8, period: 3.8, wave: 2.6 },
      { id: 'petals', type: 'particles', kind: 'petal', area: [0, -20, 1024, 572], rate: 0.9, max: 14, color: [200, 20, 40], size: [1.6, 2.6], life: [7, 11], speed: 0.6 },
      // Corners. Top left, the gargoyle's eyes burn; tapped, it stirs.
      { id: 'garg', type: 'echo', box: [22, 4, 140, 150], feather: 8, autoKick: [10, 18], motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.5, pivot: [80, 140] } },
      { id: 'gargEyes', type: 'glow', points: [[84, 52, 5], [104, 54, 5]], color: [255, 40, 40], anim: 'pulse', period: 3.4, alpha: [0.2, 0.75], kickDur: 2 },
      // Top right, the goblet of blood glints and ripples.
      { id: 'goblet', type: 'glow', points: [[946, 48, 22]], color: [255, 40, 60], anim: 'pulse', period: 2.4, alpha: [0.08, 0.3], kickDur: 2 },
      { id: 'gobletGlint', type: 'particles', kind: 'glint', area: [916, 22, 980, 128], rate: 1, max: 3, color: [255, 240, 240], size: [1, 1.6], life: [0.4, 0.8] },
      // Bottom left, the candelabra's red candles flicker and drip wax.
      { id: 'candles', type: 'glow', points: [[38, 410, 11], [66, 364, 11], [91, 384, 11], [108, 398, 11]], color: [255, 180, 90], anim: 'flicker', alpha: [0.35, 0.9], kickDur: 2 },
      { id: 'cflames', type: 'flames', points: [[38, 414, 5, 10], [66, 368, 5, 10], [91, 388, 5, 10], [108, 402, 5, 10]], tongues: 2, alpha: 0.9 },
      { id: 'wax', type: 'particles', kind: 'drip', from: [[40, 430, 3], [68, 384, 3], [106, 418, 3]], rate: 0.4, max: 3, color: [200, 20, 30], size: [1, 1.5], life: [3, 4], fall: 14, splash: false },
      // Bottom right, the coffin lid shifts now and then; a bat escapes when tapped.
      { id: 'coffin', type: 'echo', box: [884, 392, 1012, 512], feather: 8, autoKick: [9, 16], motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.4, pivot: [948, 510] } },
      // Air: bats cross the moon, a low red mist hangs over the stones.
      { id: 'bats', type: 'flyers', area: [100, 0, 1000, 120], every: [4, 9], speed: [60, 100], size: [5, 8], color: [20, 6, 10] },
      { type: 'fog', area: [-80, 380, 1104, 600], count: 10, size: [90, 160], speed: 4, color: [140, 30, 40], alpha: 0.09 },
    ],
    pokes: [
      { area: [20, 2, 142, 152], sound: 'growl', kick: ['garg', 'gargEyes'], flare: [255, 60, 60], glyph: '🗿' },
      { area: [910, 16, 986, 136], sound: 'clink', kick: ['goblet'], flare: [255, 60, 80], glyph: '🍷' },
      { area: [18, 350, 128, 540], sound: 'whoosh', kick: ['candles'], flare: [255, 180, 90], glyph: '🕯️' },
      { area: [846, 386, 1018, 552], sound: 'knock', kick: ['coffin'], flare: [255, 60, 60], glyph: '🦇' },
      { area: [400, 0, 620, 50], sound: 'screech', kick: ['moonGlow'], flare: [255, 80, 80], glyph: '🦇' },
    ],
  },
  'vampires-portrait': {
    wind: { dir: -1, every: [7, 12], speed: [100, 150], width: [140, 220], lean: 0.12 },
    layers: [
      { id: 'moonGlow', type: 'glow', points: [[230, 10, 130]], color: [255, 60, 60], anim: 'pulse', period: 6, alpha: [0.1, 0.25], kickDur: 3 },
      { id: 'bloodFlow', type: 'flow', mask: 'blood', dir: [0.2, 1], dist: 8, period: 4, alpha: 0.9, glow: 0.25, glowPeriod: 1.1 },
      { id: 'blood', type: 'mask', mask: 'blood', anim: { kind: 'pulse', period: 1.1 }, alpha: [0.05, 0.4], bloom: 0.6, kickDur: 2 },
      { id: 'rosesL', type: 'warp', box: [0, 180, 110, 800], base: 'left', mask: 'roses', amp: 1.8, period: 4.4, wave: 2.4 },
      { id: 'rosesR', type: 'warp', box: [350, 180, 459, 800], base: 'right', mask: 'roses', amp: 1.8, period: 4, wave: 2.4 },
      { id: 'petals', type: 'particles', kind: 'petal', area: [0, -20, 459, 1024], rate: 0.9, max: 14, color: [200, 20, 40], size: [1.5, 2.4], life: [7, 11], speed: 0.6 },
      { id: 'garg', type: 'echo', box: [6, 40, 106, 160], feather: 6, autoKick: [10, 18], motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.5, pivot: [56, 156] } },
      { id: 'gargEyes', type: 'glow', points: [[64, 82, 4], [80, 84, 4]], color: [255, 40, 40], anim: 'pulse', period: 3.4, alpha: [0.2, 0.75], kickDur: 2 },
      { id: 'goblet', type: 'glow', points: [[424, 94, 18]], color: [255, 40, 60], anim: 'pulse', period: 2.4, alpha: [0.08, 0.3], kickDur: 2 },
      { id: 'candles', type: 'glow', points: [[28, 870, 9], [56, 826, 9], [78, 852, 9], [96, 866, 9]], color: [255, 180, 90], anim: 'flicker', alpha: [0.35, 0.9], kickDur: 2 },
      { id: 'cflames', type: 'flames', points: [[28, 874, 4, 9], [56, 830, 4, 9], [78, 856, 4, 9], [96, 870, 4, 9]], tongues: 2, alpha: 0.9 },
      { id: 'coffin', type: 'echo', box: [334, 852, 456, 990], feather: 8, autoKick: [9, 16], motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.4, pivot: [395, 988] } },
      { id: 'bats', type: 'flyers', area: [0, 0, 459, 120], every: [4, 9], speed: [50, 80], size: [4, 7], color: [20, 6, 10] },
      { type: 'fog', area: [-80, 500, 540, 1024], count: 10, size: [80, 140], speed: 4, color: [140, 30, 40], alpha: 0.09 },
    ],
    pokes: [
      { area: [4, 38, 108, 162], sound: 'growl', kick: ['garg', 'gargEyes'], flare: [255, 60, 60], glyph: '🗿' },
      { area: [394, 60, 456, 170], sound: 'clink', kick: ['goblet'], flare: [255, 60, 80], glyph: '🍷' },
      { area: [10, 810, 120, 990], sound: 'whoosh', kick: ['candles'], flare: [255, 180, 90], glyph: '🕯️' },
      { area: [330, 848, 458, 994], sound: 'knock', kick: ['coffin'], flare: [255, 60, 60], glyph: '🦇' },
    ],
  },

  // ---- Void: a floating island adrift in deep space -------------------------------------------
  'void-land': {
    wind: null,
    layers: [
      // Space: the nebula tendrils churn and glow; stars twinkle; the starlight in the rock's
      // cracks pulses as if the void were breathing through it.
      { id: 'nebFlow', type: 'flow', mask: 'nebula', dir: [1, -0.3], dist: 16, period: 6, alpha: 0.9, glow: 0.3, glowPeriod: 5 },
      { id: 'nebula', type: 'mask', mask: 'nebula', anim: { kind: 'wave', along: 'x', band: 240, speed: 16 }, alpha: [0.05, 0.4], gain: 0.7, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'stars' }, rate: 9, max: 40, color: [255, 255, 255], size: [0.8, 1.6], life: [0.4, 1.1] },
      { id: 'cracks', type: 'mask', mask: 'cracks', anim: { kind: 'pulse', period: 3.6 }, alpha: [0.1, 0.6], bloom: 0.7, kickDur: 2 },
      // The island bobs gently; loose rocks orbit its edges.
      { id: 'rock1', type: 'echo', box: [160, 154, 178, 172], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.35 } },
      { id: 'rock2', type: 'echo', box: [810, 70, 830, 98], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.3 } },
      { id: 'rock3', type: 'echo', box: [130, 350, 180, 400], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.4 } },
      { id: 'rock4', type: 'echo', box: [752, 462, 808, 500], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.33 } },
      { id: 'rock5', type: 'echo', box: [556, 10, 578, 28], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.36 } },
      // Corners. Top left, the bitten planet turns slowly. Top right, the star cluster flares.
      { id: 'planet', type: 'echo', box: [52, 22, 160, 130], round: true, feather: 6, motion: { kind: 'spin', speed: 4 } },
      { id: 'cluster', type: 'glow', points: [[924, 78, 14], [956, 108, 9], [900, 44, 7], [945, 54, 6]], color: [220, 230, 255], anim: 'pulse', period: 2.2, alpha: [0.3, 0.9], kickDur: 2 },
      // Bottom left, the crescent moon on its floating rock bobs. Bottom right, the galaxy spins.
      { id: 'moonRock', type: 'echo', box: [48, 404, 186, 546], feather: 8, motion: { kind: 'bob', amp: 3, period: 5, kickAmp: 6 } },
      { id: 'galaxy', type: 'echo', box: [836, 406, 984, 550], round: true, feather: 10, motion: { kind: 'spin', speed: -10, pivot: [912, 478], tilt: [-35, 0.47] } },
      { id: 'galaxy2', type: 'echo', box: [228, 8, 300, 56], round: true, feather: 6, motion: { kind: 'spin', speed: -14, pivot: [258, 32], tilt: [-18, 0.42] } },
      { id: 'galaxy3', type: 'echo', box: [234, 488, 302, 540], round: true, feather: 6, motion: { kind: 'spin', speed: -12, pivot: [265, 512], tilt: [-25, 0.47] } },
      // Air: comets streak by; a slow vortex of void dust circles the island.
      { id: 'comets', type: 'meteors', area: [0, 0, 1024, 572], dir: [0.8, 0.35], speed: [160, 240], every: [5, 11], size: [1, 1.8] },
      { type: 'vortex', center: [512, 290], rx: 480, ry: 260, count: 50, speed: 0.15, color: [200, 160, 255], alpha: 0.12, width: 1.2 },
      { type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2.5, max: 26, color: [220, 200, 255], size: [0.6, 1.2], life: [3, 6], alpha: 0.6, speed: 0.6 },
    ],
    pokes: [
      { area: [48, 18, 164, 134], sound: 'whoosh', kick: ['planet', 'nebula'], flare: [200, 150, 255], glyph: '🪐' },
      { area: [880, 30, 990, 130], sound: 'chime', kick: ['cluster'], flare: [230, 235, 255], glyph: '⭐' },
      { area: [46, 402, 188, 548], sound: 'chime', kick: ['moonRock'], flare: [230, 230, 255], glyph: '🌙' },
      { area: [832, 402, 988, 554], sound: 'whoosh', kick: ['galaxy'], flare: [200, 150, 255], glyph: '🌀' },
      { area: [220, 120, 820, 470], sound: 'rumble', kick: ['cracks'], flare: [180, 140, 255] },
    ],
  },
  'void-portrait': {
    wind: null,
    layers: [
      { id: 'nebFlow', type: 'flow', mask: 'nebula', dir: [0.3, 1], dist: 16, period: 6, alpha: 0.9, glow: 0.3, glowPeriod: 5 },
      { id: 'nebula', type: 'mask', mask: 'nebula', anim: { kind: 'wave', along: 'y', band: 260, speed: 16 }, alpha: [0.05, 0.4], gain: 0.7, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'stars' }, rate: 9, max: 40, color: [255, 255, 255], size: [0.8, 1.5], life: [0.4, 1.1] },
      { id: 'cracks', type: 'mask', mask: 'cracks', anim: { kind: 'pulse', period: 3.6 }, alpha: [0.1, 0.6], bloom: 0.7, kickDur: 2 },
      { id: 'rock1', type: 'echo', box: [118, 175, 140, 197], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.35 } },
      { id: 'rock2', type: 'echo', box: [414, 648, 436, 672], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.3 } },
      { id: 'rock3', type: 'echo', box: [220, 860, 270, 910], feather: 5, motion: { kind: 'drift', amp: 3, speed: 0.4 } },
      { id: 'planet', type: 'echo', box: [24, 22, 142, 140], round: true, feather: 6, motion: { kind: 'spin', speed: 4 } },
      { id: 'cluster', type: 'glow', points: [[380, 90, 12], [410, 74, 7], [356, 60, 6], [420, 110, 6]], color: [220, 230, 255], anim: 'pulse', period: 2.2, alpha: [0.3, 0.9], kickDur: 2 },
      { id: 'moonRock', type: 'echo', box: [36, 850, 126, 970], feather: 6, motion: { kind: 'bob', amp: 3, period: 5, kickAmp: 6 } },
      { id: 'galaxy', type: 'echo', box: [292, 856, 452, 1010], round: true, feather: 10, motion: { kind: 'spin', speed: -10, pivot: [370, 935], tilt: [-38, 0.47] } },
      { id: 'comets', type: 'meteors', area: [0, 0, 459, 1024], dir: [0.5, 0.8], speed: [160, 240], every: [5, 11], size: [1, 1.7] },
      { type: 'vortex', center: [230, 510], rx: 230, ry: 420, count: 40, speed: 0.15, color: [200, 160, 255], alpha: 0.12, width: 1.2 },
      { type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2.5, max: 26, color: [220, 200, 255], size: [0.6, 1.1], life: [3, 6], alpha: 0.6, speed: 0.6 },
    ],
    pokes: [
      { area: [20, 18, 146, 144], sound: 'whoosh', kick: ['planet', 'nebula'], flare: [200, 150, 255], glyph: '🪐' },
      { area: [340, 40, 440, 130], sound: 'chime', kick: ['cluster'], flare: [230, 235, 255], glyph: '⭐' },
      { area: [34, 848, 128, 972], sound: 'chime', kick: ['moonRock'], flare: [230, 230, 255], glyph: '🌙' },
      { area: [288, 852, 456, 1014], sound: 'whoosh', kick: ['galaxy'], flare: [200, 150, 255], glyph: '🌀' },
    ],
  },

  // ---- Zombies: a misty graveyard at night ----------------------------------------------------
  'zombies-land': {
    wind: { dir: 1, every: [8, 14], speed: [100, 160], width: [180, 280], lean: 0.25 },
    layers: [
      // Air first, at ground level: the green graveyard mist rolls and churns between the graves.
      { id: 'mistFlow', type: 'flow', mask: 'mist', dir: [1, 0], dist: 24, period: 5, alpha: 0.9, glow: 0.2, glowPeriod: 4 },
      { id: 'mist', type: 'mask', mask: 'mist', anim: { kind: 'wave', along: 'x', band: 260, speed: 20 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { type: 'fog', area: [-120, 120, 1144, 572], count: 14, size: [90, 170], speed: 6, color: [90, 200, 140], alpha: 0.12 },
      // The grasping hands claw at the air from the open graves.
      { id: 'hand1', type: 'echo', box: [244, 440, 290, 520], feather: 5, motion: { kind: 'claw', amp: 2.2, period: 2.4, pivot: [266, 518] } },
      { id: 'hand2', type: 'echo', box: [290, 436, 330, 486], feather: 5, motion: { kind: 'claw', amp: 2, period: 2.9, pivot: [310, 484] } },
      { id: 'hand3', type: 'echo', box: [810, 430, 856, 482], feather: 5, motion: { kind: 'claw', amp: 2.2, period: 2.6, pivot: [833, 480] } },
      { id: 'hand4', type: 'echo', box: [860, 442, 904, 500], feather: 5, motion: { kind: 'claw', amp: 2, period: 3.1, pivot: [882, 498] } },
      // The crypt doorways glow faintly green, as if something waits inside.
      { id: 'crypts', type: 'glow', points: [[240, 76, 22], [794, 88, 24]], color: [120, 255, 150], anim: 'pulse', period: 5, alpha: [0.05, 0.22], kickDur: 2 },
      // Corners. Top right, the lantern flickers and sways on its hook.
      { id: 'lantern', type: 'mask', mask: 'lantern', anim: { kind: 'flicker', speed: 4 }, alpha: [0.2, 0.8], bloom: 1, kickDur: 1.5 },
      { id: 'lanternGlow', type: 'glow', points: [[938, 118, 64]], color: [255, 190, 100], anim: 'flicker', alpha: [0.1, 0.32], kickDur: 1.5 },
      { id: 'lanternSway', type: 'echo', box: [898, 52, 980, 180], feather: 6, motion: { kind: 'rock', amp: 1.6, period: 3.6, pivot: [958, 30], kickAmp: 5 } },
      // Bottom right, the crow bobs its head and shuffles; tapped, it caws and flaps.
      { id: 'crow', type: 'echo', box: [898, 390, 1000, 488], feather: 6, autoKick: [6, 12], motion: { kind: 'bob', amp: 0, kickAmp: 2.4, period: 0.4 } },
      // Bottom left, dirt trickles from the shovel's mound.
      { id: 'dirt', type: 'particles', kind: 'drip', from: [[90, 470, 20]], rate: 0.6, max: 4, color: [90, 60, 40], size: [1, 1.5], life: [2, 3], fall: 12, splash: false },
      { id: 'shovel', type: 'echo', box: [30, 330, 120, 500], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [90, 495] } },
      // Top left, the old headstone; tapped, its moss glows and something moans.
      { id: 'stone', type: 'echo', box: [30, 20, 136, 150], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.4, pivot: [83, 148] } },
      // Air: crows and bats cross the sky, fireflies of grave-light drift.
      { type: 'flyers', area: [0, 0, 1024, 80], every: [6, 12], speed: [50, 80], size: [5, 8], color: [10, 14, 12] },
      { id: 'wisps', type: 'particles', kind: 'wisp', area: [0, 100, 1024, 572], rate: 1, max: 10, color: [140, 255, 170], size: [2.5, 5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2, max: 20, color: [170, 255, 190], size: [0.6, 1.2], life: [3, 6], alpha: 0.6, speed: 0.6 },
    ],
    pokes: [
      { area: [28, 18, 138, 152], sound: 'groan', kick: ['stone', 'crypts'], flare: [140, 255, 170], glyph: '🪦', burst: { layer: 'wisps', n: 4, at: [83, 80], spread: 30 } },
      { area: [896, 28, 982, 182], sound: 'whoosh', kick: ['lantern', 'lanternGlow', 'lanternSway'], flare: [255, 190, 100], glyph: '🏮' },
      { area: [28, 328, 122, 540], sound: 'knock', kick: ['shovel'], flare: [200, 170, 120], burst: { layer: 'dirt', n: 4, at: [90, 470], spread: 20 } },
      { area: [896, 388, 1002, 490], sound: 'screech', kick: ['crow'], flare: [140, 255, 170], glyph: '🪶' },
      { area: [240, 430, 340, 530], sound: 'groan', kick: ['hand1', 'hand2'], flare: [140, 255, 170], glyph: '🧟' },
      { area: [806, 426, 908, 504], sound: 'groan', kick: ['hand3', 'hand4'], flare: [140, 255, 170], glyph: '🧟' },
    ],
  },
  'zombies-portrait': {
    wind: { dir: 1, every: [8, 14], speed: [90, 140], width: [160, 240], lean: 0.12 },
    layers: [
      { id: 'mistFlow', type: 'flow', mask: 'mist', dir: [1, 0.2], dist: 22, period: 5, alpha: 0.9, glow: 0.2, glowPeriod: 4 },
      { id: 'mist', type: 'mask', mask: 'mist', anim: { kind: 'wave', along: 'y', band: 280, speed: 22 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { type: 'fog', area: [-120, 120, 580, 1024], count: 14, size: [80, 150], speed: 6, color: [90, 200, 140], alpha: 0.12 },
      { id: 'hand1', type: 'echo', box: [114, 198, 152, 240], feather: 5, motion: { kind: 'claw', amp: 2, period: 2.4, pivot: [133, 238] } },
      { id: 'hand2', type: 'echo', box: [374, 650, 412, 690], feather: 5, motion: { kind: 'claw', amp: 2, period: 2.9, pivot: [393, 688] } },
      { id: 'hand3', type: 'echo', box: [346, 736, 384, 780], feather: 5, motion: { kind: 'claw', amp: 2, period: 2.6, pivot: [365, 778] } },
      { id: 'hand4', type: 'echo', box: [94, 762, 124, 810], feather: 5, motion: { kind: 'claw', amp: 2, period: 3.1, pivot: [109, 808] } },
      { id: 'crypts', type: 'glow', points: [[388, 216, 16], [30, 410, 16], [416, 356, 16]], color: [120, 255, 150], anim: 'pulse', period: 5, alpha: [0.05, 0.22], kickDur: 2 },
      { id: 'lantern', type: 'mask', mask: 'lantern', anim: { kind: 'flicker', speed: 4 }, alpha: [0.2, 0.8], bloom: 1, kickDur: 1.5 },
      { id: 'lanternGlow', type: 'glow', points: [[401, 86, 46]], color: [220, 240, 255], anim: 'flicker', alpha: [0.1, 0.3], kickDur: 1.5 },
      { id: 'lanternSway', type: 'echo', box: [378, 34, 424, 126], feather: 5, motion: { kind: 'rock', amp: 1.6, period: 3.6, pivot: [404, 30], kickAmp: 5 } },
      { id: 'crow', type: 'echo', box: [366, 852, 446, 928], feather: 6, autoKick: [6, 12], motion: { kind: 'bob', amp: 0, kickAmp: 2.4, period: 0.4 } },
      { id: 'shovel', type: 'echo', box: [14, 840, 90, 990], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [60, 985] } },
      { id: 'stone', type: 'echo', box: [20, 22, 92, 116], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.4, pivot: [56, 114] } },
      { type: 'flyers', area: [0, 0, 459, 80], every: [6, 12], speed: [45, 70], size: [4, 7], color: [10, 14, 12] },
      { id: 'wisps', type: 'particles', kind: 'wisp', area: [0, 120, 459, 1024], rate: 1, max: 10, color: [140, 255, 170], size: [2.3, 4.5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2, max: 20, color: [170, 255, 190], size: [0.6, 1.1], life: [3, 6], alpha: 0.6, speed: 0.6 },
    ],
    pokes: [
      { area: [18, 20, 94, 118], sound: 'groan', kick: ['stone', 'crypts'], flare: [140, 255, 170], glyph: '🪦', burst: { layer: 'wisps', n: 4, at: [56, 70], spread: 24 } },
      { area: [374, 30, 428, 130], sound: 'whoosh', kick: ['lantern', 'lanternGlow', 'lanternSway'], flare: [220, 240, 255], glyph: '🏮' },
      { area: [12, 838, 92, 994], sound: 'knock', kick: ['shovel'], flare: [200, 170, 120] },
      { area: [364, 850, 448, 930], sound: 'screech', kick: ['crow'], flare: [140, 255, 170], glyph: '🪶' },
      { area: [100, 190, 160, 250], sound: 'groan', kick: ['hand1'], flare: [140, 255, 170], glyph: '🧟' },
    ],
  },

  // ==== The Circles of Hell (Demons' Descent), rebuilt for the new paintings ====================
  // ---- I · Limbo: a grey ashen plain, ruins in the mist, lost souls wandering. ----
  'circle1-land': {
    wind: { dir: 1, every: [7, 12], speed: [90, 140], width: [200, 320], lean: 0.2 },
    layers: [
      { id: 'fogFlow', type: 'flow', mask: 'fog', dir: [1, 0], dist: 26, period: 6, alpha: 0.9 },
      { id: 'fog', type: 'mask', mask: 'fog', anim: { kind: 'wave', along: 'x', band: 300, speed: 14 }, alpha: [0, 0.25], gain: 0.5, kickDur: 2 },
      { type: 'fog', area: [-150, 40, 1174, 572], count: 16, size: [90, 170], speed: 6, color: [215, 220, 228], alpha: 0.16 },
      { type: 'rays', beams: [[400, 0, 12, 300, 70], [620, 0, -10, 300, 70]], color: [235, 240, 250], alpha: [0.04, 0.12], period: 9 },
      { id: 'souls', type: 'particles', kind: 'spirit', area: [60, 80, 960, 520], rate: 0.18, max: 3, color: [215, 230, 255], size: [6, 9], life: [10, 16], alpha: 0.3 },
      { id: 'ghostTR', type: 'echo', box: [834, 34, 910, 130], feather: 8, motion: { kind: 'drift', amp: 4, speed: 0.3 } },
      { id: 'ghostL', type: 'echo', box: [24, 120, 80, 186], feather: 8, motion: { kind: 'drift', amp: 3.5, speed: 0.35 } },
      { id: 'windows', type: 'glow', points: [[290, 30, 3], [330, 36, 3], [362, 42, 3]], color: [255, 200, 130], anim: 'flicker', alpha: [0.1, 0.5] },
      { id: 'statue', type: 'echo', box: [56, 6, 192, 168], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1, period: 0.4, pivot: [124, 166] } },
      { id: 'tree', type: 'warp', box: [10, 335, 178, 515], base: 'bottom', amp: 1.6, period: 5, wave: 1.6 },
      { id: 'books', type: 'echo', box: [786, 424, 974, 540], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.35, pivot: [880, 538] } },
      { id: 'pages', type: 'particles', kind: 'petal', from: [[880, 470, 50]], rate: 0.25, max: 4, color: [230, 220, 190], size: [2, 3], life: [4, 6], speed: 0.8 },
      { id: 'wisps', type: 'particles', kind: 'wisp', area: [0, 60, 1024, 572], rate: 1.2, max: 12, color: [220, 230, 245], size: [3, 6], life: [3, 5.5], alpha: 0.2 },
    ],
    pokes: [
      { area: [54, 4, 194, 170], sound: 'groan', kick: ['statue'], flare: [210, 225, 255], glyph: '🗿' },
      { area: [830, 30, 914, 134], sound: 'whoosh', kick: ['ghostTR'], flare: [210, 225, 255], glyph: '👻', burst: { layer: 'souls', n: 1, at: [870, 80], spread: 4 } },
      { area: [8, 328, 122, 512], sound: 'rustle', kick: ['tree'], flare: [210, 225, 255] },
      { area: [784, 422, 976, 542], sound: 'flutter', kick: ['books'], flare: [230, 220, 190], glyph: '📖', burst: { layer: 'pages', n: 4, spread: 30 } },
    ],
  },
  'circle1-portrait': {
    wind: { dir: 1, every: [7, 12], speed: [80, 120], width: [180, 280], lean: 0.1 },
    layers: [
      { id: 'fogFlow', type: 'flow', mask: 'fog', dir: [1, 0.2], dist: 22, period: 6, alpha: 0.9 },
      { id: 'fog', type: 'mask', mask: 'fog', anim: { kind: 'wave', along: 'y', band: 320, speed: 16 }, alpha: [0, 0.25], gain: 0.5, kickDur: 2 },
      { type: 'fog', area: [-150, 80, 610, 1024], count: 16, size: [80, 150], speed: 6, color: [215, 220, 228], alpha: 0.16 },
      { id: 'souls', type: 'particles', kind: 'spirit', area: [30, 150, 430, 900], rate: 0.18, max: 3, color: [215, 230, 255], size: [5, 8], life: [10, 16], alpha: 0.3 },
      { id: 'ghostTR', type: 'echo', box: [372, 120, 446, 215], feather: 6, motion: { kind: 'drift', amp: 3.5, speed: 0.3 } },
      { id: 'statue', type: 'echo', box: [4, 70, 70, 170], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1, period: 0.4, pivot: [37, 168] } },
      { id: 'tree', type: 'warp', box: [0, 815, 135, 1015], base: 'bottom', amp: 1.6, period: 5, wave: 1.6 },
      { id: 'pages', type: 'particles', kind: 'petal', from: [[130, 980, 30]], rate: 0.25, max: 4, color: [230, 220, 190], size: [1.8, 2.8], life: [4, 6], speed: 0.8 },
      { id: 'wisps', type: 'particles', kind: 'wisp', area: [0, 100, 459, 1024], rate: 1.2, max: 12, color: [220, 230, 245], size: [2.5, 5], life: [3, 5.5], alpha: 0.2 },
    ],
    pokes: [
      { area: [2, 66, 74, 172], sound: 'groan', kick: ['statue'], flare: [210, 225, 255], glyph: '🗿' },
      { area: [364, 66, 434, 154], sound: 'whoosh', kick: ['ghostTR'], flare: [210, 225, 255], glyph: '👻', burst: { layer: 'souls', n: 1, at: [400, 110], spread: 4 } },
      { area: [90, 940, 180, 1020], sound: 'flutter', flare: [230, 220, 190], glyph: '📖', burst: { layer: 'pages', n: 4, spread: 20 } },
    ],
  },

  // ---- II · Lust: a cliff in an endless storm of wind and souls, lightning cracking. ----
  'circle2-land': {
    wind: { dir: 1, every: [3, 6], speed: [240, 340], width: [160, 240], lean: 0.4 },
    layers: [
      { id: 'stormFlow', type: 'flow', mask: 'storm', dir: [1, -0.6], dist: 30, period: 2.6, alpha: 0.95, glow: 0.25, glowPeriod: 2 },
      { id: 'storm', type: 'mask', mask: 'storm', anim: { kind: 'wave', along: 'x', band: 220, speed: 60 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { type: 'vortex', center: [512, 290], rx: 560, ry: 330, count: 70, speed: 0.9, color: [255, 120, 210], alpha: 0.18, width: 1.4 },
      { id: 'souls', type: 'stream', path: [[60, 560], [20, 300], [120, 80], [400, 10], [700, 20], [960, 120], [1010, 380], [880, 560]], count: 24, speed: 70, width: 26, color: [255, 190, 230], alpha: 0.3, size: [1.4, 2.6], tail: 22 },
      { id: 'bolts', type: 'mask', mask: 'bolts', anim: { kind: 'flicker', speed: 8 }, alpha: [0, 0.5], bloom: 0.9, kickDur: 0.6 },
      { id: 'zap', type: 'lightning', every: [2.5, 6], color: [255, 140, 220], flashMask: 'bolts', zones: [
        { from: [100, 100, 180, 160], to: [60, 260, 140, 320], jag: 30, flash: [120, 200, 80] },
        { from: [720, 20, 800, 60], to: [640, 120, 720, 180], jag: 30, flash: [720, 100, 80] },
        { from: [920, 180, 1000, 230], to: [900, 330, 980, 400], jag: 30, flash: [950, 280, 80] },
        { from: [780, 360, 860, 420], to: [700, 500, 780, 560], jag: 30, flash: [780, 460, 80] },
      ] },
      { id: 'rose', type: 'echo', box: [70, 0, 160, 96], feather: 6, motion: { kind: 'rock', amp: 2.2, period: 2.4, pivot: [100, 96], kickAmp: 4 } },
      { id: 'petals', type: 'particles', kind: 'petal', area: [0, 0, 1024, 572], rate: 1.6, max: 18, color: [190, 40, 90], size: [1.6, 2.6], life: [4, 7], speed: 1.4 },
      { id: 'veil', type: 'warp', box: [806, 30, 990, 190], base: 'top', amp: 4, period: 1.6, wave: 3 },
      { id: 'mirror', type: 'echo', box: [16, 404, 136, 548], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [76, 546] } },
      { id: 'mirrorGlint', type: 'particles', kind: 'glint', area: [40, 420, 110, 490], rate: 0.8, max: 3, color: [255, 220, 255], size: [1, 1.8], life: [0.4, 0.9] },
      { id: 'rod', type: 'glow', points: [[908, 360, 10]], color: [255, 140, 255], anim: 'flicker', alpha: [0.05, 0.4], kickDur: 1 },
    ],
    pokes: [
      { area: [66, 0, 164, 100], sound: 'rustle', kick: ['rose'], flare: [255, 80, 140], glyph: '🥀', burst: { layer: 'petals', n: 8, at: [110, 50], spread: 20 } },
      { area: [802, 26, 994, 194], sound: 'whoosh', kick: ['veil'], flare: [255, 160, 220] },
      { area: [14, 402, 138, 550], sound: 'clink', kick: ['mirror'], flare: [255, 200, 255], glyph: '💔' },
      { area: [860, 330, 970, 545], sound: 'rumble', strike: 'zap', zone: 3, kick: ['rod'], flare: [255, 140, 220], glyph: '⚡' },
      { area: [180, 120, 840, 420], sound: 'whoosh', kick: ['storm', 'stormFlow'], flare: [255, 140, 220] },
    ],
  },
  'circle2-portrait': {
    wind: { dir: 1, every: [3, 6], speed: [200, 280], width: [140, 220], lean: 0.2 },
    layers: [
      { id: 'stormFlow', type: 'flow', mask: 'storm', dir: [0.4, 1], dist: 28, period: 2.6, alpha: 0.95, glow: 0.25, glowPeriod: 2 },
      { id: 'storm', type: 'mask', mask: 'storm', anim: { kind: 'wave', along: 'y', band: 240, speed: 60 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { type: 'vortex', center: [230, 520], rx: 250, ry: 520, count: 60, speed: 0.9, color: [255, 120, 210], alpha: 0.18, width: 1.3 },
      { id: 'bolts', type: 'mask', mask: 'bolts', anim: { kind: 'flicker', speed: 8 }, alpha: [0, 0.5], bloom: 0.9, kickDur: 0.6 },
      { id: 'zap', type: 'lightning', every: [2.5, 6], color: [255, 140, 220], flashMask: 'bolts', zones: [
        { from: [380, 300, 440, 340], to: [400, 460, 450, 520], jag: 24, flash: [420, 400, 70] },
        { from: [10, 300, 60, 340], to: [20, 460, 60, 520], jag: 24, flash: [40, 400, 70] },
        { from: [360, 700, 420, 740], to: [380, 840, 440, 900], jag: 24, flash: [400, 800, 70] },
      ] },
      { id: 'rose', type: 'echo', box: [10, 0, 80, 90], feather: 6, motion: { kind: 'rock', amp: 2.2, period: 2.4, pivot: [40, 90], kickAmp: 4 } },
      { id: 'petals', type: 'particles', kind: 'petal', area: [0, 0, 459, 1024], rate: 1.6, max: 18, color: [190, 40, 90], size: [1.5, 2.4], life: [4, 7], speed: 1.4 },
      { id: 'veil', type: 'warp', box: [330, 110, 459, 300], base: 'top', amp: 4, period: 1.6, wave: 3 },
      { id: 'mirror', type: 'echo', box: [14, 808, 96, 964], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [55, 962] } },
    ],
    pokes: [
      { area: [6, 0, 84, 94], sound: 'rustle', kick: ['rose'], flare: [255, 80, 140], glyph: '🥀', burst: { layer: 'petals', n: 8, at: [40, 45], spread: 18 } },
      { area: [326, 106, 459, 304], sound: 'whoosh', kick: ['veil'], flare: [255, 160, 220] },
      { area: [12, 806, 98, 966], sound: 'clink', kick: ['mirror'], flare: [255, 200, 255], glyph: '💔' },
      { area: [360, 820, 459, 980], sound: 'rumble', strike: 'zap', zone: 2, flare: [255, 140, 220], glyph: '⚡' },
    ],
  },

  // ---- III · Gluttony: a field under a cold endless rain of filth; Cerberus in the distance. ----
  'circle3-land': {
    wind: null,
    layers: [
      { id: 'rain', type: 'particles', kind: 'rain', area: [-60, -20, 1084, 560], rate: 70, max: 220, color: [200, 215, 230], size: [1, 1], life: [0.9, 1.4], wind: -70, floor: null },
      { id: 'drops', type: 'particles', kind: 'drip', area: { mask: 'puddles' }, rate: 14, max: 30, color: [0, 0, 0], size: [0.1, 0.1], life: [0.6, 0.9], fall: 1, splashColor: [210, 225, 240] },
      { id: 'puddles', type: 'mask', mask: 'puddles', anim: { kind: 'wave', along: 'x', band: 80, speed: 24 }, alpha: [0, 0.3], gain: 0.55, kickDur: 2 },
      { type: 'fog', area: [-120, 60, 1144, 280], count: 10, size: [100, 180], speed: 5, color: [170, 180, 190], alpha: 0.14 },
      { id: 'cerberus', type: 'echo', box: [624, 4, 772, 110], feather: 10, motion: { kind: 'breathe', amp: 0.8, period: 3, pivot: [698, 108], kickAmp: 3 } },
      { id: 'eyes', type: 'glow', points: [[648, 34, 3], [672, 30, 3], [700, 28, 3], [726, 34, 3]], color: [255, 200, 60], anim: 'blink', pair: true, period: 4, alpha: [0.3, 0.9], kickDur: 2 },
      { id: 'spill', type: 'particles', kind: 'drip', from: [[96, 76, 4], [112, 92, 4]], rate: 1.2, max: 5, color: [120, 110, 60], size: [1.2, 1.8], life: [3, 4], fall: 40, splashColor: [150, 140, 90] },
      { id: 'goblet', type: 'echo', box: [0, 0, 128, 116], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.35, pivot: [64, 114] } },
      { id: 'steam', type: 'particles', kind: 'smoke', from: [[904, 60, 30]], rate: 1, max: 8, color: [200, 190, 180], size: [6, 10], life: [2, 3.5], alpha: 0.2, speed: 0.6 },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[904, 60, 30], [120, 470, 40], [890, 480, 40], [40, 220, 30]], rate: 2, max: 14, color: [30, 30, 30], size: [1.1, 1.6], life: [4, 7] },
      { id: 'bowl', type: 'echo', box: [790, 410, 990, 560], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [890, 558] } },
      { id: 'bones', type: 'echo', box: [0, 420, 260, 572], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 0.8, period: 0.3, pivot: [130, 570] } },
    ],
    pokes: [
      { area: [0, 0, 130, 118], sound: 'splash', kick: ['goblet'], flare: [200, 190, 140], glyph: '🍷', burst: { layer: 'spill', n: 5, at: [104, 84], spread: 6 } },
      { area: [808, 0, 1000, 136], sound: 'squelch', flare: [220, 200, 170], glyph: '🍖', burst: [{ layer: 'flies', n: 6, at: [904, 60], spread: 20 }, { layer: 'steam', n: 4, at: [904, 60], spread: 20 }] },
      { area: [620, 0, 776, 112], sound: 'growl', kick: ['cerberus', 'eyes'], flare: [255, 200, 60], glyph: '🐕' },
      { area: [788, 408, 992, 562], sound: 'clink', kick: ['bowl'], flare: [220, 210, 190], glyph: '🥣' },
      { area: [0, 418, 262, 572], sound: 'rattle', kick: ['bones'], flare: [230, 220, 200], glyph: '🦴' },
    ],
  },
  'circle3-portrait': {
    wind: null,
    layers: [
      { id: 'rain', type: 'particles', kind: 'rain', area: [-40, -20, 499, 1010], rate: 60, max: 200, color: [200, 215, 230], size: [1, 1], life: [1.4, 2], wind: -60 },
      { id: 'drops', type: 'particles', kind: 'drip', area: { mask: 'puddles' }, rate: 12, max: 26, color: [0, 0, 0], size: [0.1, 0.1], life: [0.6, 0.9], fall: 1, splashColor: [210, 225, 240] },
      { id: 'puddles', type: 'mask', mask: 'puddles', anim: { kind: 'wave', along: 'y', band: 90, speed: 24 }, alpha: [0, 0.3], gain: 0.55, kickDur: 2 },
      { type: 'fog', area: [-100, 150, 560, 500], count: 10, size: [80, 150], speed: 5, color: [170, 180, 190], alpha: 0.14 },
      { id: 'spill', type: 'particles', kind: 'drip', from: [[52, 70, 4]], rate: 1, max: 4, color: [120, 110, 60], size: [1.1, 1.7], life: [3, 4], fall: 34, splashColor: [150, 140, 90] },
      { id: 'steam', type: 'particles', kind: 'smoke', from: [[410, 40, 24]], rate: 1, max: 8, color: [200, 190, 180], size: [5, 9], life: [2, 3.5], alpha: 0.2, speed: 0.6 },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[410, 40, 24], [40, 940, 30], [410, 950, 30]], rate: 2, max: 12, color: [30, 30, 30], size: [1.1, 1.5], life: [4, 7] },
      { id: 'bowl', type: 'echo', box: [356, 890, 459, 1000], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [407, 998] } },
      { id: 'bones', type: 'echo', box: [0, 880, 110, 1010], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 0.8, period: 0.3, pivot: [55, 1008] } },
    ],
    pokes: [
      { area: [0, 0, 100, 110], sound: 'splash', flare: [200, 190, 140], glyph: '🍷', burst: { layer: 'spill', n: 5, at: [52, 70], spread: 5 } },
      { area: [350, 0, 459, 110], sound: 'squelch', flare: [220, 200, 170], glyph: '🍖', burst: { layer: 'flies', n: 6, at: [410, 40], spread: 16 } },
      { area: [354, 888, 459, 1002], sound: 'clink', kick: ['bowl'], flare: [220, 210, 190], glyph: '🥣' },
      { area: [0, 878, 112, 1012], sound: 'rattle', kick: ['bones'], flare: [230, 220, 200], glyph: '🦴' },
    ],
  },

  // ---- IV · Greed: a cavern of spilled treasure, molten gold pouring from above. ----
  'circle4-land': {
    wind: null,
    layers: [
      { id: 'goldFlow', type: 'flow', mask: 'molten', dir: [0, 1], dist: 18, period: 2, alpha: 0.95, glow: 0.35, glowPeriod: 1.6 },
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [1, 0.3], dist: 12, period: 3, alpha: 0.9, glow: 0.25, glowPeriod: 2 },
      { id: 'molten', type: 'mask', mask: 'molten', anim: { kind: 'wave', along: 'y', band: 80, speed: 50 }, alpha: [0.05, 0.6], gain: 0.85, kickDur: 2 },
      { id: 'pours', type: 'particles', kind: 'drip', from: [[290, 30, 6], [300, 70, 4], [700, 30, 6], [692, 70, 4]], rate: 5, max: 16, color: [255, 200, 40], size: [1.6, 2.6], life: [2, 3], fall: 46, splashColor: [255, 220, 90] },
      { id: 'gold', type: 'mask', mask: 'gold', anim: { kind: 'wave', along: 'x', band: 200, speed: 40 }, alpha: [0, 0.45], gain: 0.7, kickDur: 2 },
      { id: 'glints', type: 'particles', kind: 'glint', area: { mask: 'gold' }, rate: 8, max: 30, color: [255, 250, 210], size: [0.9, 1.8], life: [0.3, 0.8] },
      { id: 'chest', type: 'echo', box: [36, 0, 202, 142], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [120, 140] } },
      { id: 'chestGlow', type: 'glow', points: [[120, 50, 50]], color: [255, 210, 80], anim: 'pulse', period: 3, alpha: [0.08, 0.25], kickDur: 2 },
      { id: 'boulder', type: 'echo', box: [790, 0, 950, 130], feather: 8, autoKick: [5, 10], motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 1.2, pivot: [870, 128] } },
      { id: 'bag', type: 'echo', box: [26, 440, 140, 560], feather: 8, motion: { kind: 'breathe', amp: 0, kickAmp: 3, period: 0.5, pivot: [83, 558] } },
      { id: 'scale', type: 'echo', box: [816, 360, 980, 545], feather: 8, motion: { kind: 'rock', amp: 2.2, period: 3.8, pivot: [898, 400], kickAmp: 4 } },
      { id: 'heat', type: 'fog', area: [-60, 0, 1084, 572], count: 9, size: [80, 140], speed: 3, color: [255, 190, 80], alpha: 0.06, blend: 'lighter' },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 2, max: 16, color: [255, 180, 60], size: [0.6, 1.2], life: [1.5, 3], speed: 0.8 },
    ],
    pokes: [
      { area: [34, 0, 204, 144], sound: 'coin', kick: ['chest', 'chestGlow', 'gold'], flare: [255, 220, 100], glyph: '💰', burst: { layer: 'glints', n: 14, at: [120, 70], spread: 50 } },
      { area: [788, 0, 952, 132], sound: 'grind', kick: ['boulder'], flare: [255, 200, 140], glyph: '🪨' },
      { area: [24, 438, 142, 562], sound: 'coin', kick: ['bag'], flare: [255, 220, 100], glyph: '💰' },
      { area: [814, 358, 982, 547], sound: 'clink', kick: ['scale'], flare: [255, 220, 100], glyph: '⚖️' },
      { area: [260, 0, 330, 140], sound: 'drip', kick: ['molten', 'goldFlow'], flare: [255, 210, 60], burst: { layer: 'pours', n: 6, at: [292, 40], spread: 6 } },
      { area: [660, 0, 730, 140], sound: 'drip', kick: ['molten', 'goldFlow'], flare: [255, 210, 60], burst: { layer: 'pours', n: 6, at: [698, 40], spread: 6 } },
    ],
  },
  'circle4-portrait': {
    wind: null,
    layers: [
      { id: 'goldFlow', type: 'flow', mask: 'molten', dir: [0, 1], dist: 16, period: 2, alpha: 0.95, glow: 0.35, glowPeriod: 1.6 },
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [0.3, 1], dist: 12, period: 3, alpha: 0.9, glow: 0.25, glowPeriod: 2 },
      { id: 'molten', type: 'mask', mask: 'molten', anim: { kind: 'wave', along: 'y', band: 90, speed: 50 }, alpha: [0.05, 0.6], gain: 0.85, kickDur: 2 },
      { id: 'gold', type: 'mask', mask: 'gold', anim: { kind: 'wave', along: 'y', band: 220, speed: 44 }, alpha: [0, 0.45], gain: 0.7, kickDur: 2 },
      { id: 'glints', type: 'particles', kind: 'glint', area: { mask: 'gold' }, rate: 8, max: 30, color: [255, 250, 210], size: [0.9, 1.7], life: [0.3, 0.8] },
      { id: 'chest', type: 'echo', box: [10, 0, 100, 90], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [55, 88] } },
      { id: 'boulder', type: 'echo', box: [330, 0, 459, 120], feather: 8, autoKick: [5, 10], motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 1.2, pivot: [395, 118] } },
      { id: 'scale', type: 'echo', box: [330, 880, 430, 1000], feather: 6, motion: { kind: 'rock', amp: 2.2, period: 3.8, pivot: [380, 900], kickAmp: 4 } },
      { id: 'heat', type: 'fog', area: [-60, 0, 520, 1024], count: 9, size: [70, 120], speed: 3, color: [255, 190, 80], alpha: 0.06, blend: 'lighter' },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 2, max: 16, color: [255, 180, 60], size: [0.6, 1.1], life: [1.5, 3], speed: 0.8 },
    ],
    pokes: [
      { area: [8, 0, 102, 92], sound: 'coin', kick: ['chest', 'gold'], flare: [255, 220, 100], glyph: '💰', burst: { layer: 'glints', n: 12, at: [55, 50], spread: 40 } },
      { area: [328, 0, 459, 122], sound: 'grind', kick: ['boulder'], flare: [255, 200, 140], glyph: '🪨' },
      { area: [326, 878, 434, 1002], sound: 'clink', kick: ['scale'], flare: [255, 220, 100], glyph: '⚖️' },
    ],
  },

  // ---- V · Wrath: the marsh of the Styx, drowned souls clawing out of the water. ----
  'circle5-land': {
    wind: null,
    layers: [
      { id: 'swampFlow', type: 'flow', mask: 'swamp', dir: [1, 0.2], dist: 20, period: 4, alpha: 0.95, glow: 0.2, glowPeriod: 3 },
      { id: 'swamp', type: 'mask', mask: 'swamp', anim: { kind: 'wave', along: 'x', band: 140, speed: 18 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'swamp' }, rate: 5, max: 24, color: [150, 220, 140], size: [1, 2.2], life: [0.5, 1.2] },
      { id: 'souls1', type: 'echo', box: [0, 200, 110, 300], feather: 8, motion: { kind: 'claw', amp: 2.4, period: 2.2, pivot: [55, 298] } },
      { id: 'souls2', type: 'echo', box: [0, 304, 110, 390], feather: 8, motion: { kind: 'claw', amp: 2.2, period: 2.8, pivot: [55, 388] } },
      { id: 'souls3', type: 'echo', box: [840, 216, 980, 300], feather: 8, motion: { kind: 'claw', amp: 2.4, period: 2.5, pivot: [910, 298] } },
      { id: 'souls4', type: 'echo', box: [880, 290, 1010, 380], feather: 8, motion: { kind: 'claw', amp: 2.2, period: 3, pivot: [945, 378] } },
      { id: 'hand', type: 'echo', box: [870, 0, 940, 96], feather: 6, motion: { kind: 'claw', amp: 2.6, period: 1.8, pivot: [905, 94], kickAmp: 3 } },
      { id: 'ripples', type: 'particles', kind: 'drip', from: [[60, 300, 40], [920, 300, 40], [905, 96, 14]], rate: 3, max: 10, color: [0, 0, 0], size: [0.1, 0.1], life: [1.4, 1.8], fall: 1, splashColor: [170, 230, 170] },
      { id: 'lantern', type: 'glow', points: [[134, 82, 34]], color: [255, 190, 90], anim: 'flicker', alpha: [0.2, 0.55], kickDur: 2 },
      { id: 'lanternSway', type: 'echo', box: [104, 34, 164, 130], feather: 5, motion: { kind: 'rock', amp: 1.4, period: 3.6, pivot: [120, 34], kickAmp: 4 } },
      { id: 'shield', type: 'echo', box: [830, 410, 960, 556], feather: 6, motion: { kind: 'bob', amp: 1.6, period: 4, kickAmp: 3 } },
      { id: 'oar', type: 'echo', box: [60, 420, 320, 560], feather: 8, motion: { kind: 'bob', amp: 1.4, period: 4.6, kickAmp: 3 } },
      { type: 'fog', area: [-120, 120, 1144, 572], count: 12, size: [90, 160], speed: 4, color: [100, 150, 100], alpha: 0.12 },
      { type: 'particles', kind: 'fly', from: [[300, 300, 60], [700, 260, 60]], rate: 1.5, max: 10, color: [30, 40, 30], size: [1, 1.5], life: [4, 7] },
    ],
    pokes: [
      { area: [100, 30, 170, 136], sound: 'whoosh', kick: ['lantern', 'lanternSway'], flare: [255, 190, 90], glyph: '🏮' },
      { area: [866, 0, 944, 100], sound: 'splash', kick: ['hand'], flare: [170, 230, 170], glyph: '✋', burst: { layer: 'ripples', n: 4, at: [905, 96], spread: 10 } },
      { area: [0, 196, 112, 392], sound: 'groan', kick: ['souls1', 'souls2'], flare: [200, 120, 100], glyph: '😡' },
      { area: [836, 212, 1012, 382], sound: 'groan', kick: ['souls3', 'souls4'], flare: [200, 120, 100], glyph: '😡' },
      { area: [828, 408, 962, 558], sound: 'clink', kick: ['shield'], flare: [200, 210, 220], glyph: '🛡️' },
      { area: [58, 418, 322, 562], sound: 'splash', kick: ['oar'], flare: [170, 230, 170] },
    ],
  },
  'circle5-portrait': {
    wind: null,
    layers: [
      { id: 'swampFlow', type: 'flow', mask: 'swamp', dir: [0.2, 1], dist: 18, period: 4, alpha: 0.95, glow: 0.2, glowPeriod: 3 },
      { id: 'swamp', type: 'mask', mask: 'swamp', anim: { kind: 'wave', along: 'y', band: 160, speed: 18 }, alpha: [0, 0.35], gain: 0.6, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'swamp' }, rate: 5, max: 24, color: [150, 220, 140], size: [1, 2], life: [0.5, 1.2] },
      { id: 'soulsL', type: 'echo', box: [0, 225, 140, 815], feather: 8, motion: { kind: 'claw', amp: 2.2, period: 2.4, pivot: [40, 718] } },
      { id: 'soulsR', type: 'echo', box: [335, 215, 459, 720], feather: 8, motion: { kind: 'claw', amp: 2.2, period: 2.8, pivot: [415, 698] } },
      { id: 'hand', type: 'echo', box: [360, 20, 420, 100], feather: 6, motion: { kind: 'claw', amp: 2.4, period: 1.8, pivot: [390, 98], kickAmp: 3 } },
      { id: 'lantern', type: 'glow', points: [[92, 76, 28]], color: [255, 210, 120], anim: 'flicker', alpha: [0.2, 0.55], kickDur: 2 },
      { id: 'shield', type: 'echo', box: [370, 890, 450, 990], feather: 6, motion: { kind: 'bob', amp: 1.5, period: 4, kickAmp: 3 } },
      { type: 'fog', area: [-100, 120, 560, 1024], count: 12, size: [80, 140], speed: 4, color: [100, 150, 100], alpha: 0.12 },
    ],
    pokes: [
      { area: [60, 40, 130, 120], sound: 'whoosh', kick: ['lantern'], flare: [255, 210, 120], glyph: '🏮' },
      { area: [356, 16, 424, 104], sound: 'splash', kick: ['hand'], flare: [170, 230, 170], glyph: '✋' },
      { area: [0, 225, 140, 815], sound: 'groan', kick: ['soulsL'], flare: [200, 120, 100], glyph: '😡' },
      { area: [340, 225, 459, 715], sound: 'groan', kick: ['soulsR'], flare: [200, 120, 100], glyph: '😡' },
      { area: [366, 886, 454, 994], sound: 'clink', kick: ['shield'], flare: [200, 210, 220], glyph: '🛡️' },
    ],
  },

  // ---- VI · Heresy: a graveyard of open burning tombs, the walls of Dis aflame. ----
  'circle6-land': {
    wind: null,
    layers: [
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [1, 0.4], dist: 14, period: 2.8, alpha: 0.95, glow: 0.35, glowPeriod: 1.8 },
      { id: 'lava', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'x', band: 120, speed: 30 }, alpha: [0.05, 0.5], gain: 0.85, kickDur: 2 },
      { id: 'fire', type: 'mask', mask: 'fire', anim: { kind: 'flicker', speed: 3 }, alpha: [0.25, 0.85], bloom: 1, kickDur: 2 },
      { id: 'tombFlames', type: 'flames', points: [[96, 60, 70, 50], [80, 120, 30, 26], [110, 232, 56, 36], [868, 236, 40, 34], [928, 50, 56, 40], [906, 420, 54, 50]], tongues: 6, alpha: 0.8 },
      { id: 'city', type: 'glow', points: [[200, 30, 50], [400, 30, 50], [620, 30, 50], [820, 30, 50]], color: [255, 90, 30], anim: 'flicker', alpha: [0.1, 0.3] },
      { type: 'particles', kind: 'ember', area: { mask: 'fire' }, rate: 8, max: 50, color: [255, 140, 40], size: [0.7, 1.5], life: [1.2, 2.4], speed: 1.1 },
      { type: 'particles', kind: 'smoke', from: [[96, 40, 30], [928, 30, 26], [906, 400, 26], [110, 210, 20]], rate: 2, max: 20, color: [50, 30, 25], size: [8, 14], life: [3, 5], alpha: 0.22, speed: 0.7 },
      { id: 'book', type: 'echo', box: [826, 30, 990, 140], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.35, pivot: [908, 138] } },
      { id: 'lid', type: 'echo', box: [20, 384, 230, 500], feather: 8, autoKick: [9, 15], motion: { kind: 'rock', amp: 0, kickAmp: 1, period: 0.5, pivot: [125, 498] } },
      { type: 'fog', area: [-60, 0, 1084, 572], count: 9, size: [80, 140], speed: 3, color: [220, 80, 20], alpha: 0.07, blend: 'lighter' },
      { type: 'particles', kind: 'ash', area: [0, -10, 1024, 572], rate: 3, max: 30, color: [100, 90, 90], size: [0.8, 1.6], life: [5, 9], speed: 0.6 },
    ],
    pokes: [
      { area: [0, 0, 200, 140], sound: 'ignite', kick: ['tombFlames', 'fire'], flare: [255, 140, 40], glyph: '⚰️' },
      { area: [824, 28, 992, 142], sound: 'ignite', kick: ['book', 'fire'], flare: [255, 140, 40], glyph: '📕' },
      { area: [18, 382, 232, 502], sound: 'grind', kick: ['lid'], flare: [255, 120, 40], glyph: '🪦' },
      { area: [846, 360, 970, 470], sound: 'whoosh', kick: ['tombFlames', 'fire'], flare: [255, 140, 40], glyph: '🔥' },
      { area: [200, 150, 820, 420], sound: 'hiss', kick: ['lava', 'lavaFlow'], flare: [255, 120, 30] },
    ],
  },
  'circle6-portrait': {
    wind: null,
    layers: [
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [0.4, 1], dist: 14, period: 2.8, alpha: 0.95, glow: 0.35, glowPeriod: 1.8 },
      { id: 'lava', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'y', band: 140, speed: 30 }, alpha: [0.05, 0.5], gain: 0.85, kickDur: 2 },
      { id: 'fire', type: 'mask', mask: 'fire', anim: { kind: 'flicker', speed: 3 }, alpha: [0.25, 0.85], bloom: 1, kickDur: 2 },
      { type: 'particles', kind: 'ember', area: { mask: 'fire' }, rate: 7, max: 44, color: [255, 140, 40], size: [0.7, 1.4], life: [1.2, 2.4], speed: 1.1 },
      { id: 'brazier', type: 'flames', points: [[400, 968, 30, 34]], tongues: 5, alpha: 0.8 },
      { type: 'particles', kind: 'smoke', area: { mask: 'fire' }, rate: 1.5, max: 16, color: [50, 30, 25], size: [7, 12], life: [3, 5], alpha: 0.22, speed: 0.7 },
      { type: 'fog', area: [-60, 0, 520, 1024], count: 9, size: [70, 120], speed: 3, color: [220, 80, 20], alpha: 0.07, blend: 'lighter' },
      { type: 'particles', kind: 'ash', area: [0, -10, 459, 1024], rate: 3, max: 28, color: [100, 90, 90], size: [0.8, 1.5], life: [5, 9], speed: 0.6 },
    ],
    pokes: [
      { area: [360, 920, 459, 1010], sound: 'ignite', kick: ['brazier', 'fire'], flare: [255, 140, 40], glyph: '🔥' },
      { area: [0, 120, 120, 260], sound: 'ignite', kick: ['fire'], flare: [255, 140, 40], glyph: '⚰️' },
      { area: [340, 120, 459, 260], sound: 'ignite', kick: ['fire'], flare: [255, 140, 40], glyph: '📕' },
    ],
  },

  // ---- VII · Violence: a river of boiling blood, burning trees, centaurs on the horizon. ----
  'circle7-land': {
    wind: null,
    layers: [
      { id: 'riverFlow', type: 'flow', mask: 'lava', dir: [1, -0.3], dist: 22, period: 2.6, alpha: 0.95, glow: 0.35, glowPeriod: 1.6 },
      { id: 'river', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'x', band: 140, speed: 40 }, alpha: [0.05, 0.5], gain: 0.85, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'lava' }, rate: 6, max: 30, color: [255, 200, 120], size: [1, 2.4], life: [0.4, 0.9] },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 7, max: 46, color: [255, 140, 40], size: [0.7, 1.5], life: [1.2, 2.6], speed: 1 },
      { id: 'blood', type: 'mask', mask: 'blood', anim: { kind: 'pulse', period: 1.2 }, alpha: [0.1, 0.5], bloom: 0.6, kickDur: 2 },
      { id: 'bloodBub', type: 'particles', kind: 'bubble', from: [[900, 490, 50]], rate: 4, max: 16, color: [255, 120, 120], size: [1.2, 2.6], life: [0.4, 0.9] },
      { id: 'trees', type: 'flames', points: [[150, 40, 50, 46], [60, 120, 30, 30], [200, 50, 20, 20]], tongues: 5, alpha: 0.75 },
      { id: 'treeWarp', type: 'warp', box: [25, 0, 235, 148], base: 'bottom', amp: 1.6, period: 3, wave: 2 },
      { id: 'meteors', type: 'meteors', area: [600, -20, 1024, 300], dir: [-0.7, 1], speed: [120, 180], every: [2.5, 5], size: [1.8, 3] },
      { id: 'arrows', type: 'arrows', every: [3, 6], shooters: [
        { from: [300, 26], to: [430, 120], arc: 30, dur: 1 }, { from: [646, 30], to: [560, 140], arc: 30, dur: 1 }, { from: [744, 30], to: [820, 160], arc: 30, dur: 1 },
      ] },
      { id: 'bow', type: 'echo', box: [30, 390, 180, 530], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.4, period: 0.3, pivot: [105, 528] } },
      { type: 'particles', kind: 'ember', area: [0, 0, 1024, 572], rate: 3, max: 24, color: [255, 150, 50], size: [0.6, 1.3], life: [2, 4], speed: 0.8 },
      { type: 'fog', area: [-60, 0, 1084, 572], count: 9, size: [80, 140], speed: 3, color: [220, 70, 20], alpha: 0.07, blend: 'lighter' },
    ],
    pokes: [
      { area: [60, 0, 240, 150], sound: 'ignite', kick: ['trees', 'treeWarp'], flare: [255, 120, 40], glyph: '🔥' },
      { area: [900, 0, 1024, 120], sound: 'whoosh', flare: [255, 140, 40], glyph: '☄️' },
      { area: [28, 388, 182, 532], sound: 'whoosh', kick: ['bow'], loose: 'arrows', shooter: 1, flare: [255, 170, 60], glyph: '🏹' },
      { area: [790, 430, 1010, 552], sound: 'bloop', kick: ['blood'], flare: [255, 60, 60], glyph: '🩸', burst: { layer: 'bloodBub', n: 10, spread: 30 } },
      { area: [240, 0, 820, 80], sound: 'growl', loose: 'arrows', shooter: 0, flare: [255, 170, 60], glyph: '🐎' },
    ],
  },
  'circle7-portrait': {
    wind: null,
    layers: [
      { id: 'riverFlow', type: 'flow', mask: 'lava', dir: [0.3, 1], dist: 20, period: 2.6, alpha: 0.95, glow: 0.35, glowPeriod: 1.6 },
      { id: 'river', type: 'mask', mask: 'lava', anim: { kind: 'wave', along: 'y', band: 160, speed: 40 }, alpha: [0.05, 0.5], gain: 0.85, kickDur: 2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'lava' }, rate: 5, max: 26, color: [255, 200, 120], size: [1, 2.2], life: [0.4, 0.9] },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 6, max: 40, color: [255, 140, 40], size: [0.7, 1.4], life: [1.2, 2.6], speed: 1 },
      { id: 'blood', type: 'mask', mask: 'blood', anim: { kind: 'pulse', period: 1.2 }, alpha: [0.1, 0.5], bloom: 0.6, kickDur: 2 },
      { id: 'bloodBub', type: 'particles', kind: 'bubble', from: [[350, 950, 40]], rate: 3.5, max: 14, color: [255, 120, 120], size: [1.1, 2.4], life: [0.4, 0.9] },
      { id: 'trees', type: 'flames', points: [[60, 40, 40, 40]], tongues: 5, alpha: 0.75 },
      { id: 'meteors', type: 'meteors', area: [200, -20, 459, 300], dir: [-0.6, 1], speed: [120, 180], every: [2.5, 5], size: [1.6, 2.6] },
      { type: 'particles', kind: 'ember', area: [0, 0, 459, 1024], rate: 3, max: 24, color: [255, 150, 50], size: [0.6, 1.2], life: [2, 4], speed: 0.8 },
    ],
    pokes: [
      { area: [0, 0, 120, 140], sound: 'ignite', kick: ['trees'], flare: [255, 120, 40], glyph: '🔥' },
      { area: [370, 0, 459, 90], sound: 'whoosh', flare: [255, 140, 40], glyph: '☄️' },
      { area: [290, 890, 410, 1000], sound: 'bloop', kick: ['blood'], flare: [255, 60, 60], glyph: '🩸', burst: { layer: 'bloodBub', n: 10, spread: 26 } },
    ],
  },

  // ---- VIII · Fraud: the stone ditches of Malebolge; serpents, masks and hooded hypocrites. ----
  'circle8-land': {
    wind: null,
    layers: [
      { id: 'greenFlow', type: 'flow', mask: 'green', dir: [0, 1], dist: 16, period: 3.4, alpha: 0.95, glow: 0.3, glowPeriod: 2.2 },
      { id: 'green', type: 'mask', mask: 'green', anim: { kind: 'wave', along: 'y', band: 120, speed: 24 }, alpha: [0.05, 0.45], gain: 0.75, kickDur: 2 },
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [0, 1], dist: 14, period: 3, alpha: 0.95, glow: 0.3, glowPeriod: 2 },
      { type: 'particles', kind: 'wisp', area: { mask: 'green' }, rate: 1.5, max: 12, color: [170, 255, 120], size: [2.5, 5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 3, max: 22, color: [255, 150, 50], size: [0.6, 1.3], life: [1.5, 3], speed: 0.8 },
      // The hooded hypocrites walk their slow circuit in gilded lead cloaks.
      { id: 'hood1', type: 'echo', box: [716, 26, 790, 118], feather: 6, motion: { kind: 'drift', amp: 2, speed: 0.25 } },
      { id: 'hood2', type: 'echo', box: [158, 380, 214, 476], feather: 6, motion: { kind: 'drift', amp: 2, speed: 0.22 } },
      { id: 'hood3', type: 'echo', box: [770, 368, 832, 452], feather: 6, motion: { kind: 'drift', amp: 2, speed: 0.27 } },
      { id: 'hood4', type: 'echo', box: [820, 420, 880, 520], feather: 6, motion: { kind: 'drift', amp: 2, speed: 0.24 } },
      // The serpents coil and sway.
      { id: 'snakeTR', type: 'echo', box: [880, 0, 1010, 112], feather: 8, motion: { kind: 'breathe', amp: 2, period: 2.2, kickAmp: 4 } },
      { id: 'snakeL', type: 'warp', box: [60, 300, 120, 440], base: 'bottom', amp: 2.4, period: 2.4, wave: 3 },
      { id: 'snakeR', type: 'warp', box: [850, 120, 920, 210], base: 'bottom', amp: 2.4, period: 2.7, wave: 3 },
      { id: 'snakeR2', type: 'warp', box: [880, 290, 930, 410], base: 'bottom', amp: 2.4, period: 2.5, wave: 3 },
      { id: 'mask', type: 'echo', box: [6, 0, 112, 112], feather: 8, autoKick: [7, 13], motion: { kind: 'rock', amp: 0.8, period: 4, pivot: [59, 56], kickAmp: 3 } },
      { id: 'maskEyes', type: 'glow', points: [[44, 46, 5], [72, 46, 5]], color: [255, 210, 80], anim: 'pulse', period: 4, alpha: [0, 0.4], kickDur: 2 },
      { id: 'pitch', type: 'particles', kind: 'bubble', from: [[52, 456, 34]], rate: 4, max: 14, color: [120, 100, 100], size: [1.4, 2.8], life: [0.5, 1] },
      { id: 'coins', type: 'particles', kind: 'glint', area: { mask: 'gold' }, rate: 3, max: 12, color: [255, 245, 200], size: [0.9, 1.7], life: [0.3, 0.8] },
      { type: 'fog', area: [-60, 0, 1084, 572], count: 8, size: [80, 140], speed: 3, color: [120, 200, 80], alpha: 0.06, blend: 'lighter' },
    ],
    pokes: [
      { area: [4, 0, 114, 114], sound: 'groan', kick: ['mask', 'maskEyes'], flare: [255, 210, 80], glyph: '🎭' },
      { area: [878, 0, 1012, 114], sound: 'hiss', kick: ['snakeTR'], flare: [200, 255, 120], glyph: '🐍' },
      { area: [0, 420, 110, 560], sound: 'bloop', flare: [150, 120, 120], burst: { layer: 'pitch', n: 10, spread: 26 } },
      { area: [866, 470, 960, 550], sound: 'coin', kick: ['green'], flare: [255, 220, 100], glyph: '🪙', burst: { layer: 'coins', n: 10, spread: 30 } },
      { area: [710, 20, 796, 124], sound: 'groan', kick: ['hood1'], flare: [255, 210, 120] },
    ],
  },
  'circle8-portrait': {
    wind: null,
    layers: [
      { id: 'greenFlow', type: 'flow', mask: 'green', dir: [0, 1], dist: 16, period: 3.4, alpha: 0.95, glow: 0.3, glowPeriod: 2.2 },
      { id: 'green', type: 'mask', mask: 'green', anim: { kind: 'wave', along: 'y', band: 140, speed: 24 }, alpha: [0.05, 0.45], gain: 0.75, kickDur: 2 },
      { id: 'lavaFlow', type: 'flow', mask: 'lava', dir: [0, 1], dist: 14, period: 3, alpha: 0.95, glow: 0.3, glowPeriod: 2 },
      { type: 'particles', kind: 'wisp', area: { mask: 'green' }, rate: 1.5, max: 12, color: [170, 255, 120], size: [2.3, 4.5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'ember', area: { mask: 'lava' }, rate: 3, max: 20, color: [255, 150, 50], size: [0.6, 1.2], life: [1.5, 3], speed: 0.8 },
      { id: 'snakeTR', type: 'echo', box: [305, 10, 459, 105], feather: 6, motion: { kind: 'breathe', amp: 2, period: 2.2, kickAmp: 4 } },
      { id: 'coins', type: 'particles', kind: 'glint', area: { mask: 'gold' }, rate: 3, max: 12, color: [255, 245, 200], size: [0.9, 1.6], life: [0.3, 0.8] },
      { type: 'fog', area: [-60, 0, 520, 1024], count: 8, size: [70, 120], speed: 3, color: [120, 200, 80], alpha: 0.06, blend: 'lighter' },
    ],
    pokes: [
      { area: [366, 6, 459, 104], sound: 'hiss', kick: ['snakeTR'], flare: [200, 255, 120], glyph: '🐍' },
      { area: [120, 60, 340, 180], sound: 'groan', kick: ['green'], flare: [255, 210, 80], glyph: '🎭' },
      { area: [350, 940, 459, 1020], sound: 'coin', flare: [255, 220, 100], glyph: '🪙', burst: { layer: 'coins', n: 10, spread: 30 } },
    ],
  },

  // ---- IX · Treachery: Cocytus, the frozen lake; traitors locked in the ice, Satan's wings. ----
  'circle9-land': {
    wind: { dir: 1, every: [3, 6], speed: [220, 320], width: [180, 260], lean: 0.2 },
    layers: [
      // The icy wind streaming from the great wings.
      { id: 'wings', type: 'warp', box: [150, 0, 880, 112], base: 'top', amp: 2.4, period: 5, wave: 1.2 },
      { type: 'stream', path: [[300, 40], [200, 90], [80, 120], [-30, 140]], count: 24, speed: 120, width: 30, color: [230, 245, 255], alpha: 0.35, size: [1, 2], tail: 30 },
      { type: 'stream', path: [[720, 40], [820, 90], [940, 120], [1054, 140]], count: 24, speed: 120, width: 30, color: [230, 245, 255], alpha: 0.35, size: [1, 2], tail: 30 },
      { id: 'ice', type: 'mask', mask: 'ice', anim: { kind: 'wave', along: 'x', band: 300, speed: 30 }, alpha: [0, 0.25], gain: 0.5, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'snow' }, rate: 6, max: 26, color: [240, 250, 255], size: [0.9, 1.7], life: [0.4, 1] },
      { id: 'cracks', type: 'lightning', every: [8, 16], color: [200, 235, 255], zones: [
        { from: [300, 180, 400, 220], to: [440, 260, 520, 320], jag: 16, flash: [420, 250, 40] },
        { from: [600, 300, 700, 340], to: [740, 380, 820, 420], jag: 16, flash: [720, 360, 40] },
      ] },
      // The traitors' faces in the ice seem to strain; their breath fogs the surface.
      { id: 'faceL', type: 'echo', box: [0, 140, 120, 300], feather: 10, motion: { kind: 'breathe', amp: 0.8, period: 4, kickAmp: 2 } },
      { id: 'faceR', type: 'echo', box: [880, 180, 1024, 320], feather: 10, motion: { kind: 'breathe', amp: 0.8, period: 4.6, kickAmp: 2 } },
      { id: 'faceB', type: 'echo', box: [720, 460, 840, 572], feather: 10, motion: { kind: 'breathe', amp: 0.8, period: 4.3, kickAmp: 2 } },
      { id: 'breath', type: 'particles', kind: 'smoke', from: [[60, 230, 30], [950, 250, 30], [780, 510, 30], [240, 520, 30]], rate: 0.8, max: 8, color: [230, 240, 255], size: [5, 9], life: [2, 3.5], alpha: 0.18, speed: 0.5 },
      { id: 'hand', type: 'echo', box: [56, 0, 120, 110], feather: 6, motion: { kind: 'claw', amp: 1.4, period: 3, pivot: [88, 108], kickAmp: 3 } },
      { id: 'crown', type: 'echo', box: [20, 410, 130, 530], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.35, pivot: [75, 528] } },
      { id: 'crownGlint', type: 'particles', kind: 'glint', area: [30, 420, 120, 500], rate: 0.8, max: 3, color: [255, 255, 255], size: [1, 1.8], life: [0.4, 0.9] },
      { id: 'chain', type: 'echo', box: [870, 390, 980, 545], feather: 8, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [925, 400] } },
      { type: 'fog', area: [-120, 60, 1144, 572], count: 12, size: [90, 160], speed: 6, color: [200, 225, 245], alpha: 0.12 },
      { id: 'snowfall', type: 'particles', kind: 'snow', area: [-60, -20, 1024, 572], rate: 9, max: 90, color: [245, 250, 255], size: [1.2, 2.6], life: [5, 9], drift: 22, gustPush: 90 },
    ],
    pokes: [
      { area: [280, 0, 744, 96], sound: 'whoosh', kick: ['wings'], flare: [200, 230, 255], glyph: '🦇' },
      { area: [52, 0, 124, 112], sound: 'crack', kick: ['hand'], flare: [200, 235, 255], glyph: '✋' },
      { area: [18, 408, 132, 532], sound: 'clink', kick: ['crown'], flare: [230, 240, 255], glyph: '👑' },
      { area: [866, 388, 984, 548], sound: 'rattle', kick: ['chain'], flare: [200, 235, 255], glyph: '⛓️' },
      { area: [200, 140, 820, 420], sound: 'crack', strike: 'cracks', zone: 0, kick: ['ice'], flare: [200, 235, 255] },
      { area: [0, 136, 124, 304], sound: 'groan', kick: ['faceL'], flare: [200, 235, 255] },
    ],
  },
  'circle9-portrait': {
    wind: { dir: 1, every: [3, 6], speed: [180, 260], width: [160, 220], lean: 0.1 },
    layers: [
      { id: 'wings', type: 'warp', box: [0, 0, 410, 155], base: 'top', amp: 2.2, period: 5, wave: 1.2 },
      { id: 'ice', type: 'mask', mask: 'ice', anim: { kind: 'wave', along: 'y', band: 320, speed: 30 }, alpha: [0, 0.25], gain: 0.5, kickDur: 2 },
      { type: 'particles', kind: 'glint', area: { mask: 'snow' }, rate: 6, max: 26, color: [240, 250, 255], size: [0.9, 1.6], life: [0.4, 1] },
      { id: 'cracks', type: 'lightning', every: [8, 16], color: [200, 235, 255], zones: [
        { from: [120, 300, 200, 340], to: [220, 420, 300, 470], jag: 14, flash: [220, 390, 36] },
        { from: [200, 560, 280, 600], to: [260, 680, 340, 720], jag: 14, flash: [260, 640, 36] },
      ] },
      { id: 'faceTR', type: 'echo', box: [300, 100, 459, 260], feather: 10, motion: { kind: 'breathe', amp: 0.8, period: 4, kickAmp: 2 } },
      { id: 'breath', type: 'particles', kind: 'smoke', from: [[380, 180, 30], [40, 700, 30], [400, 760, 30]], rate: 0.8, max: 8, color: [230, 240, 255], size: [4, 8], life: [2, 3.5], alpha: 0.18, speed: 0.5 },
      { id: 'crown', type: 'echo', box: [16, 900, 100, 1000], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.35, pivot: [58, 998] } },
      { id: 'cube', type: 'echo', box: [370, 870, 459, 960], feather: 6, motion: { kind: 'rock', amp: 0, kickAmp: 1.2, period: 0.3, pivot: [414, 958] } },
      { type: 'fog', area: [-120, 100, 580, 1024], count: 12, size: [80, 140], speed: 6, color: [200, 225, 245], alpha: 0.12 },
      { id: 'snowfall', type: 'particles', kind: 'snow', area: [-40, -20, 459, 1024], rate: 9, max: 90, color: [245, 250, 255], size: [1.1, 2.4], life: [5, 9], drift: 18, gustPush: 70 },
    ],
    pokes: [
      { area: [150, 0, 459, 110], sound: 'whoosh', kick: ['wings'], flare: [200, 230, 255], glyph: '🦇' },
      { area: [14, 898, 102, 1002], sound: 'clink', kick: ['crown'], flare: [230, 240, 255], glyph: '👑' },
      { area: [366, 866, 459, 964], sound: 'rattle', kick: ['cube'], flare: [200, 235, 255], glyph: '⛓️' },
      { area: [80, 250, 380, 760], sound: 'crack', strike: 'cracks', zone: 0, kick: ['ice'], flare: [200, 235, 255] },
    ],
  },

  // ---- Basic: a quiet hilltop at golden hour that belongs to no realm ------------------------
  'basic-land': {
    wind: { dir: 1, every: [5, 9], speed: [150, 220], width: [180, 280], lean: 0.3 },
    layers: [
      { type: 'fog', area: [-420, -160, 1440, 730], count: 3, size: [230, 330], speed: 7, leftward: 0, color: [40, 30, 10], alpha: 0.06, gustPush: 0 },
      { type: 'rays', beams: [[200, 0, 30, 560, 120], [560, 0, 22, 560, 100]], color: [255, 230, 170], alpha: [0.04, 0.12], period: 9 },
      { id: 'grass', type: 'sprites', mask: 'grass', bend: 0.07, gustBend: 0.24, period: [2.4, 3.8] },
      { id: 'tree', type: 'warp', box: [740, 0, 1024, 200], base: 'top', mask: 'leaves', amp: 2.2, period: 4.2, wave: 2 },
      { id: 'bushes', type: 'warp', box: [220, 440, 820, 572], base: 'bottom', mask: 'leaves', amp: 2, period: 3.8, wave: 2.4 },
      { id: 'flowers', type: 'warp', box: [836, 380, 1024, 572], base: 'bottom', amp: 2, period: 3, wave: 2.6 },
      // Corners. Top left, the rune stone's carvings glow softly. Top right, the swing sways.
      { id: 'runes', type: 'glow', points: [[96, 44, 10], [110, 72, 10]], color: [140, 220, 255], anim: 'pulse', period: 4, alpha: [0.05, 0.4], kickDur: 2.5 },
      { id: 'swing', type: 'echo', box: [826, 40, 870, 116], feather: 5, motion: { kind: 'rock', amp: 3, period: 3, pivot: [848, 40], kickAmp: 8 } },
      // Bottom left, the lantern on the cairn flickers. Bottom right, the butterfly opens its wings.
      { id: 'lantern', type: 'glow', points: [[118, 466, 30]], color: [255, 200, 110], anim: 'flicker', alpha: [0.2, 0.5], kickDur: 2 },
      { id: 'lanternFlame', type: 'flames', points: [[118, 470, 6, 10]], tongues: 2, alpha: 0.8 },
      { id: 'butterfly', type: 'echo', box: [906, 450, 1000, 520], feather: 6, autoKick: [4, 8], motion: { kind: 'breathe', amp: 0, kickAmp: 6, period: 0.35, pivot: [953, 485] } },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[930, 470, 50], [80, 230, 40], [600, 460, 50]], rate: 0.8, max: 6, color: [255, 160, 60], size: [1.8, 2.4], life: [5, 8] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2.5, max: 26, color: [255, 240, 180], size: [0.6, 1.2], life: [3, 6], alpha: 0.65, speed: 0.6 },
      { id: 'petals', type: 'particles', kind: 'petal', area: [0, -20, 1024, 300], rate: 0.4, max: 6, color: [255, 220, 120], size: [1.4, 2.2], life: [7, 11], speed: 0.6 },
    ],
    pokes: [
      { area: [60, 6, 140, 120], sound: 'chime', kick: ['runes'], flare: [150, 220, 255], glyph: '✨' },
      { area: [800, 30, 900, 130], sound: 'whoosh', kick: ['swing'], flare: [255, 230, 170] },
      { area: [40, 420, 200, 560], sound: 'whoosh', kick: ['lantern'], flare: [255, 200, 110], glyph: '🏮' },
      { area: [880, 430, 1020, 540], sound: 'flutter', kick: ['butterfly', 'flowers'], flare: [255, 180, 80], glyph: '🦋', burst: { layer: 'flies', n: 3, at: [950, 480], spread: 20 } },
    ],
  },
  'basic-portrait': {
    wind: { dir: 1, every: [5, 9], speed: [110, 170], width: [160, 240], lean: 0.12 },
    layers: [
      { type: 'fog', area: [-300, -200, 760, 1220], count: 3, size: [180, 260], speed: 6, leftward: 0, color: [40, 30, 10], alpha: 0.06, gustPush: 0 },
      { type: 'rays', beams: [[60, 0, 16, 1000, 100], [260, 0, 12, 1000, 90]], color: [255, 230, 170], alpha: [0.04, 0.12], period: 9 },
      { id: 'grass', type: 'sprites', mask: 'grass', bend: 0.07, gustBend: 0.24, period: [2.4, 3.8] },
      { id: 'tree', type: 'warp', box: [340, 0, 459, 110], base: 'top', mask: 'leaves', amp: 2, period: 4.2, wave: 2 },
      { id: 'flowers', type: 'warp', box: [390, 260, 459, 360], base: 'right', amp: 2, period: 3, wave: 2.6 },
      { id: 'flowers2', type: 'warp', box: [380, 900, 459, 1024], base: 'bottom', amp: 2, period: 3.2, wave: 2.6 },
      { id: 'lantern', type: 'glow', points: [[14, 290, 22], [36, 945, 24]], color: [255, 200, 110], anim: 'flicker', alpha: [0.2, 0.5], kickDur: 2 },
      { id: 'swing', type: 'echo', box: [404, 30, 440, 80], feather: 5, motion: { kind: 'rock', amp: 3, period: 3, pivot: [422, 30], kickAmp: 8 } },
      { id: 'flies', type: 'particles', kind: 'fly', from: [[420, 300, 30], [420, 950, 30], [100, 720, 40]], rate: 0.8, max: 6, color: [255, 160, 60], size: [1.7, 2.3], life: [5, 8] },
      { id: 'pollen', type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2.5, max: 26, color: [255, 240, 180], size: [0.6, 1.1], life: [3, 6], alpha: 0.65, speed: 0.6 },
    ],
    pokes: [
      { area: [390, 20, 459, 100], sound: 'whoosh', kick: ['swing'], flare: [255, 230, 170] },
      { area: [0, 900, 110, 1010], sound: 'whoosh', kick: ['lantern'], flare: [255, 200, 110], glyph: '🏮' },
      { area: [380, 250, 459, 370], sound: 'flutter', kick: ['flowers'], flare: [255, 180, 80], glyph: '🦋' },
    ],
  },
};
