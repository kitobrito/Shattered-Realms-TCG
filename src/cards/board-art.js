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
  // Not a realm: the plain board players can pick in Settings ("Basic board").
  Basic: 'art/boards-v2/basic.jpg',
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
  Basic: { src: 'art/boards-portrait/basic.jpg', opp: [201, 30, 259, 98, 'arch'], me: [198, 806, 261, 876, 'circle'], field: [120, 790], frame: 'stone', props: [] },
  // Living board (board-fx-defs.js): its corners react on the canvas, and the game draws the hero frames.
  'Ice Age': { src: 'art/boards-portrait/ice-age.jpg', opp: [201, 34, 259, 102, 'arch'], me: [198, 806, 261, 876, 'circle'], field: [125, 790], frame: 'bone', props: [] },
  Void: { src: 'art/boards-portrait/void.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'void', props: [] },
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
  Zombies: { src: 'art/boards-portrait/zombies.jpg', opp: [196, 56, 264, 154, 'arch'], me: [194, 858, 264, 956, 'circle'], field: [175, 840], props: [] },
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
  Basic: { src: 'art/boards-v2/basic.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'stone', props: [] },
  'Ice Age': { src: 'art/boards-v2/ice-age.jpg', opp: [471, 22, 553, 116], me: [468, 444, 556, 548], field: [110, 140, 915, 430], frame: 'bone', props: [] },
  Void: { src: 'art/boards-v2/void.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'void', props: [] },
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
  Zombies: { src: 'art/boards-v2/zombies.jpg', opp: [480, 36, 544, 123], me: [467, 441, 557, 532], field: [140, 150, 880, 420], props: [] },
  Fungus: { src: 'art/boards-v2/fungus.jpg', opp: [465, 26, 559, 125], me: [456, 434, 569, 547], field: [120, 150, 900, 420], props: [] },
  Plants: { src: 'art/boards-v2/plants.jpg', opp: [469, 27, 557, 116], me: [462, 436, 562, 534], field: [150, 140, 880, 420], props: [] },
  Dinosaurs: { src: 'art/boards-v2/dinosaurs.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'stone', props: [] },
  Aliens: { src: 'art/boards-v2/aliens.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'chitin', props: [] },
};


// ---- Demons: the Circles of Hell (the Descent) --------------------------------------
// When a Demon player is in the match, the battle sinks through nine circles and BOTH players'
// boards change to the current circle's painting (board.js picks these over the faction board).
// Hero frame openings and battlefields measured from each painting like the faction boards.
// The living effects for each circle are in src/ui/board-fx-defs.js.
export const CIRCLE_BOARDS = {
  land: {
    1: { src: 'art/boards-v2/circle1.jpg', opp: [484, 54, 540, 140], me: [464, 460, 559, 522], field: [130, 155, 895, 445] },
    2: { src: 'art/boards-v2/circle2.jpg', opp: [470, 24, 555, 122], me: [462, 443, 562, 543], field: [130, 137, 895, 428] },
    3: { src: 'art/boards-v2/circle3.jpg', opp: [469, 28, 555, 133], me: [456, 432, 567, 543], field: [130, 148, 895, 417] },
    4: { src: 'art/boards-v2/circle4.jpg', opp: [472, 31, 553, 125], me: [460, 438, 563, 525], field: [130, 140, 895, 423] },
    5: { src: 'art/boards-v2/circle5.jpg', opp: [461, 28, 562, 136], me: [456, 422, 564, 528], field: [130, 151, 895, 407] },
    6: { src: 'art/boards-v2/circle6.jpg', opp: [473, 44, 551, 138], me: [454, 435, 570, 535], field: [130, 153, 895, 420] },
    7: { src: 'art/boards-v2/circle7.jpg', opp: [471, 24, 554, 123], me: [453, 427, 572, 547], field: [130, 138, 895, 412] },
    8: { src: 'art/boards-v2/circle8.jpg', opp: [469, 31, 556, 124], me: [462, 437, 564, 540], field: [130, 139, 895, 422] },
    9: { src: 'art/boards-v2/circle9.jpg', opp: [467, 18, 558, 123], me: [466, 438, 559, 539], field: [130, 138, 895, 423] },
  },
  portrait: {
    1: { src: 'art/boards-portrait/circle1.jpg', opp: [204, 123, 256, 209, 'arch'], me: [184, 857, 276, 933, 'circle'], field: [224, 842] },
    2: { src: 'art/boards-portrait/circle2.jpg', opp: [176, 62, 285, 190, 'arch'], me: [171, 816, 287, 932, 'circle'], field: [205, 801] },
    3: { src: 'art/boards-portrait/circle3.jpg', opp: [183, 53, 278, 169, 'arch'], me: [176, 824, 283, 935, 'circle'], field: [184, 809] },
    4: { src: 'art/boards-portrait/circle4.jpg', opp: [191, 64, 269, 158, 'arch'], me: [177, 834, 280, 937, 'circle'], field: [173, 819] },
    5: { src: 'art/boards-portrait/circle5.jpg', opp: [175, 59, 281, 181, 'arch'], me: [167, 822, 293, 946, 'circle'], field: [196, 807] },
    6: { src: 'art/boards-portrait/circle6.jpg', opp: [196, 130, 263, 216, 'arch'], me: [174, 823, 289, 920, 'circle'], field: [231, 808] },
    7: { src: 'art/boards-portrait/circle7.jpg', opp: [189, 112, 271, 215, 'arch'], me: [184, 766, 277, 861, 'circle'], field: [230, 751] },
    8: { src: 'art/boards-portrait/circle8.jpg', opp: [180, 44, 280, 151, 'arch'], me: [175, 807, 286, 923, 'circle'], field: [166, 792] },
    9: { src: 'art/boards-portrait/circle9.jpg', opp: [183, 90, 281, 213, 'arch'], me: [177, 819, 282, 948, 'circle'], field: [228, 804] },
  },
};
