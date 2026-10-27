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
};
