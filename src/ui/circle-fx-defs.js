// What brings each Circle of Hell board to life (src/ui/circle-fx.js draws these). Every
// position is in the painting's own pixels: landscape 1024x572, portrait 459x1024. Masks
// are cut from the paintings by tools/circle-fx-masks.py (spec: tools/circle_fx_spec.py).
// Layers draw in order (back to front). `id`s let pokes (taps on the scenery) find a layer.

const MIST = [205, 214, 228];
const SPIRIT = [215, 232, 255];
const WARM = [255, 196, 120];

export const CIRCLE_FX = {
  // ---- I · Limbo: a cold grey hush. Light falls from above; the unbaptised drift in the mist. ----
  '1-land': {
    layers: [
      { type: 'rays', beams: [[402, 0, 13, 240, 74], [452, 0, 6, 200, 34], [612, 0, -11, 235, 74], [566, 0, -4, 195, 34]], color: [225, 238, 255], alpha: [0.035, 0.11], period: 9 },
      { type: 'particles', kind: 'mote', area: [330, 4, 700, 210], rate: 2.4, max: 26, color: [235, 245, 255], size: [0.5, 1.3], life: [4, 8], alpha: 0.7 },
      { type: 'fog', area: [-90, 40, 150, 572], count: 9, size: [50, 100], speed: 5, color: MIST, alpha: 0.16 },
      { type: 'fog', area: [870, 40, 1110, 572], count: 9, size: [50, 100], speed: 5, color: MIST, alpha: 0.16 },
      { type: 'fog', area: [-40, 470, 1064, 610], count: 10, size: [60, 120], speed: 7, color: MIST, alpha: 0.14 },
      { type: 'fog', area: [-40, -30, 320, 110], count: 5, size: [50, 90], speed: 4, color: MIST, alpha: 0.13 },
      { type: 'fog', area: [700, -30, 1064, 100], count: 5, size: [50, 90], speed: 4, color: MIST, alpha: 0.13 },
      // The castles of Limbo: candlelit windows in the far keeps.
      { id: 'windows', type: 'glow', points: [[62, 42, 3], [79, 56, 2.4], [97, 49, 2.4], [55, 64, 2], [114, 62, 1.8], [948, 34, 3], [963, 51, 2.4], [986, 46, 2.4], [935, 60, 2], [973, 22, 1.8]],
        color: WARM, anim: 'flicker', alpha: [0.18, 0.55] },
      // The spirits: each group of painted souls drifts in the mist, glowing faintly;
      // thin wisps lift off them.
      ...[[0, 92, 126, 252], [0, 296, 92, 424], [150, 12, 304, 74], [938, 108, 1024, 242], [938, 306, 1024, 444], [733, 6, 867, 70], [772, 478, 818, 550]]
        .map((box, k) => ({ type: 'echo', box, feather: 12, motion: { kind: 'drift', amp: 3.2, speed: 0.28 + k * 0.03 } })),
      { id: 'ghosts', type: 'mask', mask: 'ghostsL', anim: { kind: 'drift', amp: 2.6, speed: 0.45 }, alpha: [0.45, 0.95], bloom: 0.7 },
      { id: 'ghosts2', type: 'mask', mask: 'ghostsR', anim: { kind: 'drift', amp: 2.6, speed: 0.4 }, alpha: [0.45, 0.95], bloom: 0.7 },
      { id: 'wisps', type: 'particles', kind: 'wisp', area: [4, 100, 96, 420], rate: 0.9, max: 10, color: SPIRIT, size: [3, 6], life: [3, 5.5], alpha: 0.22 },
      { id: 'wisps2', type: 'particles', kind: 'wisp', area: [946, 110, 1020, 432], rate: 0.9, max: 10, color: SPIRIT, size: [3, 6], life: [3, 5.5], alpha: 0.22 },
      { type: 'particles', kind: 'wisp', from: [[185, 50, 15], [265, 40, 25], [760, 45, 15], [850, 52, 10], [795, 520, 8]], rate: 0.6, max: 6, color: SPIRIT, size: [2.5, 5], life: [3, 5], alpha: 0.2 },
      // The runes carved round the battlefield wake one after another, cold blue.
      { id: 'runes', type: 'mask', mask: 'runesL', anim: { kind: 'seq', period: 8, vertical: true }, alpha: [0.04, 0.95], bloom: 0.6 },
      { id: 'runes2', type: 'mask', mask: 'runesR', anim: { kind: 'seq', period: 8, phase: 0.5, vertical: true }, alpha: [0.04, 0.95], bloom: 0.6 },
      // The grave: rune stones pulse violet, the skull's sockets glimmer.
      { id: 'stones', type: 'mask', mask: 'stones', anim: { kind: 'pulse', period: 4.5 }, alpha: [0.12, 0.75], bloom: 0.7 },
      { id: 'skull', type: 'glow', points: [[873, 487, 3], [882, 487, 3]], color: [150, 220, 255], anim: 'pulse', period: 3.5, alpha: [0.05, 0.45] },
      // The obsidian altar: a sheen slides along its edges; a violet smoke breathes off it.
      { id: 'altar', type: 'mask', mask: 'altar', anim: { kind: 'wave', along: 'x', band: 70, speed: 22 }, alpha: [0, 0.7], gain: 0.9 },
      { id: 'smoke', type: 'particles', kind: 'smoke', from: [[52, 440, 8], [88, 448, 10], [128, 452, 8]], rate: 1.1, max: 12, color: [70, 50, 95], size: [6, 10], life: [3, 5], alpha: 0.2, speed: 0.8 },
    ],
    pokes: [
      { area: [0, 90, 130, 425], sound: 'whoosh', kick: ['ghosts'], burst: { layer: 'wisps', n: 8 } },
      { area: [940, 110, 1024, 435], sound: 'whoosh', kick: ['ghosts2'], burst: { layer: 'wisps2', n: 8 } },
      { area: [815, 415, 1005, 565], sound: 'rattle', kick: ['stones', 'skull'] },
      { area: [15, 425, 160, 565], sound: 'rumble', kick: ['altar'], burst: { layer: 'smoke', n: 6 } },
      { area: [10, 0, 140, 90], sound: 'chime', kick: ['windows'] },
      { area: [900, 0, 1010, 85], sound: 'chime', kick: ['windows'] },
      { area: [140, 105, 210, 145], sound: 'chime', kick: ['runes'] },
      { area: [800, 105, 870, 145], sound: 'chime', kick: ['runes2'] },
    ],
  },
  '1-portrait': {
    layers: [
      { type: 'fog', area: [-70, 50, 75, 1024], count: 12, size: [40, 80], speed: 4, color: MIST, alpha: 0.16 },
      { type: 'fog', area: [385, 50, 530, 1024], count: 12, size: [40, 80], speed: 4, color: MIST, alpha: 0.16 },
      { type: 'fog', area: [-40, -20, 500, 120], count: 7, size: [45, 90], speed: 5, color: MIST, alpha: 0.14 },
      { type: 'fog', area: [-40, 890, 500, 1060], count: 7, size: [45, 90], speed: 6, color: MIST, alpha: 0.14 },
      { type: 'particles', kind: 'mote', area: [120, 0, 340, 160], rate: 1.2, max: 14, color: [235, 245, 255], size: [0.5, 1.2], life: [4, 8], alpha: 0.6 },
      { id: 'windows', type: 'glow', points: [[31, 30, 2.4], [46, 42, 2], [63, 34, 2], [22, 48, 1.7], [401, 24, 2.4], [419, 40, 2], [433, 30, 2], [391, 46, 1.7]],
        color: WARM, anim: 'flicker', alpha: [0.18, 0.55] },
      { id: 'crown', type: 'glow', points: [[229, 13, 7], [216, 22, 4], [243, 22, 4]], color: [255, 150, 60], anim: 'flicker', alpha: [0.1, 0.4] },
      ...[[0, 84, 56, 300], [0, 300, 56, 560], [0, 560, 56, 800], [0, 800, 56, 1000], [403, 84, 459, 300], [403, 300, 459, 560], [403, 560, 459, 800], [403, 800, 459, 1016], [76, 88, 108, 148]]
        .map((box, k) => ({ type: 'echo', box, feather: 10, motion: { kind: 'drift', amp: 2.4, speed: 0.28 + k * 0.025 } })),
      { id: 'ghosts', type: 'mask', mask: 'ghostsL', anim: { kind: 'drift', amp: 2, speed: 0.45 }, alpha: [0.45, 0.95], bloom: 0.7 },
      { id: 'ghosts2', type: 'mask', mask: 'ghostsR', anim: { kind: 'drift', amp: 2, speed: 0.4 }, alpha: [0.45, 0.95], bloom: 0.7 },
      { id: 'wisps', type: 'particles', kind: 'wisp', area: [2, 90, 50, 1000], rate: 1, max: 10, color: SPIRIT, size: [2.5, 5], life: [3, 5.5], alpha: 0.22 },
      { id: 'wisps2', type: 'particles', kind: 'wisp', area: [408, 90, 457, 1000], rate: 1, max: 10, color: SPIRIT, size: [2.5, 5], life: [3, 5.5], alpha: 0.22 },
      { id: 'runes', type: 'mask', mask: 'runesL', anim: { kind: 'seq', period: 9, vertical: true }, alpha: [0.04, 0.95], bloom: 0.6 },
      { id: 'runes2', type: 'mask', mask: 'runesR', anim: { kind: 'seq', period: 9, phase: 0.5, vertical: true }, alpha: [0.04, 0.95], bloom: 0.6 },
      { id: 'stones', type: 'mask', mask: 'stones', anim: { kind: 'pulse', period: 4.5 }, alpha: [0.12, 0.75], bloom: 0.7 },
      { id: 'skull', type: 'glow', points: [[345, 954, 2.4], [352, 954, 2.4]], color: [150, 220, 255], anim: 'pulse', period: 3.5, alpha: [0.05, 0.45] },
      { id: 'altar', type: 'mask', mask: 'altar', anim: { kind: 'wave', along: 'x', band: 60, speed: 20 }, alpha: [0, 0.7], gain: 0.9 },
      { id: 'smoke', type: 'particles', kind: 'smoke', from: [[34, 912, 8], [68, 918, 8], [100, 926, 8]], rate: 1, max: 10, color: [70, 50, 95], size: [5, 9], life: [3, 5], alpha: 0.2, speed: 0.8 },
    ],
    pokes: [
      { area: [0, 85, 56, 1000], sound: 'whoosh', kick: ['ghosts'], burst: { layer: 'wisps', n: 8 } },
      { area: [403, 85, 459, 1000], sound: 'whoosh', kick: ['ghosts2'], burst: { layer: 'wisps2', n: 8 } },
      { area: [298, 895, 450, 1010], sound: 'rattle', kick: ['stones', 'skull'] },
      { area: [8, 895, 128, 1010], sound: 'rumble', kick: ['altar'], burst: { layer: 'smoke', n: 6 } },
      { area: [0, 0, 100, 70], sound: 'chime', kick: ['windows'] },
      { area: [360, 0, 459, 65], sound: 'chime', kick: ['windows'] },
    ],
  },

  // ---- II · Lust: the endless storm. Lovers' souls whirl round the field; crimson lightning cracks in the corner panels. ----
  '2-land': {
    layers: [
      { type: 'fog', area: [-60, -20, 360, 590], count: 10, size: [60, 110], speed: 9, leftward: 0.2, color: [120, 60, 150], alpha: 0.13, blend: 'lighter' },
      { type: 'fog', area: [664, -20, 1084, 590], count: 10, size: [60, 110], speed: 9, leftward: 0.8, color: [120, 60, 150], alpha: 0.13, blend: 'lighter' },
      // The whirlwind itself: pale streaks racing round the edge (up the left, down the right).
      { type: 'stream', path: [[300, 566], [160, 500], [70, 380], [52, 250], [110, 120], [250, 45], [400, 18]], width: 34, count: 46, speed: 70, tail: 26, size: [0.8, 2.2], color: [230, 205, 255], alpha: 0.22 },
      { type: 'stream', path: [[630, 18], [800, 45], [915, 130], [965, 260], [950, 390], [880, 490], [720, 560]], width: 34, count: 46, speed: 70, tail: 26, size: [0.8, 2.2], color: [230, 205, 255], alpha: 0.22 },
      { type: 'stream', kind: 'petal', path: [[300, 566], [160, 500], [70, 380], [52, 250], [110, 120], [250, 45], [400, 18]], width: 40, count: 14, speed: 55, size: [1.2, 2.2], color: [200, 20, 40], alpha: 0.35, blend: 'source-over' },
      { type: 'stream', kind: 'petal', path: [[630, 18], [800, 45], [915, 130], [965, 260], [950, 390], [880, 490], [720, 560]], width: 40, count: 14, speed: 55, size: [1.2, 2.2], color: [200, 20, 40], alpha: 0.35, blend: 'source-over' },
      // Each knot of lovers rides the wind.
      ...[[195, 20, 302, 122], [118, 84, 202, 172], [18, 180, 122, 298], [38, 292, 132, 420], [98, 398, 202, 522], [198, 440, 332, 566],
        [664, 0, 722, 62], [700, 18, 842, 152], [838, 68, 902, 172], [900, 172, 1004, 300], [888, 300, 1004, 432], [758, 418, 884, 562], [688, 470, 770, 568]]
        .map((box, k) => ({ type: 'echo', box, feather: 10, motion: { kind: 'drift', amp: 3.6, speed: 0.34 + (k % 5) * 0.05 } })),
      { id: 'souls', type: 'mask', mask: 'soulsL', anim: { kind: 'drift', amp: 2.4, speed: 0.5 }, alpha: [0.25, 0.6], bloom: 0.5 },
      { id: 'souls2', type: 'mask', mask: 'soulsR', anim: { kind: 'drift', amp: 2.4, speed: 0.45 }, alpha: [0.25, 0.6], bloom: 0.5 },
      // The silk ribbons ripple in the gale.
      ...[[0, 92, 46, 330], [0, 370, 40, 470], [978, 98, 1024, 420], [118, 0, 210, 34], [820, 0, 920, 30], [300, 540, 420, 572]]
        .map((box, k) => ({ type: 'echo', box, feather: 8, motion: { kind: 'sway', amp: 1.6, period: 2.6 + k * 0.3, pivot: [(box[0] + box[2]) / 2, box[1]] } })),
      { type: 'mask', mask: 'ribbons', anim: { kind: 'pulse', period: 2.8 }, alpha: [0, 0.35] },
      // Lightning in the four corner panels: the painted bolts pulse, real strikes crack across them.
      { id: 'bolts', type: 'mask', mask: 'bolts', anim: { kind: 'flicker', speed: 2.5 }, alpha: [0.15, 0.5], bloom: 0.8 },
      { id: 'storm', type: 'lightning', flashMask: 'bolts', color: [255, 90, 190], every: [2.2, 5],
        zones: [
          { from: [18, 10, 60, 30], to: [70, 70, 104, 94], jag: 22, flash: [60, 52, 60] },
          { from: [60, 470, 104, 490], to: [14, 530, 50, 560], jag: 22, flash: [58, 516, 60] },
          { from: [960, 10, 1012, 30], to: [920, 70, 960, 94], jag: 22, flash: [966, 52, 60] },
          { from: [924, 472, 970, 492], to: [975, 530, 1012, 560], jag: 22, flash: [966, 516, 60] },
        ] },
      { type: 'particles', kind: 'spark', from: [[60, 52, 30], [58, 516, 30], [966, 52, 30], [966, 516, 30]], rate: 1.2, max: 12, color: [255, 120, 210], size: [0.8, 1.6], life: [0.4, 0.9] },
    ],
    pokes: [
      { area: [8, 4, 112, 100], sound: 'whoosh', strike: 'storm', zone: 0 },
      { area: [8, 466, 112, 566], sound: 'whoosh', strike: 'storm', zone: 1 },
      { area: [912, 4, 1020, 100], sound: 'whoosh', strike: 'storm', zone: 2 },
      { area: [912, 466, 1020, 566], sound: 'whoosh', strike: 'storm', zone: 3 },
      { area: [15, 15, 335, 570], sound: 'flutter', kick: ['souls'] },
      { area: [660, 0, 1008, 570], sound: 'flutter', kick: ['souls2'] },
    ],
  },
  '2-portrait': {
    layers: [
      { type: 'fog', area: [-60, -20, 520, 340], count: 10, size: [50, 90], speed: 8, color: [120, 60, 150], alpha: 0.12, blend: 'lighter' },
      { type: 'fog', area: [-60, 680, 520, 1050], count: 10, size: [50, 90], speed: 8, color: [120, 60, 150], alpha: 0.12, blend: 'lighter' },
      { type: 'stream', path: [[28, 335], [28, 180], [110, 70], [229, 34], [350, 70], [432, 180], [432, 335]], width: 28, count: 40, speed: 60, tail: 22, size: [0.8, 2], color: [230, 205, 255], alpha: 0.22 },
      { type: 'stream', path: [[432, 690], [432, 860], [340, 970], [229, 996], [120, 970], [28, 860], [28, 690]], width: 28, count: 40, speed: 60, tail: 22, size: [0.8, 2], color: [230, 205, 255], alpha: 0.22 },
      { type: 'stream', kind: 'petal', path: [[28, 335], [28, 180], [110, 70], [229, 34], [350, 70], [432, 180], [432, 335]], width: 34, count: 12, speed: 48, size: [1.1, 2], color: [200, 20, 40], alpha: 0.35, blend: 'source-over' },
      { type: 'stream', kind: 'petal', path: [[432, 690], [432, 860], [340, 970], [229, 996], [120, 970], [28, 860], [28, 690]], width: 34, count: 12, speed: 48, size: [1.1, 2], color: [200, 20, 40], alpha: 0.35, blend: 'source-over' },
      ...[[0, 40, 122, 182], [0, 180, 92, 335], [300, 40, 459, 182], [360, 180, 459, 335], [0, 690, 92, 862], [60, 860, 202, 1010], [362, 690, 459, 862], [258, 860, 402, 1010]]
        .map((box, k) => ({ type: 'echo', box, feather: 9, motion: { kind: 'drift', amp: 3, speed: 0.34 + (k % 4) * 0.05 } })),
      { id: 'souls', type: 'mask', mask: 'soulsL', anim: { kind: 'drift', amp: 2, speed: 0.5 }, alpha: [0.25, 0.6], bloom: 0.5 },
      { id: 'souls2', type: 'mask', mask: 'soulsR', anim: { kind: 'drift', amp: 2, speed: 0.45 }, alpha: [0.25, 0.6], bloom: 0.5 },
      { type: 'mask', mask: 'ribbons', anim: { kind: 'pulse', period: 2.8 }, alpha: [0, 0.35] },
      { id: 'bolts', type: 'mask', mask: 'bolts', anim: { kind: 'flicker', speed: 2.5 }, alpha: [0.15, 0.5], bloom: 0.8 },
      { id: 'storm', type: 'lightning', flashMask: 'bolts', color: [255, 90, 190], every: [2.2, 5],
        zones: [
          { from: [10, 8, 40, 26], to: [55, 70, 80, 92], jag: 18, flash: [42, 50, 48] },
          { from: [420, 8, 452, 26], to: [380, 70, 405, 92], jag: 18, flash: [416, 50, 48] },
          { from: [52, 922, 80, 940], to: [8, 990, 30, 1015], jag: 18, flash: [42, 968, 48] },
          { from: [380, 922, 408, 940], to: [428, 990, 452, 1015], jag: 18, flash: [416, 968, 48] },
        ] },
    ],
    pokes: [
      { area: [0, 0, 86, 100], sound: 'whoosh', strike: 'storm', zone: 0 },
      { area: [373, 0, 459, 100], sound: 'whoosh', strike: 'storm', zone: 1 },
      { area: [0, 914, 86, 1024], sound: 'whoosh', strike: 'storm', zone: 2 },
      { area: [373, 914, 459, 1024], sound: 'whoosh', strike: 'storm', zone: 3 },
      { area: [0, 30, 459, 340], sound: 'flutter', kick: ['souls', 'souls2'] },
      { area: [0, 680, 459, 1015], sound: 'flutter', kick: ['souls', 'souls2'] },
    ],
  },

  // ---- III · Gluttony: cold filthy rain on a rotting banquet. Flies, spilled wine, Cerberus in his den. ----
  '3-land': {
    layers: [
      { type: 'vortex', center: [512, 4], rx: 90, ry: 16, count: 26, speed: 0.6, color: [170, 255, 210], alpha: 0.12, width: 1.2 },
      { type: 'fog', area: [-40, 400, 420, 600], count: 8, size: [50, 90], speed: 4, color: [80, 110, 85], alpha: 0.14 },
      { type: 'fog', area: [640, 420, 1064, 600], count: 8, size: [50, 90], speed: 4, color: [80, 110, 85], alpha: 0.12 },
      { id: 'feast', type: 'mask', mask: 'feast', anim: { kind: 'wave', along: 'x', band: 90, speed: 18 }, alpha: [0.0, 0.45], gain: 0.8 },
      { id: 'spill', type: 'mask', mask: 'spill', anim: { kind: 'wave', along: 'x', band: 60, speed: 12 }, alpha: [0.05, 0.6], gain: 0.8 },
      { id: 'slime', type: 'mask', mask: 'slime', anim: { kind: 'pulse', period: 3.2 }, alpha: [0.25, 0.9], bloom: 1 },
      // Rot drips off the tablecloth into the muck.
      { type: 'particles', kind: 'drip', from: [[62, 166, 4], [92, 172, 4], [124, 168, 4], [150, 174, 3], [178, 170, 3]], rate: 0.9, max: 8, color: [70, 90, 60], size: [1, 1.6], life: [3, 4], fall: 40, splashColor: [110, 140, 110] },
      // Flies over the feast and the bone heap.
      { type: 'particles', kind: 'fly', from: [[110, 50, 40], [190, 60, 40], [240, 45, 30], [750, 70, 40], [820, 100, 40]], rate: 2, max: 14, color: [18, 22, 14], size: [1.2, 1.8], life: [6, 12] },
      // Cerberus: three heads breathing, eyes burning, drool dripping, breath steaming.
      { id: 'cerberus', type: 'echo', box: [852, 446, 996, 566], feather: 10, motion: { kind: 'breathe', amp: 1.6, period: 2.4, pivot: [924, 566] } },
      { id: 'eyes', type: 'mask', mask: 'eyes', anim: { kind: 'flicker', speed: 1.6 }, alpha: [0.4, 1], bloom: 1.2 },
      { type: 'particles', kind: 'drip', from: [[872, 488, 3], [913, 497, 3], [968, 521, 3]], rate: 0.5, max: 5, color: [200, 220, 190], size: [0.8, 1.2], life: [3, 4], fall: 26, splash: false },
      { type: 'particles', kind: 'smoke', from: [[870, 484, 4], [912, 492, 4], [968, 518, 4]], rate: 1, max: 9, color: [150, 160, 150], size: [3, 5], life: [1.5, 2.5], alpha: 0.18, speed: 0.6 },
      // The ruined pillars' chains swing slightly in the storm.
      ...[[930, 30, 1000, 90], [935, 235, 985, 300], [56, 220, 100, 280], [52, 320, 96, 360]]
        .map((box, k) => ({ type: 'echo', box, feather: 6, motion: { kind: 'rock', amp: 1.2, period: 3.6 + k * 0.4, pivot: [box[0], box[1]] } })),
      // Rain on the edges of the hall, splashing in the wet.
      { type: 'particles', kind: 'rain', area: [-20, -20, 160, 560], rate: 46, max: 90, color: [190, 210, 200], life: [1.5, 2], floor: 560, wind: -40, speed: 1 },
      { type: 'particles', kind: 'rain', area: [870, -20, 1044, 560], rate: 46, max: 90, color: [190, 210, 200], life: [1.5, 2], floor: 560, wind: -40, speed: 1 },
      { type: 'particles', kind: 'rain', area: [160, -20, 870, 60], rate: 30, max: 50, color: [190, 210, 200], life: [0.12, 0.18], wind: -40, speed: 1 },
    ],
    pokes: [
      { area: [850, 440, 1000, 570], sound: 'growl', kick: ['cerberus', 'eyes'] },
      { area: [10, 15, 300, 175], sound: 'clink', kick: ['feast'] },
      { area: [50, 415, 385, 572], sound: 'splash', kick: ['spill'] },
      { area: [885, 150, 935, 245], sound: 'bloop', kick: ['slime'] },
    ],
  },
  '3-portrait': {
    layers: [
      // The storm above: a slow green vortex, lit by violet lightning now and then.
      { id: 'storm', type: 'mask', mask: 'storm', anim: { kind: 'pulse', period: 5 }, alpha: [0.1, 0.4], bloom: 0.5 },
      { type: 'vortex', center: [235, 46], rx: 175, ry: 46, count: 60, speed: 0.55, color: [170, 255, 210], alpha: 0.22, width: 1.4 },
      { id: 'sky', type: 'lightning', color: [200, 140, 255], flashMask: 'storm', every: [5, 10],
        zones: [{ from: [60, 0, 160, 10], to: [120, 70, 200, 90], jag: 26, flash: [150, 45, 90] }, { from: [300, 0, 400, 10], to: [260, 70, 350, 90], jag: 26, flash: [320, 45, 90] }] },
      { type: 'fog', area: [-40, 860, 500, 1060], count: 8, size: [40, 80], speed: 4, color: [80, 110, 85], alpha: 0.14 },
      { id: 'feast', type: 'mask', mask: 'feast', anim: { kind: 'wave', along: 'x', band: 70, speed: 16 }, alpha: [0.0, 0.45], gain: 0.8 },
      { id: 'spill', type: 'mask', mask: 'spill', anim: { kind: 'wave', along: 'x', band: 50, speed: 12 }, alpha: [0.05, 0.6], gain: 0.8 },
      { id: 'slime', type: 'mask', mask: 'slime', anim: { kind: 'pulse', period: 3.2 }, alpha: [0.25, 0.9], bloom: 1 },
      { type: 'particles', kind: 'drip', from: [[20, 196, 4], [48, 200, 4], [76, 196, 4]], rate: 0.7, max: 6, color: [70, 90, 60], size: [0.9, 1.4], life: [3, 4], fall: 30, splashColor: [110, 140, 110] },
      { type: 'particles', kind: 'fly', from: [[40, 140, 30], [80, 150, 30], [360, 170, 40], [410, 200, 30]], rate: 1.6, max: 12, color: [18, 22, 14], size: [1, 1.6], life: [6, 12] },
      { id: 'cerberus', type: 'echo', box: [322, 920, 459, 1020], feather: 9, motion: { kind: 'breathe', amp: 1.6, period: 2.4, pivot: [390, 1020] } },
      { id: 'eyes', type: 'mask', mask: 'eyes', anim: { kind: 'flicker', speed: 1.6 }, alpha: [0.4, 1], bloom: 1.2 },
      { type: 'particles', kind: 'rain', area: [-20, 80, 470, 1024], rate: 34, max: 70, color: [190, 210, 200], life: [0.5, 0.9], wind: -30, speed: 1 },
    ],
    pokes: [
      { area: [318, 915, 459, 1024], sound: 'growl', kick: ['cerberus', 'eyes'] },
      { area: [40, 0, 420, 95], sound: 'rumble', strike: 'sky', zone: 0 },
      { area: [0, 100, 125, 210], sound: 'clink', kick: ['feast'] },
      { area: [0, 875, 265, 1024], sound: 'splash', kick: ['spill'] },
    ],
  },

  // ---- IV · Greed: rivers of molten gold, burning runes, hoarders straining at boulders for ever. ----
  '4-land': {
    layers: [
      { id: 'gold', type: 'mask', mask: 'goldTop', anim: { kind: 'wave', along: 'x', band: 140, speed: 26 }, alpha: [0.25, 0.85], gain: 1, bloom: 0.55 },
      { id: 'gold2', type: 'mask', mask: 'goldBot', anim: { kind: 'wave', along: 'x', band: 140, speed: -26 }, alpha: [0.25, 0.85], gain: 1, bloom: 0.55 },
      { type: 'particles', kind: 'ember', area: { mask: 'goldTop' }, rate: 5, max: 40, color: [255, 200, 70], size: [0.8, 1.8], life: [1.2, 2.6], speed: 0.8 },
      { type: 'particles', kind: 'ember', area: { mask: 'goldBot' }, rate: 5, max: 40, color: [255, 200, 70], size: [0.8, 1.8], life: [1.2, 2.6], speed: 0.8 },
      { type: 'particles', kind: 'smoke', area: { mask: 'goldTop' }, rate: 1.2, max: 10, color: [255, 160, 60], size: [6, 10], life: [2, 3.5], alpha: 0.06, blend: 'lighter' },
      { type: 'particles', kind: 'smoke', area: { mask: 'goldBot' }, rate: 1.2, max: 10, color: [255, 160, 60], size: [6, 10], life: [2, 3.5], alpha: 0.06, blend: 'lighter' },
      { id: 'runes', type: 'mask', mask: 'runes', anim: { kind: 'seq', period: 6, vertical: false }, alpha: [0.25, 1], bloom: 0.9 },
      // Hoards: coins and gems glint.
      { id: 'hoard', type: 'particles', kind: 'glint', area: { mask: 'coins' }, rate: 3.2, max: 10, color: [255, 245, 200], size: [1.4, 2.4], life: [0.5, 0.9] },
      // The boulders rock as the damned heave at them.
      { id: 'boulder', type: 'echo', box: [134, 58, 238, 168], feather: 8, motion: { kind: 'rock', amp: 1.3, period: 2.2, pivot: [190, 166] } },
      { id: 'boulder2', type: 'echo', box: [814, 66, 912, 168], feather: 8, motion: { kind: 'rock', amp: 1.3, period: 2.5, phase: 1.2, pivot: [860, 166] } },
      { id: 'boulder3', type: 'echo', box: [812, 396, 940, 520], feather: 8, motion: { kind: 'rock', amp: 1.3, period: 2.3, phase: 2.1, pivot: [870, 518] } },
      // The demon faces on the walls: their eyes smoulder.
      { id: 'eyes', type: 'mask', mask: 'eyes', anim: { kind: 'pulse', period: 3.6 }, alpha: [0.2, 1], bloom: 1.4 },
    ],
    pokes: [
      { area: [0, 0, 160, 165], sound: 'clink', burst: { layer: 'hoard', n: 6 } },
      { area: [855, 0, 1024, 165], sound: 'clink', burst: { layer: 'hoard', n: 6 } },
      { area: [0, 435, 195, 572], sound: 'clink', burst: { layer: 'hoard', n: 6 } },
      { area: [825, 435, 1024, 572], sound: 'clink', burst: { layer: 'hoard', n: 6 } },
      { area: [130, 55, 240, 170], sound: 'rumble', kick: ['boulder'] },
      { area: [810, 60, 915, 170], sound: 'rumble', kick: ['boulder2'] },
      { area: [808, 392, 945, 525], sound: 'rumble', kick: ['boulder3'] },
      { area: [20, 250, 90, 320], sound: 'growl', kick: ['eyes'] },
      { area: [935, 250, 1004, 320], sound: 'growl', kick: ['eyes'] },
    ],
  },
  '4-portrait': {
    layers: [
      { id: 'gold', type: 'mask', mask: 'goldL', anim: { kind: 'wave', along: 'y', band: 130, speed: 24 }, alpha: [0.25, 0.85], gain: 1, bloom: 0.55 },
      { id: 'gold2', type: 'mask', mask: 'goldR', anim: { kind: 'wave', along: 'y', band: 130, speed: -24 }, alpha: [0.25, 0.85], gain: 1, bloom: 0.55 },
      { type: 'particles', kind: 'ember', area: { mask: 'goldL' }, rate: 4, max: 34, color: [255, 200, 70], size: [0.8, 1.6], life: [1.2, 2.6], speed: 0.8 },
      { type: 'particles', kind: 'ember', area: { mask: 'goldR' }, rate: 4, max: 34, color: [255, 200, 70], size: [0.8, 1.6], life: [1.2, 2.6], speed: 0.8 },
      { id: 'runes', type: 'mask', mask: 'runes', anim: { kind: 'seq', period: 7, vertical: true }, alpha: [0.25, 1], bloom: 0.9 },
      { id: 'hoard', type: 'particles', kind: 'glint', area: { mask: 'coins' }, rate: 2.6, max: 8, color: [255, 245, 200], size: [1.2, 2.2], life: [0.5, 0.9] },
      { id: 'boulder', type: 'echo', box: [318, 122, 412, 218], feather: 8, motion: { kind: 'rock', amp: 1.3, period: 2.2, pivot: [362, 216] } },
      { id: 'boulder2', type: 'echo', box: [44, 818, 140, 912], feather: 8, motion: { kind: 'rock', amp: 1.3, period: 2.4, phase: 1.4, pivot: [92, 910] } },
      { id: 'eyes', type: 'mask', mask: 'eyes', anim: { kind: 'pulse', period: 3.6 }, alpha: [0.2, 1], bloom: 1.4 },
    ],
    pokes: [
      { area: [0, 0, 100, 150], sound: 'clink', burst: { layer: 'hoard', n: 5 } },
      { area: [330, 0, 459, 150], sound: 'clink', burst: { layer: 'hoard', n: 5 } },
      { area: [0, 850, 100, 1024], sound: 'clink', burst: { layer: 'hoard', n: 5 } },
      { area: [360, 850, 459, 1024], sound: 'clink', burst: { layer: 'hoard', n: 5 } },
      { area: [314, 118, 416, 222], sound: 'rumble', kick: ['boulder'] },
      { area: [40, 814, 144, 916], sound: 'rumble', kick: ['boulder2'] },
    ],
  },

  // ---- V · Wrath: the black Styx churns; the wrathful claw at the banks; white lightning splits the chained rocks. ----
  '5-land': {
    layers: [
      { id: 'water', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'y', band: 110, speed: 22 }, alpha: [0.15, 0.7], gain: 0.9, bloom: 0.3 },
      { type: 'stream', path: [[300, 566], [150, 500], [60, 380], [40, 240], [90, 110], [220, 30], [400, 8]], width: 34, count: 40, speed: 34, tail: 22, size: [0.8, 1.8], color: [120, 255, 220], alpha: 0.2 },
      { type: 'stream', path: [[620, 8], [800, 30], [930, 110], [980, 240], [960, 380], [880, 500], [720, 566]], width: 34, count: 40, speed: 34, tail: 22, size: [0.8, 1.8], color: [120, 255, 220], alpha: 0.2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'water' }, rate: 3, max: 18, color: [150, 255, 225], size: [1, 2], life: [0.8, 1.6] },
      // The drowning rise and sink; hands claw out of the water.
      ...[[218, 0, 284, 62], [16, 180, 92, 282], [936, 288, 1012, 402], [158, 478, 262, 562], [818, 498, 902, 566], [740, 0, 800, 50]]
        .map((box, k) => ({ id: k ? undefined : 'drowned', type: 'echo', box, feather: 8, motion: { kind: 'bob', amp: 2.2, period: 3.6 + k * 0.45 } })),
      ...[[182, 96], [290, 92], [96, 250], [82, 332], [140, 410], [252, 462], [308, 480], [726, 96], [880, 110], [935, 190], [926, 244], [928, 310], [822, 424], [872, 430], [726, 470]]
        .map(([x, y], k) => ({ type: 'echo', box: [x - 15, y - 18, x + 15, y + 16], feather: 5, motion: { kind: 'claw', amp: 2.4, period: 1.6 + (k % 5) * 0.35, pivot: [x, y + 16] } })),
      { type: 'fog', area: [-40, -20, 1064, 600], count: 14, size: [40, 80], speed: 6, color: [40, 90, 80], alpha: 0.1 },
      { id: 'bolts', type: 'mask', mask: 'bolts', anim: { kind: 'flicker', speed: 2 }, alpha: [0.1, 0.45], bloom: 0.8 },
      { id: 'storm', type: 'lightning', flashMask: 'bolts', color: [220, 230, 255], every: [3, 7],
        zones: [
          { from: [40, 8, 80, 22], to: [70, 70, 110, 92], jag: 24, flash: [70, 50, 70] },
          { from: [930, 8, 975, 22], to: [905, 70, 945, 92], jag: 24, flash: [950, 50, 70] },
          { from: [60, 456, 100, 470], to: [20, 520, 60, 560], jag: 24, flash: [60, 510, 70] },
          { from: [930, 456, 975, 470], to: [960, 520, 1000, 560], jag: 24, flash: [960, 510, 70] },
        ] },
    ],
    pokes: [
      { area: [10, 0, 120, 100], sound: 'rumble', strike: 'storm', zone: 0 },
      { area: [900, 0, 1010, 100], sound: 'rumble', strike: 'storm', zone: 1 },
      { area: [10, 450, 120, 570], sound: 'rumble', strike: 'storm', zone: 2 },
      { area: [900, 450, 1010, 570], sound: 'rumble', strike: 'storm', zone: 3 },
      { area: [0, 100, 160, 450], sound: 'splash', kick: ['water'] },
      { area: [860, 100, 1024, 450], sound: 'splash', kick: ['water'] },
    ],
  },
  '5-portrait': {
    layers: [
      { id: 'water', type: 'mask', mask: 'water', anim: { kind: 'wave', along: 'y', band: 110, speed: 22 }, alpha: [0.15, 0.7], gain: 0.9, bloom: 0.3 },
      { type: 'stream', path: [[30, 1000], [26, 760], [30, 500], [26, 250], [60, 60], [229, 20]], width: 26, count: 32, speed: 34, tail: 20, size: [0.8, 1.6], color: [120, 255, 220], alpha: 0.2 },
      { type: 'stream', path: [[229, 20], [400, 60], [432, 250], [430, 500], [432, 760], [430, 1000]], width: 26, count: 32, speed: 34, tail: 20, size: [0.8, 1.6], color: [120, 255, 220], alpha: 0.2 },
      { type: 'particles', kind: 'bubble', area: { mask: 'water' }, rate: 2.6, max: 16, color: [150, 255, 225], size: [1, 1.8], life: [0.8, 1.6] },
      ...[[60, 57], [47, 247], [53, 300], [420, 177], [433, 267], [31, 592], [21, 642], [25, 722], [75, 815], [88, 859], [208, 925], [261, 912], [315, 929], [408, 725], [431, 879]]
        .map(([x, y], k) => ({ type: 'echo', box: [Math.max(0, x - 15), y - 18, Math.min(459, x + 15), y + 16], feather: 5, motion: { kind: 'claw', amp: 2.2, period: 1.6 + (k % 5) * 0.35, pivot: [x, y + 16] } })),
      { id: 'bolts', type: 'mask', mask: 'bolts', anim: { kind: 'flicker', speed: 2 }, alpha: [0.1, 0.45], bloom: 0.8 },
      { id: 'storm', type: 'lightning', flashMask: 'bolts', color: [220, 230, 255], every: [3, 7],
        zones: [
          { from: [10, 30, 40, 45], to: [40, 100, 70, 122], jag: 20, flash: [40, 78, 60] },
          { from: [420, 30, 450, 45], to: [390, 100, 420, 122], jag: 20, flash: [420, 78, 60] },
          { from: [40, 905, 70, 920], to: [8, 980, 30, 1010], jag: 20, flash: [40, 960, 60] },
          { from: [390, 905, 420, 920], to: [425, 980, 452, 1010], jag: 20, flash: [420, 960, 60] },
        ] },
    ],
    pokes: [
      { area: [0, 25, 80, 130], sound: 'rumble', strike: 'storm', zone: 0 },
      { area: [380, 25, 459, 130], sound: 'rumble', strike: 'storm', zone: 1 },
      { area: [0, 895, 90, 1024], sound: 'rumble', strike: 'storm', zone: 2 },
      { area: [370, 895, 459, 1024], sound: 'rumble', strike: 'storm', zone: 3 },
      { area: [0, 130, 70, 895], sound: 'splash', kick: ['water'] },
      { area: [390, 130, 459, 895], sound: 'splash', kick: ['water'] },
    ],
  },

  // ---- VI · Heresy: the burning plain of Dis. Lava breathes through every crack; heretics writhe in open tombs. ----
  '6-land': {
    layers: [
      { id: 'cracks', type: 'mask', mask: 'cracks', anim: { kind: 'wave', along: 'x', band: 220, speed: 18 }, alpha: [0.15, 0.75], gain: 0.9, bloom: 0.45 },
      { type: 'mask', mask: 'cracks', anim: { kind: 'pulse', period: 4.5 }, alpha: [0, 0.25] },
      { id: 'city', type: 'mask', mask: 'city', anim: { kind: 'flicker', speed: 1.4 }, alpha: [0.15, 0.6], bloom: 0.6 },
      { type: 'particles', kind: 'smoke', from: [[180, 30, 30], [420, 25, 30], [700, 20, 40], [880, 30, 30]], rate: 1.2, max: 12, color: [60, 30, 25], size: [8, 14], life: [3, 5], alpha: 0.25, speed: 0.6 },
      // The tombs: their fires roar, the damned claw at the lips.
      { id: 'fires', type: 'mask', mask: 'fires', anim: { kind: 'flicker', speed: 4 }, alpha: [0.35, 0.9], bloom: 0.8 },
      { id: 'flames', type: 'flames', points: [[86, 70, 54, 42], [946, 70, 54, 42], [78, 488, 58, 44], [944, 488, 58, 44]], tongues: 6, alpha: 0.9 },
      ...[[82, 70], [940, 72], [102, 446], [924, 446]]
        .map(([x, y], k) => ({ type: 'echo', box: [x - 12, y - 22, x + 12, y + 10], feather: 5, motion: { kind: 'claw', amp: 2, period: 1.8 + k * 0.3, pivot: [x, y + 10] } })),
      { type: 'particles', kind: 'ember', from: [[86, 60, 24], [946, 60, 24], [78, 478, 26], [944, 478, 26]], rate: 9, max: 60, color: [255, 150, 40], size: [0.8, 1.8], life: [1, 2.2], speed: 1.2 },
      { type: 'particles', kind: 'ember', area: { mask: 'cracks' }, rate: 4, max: 30, color: [255, 120, 30], size: [0.6, 1.4], life: [1, 2], speed: 0.6 },
      { type: 'particles', kind: 'ash', area: [0, -10, 1024, 572], rate: 4, max: 40, color: [70, 60, 60], size: [0.8, 1.6], life: [4, 7], speed: 0.8 },
      // Firelight from the tombs flickers over the devil statues in the walls.
      { type: 'glow', points: [[48, 230, 34], [45, 375, 34], [977, 230, 34], [978, 375, 34]], color: [255, 90, 30], anim: 'flicker', alpha: [0.03, 0.12], hard: 0 },
    ],
    pokes: [
      { area: [10, 15, 160, 120], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [870, 15, 1016, 120], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [5, 430, 160, 550], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [868, 430, 1018, 550], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [0, 0, 1024, 92], sound: 'rumble', kick: ['city'] },
      { area: [150, 150, 870, 430], sound: 'hiss', kick: ['cracks'] },
    ],
  },
  '6-portrait': {
    layers: [
      { id: 'cracks', type: 'mask', mask: 'cracks', anim: { kind: 'wave', along: 'y', band: 240, speed: 18 }, alpha: [0.15, 0.75], gain: 0.9, bloom: 0.45 },
      { type: 'mask', mask: 'cracks', anim: { kind: 'pulse', period: 4.5 }, alpha: [0, 0.25] },
      { id: 'city', type: 'mask', mask: 'city', anim: { kind: 'flicker', speed: 1.4 }, alpha: [0.15, 0.6], bloom: 0.6 },
      { id: 'fires', type: 'mask', mask: 'fires', anim: { kind: 'flicker', speed: 4 }, alpha: [0.35, 0.9], bloom: 0.8 },
      { id: 'flames', type: 'flames', points: [[50, 150, 46, 36], [410, 150, 46, 36], [72, 935, 54, 40], [394, 935, 54, 40]], tongues: 5, alpha: 0.9 },
      { type: 'particles', kind: 'ember', from: [[50, 142, 20], [410, 142, 20], [72, 925, 24], [394, 925, 24]], rate: 8, max: 50, color: [255, 150, 40], size: [0.8, 1.6], life: [1, 2.2], speed: 1.2 },
      { type: 'particles', kind: 'ember', area: { mask: 'cracks' }, rate: 3, max: 24, color: [255, 120, 30], size: [0.6, 1.3], life: [1, 2], speed: 0.6 },
      { type: 'particles', kind: 'ash', area: [0, -10, 459, 1024], rate: 3, max: 30, color: [70, 60, 60], size: [0.8, 1.5], life: [4, 7], speed: 0.8 },
    ],
    pokes: [
      { area: [0, 100, 100, 190], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [358, 100, 459, 190], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [10, 880, 130, 980], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [330, 880, 459, 980], sound: 'whoosh', kick: ['fires', 'flames'] },
      { area: [0, 0, 459, 140], sound: 'rumble', kick: ['city'] },
    ],
  },

  // ---- VII · Violence: the bottom. A river of boiling blood, fire raining from the sky, centaurs loosing flaming arrows. ----
  '7-land': {
    layers: [
      { type: 'meteors', area: [0, 0, 250, 300], dir: [-0.55, 1], speed: [90, 150], every: [1.6, 3.6], size: [1.6, 3] },
      { type: 'meteors', area: [800, 0, 1024, 320], dir: [-0.55, 1], speed: [90, 150], every: [1.6, 3.6], size: [1.6, 3] },
      { type: 'flyers', area: [0, 10, 330, 120], every: [6, 12], speed: [40, 70], size: [4, 6], color: [25, 10, 14] },
      { type: 'flyers', area: [700, 0, 1024, 50], every: [8, 14], speed: [40, 70], size: [3.5, 5], color: [25, 10, 14] },
      // The wood of the suicides: red veins throb in the trees, which creak in the hot wind.
      { type: 'echo', box: [60, 0, 330, 225], feather: 10, motion: { kind: 'rock', amp: 0.35, period: 6, pivot: [195, 225] } },
      { id: 'veins', type: 'mask', mask: 'veins', anim: { kind: 'pulse', period: 2.2 }, alpha: [0.15, 0.85], bloom: 0.6 },
      // The lava-fall pours; the blood pools boil.
      { id: 'fall', type: 'mask', mask: 'lavafall', anim: { kind: 'wave', along: 'y', band: 40, speed: 60 }, alpha: [0.3, 1], gain: 1, bloom: 0.6 },
      { type: 'particles', kind: 'spark', from: [[848, 150, 20]], rate: 5, max: 24, color: [255, 160, 50], size: [0.7, 1.4], life: [0.5, 1.1] },
      { type: 'particles', kind: 'smoke', from: [[848, 140, 20], [830, 70, 15]], rate: 1, max: 8, color: [90, 40, 30], size: [6, 10], life: [2, 3.5], alpha: 0.2, speed: 0.6 },
      { id: 'blood', type: 'mask', mask: 'blood', anim: { kind: 'wave', along: 'x', band: 80, speed: 14 }, alpha: [0.2, 0.8], gain: 0.9, bloom: 0.5 },
      { type: 'particles', kind: 'bubble', from: [[420, 120, 40], [520, 118, 40], [600, 122, 30], [470, 560, 30], [560, 562, 40]], rate: 3, max: 18, color: [255, 90, 70], size: [1, 2.2], life: [0.5, 1.1] },
      // The centaurs: their heads burn, they loose flaming arrows into the abyss.
      { id: 'torches', type: 'glow', points: [[48, 270, 9], [86, 428, 9], [873, 276, 9], [860, 437, 9]], color: [255, 150, 40], anim: 'flicker', alpha: [0.35, 0.9] },
      { type: 'flames', points: [[48, 276, 10, 14], [86, 434, 10, 14], [873, 282, 10, 14], [860, 443, 10, 14]], tongues: 3, alpha: 0.8 },
      { id: 'arrows', type: 'arrows', every: [2.5, 5.5], shooters: [
        { from: [100, 286], to: [250, 230], arc: 26, dur: 1 }, { from: [112, 432], to: [270, 480], arc: 22, dur: 1 },
        { from: [842, 286], to: [700, 230], arc: 26, dur: 1 }, { from: [834, 434], to: [690, 486], arc: 22, dur: 1 },
      ] },
      { type: 'fog', area: [-40, 280, 160, 600], count: 6, size: [50, 90], speed: 4, color: [140, 30, 20], alpha: 0.14, blend: 'lighter' },
      { type: 'fog', area: [880, 280, 1064, 600], count: 6, size: [50, 90], speed: 4, color: [140, 30, 20], alpha: 0.14, blend: 'lighter' },
      { type: 'particles', kind: 'ember', area: [0, 200, 1024, 572], rate: 3, max: 26, color: [255, 120, 40], size: [0.6, 1.3], life: [1.5, 3], speed: 0.7 },
    ],
    pokes: [
      { area: [10, 230, 130, 320], sound: 'whoosh', loose: 'arrows', shooter: 0 },
      { area: [40, 395, 150, 480], sound: 'whoosh', loose: 'arrows', shooter: 1 },
      { area: [810, 235, 930, 320], sound: 'whoosh', loose: 'arrows', shooter: 2 },
      { area: [800, 395, 920, 480], sound: 'whoosh', loose: 'arrows', shooter: 3 },
      { area: [770, 55, 905, 205], sound: 'hiss', kick: ['fall'] },
      { area: [330, 88, 700, 150], sound: 'bloop', kick: ['blood'] },
      { area: [60, 0, 330, 225], sound: 'rustle', kick: ['veins'] },
    ],
  },
  '7-portrait': {
    layers: [
      { type: 'meteors', area: [0, 0, 459, 130], dir: [-0.55, 1], speed: [80, 130], every: [1.8, 3.8], size: [1.4, 2.6] },
      { type: 'meteors', area: [60, 920, 459, 1024], dir: [-0.55, 1], speed: [80, 130], every: [2.2, 4.2], size: [1.4, 2.6] },
      { type: 'flyers', area: [0, 0, 459, 60], every: [7, 13], speed: [35, 60], size: [3.5, 5], color: [25, 10, 14] },
      { id: 'veins', type: 'mask', mask: 'veins', anim: { kind: 'pulse', period: 2.2 }, alpha: [0.15, 0.85], bloom: 0.6 },
      { id: 'fall', type: 'mask', mask: 'lavafall', anim: { kind: 'wave', along: 'y', band: 36, speed: 55 }, alpha: [0.3, 1], gain: 1, bloom: 0.6 },
      { type: 'particles', kind: 'spark', from: [[400, 95, 15], [395, 205, 15]], rate: 4, max: 20, color: [255, 160, 50], size: [0.7, 1.3], life: [0.5, 1.1] },
      { id: 'blood', type: 'mask', mask: 'blood', anim: { kind: 'wave', along: 'x', band: 70, speed: 14 }, alpha: [0.2, 0.8], gain: 0.9, bloom: 0.5 },
      { type: 'particles', kind: 'bubble', from: [[200, 210, 30], [270, 208, 30], [240, 900, 30], [310, 902, 30]], rate: 2.6, max: 14, color: [255, 90, 70], size: [1, 2], life: [0.5, 1.1] },
      { type: 'particles', kind: 'drip', from: [[62, 920, 3], [70, 935, 3]], rate: 0.5, max: 4, color: [160, 10, 10], size: [1, 1.5], life: [3, 4], fall: 30, splashColor: [200, 30, 30] },
      { id: 'torches', type: 'glow', points: [[22, 326, 7], [36, 400, 7], [438, 345, 7], [434, 702, 7]], color: [255, 150, 40], anim: 'flicker', alpha: [0.35, 0.9] },
      { type: 'particles', kind: 'ember', area: [0, 150, 459, 1024], rate: 2.5, max: 22, color: [255, 120, 40], size: [0.6, 1.2], life: [1.5, 3], speed: 0.7 },
    ],
    pokes: [
      { area: [270, 20, 455, 250], sound: 'hiss', kick: ['fall'] },
      { area: [150, 175, 335, 230], sound: 'bloop', kick: ['blood'] },
      { area: [0, 0, 175, 320], sound: 'rustle', kick: ['veins'] },
      { area: [0, 300, 70, 420], sound: 'whoosh', kick: ['torches'] },
      { area: [400, 320, 459, 720], sound: 'whoosh', kick: ['torches'] },
    ],
  },
  '8-land': {
    layers: [
      // Malebolge: sickly fumes rise off the ditches of pitch; false gold glints on the edges.
      { type: 'fog', area: [-60, 40, 120, 572], count: 8, size: [50, 100], speed: 5, color: [120, 160, 50], alpha: 0.14 },
      { type: 'fog', area: [904, 40, 1084, 572], count: 8, size: [50, 100], speed: 5, color: [120, 160, 50], alpha: 0.14 },
      { type: 'particles', kind: 'smoke', area: [0, 492, 1024, 572], rate: 1.2, max: 10, color: [60, 80, 30], size: [6, 12], life: [2.5, 4], alpha: 0.18, speed: 0.6 },
      { type: 'particles', kind: 'wisp', area: [0, 0, 120, 572], rate: 0.8, max: 8, color: [190, 240, 110], size: [2.5, 5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'wisp', area: [904, 0, 1024, 572], rate: 0.8, max: 8, color: [190, 240, 110], size: [2.5, 5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'glint', area: [0, 0, 1024, 572], rate: 1.5, max: 10, color: [255, 230, 120], size: [0.8, 1.6], life: [0.6, 1.2] },
      { type: 'particles', kind: 'mote', area: [0, 0, 1024, 572], rate: 2, max: 22, color: [210, 255, 140], size: [0.5, 1.2], life: [3, 6], alpha: 0.6 },
    ],
  },
  '8-portrait': {
    layers: [
      // Malebolge: sickly fumes rise off the ditches of pitch; false gold glints on the edges.
      { type: 'fog', area: [-60, 40, 100, 1024], count: 8, size: [50, 100], speed: 5, color: [120, 160, 50], alpha: 0.14 },
      { type: 'fog', area: [359, 40, 519, 1024], count: 8, size: [50, 100], speed: 5, color: [120, 160, 50], alpha: 0.14 },
      { type: 'particles', kind: 'smoke', area: [0, 944, 459, 1024], rate: 1.2, max: 10, color: [60, 80, 30], size: [6, 12], life: [2.5, 4], alpha: 0.18, speed: 0.6 },
      { type: 'particles', kind: 'wisp', area: [0, 0, 100, 1024], rate: 0.8, max: 8, color: [190, 240, 110], size: [2.5, 5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'wisp', area: [359, 0, 459, 1024], rate: 0.8, max: 8, color: [190, 240, 110], size: [2.5, 5], life: [3, 5], alpha: 0.2 },
      { type: 'particles', kind: 'glint', area: [0, 0, 459, 1024], rate: 1.5, max: 10, color: [255, 230, 120], size: [0.8, 1.6], life: [0.6, 1.2] },
      { type: 'particles', kind: 'mote', area: [0, 0, 459, 1024], rate: 2, max: 22, color: [210, 255, 140], size: [0.5, 1.2], life: [3, 6], alpha: 0.6 },
    ],  },
  '9-land': {
    layers: [
      // Cocytus: snow drifts down over the frozen lake; a bitter mist creeps along the edges.
      { type: 'rays', beams: [[410, 0, 12, 257, 70], [614, 0, -12, 257, 70]], color: [200, 230, 255], alpha: [0.03, 0.09], period: 10 },
      { type: 'fog', area: [-80, 0, 140, 572], count: 9, size: [50, 100], speed: 6, color: [190, 215, 240], alpha: 0.16 },
      { type: 'fog', area: [884, 0, 1104, 572], count: 9, size: [50, 100], speed: 6, color: [190, 215, 240], alpha: 0.16 },
      { type: 'fog', area: [-40, 462, 1064, 612], count: 8, size: [60, 120], speed: 8, color: [190, 215, 240], alpha: 0.13 },
      { type: 'particles', kind: 'ash', area: [0, -10, 1024, 572], rate: 7, max: 70, color: [235, 245, 255], size: [0.6, 1.8], life: [4, 8], alpha: 0.85, speed: 1.4 },
      { type: 'particles', kind: 'glint', area: [0, 0, 1024, 572], rate: 2, max: 12, color: [220, 245, 255], size: [0.8, 1.6], life: [0.6, 1.2] },
    ],
  },
  '9-portrait': {
    layers: [
      // Cocytus: snow drifts down over the frozen lake; a bitter mist creeps along the edges.
      { type: 'rays', beams: [[184, 0, 12, 461, 70], [275, 0, -12, 461, 70]], color: [200, 230, 255], alpha: [0.03, 0.09], period: 10 },
      { type: 'fog', area: [-80, 0, 140, 1024], count: 9, size: [50, 100], speed: 6, color: [190, 215, 240], alpha: 0.16 },
      { type: 'fog', area: [319, 0, 539, 1024], count: 9, size: [50, 100], speed: 6, color: [190, 215, 240], alpha: 0.16 },
      { type: 'fog', area: [-40, 914, 499, 1064], count: 8, size: [60, 120], speed: 8, color: [190, 215, 240], alpha: 0.13 },
      { type: 'particles', kind: 'ash', area: [0, -10, 459, 1024], rate: 7, max: 70, color: [235, 245, 255], size: [0.6, 1.8], life: [4, 8], alpha: 0.85, speed: 1.4 },
      { type: 'particles', kind: 'glint', area: [0, 0, 459, 1024], rate: 2, max: 12, color: [220, 245, 255], size: [0.8, 1.6], life: [0.6, 1.2] },
    ],  },
};

// ---- More to tap: extra scenery spots on every circle (checked before the ones above, so a
// small spot inside a big area wins), and each circle's flair for every spot: a flash of the
// circle's light with sparks (circle-fx.js flare) and a little symbol flung from the tap
// (main.js, via the poke's glyph).
const FLAIR = {
  1: { flare: [200, 220, 255], glyph: '👻' },
  2: { flare: [255, 80, 170], glyph: '💔' },
  3: { flare: [150, 255, 120], glyph: '🍖' },
  4: { flare: [255, 200, 60], glyph: '🪙' },
  5: { flare: [90, 255, 215], glyph: '💢' },
  6: { flare: [255, 120, 40], glyph: '🔥' },
  7: { flare: [255, 60, 40], glyph: '🩸' },
  8: { flare: [190, 240, 90], glyph: '🎭' },
  9: { flare: [170, 220, 255], glyph: '❄️' },
};
const MORE_POKES = {
  '1-land': [
    { area: [300, 0, 440, 95], sound: 'chime', flare: [235, 240, 255], glyph: '✨' },
    { area: [590, 0, 730, 95], sound: 'chime', flare: [235, 240, 255], glyph: '✨' },
    { area: [165, 470, 430, 572], sound: 'whoosh', kick: ['ghosts'], burst: { layer: 'wisps', n: 6 } },
    { area: [600, 470, 810, 572], sound: 'whoosh', kick: ['ghosts2'], burst: { layer: 'wisps2', n: 6 } },
    { area: [875, 240, 940, 330], sound: 'groan', kick: ['runes2'], glyph: '🕯️' },
    { area: [80, 170, 135, 240], sound: 'chime', kick: ['runes'], glyph: '🕯️' },
  ],
  '1-portrait': [
    { area: [100, 0, 360, 40], sound: 'chime', kick: ['crown'], glyph: '✨' },
    { area: [130, 900, 300, 1024], sound: 'whoosh', kick: ['ghosts', 'ghosts2'], burst: { layer: 'wisps', n: 6 } },
    { area: [100, 110, 360, 150], sound: 'chime', kick: ['runes'], glyph: '🕯️' },
  ],
  '2-land': [
    { area: [340, 0, 460, 135], sound: 'heartbeat', glyph: '💋' },
    { area: [565, 0, 685, 135], sound: 'heartbeat', glyph: '💋' },
    { area: [340, 465, 460, 572], sound: 'flutter', glyph: '🌹' },
    { area: [565, 465, 685, 572], sound: 'flutter', glyph: '🌹' },
    { area: [820, 245, 915, 305], sound: 'heartbeat', glyph: '❤️‍🔥' },
  ],
  '2-portrait': [
    { area: [90, 330, 370, 400], sound: 'heartbeat', glyph: '💋' },
    { area: [90, 620, 370, 680], sound: 'flutter', glyph: '🌹' },
    { area: [415, 470, 459, 560], sound: 'heartbeat', glyph: '❤️‍🔥' },
  ],
  '3-land': [
    { area: [700, 15, 905, 145], sound: 'rattle', glyph: '💀' },
    { area: [330, 0, 445, 55], sound: 'rumble', glyph: '🌀' },
    { area: [585, 0, 700, 55], sound: 'rumble', glyph: '🌀' },
    { area: [0, 170, 95, 285], sound: 'clink', glyph: '⛓️' },
    { area: [0, 300, 95, 400], sound: 'clink', glyph: '⛓️' },
    { area: [960, 160, 1024, 260], sound: 'clink', glyph: '⛓️' },
    { area: [930, 290, 1024, 400], sound: 'clink', glyph: '⛓️' },
  ],
  '3-portrait': [
    { area: [250, 100, 459, 230], sound: 'rattle', glyph: '💀' },
    { area: [0, 800, 70, 880], sound: 'clink', glyph: '⛓️' },
    { area: [380, 800, 459, 880], sound: 'clink', glyph: '⛓️' },
  ],
  '4-land': [
    { area: [300, 20, 360, 85], sound: 'chime', kick: ['runes'], glyph: 'ᚱ' },
    { area: [675, 25, 740, 95], sound: 'chime', kick: ['runes'], glyph: 'ᚱ' },
    { area: [90, 180, 145, 240], sound: 'chime', kick: ['runes'] },
    { area: [885, 180, 950, 240], sound: 'chime', kick: ['runes'] },
    { area: [90, 325, 145, 395], sound: 'chime', kick: ['runes'] },
    { area: [885, 325, 950, 395], sound: 'chime', kick: ['runes'] },
    { area: [200, 85, 320, 140], sound: 'hiss', kick: ['gold'], burst: { layer: 'hoard', n: 5 } },
    { area: [700, 85, 820, 140], sound: 'hiss', kick: ['gold'], burst: { layer: 'hoard', n: 5 } },
    { area: [200, 420, 330, 480], sound: 'hiss', kick: ['gold2'], burst: { layer: 'hoard', n: 5 } },
    { area: [690, 420, 810, 480], sound: 'hiss', kick: ['gold2'], burst: { layer: 'hoard', n: 5 } },
  ],
  '4-portrait': [
    { area: [0, 300, 60, 700], sound: 'chime', kick: ['runes'], glyph: 'ᚱ' },
    { area: [400, 280, 459, 700], sound: 'chime', kick: ['runes'], glyph: 'ᚱ' },
    { area: [60, 150, 110, 400], sound: 'hiss', kick: ['gold'], burst: { layer: 'hoard', n: 4 } },
    { area: [350, 700, 410, 850], sound: 'hiss', kick: ['gold2'], burst: { layer: 'hoard', n: 4 } },
  ],
  '5-land': [
    { area: [165, 0, 330, 105], sound: 'groan', kick: ['water'], glyph: '😡' },
    { area: [700, 0, 880, 110], sound: 'groan', kick: ['water'], glyph: '😡' },
    { area: [130, 445, 340, 572], sound: 'splash', kick: ['water'], glyph: '✋' },
    { area: [690, 445, 880, 572], sound: 'splash', kick: ['water'], glyph: '✋' },
    { area: [345, 10, 460, 110], sound: 'rumble', glyph: '⚔️' },
    { area: [565, 10, 680, 110], sound: 'rumble', glyph: '⚔️' },
  ],
  '5-portrait': [
    { area: [90, 0, 370, 90], sound: 'groan', kick: ['water'], glyph: '😡' },
    { area: [90, 920, 370, 1024], sound: 'splash', kick: ['water'], glyph: '✋' },
    { area: [100, 95, 175, 185], sound: 'rumble', glyph: '⚔️' },
    { area: [285, 95, 360, 185], sound: 'rumble', glyph: '⚔️' },
  ],
  '6-land': [
    { area: [0, 160, 95, 290], sound: 'growl', glyph: '😈' },
    { area: [0, 300, 85, 425], sound: 'growl', glyph: '😈' },
    { area: [925, 150, 1024, 290], sound: 'growl', glyph: '😈' },
    { area: [930, 300, 1024, 425], sound: 'growl', glyph: '😈' },
    { area: [225, 470, 335, 572], sound: 'growl', kick: ['fires', 'flames'] },
    { area: [690, 470, 800, 572], sound: 'growl', kick: ['fires', 'flames'] },
    { area: [240, 0, 330, 90], sound: 'rumble', kick: ['city'], glyph: '🏚️' },
    { area: [700, 0, 790, 90], sound: 'rumble', kick: ['city'], glyph: '🏚️' },
  ],
  '6-portrait': [
    { area: [0, 220, 60, 420], sound: 'growl', glyph: '😈' },
    { area: [0, 450, 60, 640], sound: 'growl', glyph: '😈' },
    { area: [400, 220, 459, 420], sound: 'growl', glyph: '😈' },
    { area: [400, 450, 459, 640], sound: 'growl', glyph: '😈' },
    { area: [180, 0, 290, 140], sound: 'rumble', kick: ['city'], glyph: '🏚️' },
  ],
  '7-land': [
    { area: [880, 0, 1024, 220], sound: 'whoosh', glyph: '☄️' },
    { area: [0, 0, 60, 230], sound: 'whoosh', glyph: '☄️' },
    { area: [150, 440, 330, 560], sound: 'rumble', glyph: '🏛️' },
    { area: [930, 370, 1024, 530], sound: 'whoosh', loose: 'arrows', shooter: 2, glyph: '🏹' },
    { area: [0, 480, 140, 572], sound: 'growl', glyph: '🐎' },
    { area: [330, 540, 700, 572], sound: 'bloop', kick: ['blood'] },
  ],
  '7-portrait': [
    { area: [0, 840, 120, 1000], sound: 'clink', glyph: '🗡️' },
    { area: [300, 880, 459, 1024], sound: 'rattle', glyph: '💀' },
    { area: [150, 880, 300, 930], sound: 'bloop', kick: ['blood'] },
    { area: [0, 760, 100, 840], sound: 'rumble', glyph: '🏛️' },
  ],
};
for (const [key, def] of Object.entries(CIRCLE_FX)) {
  const flair = FLAIR[key.split('-')[0]];
  def.pokes = [...(MORE_POKES[key] ?? []), ...(def.pokes ?? [])].map((p) => ({ flare: flair.flare, glyph: flair.glyph, ...p }));
}
