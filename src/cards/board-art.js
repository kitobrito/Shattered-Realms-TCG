// Board art per faction (16:9 landscape). A match uses the viewer's first faction's board.
// Each board's own layout (hero frames, battlefield, corner props) is in LANDSCAPE_BOARDS below.
export const BOARD_ART = {
  Vampires: 'art/boards-v2/vampires.jpg',
  // Aliens: the UFO experiment lab (the old hive board is now an unlockable: 'The Xeno Hive').
  Aliens: 'art/boards-v2/aliens-ufo.jpg',
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
  Eels: 'art/boards-v2/eels.jpg',
  Witches: 'art/boards-v2/witches.jpg',
  'Monster Hunter': 'art/monster-hunter/monsterhunterlandscape.jpg',
  // Unlockable alternate boards (ALT_BOARDS below): keyed by the board's own name.
  'Harvest Moon': 'art/boards-v2/harvest-moon.jpg',
  'The Rage Outbreak': 'art/boards-v2/rage-outbreak.jpg',
  'Cordyceps Outbreak': 'art/boards-v2/cordyceps-outbreak.jpg',
  'Cordyceps Bloom': 'art/boards-v2/cordyceps-bloom.jpg',
  'The Shifting Dunes': 'art/boards-v2/sand-sharks.jpg',
  'The Bone Crater': 'art/boards-v2/dino-graveyard.jpg',
  'The Fallout Vault': 'art/boards-v2/radioactive-vault.jpg',
  'The Blood Bar': 'art/boards-v2/vampire-blood-bar.jpg',
  'The Haunted Set': 'art/boards-v2/ghost-haunted-tv.jpg',
  'The Skinwalker Cave': 'art/boards-v2/lycan-skinwalker.jpg',
  'The Hornet Hollow': 'art/boards-v2/bees-hornet-nest.jpg',
  'The Kaiju Cockpit': 'art/boards-v2/robots-mech-kaiju.jpg',
  'The Frozen Hoard': 'art/boards-v2/dragons-ice-lair.jpg',
  'The White Hole': 'art/boards-v2/void-white-hole.jpg',
  'The Split Realm': 'art/boards-v2/ultra-split-dimensions.jpg',
  'The Live Wire': 'art/boards-v2/eels-power-line-river.jpg',
  'The Wicked Cabin': 'art/boards-v2/witches-evil-cabin.jpg',
  'The Tar Pit': 'art/boards-v2/iceage-tar-pit.jpg',
  'The Consecrated Graveyard': 'art/boards-v2/divine-consecrated-graveyard.jpg',
  'The Siege of Heaven': 'art/boards-v2/demons-heaven-siege.jpg',
  'The Xeno Hive': 'art/boards-v2/aliens.jpg',
  'The Sewage Works': 'art/boards-v2/acidic-sewer.jpg',
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

// Alternate boards a faction can switch to (the board picker in the collection). Each unlocks once
// every card of its mini-set (`set`) is unlocked, or (`expansion: true`) every card of the faction's
// main expansion (its `extra` cards that belong to no mini-set).
export const ALT_BOARDS = {
  Plants: [{ id: 'Harvest Moon', set: 'Harvest Moon', blurb: 'A haunted pumpkin patch under the harvest moon.' }],
  Zombies: [{ id: 'The Rage Outbreak', expansion: true, blurb: 'A blood-soaked city street, days after the Rage got out.' },
    { id: 'Cordyceps Outbreak', set: 'Cordyceps Outbreak', blurb: 'An overgrown city street, decades after the fungus won.' }],
  Sharks: [{ id: 'The Shifting Dunes', expansion: true, blurb: 'A scorching desert where sharks swim through the sand.' }],
  // The old Aliens board: unlocked by the Hive Brood cards (the Xenomorphs), not the Qu cards.
  Aliens: [{ id: 'The Xeno Hive', cards: ['facehugger_swarmling', 'ovomorph_clutch', 'parasite_carrier', 'acid_blood_drone', 'hive_stalker', 'brood_tender', 'hive_brute', 'xeno_runner', 'hive_warrior', 'praetorian_guard', 'hive_queen_xaral', 'gestation', 'it_bursts_out', 'acid_blood_spray', 'egg_chamber'], blurb: 'The xenomorph hive: resin walls and egg clusters.' }],
  Acidic: [{ id: 'The Sewage Works', expansion: true, blurb: 'A flooded sewage plant: glowing acid, skeletal fish and rats, and one very lucky frog.' }],
  // Unlocked by each realm's expansion cards.
  Dinosaurs: [{ id: 'The Bone Crater', expansion: true, blurb: 'A long-cold meteor crater ringed with giant fossil skeletons.' }],
  Radioactive: [{ id: 'The Fallout Vault', expansion: true, blurb: 'An atomic-age shelter vault leaking glowing green goo.' }],
  Vampires: [{ id: 'The Blood Bar', expansion: true, blurb: 'A gothic vampire lounge built around a pool of blood.' }],
  Ghosts: [{ id: 'The Haunted Set', expansion: true, blurb: 'A living room taken over by a poltergeist and a haunted TV.' }],
  Lycanthropes: [{ id: 'The Skinwalker Cave', set: 'Stolen Hide', blurb: 'A moonlit cave lair where something is changing shape.' }],
  Bees: [{ id: 'The Hornet Hollow', expansion: true, blurb: 'A vast underground hornet nest glowing with nectar.' }],
  Robots: [{ id: 'The Kaiju Cockpit', expansion: true, blurb: 'Inside a giant mech mid-battle with a kaiju.' }],
  Dragons: [{ id: 'The Frozen Hoard', expansion: true, blurb: 'An ice dragon coiled around its frozen treasure.' }],
  Void: [{ id: 'The White Hole', expansion: true, blurb: 'A new universe pouring out of a white hole.' }],
  Ultraterrestrials: [{ id: 'The Split Realm', expansion: true, blurb: 'One world, and its mirror seen from a higher dimension.' }],
  Eels: [{ id: 'The Live Wire', expansion: true, blurb: 'A downed power line crackling through a shallow river.' }],
  Witches: [{ id: 'The Wicked Cabin', set: 'Spellbound', blurb: 'A wicked witch\'s cabin, with dinner on the boil.' }],
  'Ice Age': [{ id: 'The Tar Pit', expansion: true, blurb: 'Woolly mammoths stuck fast in a frozen tar pit.' }],
  Divine: [{ id: 'The Consecrated Graveyard', expansion: true, blurb: "A moonlit graveyard where holy light smites the restless dead." }],
  Demons: [{ id: 'The Siege of Heaven', expansion: true, blurb: "Heaven's golden gates, as hellfire and a demon legion storm the clouds." }],
  Fungus: [{ id: 'Cordyceps Bloom', set: 'Cordyceps Bloom', blurb: 'A ruined greenhouse, alive with glowing mycelium.' }],
};

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
  'Monster Hunter': { src: 'art/monster-hunter/monsterhunterportrait.jpg', opp: [195, 150, 264, 219, 'circle'], me: [195, 788, 264, 857, 'circle'], field: [115, 250, 344, 750], props: [] },
  // No painted hero frames: the game draws iron ones over the street.
  'The Rage Outbreak': { src: 'art/boards-portrait/rage-outbreak.jpg', opp: [167, 52, 298, 169, 'circle'], me: [168, 833, 293, 961, 'circle'], field: [181, 823], props: [] },
  'Harvest Moon': { src: 'art/boards-portrait/harvest-moon.jpg', opp: [192, 130, 267, 207, 'arch'], me: [183, 757, 276, 839, 'circle'], field: [223, 741], props: [] },
  'Cordyceps Outbreak': { src: 'art/boards-portrait/cordyceps-outbreak.jpg', opp: [184, 70, 274, 158, 'arch'], me: [187, 866, 272, 950, 'circle'], field: [174, 850], props: [] },
  'The Sewage Works': { src: 'art/boards-portrait/acidic-sewer.jpg', opp: [179, 51, 281, 173, 'arch'], me: [162, 848, 298, 968, 'circle'], field: [185, 835], props: [] },
  'Cordyceps Bloom': { src: 'art/boards-portrait/cordyceps-bloom.jpg', opp: [184, 155, 275, 264, 'arch'], me: [180, 751, 281, 830, 'circle'], field: [280, 735], props: [] },
  Basic: { src: 'art/boards-portrait/basic.jpg', opp: [201, 30, 259, 98, 'arch'], me: [198, 806, 261, 876, 'circle'], field: [120, 790], frame: 'stone', props: [] },
  // Living board (board-fx-defs.js): its corners react on the canvas, and the game draws the hero frames.
  // Eels: a glowing flooded cave; the game draws copper frames over the water.
  // Witches: a coven's ritual chamber; the arched and round hero frames are painted in.
  Witches: { src: 'art/boards-portrait/witches.jpg', opp: [201, 255, 268, 332, 'arch'], me: [177, 883, 283, 987, 'circle'], field: [345, 870], props: [] },
  Eels: { src: 'art/boards-portrait/eels.jpg', opp: [201, 26, 259, 94, 'arch'], me: [198, 806, 261, 876, 'circle'], field: [125, 790], frame: 'copper', props: [] },
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
  Aliens: { src: 'art/boards-portrait/aliens-ufo.jpg', opp: [167, 36, 292, 150, 'circle'], me: [168, 794, 292, 918, 'circle'], field: [180, 785], props: [] },
  'The Xeno Hive': { src: 'art/boards-portrait/aliens.jpg', opp: [201, 20, 259, 88, 'arch'], me: [198, 790, 261, 860, 'circle'], field: [120, 775], frame: 'chitin', props: [] },
  'The Shifting Dunes': { src: 'art/boards-portrait/sand-sharks.jpg', opp: [189, 33, 270, 126, 'arch'], me: [187, 743, 273, 829, 'circle'], field: [140, 735], props: [] },
  'The Bone Crater': { src: 'art/boards-portrait/dino-graveyard.jpg', opp: [170, 24, 289, 129, 'arch'], me: [179, 783, 281, 885, 'circle'], field: [141, 773], props: [] },
  'The Fallout Vault': { src: 'art/boards-portrait/radioactive-vault.jpg', opp: [169, 105, 291, 236, 'arch'], me: [160, 800, 299, 939, 'circle'], field: [248, 790], props: [] },
  'The Blood Bar': { src: 'art/boards-portrait/vampire-blood-bar.jpg', opp: [174, 46, 282, 157, 'arch'], me: [179, 878, 282, 982, 'circle'], field: [169, 868], props: [] },
  'The Haunted Set': { src: 'art/boards-portrait/ghost-haunted-tv.jpg', opp: [183, 57, 284, 178, 'arch'], me: [175, 838, 284, 941, 'circle'], field: [190, 828], props: [] },
  'The Skinwalker Cave': { src: 'art/boards-portrait/lycan-skinwalker.jpg', opp: [170, 108, 290, 212, 'arch'], me: [169, 806, 290, 942, 'circle'], field: [224, 796], props: [] },
  'The Hornet Hollow': { src: 'art/boards-portrait/bees-hornet-nest.jpg', opp: [181, 50, 279, 162, 'arch'], me: [175, 851, 285, 960, 'circle'], field: [174, 841], props: [] },
  'The Kaiju Cockpit': { src: 'art/boards-portrait/robots-mech-kaiju.jpg', opp: [180, 184, 281, 297, 'arch'], me: [183, 766, 278, 866, 'circle'], field: [309, 756], props: [] },
  'The Frozen Hoard': { src: 'art/boards-portrait/dragons-ice-lair.jpg', opp: [184, 42, 277, 146, 'arch'], me: [188, 800, 278, 893, 'circle'], field: [158, 790], props: [] },
  'The White Hole': { src: 'art/boards-portrait/void-white-hole.jpg', opp: [176, 35, 290, 166, 'arch'], me: [175, 812, 285, 930, 'circle'], field: [178, 802], props: [] },
  'The Split Realm': { src: 'art/boards-portrait/ultra-split-dimensions.jpg', opp: [178, 48, 280, 157, 'arch'], me: [173, 862, 284, 963, 'circle'], field: [169, 852], props: [] },
  'The Live Wire': { src: 'art/boards-portrait/eels-power-line-river.jpg', opp: [190, 18, 264, 108, 'arch'], me: [184, 902, 268, 988, 'circle'], field: [120, 892], props: [] },
  'The Wicked Cabin': { src: 'art/boards-portrait/witches-evil-cabin.jpg', opp: [174, 32, 290, 160, 'arch'], me: [172, 825, 290, 950, 'circle'], field: [172, 815], props: [] },
  'The Tar Pit': { src: 'art/boards-portrait/iceage-tar-pit.jpg', opp: [193, 173, 268, 270, 'arch'], me: [184, 753, 275, 843, 'circle'], field: [282, 743], props: [] },
  'The Consecrated Graveyard': { src: 'art/boards-portrait/divine-consecrated-graveyard.jpg', opp: [183, 56, 278, 170, 'arch'], me: [185, 781, 274, 871, 'circle'], field: [182, 771], props: [] },
  'The Siege of Heaven': { src: 'art/boards-portrait/demons-heaven-siege.jpg', opp: [174, 50, 277, 160, 'arch'], me: [184, 738, 282, 834, 'circle'], field: [172, 728], props: [] },
  Vampires: { src: 'art/boards-portrait/vampires.jpg', opp: [190, 71, 266, 162, 'arch'], me: [179, 893, 280, 995, 'circle'], field: [180, 870], props: [] },
};

// Landscape boards (16:9 screens), 1024x572, same idea: hero frame openings, the
// battlefield [x0, y0, x1, y1] and the four corner props.
export const LANDSCAPE_SIZE = [1024, 572];
export const LANDSCAPE_BOARDS = {
  'Monster Hunter': { src: 'art/monster-hunter/monsterhunterlandscape.jpg', opp: [472, 28, 552, 108], me: [472, 464, 552, 544], field: [130, 145, 894, 425], props: [] },
  'The Rage Outbreak': { src: 'art/boards-v2/rage-outbreak.jpg', opp: [452, 28, 566, 142], me: [449, 423, 567, 538], field: [150, 154, 880, 409], props: [] },
  'Harvest Moon': { src: 'art/boards-v2/harvest-moon.jpg', opp: [470, 48, 555, 136], me: [455, 436, 569, 534], field: [130, 150, 895, 424], props: [] },
  'Cordyceps Outbreak': { src: 'art/boards-v2/cordyceps-outbreak.jpg', opp: [465, 42, 558, 132], me: [467, 440, 562, 528], field: [130, 146, 895, 428], props: [] },
  'The Sewage Works': { src: 'art/boards-v2/acidic-sewer.jpg', opp: [449, 34, 567, 146], me: [449, 412, 575, 539], field: [150, 155, 880, 405], props: [] },
  'Cordyceps Bloom': { src: 'art/boards-v2/cordyceps-bloom.jpg', opp: [467, 35, 558, 142], me: [462, 434, 561, 533], field: [130, 156, 895, 422], props: [] },
  Basic: { src: 'art/boards-v2/basic.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'stone', props: [] },
  Witches: { src: 'art/boards-v2/witches.jpg', opp: [467, 39, 560, 144], me: [459, 427, 565, 537], field: [150, 165, 875, 415], props: [] },
  Eels: { src: 'art/boards-v2/eels.jpg', opp: [471, 22, 553, 116], me: [468, 444, 556, 548], field: [110, 140, 915, 430], frame: 'copper', props: [] },
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
  Aliens: { src: 'art/boards-v2/aliens-ufo.jpg', opp: [465, 27, 562, 141], me: [463, 439, 561, 538], field: [160, 150, 870, 420], props: [] },
  'The Xeno Hive': { src: 'art/boards-v2/aliens.jpg', opp: [471, 24, 553, 118], me: [468, 446, 556, 548], field: [110, 140, 915, 425], frame: 'chitin', props: [] },
  'The Shifting Dunes': { src: 'art/boards-v2/sand-sharks.jpg', opp: [467, 34, 557, 138], me: [459, 430, 565, 536], field: [150, 150, 880, 415], props: [] },
  'The Bone Crater': { src: 'art/boards-v2/dino-graveyard.jpg', opp: [446, 22, 575, 133], me: [455, 433, 570, 548], field: [150, 145, 880, 419], props: [] },
  'The Fallout Vault': { src: 'art/boards-v2/radioactive-vault.jpg', opp: [451, 26, 571, 146], me: [441, 438, 580, 571], field: [150, 158, 880, 424], props: [] },
  'The Blood Bar': { src: 'art/boards-v2/vampire-blood-bar.jpg', opp: [459, 36, 566, 130], me: [458, 436, 566, 543], field: [150, 142, 880, 422], props: [] },
  'The Haunted Set': { src: 'art/boards-v2/ghost-haunted-tv.jpg', opp: [472, 43, 553, 143], me: [456, 437, 561, 540], field: [150, 155, 880, 423], props: [] },
  'The Skinwalker Cave': { src: 'art/boards-v2/lycan-skinwalker.jpg', opp: [456, 56, 568, 162], me: [440, 418, 585, 552], field: [150, 174, 880, 404], props: [] },
  'The Hornet Hollow': { src: 'art/boards-v2/bees-hornet-nest.jpg', opp: [462, 36, 562, 147], me: [454, 428, 567, 537], field: [150, 159, 880, 414], props: [] },
  'The Kaiju Cockpit': { src: 'art/boards-v2/robots-mech-kaiju.jpg', opp: [458, 29, 566, 157], me: [454, 427, 570, 541], field: [150, 169, 880, 413], props: [] },
  'The Frozen Hoard': { src: 'art/boards-v2/dragons-ice-lair.jpg', opp: [455, 40, 569, 145], me: [461, 428, 563, 536], field: [150, 157, 880, 414], props: [] },
  'The White Hole': { src: 'art/boards-v2/void-white-hole.jpg', opp: [461, 27, 562, 135], me: [460, 427, 570, 543], field: [150, 147, 880, 413], props: [] },
  'The Split Realm': { src: 'art/boards-v2/ultra-split-dimensions.jpg', opp: [450, 24, 565, 125], me: [461, 438, 562, 540], field: [150, 137, 880, 424], props: [] },
  'The Live Wire': { src: 'art/boards-v2/eels-power-line-river.jpg', opp: [462, 22, 562, 132], me: [463, 444, 560, 542], field: [150, 144, 880, 430], props: [] },
  'The Wicked Cabin': { src: 'art/boards-v2/witches-evil-cabin.jpg', opp: [450, 40, 580, 165], me: [448, 415, 578, 535], field: [150, 177, 880, 401], props: [] },
  'The Tar Pit': { src: 'art/boards-v2/iceage-tar-pit.jpg', opp: [467, 28, 556, 124], me: [455, 425, 568, 543], field: [150, 136, 880, 411], props: [] },
  'The Consecrated Graveyard': { src: 'art/boards-v2/divine-consecrated-graveyard.jpg', opp: [458, 42, 564, 140], me: [460, 440, 564, 543], field: [150, 152, 880, 426], props: [] },
  'The Siege of Heaven': { src: 'art/boards-v2/demons-heaven-siege.jpg', opp: [467, 30, 557, 137], me: [462, 439, 571, 539], field: [150, 149, 880, 425], props: [] },
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
