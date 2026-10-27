// Board art per faction (16:9 landscape). A match uses the viewer's first faction's board.
// Each board's own layout (hero frames, battlefield, corner props) is in LANDSCAPE_BOARDS below.
export const BOARD_ART = {
  Vampires: 'art/boards-v2/vampires.jpg',
  Aliens: 'art/boards-v2/aliens.jpg',
  Dinosaurs: 'art/boards-v2/dinosaurs.jpg',
  Plants: 'art/boards-v2/plants.jpg',
  Fungus: 'art/boards-v2/fungus.jpg',
  Zombies: 'art/boards-v2/zombies.jpg',
  Dragons: 'art/boards-v2/dragons.jpg',
  Demons: 'art/boards-v2/demons.jpg',
  Divine: 'art/boards-v2/divine.jpg',
  Robots: 'art/boards-v2/robots.jpg',
  Radioactive: 'art/boards-v2/radioactive.jpg',
  Bees: 'art/boards-v2/bees.jpg',
  Ghosts: 'art/boards-v2/ghosts.jpg',
  Ultraterrestrials: 'art/boards-v2/ultraterrestrials.jpg',
  Sharks: 'art/boards-v2/sharks.jpg',
  Acidic: 'art/boards-v2/acidic.jpg',
  Lycanthropes: 'art/boards-v2/lycanthropes.jpg',
  Void: 'art/boards-v2/void.jpg',
  'Ice Age': 'art/boards-v2/ice-age.jpg',
};

// Looping board videos (MP4, 16:9, camera locked so the painted slots never move).
// Add a faction here once its file is in art/boards/. The still image stays as
// the fallback (reduced motion, data saver, autoplay blocked, loading).
export const BOARD_VIDEO = {};

// Living boards made with tools/board-anim.py: moving cut-outs over a clean plate.
export const BOARD_ANIM = {};

// The sharpest board worth loading: the 4K file only when the 16:9 stage is
// drawn wider than ~2600 real pixels.
import { BUILD } from '../build.js';
import { BOARD_CUTS } from './board-cuts.js';

// A realm board's file name ('ice-age'), which also names its living effects (board-fx-defs.js).
export const boardKey = (faction) => BOARD_ART[faction]?.split('/').pop().replace(/\.jpg$/, '') ?? null;

export function boardArtFor(faction) {
  // A board whose moving props are cut out shows its clean plate underneath them.
  const plate = BOARD_CUTS.land?.[faction]?.plate;
  if (plate) return plate;
  const base = BOARD_ART[faction];
  if (!base || typeof window === 'undefined') return base;
  const stage = Math.min(window.innerWidth, (window.innerHeight * 16) / 9) * (window.devicePixelRatio || 1);
  // Only the older paintings have 4K versions.
  return BUILD.hiresBoards && stage > 2600 && base.startsWith('art/boards/') ? base.replace(/.jpg$/, '@4k.jpg') : base;
}

// Portrait boards (upright phones), 459x1024. Each painting has its own layout,
// measured by hand from the art (image pixels):
//   opp / me: the dark opening of each hero frame [x0, y0, x1, y1] and its shape
//             ('arch' = round top, flat bottom; 'circle' = round or oval);
//   field:    the painted battlefield, top and bottom [y0, y1] (the two minion rows).
//   frame:    the painting has no hero frames of its own; the game draws them in this style
//             (style.css .arena.frame-<style>), around the spots given by opp / me.
// board.js layoutPortraitBoard() scales the art to the screen and lines the
// heroes, minion rows, End Turn and decks up with these spots.
export const PORTRAIT_SIZE = [459, 1024];
// Corner props (both shapes): what each one does on its own (fx) and when tapped (sound, glyph).
//   fx: glow | flicker | steam | smoke | drip | blink | sparkle | spores | ripple | fireflies   (an effect over the prop)
//       sway | bob | wobble | spin | peck | crawl                                              (the painted prop itself moves)
const P = (at, fx, color, tap = {}) => ({ at, fx, color, ...tap });
export const PORTRAIT_BOARDS = {
  // Living board (board-fx-defs.js): its corners react on the canvas, and the game draws the hero frames.
  'Ice Age': { src: 'art/boards-portrait/ice-age.jpg', opp: [201, 34, 259, 102, 'arch'], me: [198, 806, 261, 876, 'circle'], field: [125, 790], frame: 'bone', props: [] },
  Void: { src: 'art/boards-portrait/void.jpg', opp: [183, 59, 276, 174, 'arch'], me: [178, 784, 275, 911, 'circle'], field: [195, 765],
    props: [P([15, 15, 95, 95], 'bob', '#c89cff', { sound: 'whoosh', glyph: '🪐' }), P([355, 15, 450, 100], 'sparkle', '#e8e0ff', { sound: 'chime', glyph: '⭐' }),
      P([10, 870, 110, 1010], 'wobble', '#d8d0f0', { sound: 'clink' }), P([360, 915, 459, 1005], 'glow', '#b48cff', { sound: 'whoosh', glyph: '🌀' })] },
  Lycanthropes: { src: 'art/boards-portrait/lycanthropes.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'silverwood', props: [] },
  Acidic: { src: 'art/boards-portrait/acidic.jpg', opp: [201, 22, 259, 90, 'arch'], me: [198, 812, 261, 882, 'circle'], field: [120, 795], frame: 'acid', props: [] },
  Sharks: { src: 'art/boards-portrait/sharks.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'coral', props: [] },
  Ultraterrestrials: { src: 'art/boards-portrait/ultraterrestrials.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'astral', props: [] },
  Ghosts: { src: 'art/boards-portrait/ghosts.jpg', opp: [198, 31, 261, 128, 'arch'], me: [188, 912, 271, 998, 'circle'], field: [160, 880], props: [] },
  Bees: { src: 'art/boards-portrait/bees.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'wax', props: [] },
  Radioactive: { src: 'art/boards-portrait/radioactive.jpg', opp: [191, 34, 267, 122, 'arch'], me: [181, 828, 279, 925, 'circle'], field: [140, 810], props: [] },
  Robots: { src: 'art/boards-portrait/robots.jpg', opp: [200, 10, 258, 85, 'arch'], me: [184, 895, 277, 988, 'circle'], field: [110, 880], props: [] },
  Divine: { src: 'art/boards-portrait/divine.jpg', opp: [191, 131, 270, 234, 'arch'], me: [192, 749, 268, 845, 'circle'], field: [255, 735], props: [] },
  Demons: { src: 'art/boards-portrait/demons.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'iron', props: [] },
  Dragons: { src: 'art/boards-portrait/dragons.jpg', opp: [189, 41, 270, 125, 'arch'], me: [190, 811, 268, 891, 'circle'], field: [150, 795], props: [] },
  Zombies: { src: 'art/boards-portrait/zombies.jpg', opp: [195, 18, 264, 95, 'arch'], me: [195, 693, 264, 772, 'circle'], field: [110, 680],
    props: [P([5, 5, 80, 90], 'glow', '#9cff4a', { sound: 'rumble' }), P([395, 30, 450, 90], 'flicker', '#d8ff8a', { sound: 'clink' }),
      P([0, 640, 60, 760], 'glow', '#9cff4a', { sound: 'knock' }), P([380, 670, 459, 790], 'peck', '#9cff4a', { sound: 'screech', glyph: '🪶' })] },
  Fungus: { src: 'art/boards-portrait/fungus.jpg', opp: [188, 29, 272, 119, 'arch'], me: [184, 771, 277, 864, 'circle'], field: [135, 755], props: [] },
  Plants: { src: 'art/boards-portrait/plants.jpg', opp: [186, 137, 274, 239, 'arch'], me: [178, 786, 281, 888, 'circle'], field: [255, 770], props: [] },
  Dinosaurs: { src: 'art/boards-portrait/dinosaurs.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'stone', props: [] },
  Aliens: { src: 'art/boards-portrait/aliens.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 790, 261, 860, 'circle'], field: [120, 775], frame: 'chitin', props: [] },
  Vampires: { src: 'art/boards-portrait/vampires.jpg', opp: [190, 71, 266, 162, 'arch'], me: [179, 893, 280, 995, 'circle'], field: [180, 870], props: [] },
};

// Landscape boards (16:9 screens), 1024x572, same idea: hero frame openings, the
// battlefield [x0, y0, x1, y1] and the four corner props.
export const LANDSCAPE_SIZE = [1024, 572];
export const LANDSCAPE_BOARDS = {
  'Ice Age': { src: 'art/boards-v2/ice-age.jpg', opp: [471, 22, 553, 116], me: [468, 444, 556, 548], field: [110, 140, 915, 430], frame: 'bone', props: [] },
  Void: { src: 'art/boards-v2/void.jpg', opp: [472, 43, 551, 132], me: [474, 437, 549, 537], field: [115, 150, 910, 425],
    props: [P([30, 15, 125, 105], 'bob', '#c89cff', { sound: 'whoosh', glyph: '🪐' }), P([895, 15, 1000, 115], 'sparkle', '#e8e0ff', { sound: 'chime', glyph: '⭐' }),
      P([25, 420, 125, 555], 'wobble', '#d8d0f0', { sound: 'clink' }), P([890, 465, 1015, 560], 'glow', '#b48cff', { sound: 'whoosh', glyph: '🌀' })] },
  Lycanthropes: { src: 'art/boards-v2/lycanthropes.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'silverwood', props: [] },
  Acidic: { src: 'art/boards-v2/acidic.jpg', opp: [471, 30, 553, 124], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'acid', props: [] },
  Sharks: { src: 'art/boards-v2/sharks.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'coral', props: [] },
  Ultraterrestrials: { src: 'art/boards-v2/ultraterrestrials.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'astral', props: [] },
  Ghosts: { src: 'art/boards-v2/ghosts.jpg', opp: [472, 28, 552, 124], me: [464, 443, 560, 544], field: [150, 150, 880, 420], props: [] },
  Bees: { src: 'art/boards-v2/bees.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'wax', props: [] },
  Vampires: { src: 'art/boards-v2/vampires.jpg', opp: [473, 41, 551, 132], me: [460, 438, 564, 543], field: [140, 150, 880, 420], props: [] },
  Radioactive: { src: 'art/boards-v2/radioactive.jpg', opp: [462, 37, 562, 145], me: [454, 425, 572, 541], field: [150, 160, 880, 410], props: [] },
  Robots: { src: 'art/boards-v2/robots.jpg', opp: [466, 22, 557, 126], me: [466, 447, 557, 537], field: [150, 150, 880, 420], props: [] },
  Divine: { src: 'art/boards-v2/divine.jpg', opp: [469, 24, 555, 128], me: [463, 442, 556, 554], field: [140, 150, 885, 420], props: [] },
  Demons: { src: 'art/boards-v2/demons.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'iron', props: [] },
  Dragons: { src: 'art/boards-v2/dragons.jpg', opp: [470, 39, 554, 125], me: [467, 434, 557, 529], field: [120, 150, 900, 420], props: [] },
  Zombies: { src: 'art/boards-v2/zombies.jpg', opp: [465, 20, 559, 127], me: [470, 440, 552, 542], field: [110, 130, 940, 420],
    props: [P([30, 10, 130, 120], 'glow', '#9cff4a', { sound: 'rumble' }), P([900, 15, 950, 110], 'flicker', '#d8ff8a', { sound: 'clink' }),
      P([15, 360, 110, 520], 'glow', '#9cff4a', { sound: 'knock' }), P([890, 410, 980, 490], 'peck', '#9cff4a', { sound: 'screech', glyph: '🪶' })] },
  Fungus: { src: 'art/boards-v2/fungus.jpg', opp: [465, 26, 559, 125], me: [456, 434, 569, 547], field: [120, 150, 900, 420], props: [] },
  Plants: { src: 'art/boards-v2/plants.jpg', opp: [469, 27, 557, 116], me: [462, 436, 562, 534], field: [150, 140, 880, 420], props: [] },
  Dinosaurs: { src: 'art/boards-v2/dinosaurs.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'stone', props: [] },
  Aliens: { src: 'art/boards-v2/aliens.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'chitin', props: [] },
};


// ---- Demons: the Circles of Hell (the Descent) --------------------------------------
// When a Demon player is in the match, the battle sinks through nine circles and BOTH players'
// boards change to the current circle's painting (board.js picks these over the faction board).
// Hero frame openings and battlefields measured from each painting like the faction boards.
// The living effects for each circle are in src/ui/circle-fx-defs.js.
export const CIRCLE_BOARDS = {
  land: {
    1: { src: 'art/boards-v2/circle1.jpg', opp: [467, 34, 556, 124], me: [466, 448, 557, 538], field: [100, 125, 925, 445] },
    2: { src: 'art/boards-v2/circle2.jpg', opp: [470, 48, 554, 140], me: [470, 436, 554, 528], field: [150, 130, 875, 440] },
    3: { src: 'art/boards-v2/circle3.jpg', opp: [474, 63, 549, 148], me: [470, 448, 553, 540], field: [150, 140, 875, 440] },
    4: { src: 'art/boards-v2/circle4.jpg', opp: [472, 24, 552, 125], me: [470, 437, 554, 538], field: [150, 125, 870, 440] },
    5: { src: 'art/boards-v2/circle5.jpg', opp: [467, 25, 552, 122], me: [466, 434, 555, 538], field: [150, 125, 870, 440] },
    6: { src: 'art/boards-v2/circle6.jpg', opp: [470, 25, 555, 125], me: [470, 437, 555, 538], field: [100, 110, 925, 450] },
    7: { src: 'art/boards-v2/circle7.jpg', opp: [470, 30, 555, 125], me: [470, 437, 555, 528], field: [160, 140, 870, 440] },
    8: { src: 'art/boards-v2/circle8.jpg', opp: [472, 24, 552, 125], me: [470, 437, 554, 538], field: [150, 125, 870, 440] },
    9: { src: 'art/boards-v2/circle9.jpg', opp: [467, 34, 556, 124], me: [466, 448, 557, 538], field: [100, 125, 925, 445] },
  },
  portrait: {
    1: { src: 'art/boards-portrait/circle1.jpg', opp: [189, 44, 270, 130, 'arch'], me: [189, 912, 270, 998, 'arch'], field: [140, 890] },
    2: { src: 'art/boards-portrait/circle2.jpg', opp: [185, 90, 273, 195, 'arch'], me: [188, 858, 271, 958, 'arch'], field: [210, 840] },
    3: { src: 'art/boards-portrait/circle3.jpg', opp: [192, 125, 267, 210, 'arch'], me: [188, 830, 270, 912, 'arch'], field: [230, 810] },
    4: { src: 'art/boards-portrait/circle4.jpg', opp: [185, 80, 274, 178, 'arch'], me: [186, 830, 273, 935, 'arch'], field: [200, 810] },
    5: { src: 'art/boards-portrait/circle5.jpg', opp: [187, 76, 272, 178, 'arch'], me: [183, 815, 275, 918, 'arch'], field: [200, 800] },
    6: { src: 'art/boards-portrait/circle6.jpg', opp: [185, 125, 273, 225, 'arch'], me: [183, 870, 275, 970, 'arch'], field: [240, 855] },
    7: { src: 'art/boards-portrait/circle7.jpg', opp: [184, 95, 274, 185, 'arch'], me: [188, 820, 271, 900, 'arch'], field: [215, 800] },
    8: { src: 'art/boards-portrait/circle8.jpg', opp: [185, 80, 274, 178, 'arch'], me: [186, 830, 273, 935, 'arch'], field: [200, 810] },
    9: { src: 'art/boards-portrait/circle9.jpg', opp: [189, 44, 270, 130, 'arch'], me: [189, 912, 270, 998, 'arch'], field: [140, 890] },
  },
};
