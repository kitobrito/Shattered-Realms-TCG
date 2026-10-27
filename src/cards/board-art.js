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
  Lycanthropes: { src: 'art/boards-portrait/lycanthropes.jpg', opp: [202, 28, 256, 94, 'arch'], me: [197, 919, 261, 1001, 'circle'], field: [120, 900],
    props: [P([10, 15, 100, 100], 'glow', '#dfe8ff', { sound: 'chime', glyph: '🌕' }), P([310, 25, 420, 120], 'sway', '#c8d0e0', { sound: 'clink', glyph: '⛓️' }),
      P([15, 920, 105, 1010], 'wobble', '#e8e8f0', { sound: 'growl' }), P([340, 915, 455, 1015], 'glow', '#bcd0ff', { sound: 'rustle', glyph: '🐺' })] },
  Acidic: { src: 'art/boards-portrait/acidic.jpg', opp: [201, 22, 259, 90, 'arch'], me: [198, 812, 261, 882, 'circle'], field: [120, 795], frame: 'acid', props: [] },
  Sharks: { src: 'art/boards-portrait/sharks.jpg', opp: [187, 23, 272, 117, 'arch'], me: [187, 809, 272, 914, 'circle'], field: [130, 800],
    props: [P([30, 30, 110, 110], 'bob', '#cfefff', { sound: 'splash', glyph: '🦈' }), P([335, 20, 445, 165], 'sway', '#bfe8c8', { sound: 'clink' }),
      P([30, 880, 160, 1000], 'glow', '#ffffff', { sound: 'knock' }), P([300, 890, 450, 1015], 'glow', '#ff3a4a', { sound: 'splash' })] },
  Ultraterrestrials: { src: 'art/boards-portrait/ultraterrestrials.jpg', opp: [197, 28, 262, 111, 'arch'], me: [199, 820, 260, 895, 'circle'], field: [125, 810],
    props: [P([8, 2, 58, 72], 'sparkle', '#ffe8a8', { sound: 'chime' }), P([402, 2, 457, 72], 'glow', '#b48cff', { sound: 'whoosh', glyph: '🌀' }),
      P([8, 930, 78, 1012], 'sparkle', '#d8c8ff', { sound: 'clink' }), P([388, 922, 457, 1016], 'glow', '#9fd8ff', { sound: 'chime' })] },
  Ghosts: { src: 'art/boards-portrait/ghosts.jpg', opp: [193, 19, 266, 102, 'arch'], me: [194, 869, 265, 958, 'circle'], field: [115, 860],
    props: [P([20, 5, 120, 95], 'flicker', '#9ff0ff', { sound: 'whoosh' }), P([365, 5, 435, 115], 'glow', '#9ff0ff', { sound: 'clink', glyph: '👻' }),
      P([15, 880, 125, 1012], 'smoke', '#7dff9a', { sound: 'rattle' }), P([340, 860, 455, 1015], 'fireflies', '#c8f8ff', { sound: 'screech', glyph: '🪶' })] },
  Bees: { src: 'art/boards-portrait/bees.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'wax', props: [] },
  Radioactive: { src: 'art/boards-portrait/radioactive.jpg', opp: [181, 24, 277, 134, 'arch'], me: [187, 748, 273, 847, 'circle'], field: [150, 735],
    props: [P([10, 5, 95, 105], 'glow', '#7aff3a', { sound: 'splash' }), P([370, 15, 440, 90], 'flicker', '#e8ffd8', { sound: 'clink' }),
      P([15, 820, 85, 890], 'blink', '#9aff5a', { sound: 'chime' }), P([360, 820, 459, 890], 'drip', '#7aff2a', { sound: 'drip' })] },
  Robots: { src: 'art/boards-portrait/robots.jpg', opp: [191, 18, 266, 107, 'arch'], me: [193, 785, 268, 880, 'circle'], field: [130, 770],
    props: [P([15, 15, 75, 75], 'spin', '#d8b070', { sound: 'clink' }), P([385, 15, 440, 70], 'blink', '#bfe8ff', { sound: 'hiss' }),
      P([15, 820, 75, 890], 'bob', '#9fd0ff', { sound: 'knock', glyph: '⚙️' }), P([380, 800, 440, 880], 'steam', '#e8f0ff', { sound: 'hiss' })] },
  Divine: { src: 'art/boards-portrait/divine.jpg', opp: [189, 26, 268, 119, 'arch'], me: [190, 730, 268, 827, 'circle'], field: [150, 700],
    props: [P([10, 10, 80, 80], 'glow', '#ffd25a', { sound: 'chime' }), P([380, 15, 450, 85], 'sway', '#fff6d8', { sound: 'flutter', glyph: '🪶' }),
      P([5, 770, 75, 845], 'glow', '#ffd25a', { sound: 'chime' }), P([390, 770, 455, 840], 'glow', '#ffffff', { sound: 'chime', glyph: '✨' })] },
  Demons: { src: 'art/boards-portrait/demons.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 800, 261, 870, 'circle'], field: [120, 785], frame: 'iron', props: [] },
  Dragons: { src: 'art/boards-portrait/dragons.jpg', opp: [185, 78, 273, 186, 'arch'], me: [185, 719, 273, 807, 'circle'], field: [210, 700],
    props: [P([15, 40, 90, 130], 'sparkle', '#ffd25a', { sound: 'clink', glyph: '🪙' }), P([380, 40, 445, 120], 'flicker', '#ff8a1a', { sound: 'whoosh' }),
      P([10, 780, 90, 850], 'wobble', '#c8a8ff', { sound: 'knock' }), P([360, 770, 450, 850], 'glow', '#7aff8a', { sound: 'rumble' })] },
  Zombies: { src: 'art/boards-portrait/zombies.jpg', opp: [195, 18, 264, 95, 'arch'], me: [195, 693, 264, 772, 'circle'], field: [110, 680],
    props: [P([5, 5, 80, 90], 'glow', '#9cff4a', { sound: 'rumble' }), P([395, 30, 450, 90], 'flicker', '#d8ff8a', { sound: 'clink' }),
      P([0, 640, 60, 760], 'glow', '#9cff4a', { sound: 'knock' }), P([380, 670, 459, 790], 'peck', '#9cff4a', { sound: 'screech', glyph: '🪶' })] },
  Fungus: { src: 'art/boards-portrait/fungus.jpg', opp: [190, 16, 268, 110, 'arch'], me: [182, 780, 276, 879, 'circle'], field: [130, 760],
    props: [P([25, 20, 80, 70], 'glow', '#ffd8a8', { sound: 'chime' }), P([395, 15, 445, 70], 'spores', '#e8d8ff', { sound: 'hiss' }),
      P([20, 820, 70, 890], 'drip', '#c98cff', { sound: 'drip' }), P([385, 840, 440, 880], 'crawl', '#ffe8a8', { sound: 'rustle' })] },
  Plants: { src: 'art/boards-portrait/plants.jpg', opp: [183, 24, 277, 130, 'arch'], me: [181, 744, 277, 855, 'circle'], field: [150, 720],
    props: [P([10, 10, 85, 85], 'sway', '#ff9ad8', { sound: 'rustle', glyph: '🌸' }), P([355, 15, 440, 95], 'fireflies', '#fff6a0', { sound: 'chime' }),
      P([10, 800, 90, 880], 'flicker', '#ffd25a', { sound: 'clink' }), P([335, 790, 450, 880], 'ripple', '#9ad8ff', { sound: 'splash' })] },
  Dinosaurs: { src: 'art/boards-portrait/dinosaurs.jpg', opp: [188, 29, 270, 119, 'arch'], me: [188, 763, 271, 860, 'circle'], field: [140, 740],
    props: [P([10, 10, 110, 100], 'wobble', '#ffe8c8', { sound: 'knock' }), P([330, 10, 450, 120], 'sway', '#7dff6a', { sound: 'rustle' }),
      P([15, 820, 100, 870], 'bob', '#ffe8c8', { sound: 'rattle', glyph: '🦴' }), P([340, 710, 450, 880], 'smoke', '#ff8a3a', { sound: 'rumble' })] },
  Aliens: { src: 'art/boards-portrait/aliens.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 790, 261, 860, 'circle'], field: [120, 775], frame: 'chitin', props: [] },
  Vampires: { src: 'art/boards-portrait/vampires.jpg', opp: [192, 18, 268, 102, 'arch'], me: [193, 745, 268, 845, 'circle'], field: [120, 720],
    props: [P([25, 10, 60, 75], 'flicker', '#ffcf6a', { sound: 'whoosh' }), P([395, 5, 450, 80], 'glow', '#ff2a44', { sound: 'clink' }),
      P([15, 815, 75, 875], 'wobble', '#e8dcc8', { sound: 'rattle' }), P([355, 780, 459, 930], 'wobble', '#ff2a44', { sound: 'knock', glyph: '🦇' })] },
};

// Landscape boards (16:9 screens), 1024x572, same idea: hero frame openings, the
// battlefield [x0, y0, x1, y1] and the four corner props.
export const LANDSCAPE_SIZE = [1024, 572];
export const LANDSCAPE_BOARDS = {
  'Ice Age': { src: 'art/boards-v2/ice-age.jpg', opp: [471, 22, 553, 116], me: [468, 444, 556, 548], field: [110, 140, 915, 430], frame: 'bone', props: [] },
  Void: { src: 'art/boards-v2/void.jpg', opp: [472, 43, 551, 132], me: [474, 437, 549, 537], field: [115, 150, 910, 425],
    props: [P([30, 15, 125, 105], 'bob', '#c89cff', { sound: 'whoosh', glyph: '🪐' }), P([895, 15, 1000, 115], 'sparkle', '#e8e0ff', { sound: 'chime', glyph: '⭐' }),
      P([25, 420, 125, 555], 'wobble', '#d8d0f0', { sound: 'clink' }), P([890, 465, 1015, 560], 'glow', '#b48cff', { sound: 'whoosh', glyph: '🌀' })] },
  Lycanthropes: { src: 'art/boards-v2/lycanthropes.jpg', opp: [473, 37, 550, 130], me: [470, 441, 552, 545], field: [120, 150, 900, 425],
    props: [P([20, 10, 150, 140], 'glow', '#dfe8ff', { sound: 'chime', glyph: '🌕' }), P([810, 30, 970, 160], 'sway', '#c8d0e0', { sound: 'clink', glyph: '⛓️' }),
      P([40, 420, 170, 550], 'wobble', '#e8e8f0', { sound: 'growl' }), P([820, 400, 1000, 560], 'glow', '#bcd0ff', { sound: 'rustle', glyph: '🐺' })] },
  Acidic: { src: 'art/boards-v2/acidic.jpg', opp: [471, 30, 553, 124], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'acid', props: [] },
  Sharks: { src: 'art/boards-v2/sharks.jpg', opp: [464, 21, 558, 127], me: [464, 432, 559, 546], field: [110, 140, 915, 420],
    props: [P([75, 30, 150, 115], 'bob', '#cfefff', { sound: 'splash', glyph: '🦈' }), P([850, 10, 980, 180], 'sway', '#bfe8c8', { sound: 'clink' }),
      P([40, 415, 180, 560], 'glow', '#ffffff', { sound: 'knock' }), P([855, 420, 1015, 560], 'glow', '#ff3a4a', { sound: 'splash' })] },
  Ultraterrestrials: { src: 'art/boards-v2/ultraterrestrials.jpg', opp: [468, 34, 554, 140], me: [465, 425, 558, 540], field: [60, 150, 965, 415],
    props: [P([25, 5, 120, 120], 'sparkle', '#ffe8a8', { sound: 'chime' }), P([895, 5, 995, 100], 'glow', '#b48cff', { sound: 'whoosh', glyph: '🌀' }),
      P([25, 420, 130, 548], 'sparkle', '#d8c8ff', { sound: 'clink' }), P([890, 415, 1005, 562], 'glow', '#9fd8ff', { sound: 'chime' })] },
  Ghosts: { src: 'art/boards-v2/ghosts.jpg', opp: [467, 23, 555, 124], me: [466, 440, 556, 551], field: [70, 140, 955, 425],
    props: [P([30, 10, 150, 130], 'flicker', '#9ff0ff', { sound: 'whoosh' }), P([900, 5, 990, 140], 'glow', '#9ff0ff', { sound: 'clink', glyph: '👻' }),
      P([20, 400, 150, 556], 'smoke', '#7dff9a', { sound: 'rattle' }), P([870, 385, 1012, 560], 'fireflies', '#c8f8ff', { sound: 'screech', glyph: '🪶' })] },
  Bees: { src: 'art/boards-v2/bees.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'wax', props: [] },
  Vampires: { src: 'art/boards-v2/vampires.jpg', opp: [468, 20, 552, 112], me: [465, 440, 550, 537], field: [35, 130, 980, 420],
    props: [P([30, 10, 70, 80], 'flicker', '#ffcf6a', { sound: 'whoosh' }), P([925, 5, 985, 90], 'glow', '#ff2a44', { sound: 'clink' }),
      P([20, 475, 85, 545], 'wobble', '#e8dcc8', { sound: 'rattle' }), P([880, 425, 1024, 572], 'wobble', '#ff2a44', { sound: 'knock', glyph: '🦇' })] },
  Radioactive: { src: 'art/boards-v2/radioactive.jpg', opp: [465, 25, 557, 130], me: [470, 440, 552, 540], field: [60, 150, 960, 420],
    props: [P([10, 5, 110, 115], 'glow', '#7aff3a', { sound: 'splash' }), P([900, 10, 990, 100], 'flicker', '#e8ffd8', { sound: 'clink' }),
      P([25, 450, 110, 545], 'blink', '#9aff5a', { sound: 'chime' }), P([900, 430, 1024, 550], 'drip', '#7aff2a', { sound: 'drip' })] },
  Robots: { src: 'art/boards-v2/robots.jpg', opp: [468, 24, 554, 136], me: [470, 430, 558, 537], field: [150, 150, 880, 420],
    props: [P([25, 15, 95, 85], 'spin', '#d8b070', { sound: 'clink' }), P([905, 15, 975, 85], 'blink', '#bfe8ff', { sound: 'hiss' }),
      P([18, 450, 88, 548], 'bob', '#9fd0ff', { sound: 'knock', glyph: '⚙️' }), P([910, 400, 990, 540], 'steam', '#e8f0ff', { sound: 'hiss' })] },
  Divine: { src: 'art/boards-v2/divine.jpg', opp: [470, 26, 556, 129], me: [468, 435, 556, 544], field: [75, 140, 920, 430],
    props: [P([25, 15, 100, 90], 'glow', '#ffd25a', { sound: 'chime' }), P([895, 15, 975, 95], 'sway', '#fff6d8', { sound: 'flutter', glyph: '🪶' }),
      P([20, 470, 90, 545], 'glow', '#ffd25a', { sound: 'chime' }), P([895, 450, 975, 545], 'glow', '#ffffff', { sound: 'chime', glyph: '✨' })] },
  Demons: { src: 'art/boards-v2/demons.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'iron', props: [] },
  Dragons: { src: 'art/boards-v2/dragons.jpg', opp: [460, 25, 550, 135], me: [460, 430, 545, 540], field: [30, 145, 1000, 420],
    props: [P([20, 15, 120, 110], 'sparkle', '#ffd25a', { sound: 'clink', glyph: '🪙' }), P([925, 10, 995, 95], 'flicker', '#ff8a1a', { sound: 'whoosh' }),
      P([25, 470, 80, 550], 'wobble', '#ffb07a', { sound: 'knock' }), P([915, 470, 1000, 550], 'glow', '#ff6a1a', { sound: 'rumble' })] },
  Zombies: { src: 'art/boards-v2/zombies.jpg', opp: [465, 20, 559, 127], me: [470, 440, 552, 542], field: [110, 130, 940, 420],
    props: [P([30, 10, 130, 120], 'glow', '#9cff4a', { sound: 'rumble' }), P([900, 15, 950, 110], 'flicker', '#d8ff8a', { sound: 'clink' }),
      P([15, 360, 110, 520], 'glow', '#9cff4a', { sound: 'knock' }), P([890, 410, 980, 490], 'peck', '#9cff4a', { sound: 'screech', glyph: '🪶' })] },
  Fungus: { src: 'art/boards-v2/fungus.jpg', opp: [465, 18, 558, 130], me: [470, 425, 550, 535], field: [30, 140, 990, 410],
    props: [P([25, 20, 95, 80], 'glow', '#ffd8a8', { sound: 'chime' }), P([920, 15, 975, 90], 'spores', '#e8d8ff', { sound: 'hiss' }),
      P([35, 460, 80, 545], 'drip', '#c98cff', { sound: 'drip' }), P([880, 470, 980, 545], 'crawl', '#ffe8a8', { sound: 'rustle' })] },
  Plants: { src: 'art/boards-v2/plants.jpg', opp: [470, 25, 552, 135], me: [468, 432, 552, 530], field: [40, 150, 980, 415],
    props: [P([20, 15, 95, 85], 'sway', '#ff9ad8', { sound: 'rustle', glyph: '🌸' }), P([890, 15, 975, 95], 'fireflies', '#fff6a0', { sound: 'chime' }),
      P([20, 455, 95, 550], 'flicker', '#ffd25a', { sound: 'clink' }), P([860, 445, 975, 545], 'ripple', '#9ad8ff', { sound: 'splash' })] },
  Dinosaurs: { src: 'art/boards-v2/dinosaurs.jpg', opp: [462, 30, 555, 125], me: [470, 440, 552, 540], field: [30, 140, 990, 420],
    props: [P([15, 5, 145, 125], 'wobble', '#ffe8c8', { sound: 'knock' }), P([870, 10, 990, 130], 'sway', '#7dff6a', { sound: 'rustle' }),
      P([20, 470, 110, 545], 'bob', '#ffe8c8', { sound: 'rattle', glyph: '🦴' }), P([880, 360, 990, 545], 'smoke', '#ff8a3a', { sound: 'rumble' })] },
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
