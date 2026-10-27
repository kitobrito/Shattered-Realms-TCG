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
      { id: 'crawl', type: 'crawlers', boxes: [[385, 217, 406, 243], [376, 293, 393, 311], [353, 323, 372, 351], [391, 357, 427, 401], [92, 652, 116, 679], [19, 662, 57, 689], [350, 661, 375, 688], [376, 685, 404, 710], [413, 709, 446, 753], [31, 724, 57, 744], [322, 757, 355, 781], [400, 763, 432, 800], [16, 779, 38, 811], [384, 787, 407, 811], [100, 812, 134, 837], [190, 914, 223, 940]], amp: 1.4, feather: 4 },
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
      { id: 'moon', type: 'mask', mask: 'moon', anim: { kind: 'pulse', period: 6 }, alpha: [0.2, 0.6], bloom: 1, kickDur: 3 },
      { id: 'moonHalo', type: 'glow', points: [[140, 72, 70]], color: [200, 220, 255], anim: 'pulse', period: 6, alpha: [0.1, 0.28], kickDur: 3 },
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
      { id: 'moon', type: 'mask', mask: 'moon', anim: { kind: 'pulse', period: 6 }, alpha: [0.2, 0.6], bloom: 1, kickDur: 3 },
      { id: 'moonHalo', type: 'glow', points: [[68, 62, 60]], color: [200, 220, 255], anim: 'pulse', period: 6, alpha: [0.1, 0.28], kickDur: 3 },
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
};
