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
// board.js layoutPortraitBoard() scales the art to the screen and lines the
// heroes, minion rows, End Turn and decks up with these spots.
export const PORTRAIT_SIZE = [459, 1024];
// Corner props (both shapes): what each one does on its own (fx) and when tapped (sound, glyph).
//   fx: glow | flicker | steam | smoke | drip | blink | sparkle | spores | ripple | fireflies   (an effect over the prop)
//       sway | bob | wobble | spin | peck | crawl                                              (the painted prop itself moves)
const P = (at, fx, color, tap = {}) => ({ at, fx, color, ...tap });
export const PORTRAIT_BOARDS = {
  Acidic: { src: 'art/boards-portrait/acidic.jpg', opp: [198, 22, 261, 98, 'arch'], me: [188, 910, 270, 992, 'circle'], field: [120, 880],
    props: [P([30, 0, 130, 105], 'steam', '#c8ff2a', { sound: 'bloop', glyph: '🧪' }), P([330, 0, 440, 110], 'glow', '#ff8a5a', { sound: 'clink' }),
      P([20, 890, 140, 1015], 'steam', '#c8ff2a', { sound: 'bloop' }), P([340, 860, 450, 1015], 'glow', '#d8ff9a', { sound: 'chime' })] },
  Sharks: { src: 'art/boards-portrait/sharks.jpg', opp: [187, 23, 272, 117, 'arch'], me: [187, 809, 272, 914, 'circle'], field: [130, 800],
    props: [P([30, 30, 110, 110], 'bob', '#cfefff', { sound: 'splash', glyph: '🦈' }), P([335, 20, 445, 165], 'sway', '#bfe8c8', { sound: 'clink' }),
      P([30, 880, 160, 1000], 'glow', '#ffffff', { sound: 'knock' }), P([300, 890, 450, 1015], 'glow', '#ff3a4a', { sound: 'splash' })] },
  Ultraterrestrials: { src: 'art/boards-portrait/ultraterrestrials.jpg', opp: [197, 28, 262, 111, 'arch'], me: [199, 820, 260, 895, 'circle'], field: [125, 810],
    props: [P([8, 2, 58, 72], 'sparkle', '#ffe8a8', { sound: 'chime' }), P([402, 2, 457, 72], 'glow', '#b48cff', { sound: 'whoosh', glyph: '🌀' }),
      P([8, 930, 78, 1012], 'sparkle', '#d8c8ff', { sound: 'clink' }), P([388, 922, 457, 1016], 'glow', '#9fd8ff', { sound: 'chime' })] },
  Ghosts: { src: 'art/boards-portrait/ghosts.jpg', opp: [193, 19, 266, 102, 'arch'], me: [194, 869, 265, 958, 'circle'], field: [115, 860],
    props: [P([20, 5, 120, 95], 'flicker', '#9ff0ff', { sound: 'whoosh' }), P([365, 5, 435, 115], 'glow', '#9ff0ff', { sound: 'clink', glyph: '👻' }),
      P([15, 880, 125, 1012], 'smoke', '#7dff9a', { sound: 'rattle' }), P([340, 860, 455, 1015], 'fireflies', '#c8f8ff', { sound: 'screech', glyph: '🪶' })] },
  Bees: { src: 'art/boards-portrait/bees.jpg', opp: [198, 19, 262, 91, 'arch'], me: [195, 922, 264, 1009, 'circle'], field: [110, 905],
    props: [P([20, 15, 95, 125], 'drip', '#ffb21a', { sound: 'drip' }), P([360, 5, 440, 110], 'sway', '#f0e0c0', { sound: 'rustle', glyph: '🐝' }),
      P([15, 915, 90, 1010], 'glow', '#ffc21a', { sound: 'clink' }), P([355, 910, 450, 1015], 'wobble', '#ffe8c8', { sound: 'rustle' })] },
  Radioactive: { src: 'art/boards-portrait/radioactive.jpg', opp: [181, 24, 277, 134, 'arch'], me: [187, 748, 273, 847, 'circle'], field: [150, 735],
    props: [P([10, 5, 95, 105], 'glow', '#7aff3a', { sound: 'splash' }), P([370, 15, 440, 90], 'flicker', '#e8ffd8', { sound: 'clink' }),
      P([15, 820, 85, 890], 'blink', '#9aff5a', { sound: 'chime' }), P([360, 820, 459, 890], 'drip', '#7aff2a', { sound: 'drip' })] },
  Robots: { src: 'art/boards-portrait/robots.jpg', opp: [191, 18, 266, 107, 'arch'], me: [193, 785, 268, 880, 'circle'], field: [130, 770],
    props: [P([15, 15, 75, 75], 'spin', '#d8b070', { sound: 'clink' }), P([385, 15, 440, 70], 'blink', '#bfe8ff', { sound: 'hiss' }),
      P([15, 820, 75, 890], 'bob', '#9fd0ff', { sound: 'knock', glyph: '⚙️' }), P([380, 800, 440, 880], 'steam', '#e8f0ff', { sound: 'hiss' })] },
  Divine: { src: 'art/boards-portrait/divine.jpg', opp: [189, 26, 268, 119, 'arch'], me: [190, 730, 268, 827, 'circle'], field: [150, 700],
    props: [P([10, 10, 80, 80], 'glow', '#ffd25a', { sound: 'chime' }), P([380, 15, 450, 85], 'sway', '#fff6d8', { sound: 'flutter', glyph: '🪶' }),
      P([5, 770, 75, 845], 'glow', '#ffd25a', { sound: 'chime' }), P([390, 770, 455, 840], 'glow', '#ffffff', { sound: 'chime', glyph: '✨' })] },
  Demons: { src: 'art/boards-portrait/demons.jpg', opp: [185, 15, 272, 120, 'arch'], me: [186, 757, 270, 850, 'circle'], field: [140, 740],
    props: [P([5, 10, 90, 95], 'flicker', '#ff7a2a', { sound: 'whoosh' }), P([390, 15, 440, 90], 'flicker', '#ffcf6a', { sound: 'whoosh' }),
      P([5, 800, 90, 890], 'glow', '#ff2a3a', { sound: 'growl' }), P([380, 800, 459, 880], 'glow', '#ff2a3a', { sound: 'rattle' })] },
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
  Aliens: { src: 'art/boards-portrait/aliens.jpg', opp: [190, 13, 268, 104, 'arch'], me: [189, 778, 270, 881, 'circle'], field: [120, 760],
    props: [P([10, 10, 80, 80], 'glow', '#5aff8a', { sound: 'hiss' }), P([380, 10, 450, 80], 'blink', '#7affe8', { sound: 'chime' }),
      P([15, 840, 55, 880], 'wobble', '#c8e8d8', { sound: 'knock' }), P([375, 835, 445, 885], 'blink', '#5aff8a', { sound: 'chime' })] },
  Vampires: { src: 'art/boards-portrait/vampires.jpg', opp: [192, 18, 268, 102, 'arch'], me: [193, 745, 268, 845, 'circle'], field: [120, 720],
    props: [P([25, 10, 60, 75], 'flicker', '#ffcf6a', { sound: 'whoosh' }), P([395, 5, 450, 80], 'glow', '#ff2a44', { sound: 'clink' }),
      P([15, 815, 75, 875], 'wobble', '#e8dcc8', { sound: 'rattle' }), P([355, 780, 459, 930], 'wobble', '#ff2a44', { sound: 'knock', glyph: '🦇' })] },
};

// Landscape boards (16:9 screens), 1024x572, same idea: hero frame openings, the
// battlefield [x0, y0, x1, y1] and the four corner props.
export const LANDSCAPE_SIZE = [1024, 572];
export const LANDSCAPE_BOARDS = {
  Acidic: { src: 'art/boards-v2/acidic.jpg', opp: [467, 30, 556, 132], me: [460, 431, 558, 535], field: [110, 150, 915, 420],
    props: [P([55, 10, 200, 140], 'steam', '#c8ff2a', { sound: 'bloop', glyph: '🧪' }), P([850, 10, 990, 170], 'glow', '#ff8a5a', { sound: 'clink' }),
      P([50, 400, 200, 560], 'steam', '#c8ff2a', { sound: 'bloop' }), P([870, 360, 1010, 560], 'glow', '#d8ff9a', { sound: 'chime' })] },
  Sharks: { src: 'art/boards-v2/sharks.jpg', opp: [464, 21, 558, 127], me: [464, 432, 559, 546], field: [110, 140, 915, 420],
    props: [P([75, 30, 150, 115], 'bob', '#cfefff', { sound: 'splash', glyph: '🦈' }), P([850, 10, 980, 180], 'sway', '#bfe8c8', { sound: 'clink' }),
      P([40, 415, 180, 560], 'glow', '#ffffff', { sound: 'knock' }), P([855, 420, 1015, 560], 'glow', '#ff3a4a', { sound: 'splash' })] },
  Ultraterrestrials: { src: 'art/boards-v2/ultraterrestrials.jpg', opp: [468, 34, 554, 140], me: [465, 425, 558, 540], field: [60, 150, 965, 415],
    props: [P([25, 5, 120, 120], 'sparkle', '#ffe8a8', { sound: 'chime' }), P([895, 5, 995, 100], 'glow', '#b48cff', { sound: 'whoosh', glyph: '🌀' }),
      P([25, 420, 130, 548], 'sparkle', '#d8c8ff', { sound: 'clink' }), P([890, 415, 1005, 562], 'glow', '#9fd8ff', { sound: 'chime' })] },
  Ghosts: { src: 'art/boards-v2/ghosts.jpg', opp: [467, 23, 555, 124], me: [466, 440, 556, 551], field: [70, 140, 955, 425],
    props: [P([30, 10, 150, 130], 'flicker', '#9ff0ff', { sound: 'whoosh' }), P([900, 5, 990, 140], 'glow', '#9ff0ff', { sound: 'clink', glyph: '👻' }),
      P([20, 400, 150, 556], 'smoke', '#7dff9a', { sound: 'rattle' }), P([870, 385, 1012, 560], 'fireflies', '#c8f8ff', { sound: 'screech', glyph: '🪶' })] },
  Bees: { src: 'art/boards-v2/bees.jpg', opp: [468, 24, 556, 125], me: [464, 437, 559, 555], field: [60, 140, 965, 425],
    props: [P([30, 15, 130, 165], 'drip', '#ffb21a', { sound: 'drip' }), P([885, 5, 975, 150], 'sway', '#f0e0c0', { sound: 'rustle', glyph: '🐝' }),
      P([25, 430, 120, 550], 'glow', '#ffc21a', { sound: 'clink' }), P([880, 425, 1010, 560], 'wobble', '#ffe8c8', { sound: 'rustle' })] },
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
  Demons: { src: 'art/boards-v2/demons.jpg', opp: [460, 25, 550, 125], me: [465, 440, 558, 538], field: [40, 140, 990, 420],
    props: [P([15, 15, 110, 110], 'flicker', '#ff7a2a', { sound: 'whoosh' }), P([920, 15, 980, 95], 'flicker', '#ffcf6a', { sound: 'whoosh' }),
      P([25, 440, 115, 550], 'glow', '#ff2a3a', { sound: 'growl' }), P([920, 460, 990, 550], 'glow', '#ff2a3a', { sound: 'rattle' })] },
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
  Aliens: { src: 'art/boards-v2/aliens.jpg', opp: [464, 13, 559, 126], me: [465, 427, 558, 543], field: [30, 135, 990, 415],
    props: [P([20, 10, 90, 90], 'glow', '#5aff8a', { sound: 'hiss' }), P([900, 10, 975, 85], 'blink', '#7affe8', { sound: 'chime' }),
      P([25, 485, 70, 545], 'wobble', '#c8e8d8', { sound: 'knock' }), P([915, 485, 980, 545], 'blink', '#5aff8a', { sound: 'chime' })] },
};

