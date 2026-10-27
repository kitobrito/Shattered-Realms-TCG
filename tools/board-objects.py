#!/usr/bin/env python3
"""Cut the living boards' moving objects out of their paintings, so only the object moves.

Every layer in src/ui/board-fx-defs.js that moves painted pixels (echo: a skull rocking, a sun
spinning; crawlers: bees on the comb; warp without a mask: a banner rippling) used to copy a
rectangle of the painting and move it: the background inside the rectangle travelled with the
object, and the original object stayed painted underneath. This tool makes, per object:
  - obj:   the object alone (RGBA, soft 1px edge), cut with a salient-object model (IS-Net)
           inside the layer's box, plus per-object hints (HINTS) where the model needs help;
  - patch: the background where the object was, with the object painted out (inpainted), a
           little wider than the object so no fringe of it stays behind.
At run time circle-fx.js draws the patch where the object sits and the moving object on top,
so the board around it never moves.

  python3 tools/board-objects.py [board-key ...]      e.g. ice-age-land circle3-portrait
  (no keys: every board). Needs the IS-Net model: --model path/to/model.onnx (or $ISNET_MODEL).
Writes art/boards-fx/objects/<key>.png (one atlas per board) and src/cards/board-objects.js.
"""
import argparse, json, os, subprocess, sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = {'land': (1024, 572), 'portrait': (459, 1024)}
OUT_DIR = os.path.join(ROOT, 'art', 'boards-fx', 'objects')
MANIFEST = os.path.join(ROOT, 'src', 'cards', 'board-objects.js')

# Per-object fixes, keyed '<board-key>/<item id>'. All boxes in board image px.
#   method: 'model' (default: IS-Net salient object), 'grabcut' (colour model from the box; 'rect'
#           overrides the box it starts from), 'bee', 'hsv' (with 'hsv' ranges), 'poly' (outlined
#           by hand: 'polys' and 'ellipses' [cx, cy, rx, ry, angle] minus 'holes', snapped to the painted edges within 'refine' px), 'disc' (round
#           things that spin; 'center', 'radius')
#   expand: how far past the box the object may reach (default 30% of the box)
#   keep: [[x0,y0,x1,y1]...]  only these areas can hold the object
#   fg:   [[x0,y0,x1,y1]...]  surely object (forced in);  fg_polys: the same, outlined
#   bg:   [[x0,y0,x1,y1]...]  surely background (forced out)
#   within: {hint}  keep only what that cut finds too (colour rules inside the model's outline)
#   cover: {'area': box, 'hsv': ranges} or {'polys': [...]}  scenery painted in front of the object, kept in front
#   thr:  matte threshold (default 0.5);  grow: px to grow the cut;  max_hole, min_area
SHIMMER = {'method': 'hsv', 'hsv': [[105, 178, 22, 120, 105, 238]], 'close': 1, 'expand': 0}  # pale lavender stone
CHAINS = {'method': 'hsv', 'hsv': [[0, 180, 0, 255, 0, 62], [0, 180, 0, 40, 120, 255], [0, 14, 90, 255, 60, 200]], 'close': 1, 'expand': 4, 'within': {'method': 'model'}}
HINTS = {
    # Ice Age: the spears lying by the fire pits (thin: outlined, snapped to the paint).
    'ice-age-land/spear': {'method': 'poly', 'polys': [[[222, 451], [222, 466], [210, 481], [200, 486], [190, 494], [146, 544], [133, 557], [126, 553], [127, 547], [137, 538], [183, 488], [193, 477], [196, 468], [208, 458]]]},
    'ice-age-portrait/spear': {'method': 'poly', 'polys': [[[125, 272], [122, 284], [112, 295], [80, 328], [76, 337], [71, 335], [72, 327], [103, 294], [111, 283], [118, 276]]]},
    # Aliens: the egg clusters set in the hive wall (each egg an ellipse).
    'aliens-land/eggs3': {'method': 'poly', 'ellipses': [[948, 297, 16, 19], [982, 305, 13, 15], [1012, 310, 13, 16], [926, 328, 12, 14], [958, 336, 14, 16], [977, 362, 16, 16], [996, 395, 15, 19]]},
    'aliens-land/eggs4': {'method': 'poly', 'ellipses': [[670, 517, 11, 13], [700, 514, 10, 12], [629, 545, 9, 11], [660, 551, 10, 11]]},
    'aliens-portrait/eggs3': {'method': 'poly', 'ellipses': [[416.5, 695, 9.5, 6.5], [398.5, 712, 16.5, 13], [424.5, 718.5, 9.5, 8.5], [411.5, 737.5, 9.5, 10.5], [430, 745, 10, 11]]},
    'aliens-portrait/eggs2': {'method': 'poly', 'ellipses': [[61, 680, 9, 9], [38, 700, 8, 9], [68.5, 700, 8.5, 9], [52.5, 718, 12, 12], [28.5, 724, 8.5, 10]]},
    # Bees: the larvae breathing in their cells (the larva alone, not the cell); two bees the colour cut misses.
    'bees-land/grub': {'method': 'poly', 'ellipses': [[933, 497, 26, 27]]},
    'bees-portrait/grub': {'method': 'poly', 'ellipses': [[391, 947, 23, 27]]},
    'bees-portrait/crawl.0': {'method': 'poly', 'ellipses': [[383, 302, 6, 7]]},
    'bees-portrait/crawl.8': {'method': 'poly', 'ellipses': [[42, 736, 9, 6, 10], [33, 742, 5, 6]]},
    'bees-portrait/nest': {'bg': [[330, 138, 450, 150]]},
    # Dinosaurs: the bones lying in their dirt (the bones, not the dirt).
    'dinosaurs-land/bone': {'method': 'grabcut'},
    'dinosaurs-portrait/bone': {'method': 'grabcut'},
    # Divine: the angel wings beside the arches flap (outlined, then fitted to the feathers).
    'divine-land/wingsOL': {'method': 'poly', 'refine': 6, 'polys': [[[366, 1], [392, 4], [398, 25], [418, 25], [430, 40], [440, 60], [452, 80], [462, 95], [466, 128], [400, 128], [388, 110], [375, 95], [368, 82], [362, 60], [352, 30], [352, 18]]], 'holes': [[[418, 12], [472, 12], [472, 38], [445, 40], [418, 30]]]},
    'divine-land/wingsOR': {'method': 'poly', 'refine': 5, 'polys': [[[656, 1], [630, 4], [624, 25], [604, 25], [592, 40], [582, 60], [570, 80], [560, 95], [556, 128], [622, 128], [634, 110], [647, 95], [654, 82], [660, 60], [670, 30], [670, 18]]], 'holes': [[[604, 12], [550, 12], [550, 38], [577, 40], [604, 30]]]},
    'divine-land/wingsML': {'method': 'poly', 'refine': 5, 'polys': [[[355, 408], [362, 410], [385, 435], [398, 440], [410, 445], [425, 448], [440, 460], [450, 470], [455, 490], [452, 505], [448, 520], [420, 520], [395, 505], [372, 488], [360, 470], [352, 455], [355, 440], [358, 425]]]},
    'divine-land/wingsMR': {'method': 'poly', 'refine': 5, 'polys': [[[665, 408], [658, 410], [635, 435], [622, 440], [610, 445], [595, 448], [580, 460], [570, 470], [565, 490], [568, 505], [572, 520], [600, 520], [625, 505], [648, 488], [660, 470], [668, 455], [665, 440], [662, 425]]]},
    'divine-portrait/wingsOL': {'method': 'poly', 'refine': 5, 'polys': [[[143, 107], [150, 110], [160, 125], [172, 140], [180, 155], [184, 170], [183, 200], [180, 232], [165, 232], [150, 225], [140, 210], [132, 190], [130, 160], [133, 130], [138, 115]]]},
    'divine-portrait/wingsOR': {'method': 'poly', 'refine': 5, 'polys': [[[317, 107], [310, 110], [300, 125], [288, 140], [280, 155], [276, 170], [277, 200], [280, 232], [295, 232], [310, 225], [320, 210], [328, 190], [330, 160], [327, 130], [322, 115]]]},
    'divine-portrait/wingsML': {'method': 'poly', 'refine': 5, 'polys': [[[148, 718], [155, 725], [165, 745], [175, 765], [183, 785], [187, 800], [188, 830], [185, 860], [172, 865], [158, 855], [145, 840], [135, 820], [130, 800], [132, 770], [136, 745], [142, 728]]]},
    'divine-portrait/wingsMR': {'method': 'poly', 'refine': 5, 'polys': [[[312, 718], [305, 725], [295, 745], [285, 765], [277, 785], [273, 800], [272, 830], [275, 860], [288, 865], [302, 855], [315, 840], [325, 820], [330, 800], [328, 770], [324, 745], [318, 728]]]},
    # Divine: the floor mosaics' inner suns turn (discs inside their rings); clouds drift in front of the right one.
    'divine-land/sun': {'bg': [[428, 218, 458, 243], [562, 216, 596, 247]], 'max_hole': 200},
    'divine-portrait/sun': {'method': 'disc', 'center': [232, 512], 'radius': 74},
    'divine-land/sunL': {'method': 'disc', 'center': [186, 288], 'radius': 45},
    'divine-land/sunR': {'method': 'disc', 'center': [835, 291], 'radius': 45,
                         'cover': {'area': [785, 240, 890, 340], 'hsv': [[0, 28, 35, 120, 232, 255]]}},
    # Fungus: the giant mushrooms breathe about their stems (cap and stem down to the pivot).
    'fungus-land/capP': {'method': 'grabcut', 'rect': [0, 140, 180, 330]},
    'fungus-land/capP2': {'method': 'grabcut', 'rect': [128, 0, 302, 84]},
    'fungus-land/capT2': {'method': 'grabcut', 'rect': [678, 0, 832, 90]},
    'fungus-portrait/capP2': {'method': 'grabcut', 'rect': [0, 668, 118, 775]},
    'fungus-portrait/capT2': {'method': 'grabcut'},
    'fungus-land/capO': {'method': 'grabcut', 'rect': [924, 160, 1024, 340]},
    # Ghosts: the music box's dancing figurines turn together; its big gear spins behind the blue one.
    'ghosts-land/dancers': {'method': 'poly', 'polys': [[[104, 455], [112, 455], [113, 470], [116, 482], [113, 490], [110, 497], [106, 497], [101, 488], [100, 478], [103, 468]], [[116, 470], [123, 471], [125, 485], [123, 500], [117, 500], [114, 487]], [[141, 455], [149, 456], [151, 470], [150, 487], [141, 487], [139, 470]]]},
    'ghosts-land/gear': {'method': 'disc', 'center': [86, 482], 'radius': 21, 'cover': {'polys': [[[104, 455], [112, 455], [113, 470], [116, 482], [113, 490], [110, 497], [106, 497], [101, 488], [100, 478], [103, 468]]]}},
    'ghosts-portrait/dancers': {'method': 'poly', 'polys': [[[71, 940], [77, 940], [79, 950], [78, 959], [70, 959], [69, 949]], [[80, 951], [84, 951], [86, 958], [84, 965], [80, 965], [79, 958]], [[100, 940], [105, 941], [106, 950], [103, 957], [99, 957], [98, 948]]]},
    # Lycanthropes: the broken chains (dark iron, pale highlights, the rusty shackle) inside the model's outline.
    'lycanthropes-land/chains': dict(CHAINS, bg=[[730, 50, 772, 96]]),
    'lycanthropes-portrait/chains': CHAINS,
    'lycanthropes-portrait/chains2': CHAINS,
    # Radioactive: the gauges hang below their boxes; the work lamp alone (not the floor it lights).
    'radioactive-land/gauge': {'expand': 40},
    'radioactive-portrait/gauge': {'expand': 40},
    'radioactive-land/lampSway': {'method': 'poly', 'refine': 2, 'polys': [[[843, 63], [855, 52], [870, 48], [882, 58], [880, 75], [875, 90], [872, 110], [866, 130], [855, 145], [835, 145], [818, 140], [814, 120], [818, 100], [832, 85], [840, 72]]]},
    # Robots: the valve wheel reaches past its box; the bot's left leg; the toolbox, not the plate under it.
    'robots-land/valve': {'expand': 20},
    'robots-land/bot': {'fg_polys': [[[90, 470], [100, 467], [108, 478], [120, 478], [128, 490], [118, 493], [105, 490], [104, 505], [98, 520], [88, 518], [90, 495]]]},
    'robots-portrait/tools': {'method': 'poly', 'refine': 3, 'polys': [[[365, 935], [372, 930], [385, 927], [430, 912], [437, 915], [442, 925], [447, 940], [440, 945], [440, 970], [420, 980], [395, 990], [375, 995], [360, 990], [352, 975], [350, 945]]]},
    'robots-portrait/bot': {'expand': 30, 'fg_polys': [[[44, 943], [50, 945], [52, 952], [45, 958], [40, 965], [38, 980], [36, 992], [30, 992], [29, 975], [31, 958], [37, 948]]]},
    'robots-land/tools': {'method': 'poly', 'refine': 3, 'polys': [[[825, 437], [845, 430], [905, 420], [920, 413], [935, 418], [945, 445], [948, 470], [935, 470], [933, 505], [905, 515], [880, 525], [850, 543], [835, 535], [818, 520], [813, 485], [815, 455]]]},
    # Vampires (upright): the coffin and the gargoyle on its pedestal, dark on dark.
    'vampires-portrait/coffin': {'method': 'poly', 'refine': 3, 'polys': [[[372, 868], [405, 855], [440, 860], [456, 872], [452, 925], [438, 965], [418, 988], [380, 995], [345, 982], [330, 968], [345, 925], [360, 890]]]},
    'vampires-portrait/garg': {'method': 'poly', 'refine': 3, 'polys': [[[8, 110], [15, 80], [30, 60], [48, 52], [60, 62], [62, 45], [75, 42], [86, 52], [88, 80], [90, 100], [88, 118], [100, 135], [105, 165], [30, 170], [15, 150]]]},
    # Ultraterrestrials: the hourglasses (not their rock), the free-floating triangle, the portals.
    'ultraterrestrials-land/hourglass': {'method': 'poly', 'refine': 2, 'polys': [[[61, 36], [80, 27], [105, 19], [113, 26], [110, 34], [130, 72], [148, 103], [152, 112], [140, 121], [115, 127], [103, 122], [97, 112], [80, 80], [68, 52], [60, 44]]]},
    'ultraterrestrials-portrait/hourglass': {'method': 'poly', 'refine': 2, 'polys': [[[29, 58], [50, 45], [90, 36], [106, 36], [110, 45], [103, 55], [115, 85], [127, 115], [134, 138], [132, 150], [115, 158], [90, 160], [80, 155], [77, 140], [65, 120], [55, 95], [45, 70], [30, 65]]]},
    'ultraterrestrials-land/tri1': {'method': 'poly', 'polys': [[[477, 70], [445, 136], [521, 138]]], 'holes': [[[481, 93], [461, 120], [499, 119]]]},
    **{f'ultraterrestrials-{k}': SHIMMER for k in ('land/tri3', 'land/tri4', 'land/tri5', 'land/tri7', 'portrait/tri1', 'portrait/tri2', 'portrait/tri3', 'portrait/tri4')},
    # Void: the galaxies (ellipses, they turn in their own plane), the moon with its rock, small free rocks.
    'void-land/galaxy': {'method': 'poly', 'ellipses': [[912, 478, 86, 40, -35]]},
    'void-land/galaxy2': {'method': 'poly', 'ellipses': [[258, 32, 38, 16, -18]]},
    'void-land/galaxy3': {'method': 'poly', 'ellipses': [[265, 512, 40, 18, -25]]},
    'void-portrait/galaxy': {'method': 'poly', 'ellipses': [[370, 935, 96, 45, -38]]},
    'void-land/moonRock': {'method': 'poly', 'refine': 3, 'polys': [[[75, 415], [95, 405], [110, 407], [98, 420], [90, 440], [95, 455], [150, 452], [160, 460], [185, 475], [183, 500], [165, 520], [130, 540], [100, 545], [75, 530], [60, 505], [50, 480], [58, 465], [75, 458], [72, 440]]]},
    'void-land/rock4': {'method': 'poly', 'polys': [[[758, 486], [765, 475], [800, 467], [803, 474], [790, 490], [770, 496]]]},
    'void-land/rock5': {'method': 'poly', 'ellipses': [[566, 18, 7, 5]]},
    'void-land/rock1': {'method': 'poly', 'ellipses': [[169, 163, 6, 7]]},
    'void-land/rock2': {'method': 'poly', 'ellipses': [[819, 84, 6, 11]]},
    'void-portrait/rock1': {'method': 'poly', 'ellipses': [[129, 186, 8, 7]]},
    'void-portrait/rock2': {'method': 'poly', 'ellipses': [[425, 660, 6, 9]]},
    'void-portrait/rock3': {'method': 'poly', 'ellipses': [[245, 885, 13, 8, -40]]},
    'ultraterrestrials-land/portal': {'method': 'disc', 'center': [922, 66], 'radius': 51},
    'ultraterrestrials-portrait/portal': {'method': 'disc', 'center': [379, 85], 'radius': 57},
    # Zombies: the hands clawing out of the graves (outlined, fitted to the bones).
    'zombies-land/hand1': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[250, 487], [257, 483], [264, 481], [271, 486], [274, 489], [280, 503], [277, 510], [268, 514], [266, 525], [254, 525], [252, 512], [249, 500]]], 'pad': 1}},
    'zombies-land/hand2': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[297, 457], [305, 447], [309, 443], [313, 445], [318, 450], [325, 455], [327, 462], [320, 470], [316, 478], [315, 492], [305, 492], [304, 478], [296, 468], [290, 462], [292, 460]]], 'pad': 1}},
    'zombies-land/hand3': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[817, 448], [824, 442], [832, 441], [837, 446], [840, 455], [841, 466], [845, 475], [851, 489], [843, 489], [835, 476], [828, 470], [820, 466], [817, 460], [825, 458], [818, 452]]], 'pad': 1}},
    'zombies-land/hand4': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[887, 462], [896, 455], [903, 457], [908, 466], [905, 477], [900, 480], [892, 482], [882, 490], [866, 503], [860, 500], [878, 483], [886, 474]]], 'pad': 1}},
    'zombies-portrait/hand1': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255], [28, 58, 55, 255, 80, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[127, 205], [133, 203], [140, 206], [146, 210], [148, 217], [144, 220], [140, 222], [138, 232], [137, 246], [126, 246], [127, 232], [126, 220]]], 'pad': 1}},
    'zombies-portrait/hand2': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255], [28, 58, 55, 255, 80, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[377, 659], [383, 655], [392, 655], [400, 660], [402, 670], [410, 688], [412, 697], [402, 697], [395, 687], [388, 684], [380, 683], [376, 675], [382, 672], [378, 665]]], 'pad': 1}},
    'zombies-portrait/hand3': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255], [28, 58, 55, 255, 80, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[346, 744], [352, 739], [362, 739], [371, 745], [374, 755], [378, 763], [388, 776], [390, 786], [382, 786], [372, 778], [362, 775], [352, 770], [348, 765], [355, 762], [350, 752]]], 'pad': 1}},
    'zombies-portrait/hand4': {'method': 'hsv', 'hsv': [[25, 100, 0, 125, 105, 255]], 'close': 1, 'grow': 1, 'expand': 12, 'within': {'method': 'poly', 'polys': [[[101, 770], [110, 766], [118, 768], [124, 773], [123, 780], [117, 790], [116, 800], [115, 816], [103, 816], [102, 800], [100, 788], [100, 778]]], 'pad': 1}},
    'ice-age-portrait/skull': {'method': 'poly', 'polys': [[[40.6, 13], [51, 16.75], [61, 25.5], [59, 38], [70, 49], [73.75, 55], [85, 59], [98.75, 60.5], [104, 55.5], [105, 48], [100, 41.75], [92, 36], [102.5, 39], [107.5, 45.5], [108, 55.5], [102.5, 63], [90, 64], [77, 62], [78, 70], [79, 83], [77.5, 93], [69, 96], [60, 93], [56, 83], [55, 64], [45, 58], [33.75, 54], [32.5, 44], [27.5, 29], [28.75, 21.75], [35, 15.5]]],
                               'holes': [[[61, 67], [72, 68], [74, 83], [71, 90], [65, 92], [61, 85]]]},
    'ice-age-portrait/spear2': {'method': 'poly', 'polys': [[[99, 955], [98, 966], [90, 976], [62, 1008], [57, 1016], [53, 1013], [55, 1006], [83, 975], [87, 966], [94, 958]]]},
}

# Foliage that ripples (warp layers with a mask): cut by colour inside the layer's box, per board,
# then cleaned up (closed, specks dropped, pinholes filled). 'hsv': [[h0, h1, s0, s1, v0, v1]...]
# in OpenCV units (h 0..180, wraps when h0 > h1); 'exclude': boxes that are not foliage.
GREEN = [[25, 80, 60, 255, 35, 255]]
LEAF = [[38, 85, 110, 255, 80, 255]]  # brighter leaves, not the dark moss and ground between them
ROSES = [[170, 8, 110, 255, 70, 255], [35, 95, 60, 255, 40, 255]]
KELP = [[18, 40, 70, 255, 20, 170]]
CLOAK = [[95, 135, 25, 255, 25, 210], [170, 10, 90, 255, 30, 200]]
FOLIAGE = {
    'dinosaurs-land': {'*': {'hsv': GREEN}}, 'dinosaurs-portrait': {'*': {'hsv': GREEN}},
    # Plants: the hero frames are wreaths of leaves themselves; they stay still.
    'plants-land': {'*': {'hsv': LEAF, 'exclude': [[415, 0, 615, 150], [410, 395, 620, 572]]},
                    'topG': {'hsv': LEAF, 'exclude': [[415, 0, 615, 150]],
                              'fg_polys': [[[655, 10], [700, 0], [760, 0], [790, 20], [760, 45], [740, 55], [715, 60], [700, 75], [680, 90], [668, 85], [660, 60], [655, 35]]]}},
    'plants-portrait': {'*': {'hsv': LEAF, 'exclude': [[155, 105, 305, 270], [145, 755, 315, 920]]}},
    'basic-land': {'*': {'hsv': GREEN}, 'bushes': {'hsv': GREEN, 'exclude': [[470, 440, 770, 572]]}},
    'basic-portrait': {'*': {'hsv': GREEN}},
    # Sharks: thin kelp fronds only (no growing into the coral around them).
    'sharks-land': {'*': {'hsv': KELP, 'refine': 0}, 'kelpB': {'hsv': KELP, 'refine': 0, 'exclude': [[840, 420, 1024, 572]]}},
    'sharks-portrait': {'*': {'hsv': KELP, 'refine': 0}},
    'vampires-land': {'*': {'hsv': ROSES}, 'rosesL': {'hsv': ROSES, 'exclude': [[0, 330, 120, 440]]},
                      'rosesB': {'hsv': ROSES, 'exclude': [[395, 470, 610, 572]]}},
    'vampires-portrait': {'*': {'hsv': ROSES}},
    'lycanthropes-land': {'*': {'hsv': CLOAK}}, 'lycanthropes-portrait': {'*': {'hsv': CLOAK}},
}


def hsv_cut(img, box, ranges, exclude=(), close=2, min_area=30, hole=60):
    x0, y0, x1, y1 = box
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    m = np.zeros(img.shape[:2], np.uint8)
    for h0, h1, s0, s1, v0, v1 in ranges:
        if h0 <= h1:
            m |= cv2.inRange(hsv, (h0, s0, v0), (h1, s1, v1))
        else:
            m |= cv2.inRange(hsv, (h0, s0, v0), (180, s1, v1)) | cv2.inRange(hsv, (0, s0, v0), (h1, s1, v1))
    out = np.zeros(img.shape[:2], np.uint8)
    out[y0:y1, x0:x1] = (m[y0:y1, x0:x1] > 0)
    for e in exclude:
        out[e[1]:e[3], e[0]:e[2]] = 0
    out = cv2.morphologyEx(out, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * close + 1, 2 * close + 1)))
    out = cv2.morphologyEx(out, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(out, 8)
    keep = np.zeros_like(out)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] >= min_area:
            keep[lab == k] = 1
    n, lab, st, _ = cv2.connectedComponentsWithStats(1 - keep, 4)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] < hole:
            keep[lab == k] = 1
    keep[:y0] = 0; keep[y1:] = 0; keep[:, :x0] = 0; keep[:, x1:] = 0
    return keep


def load_defs():
    js = "import('./src/ui/board-fx-defs.js').then((m) => process.stdout.write(JSON.stringify(m.BOARD_FX)))"
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def board_path(key):
    name, orient = key.rsplit('-', 1)
    return os.path.join(ROOT, 'art', 'boards-v2' if orient == 'land' else 'boards-portrait', f'{name}.jpg')


def moving_items(d):
    """(item id, box, layer) for every piece of painting this board moves."""
    out = []
    for i, l in enumerate(d['layers']):
        if l['type'] == 'echo':
            out.append((l['id'], l['box'], l))
        elif l['type'] == 'crawlers':
            for k, b in enumerate(l['boxes']):
                out.append((f"{l.get('id', f'crawl{i}')}.{k}", b, l))
        elif l['type'] == 'warp':
            out.append((l.get('id', f'warp{i}'), l['box'], l))
    return out


class Matter:
    def __init__(self, model):
        import onnxruntime as ort
        self.s = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
        self.name = self.s.get_inputs()[0].name

    def __call__(self, rgb):
        """Salient-object matte (0..1, float) for an RGB crop."""
        h, w = rgb.shape[:2]
        x = cv2.resize(rgb, (1024, 1024), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
        x = (x - 0.5) / 1.0
        x = x.transpose(2, 0, 1)[None]
        y = self.s.run(None, {self.name: x})[0][0, 0]
        y = (y - y.min()) / max(1e-6, y.max() - y.min())
        return cv2.resize(y, (w, h), interpolation=cv2.INTER_LINEAR)


def rect(a, H, W):
    x0, y0, x1, y1 = [int(round(v)) for v in a]
    return max(0, x0), max(0, y0), min(W, x1), min(H, y1)


def grabcut(img, box, region, iters=6):
    """GrabCut started from the layer's box: inside is probably the object, outside the region surely not."""
    H, W = img.shape[:2]
    X0, Y0, X1, Y1 = region
    crop = img[Y0:Y1, X0:X1]
    x0, y0, x1, y1 = box
    m = np.zeros(crop.shape[:2], np.uint8)
    bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(crop, m, (x0 - X0, y0 - Y0, max(1, x1 - x0), max(1, y1 - y0)), bg, fg, iters, cv2.GC_INIT_WITH_RECT)
    full = np.zeros((H, W), np.float32)
    full[Y0:Y1, X0:X1] = ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD))
    return full


def bee_cut(img):
    """A bee on the comb: its dark stripes and pale wings, never the saturated gold of the comb."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.int32)
    s, v = hsv[..., 1], hsv[..., 2]
    m = ((v < 80) | ((s < 105) & (v > 110)) | ((s < 140) & (v < 130))).astype(np.uint8)
    # Closed so a bee is one piece; not opened, so its thin legs stay with it.
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))).astype(np.float32)


# How a layer's objects are cut when no hint names them: bees by their stripes, candles by their wax and flame.
CANDLE = {'method': 'hsv', 'hsv': [[3, 35, 35, 175, 100, 255]], 'close': 2, 'expand': 8}
DEFAULT_HINTS = {'bees-land/crawl': {'method': 'bee'}, 'bees-portrait/crawl': {'method': 'bee'},
                 'ghosts-land/candles': CANDLE, 'ghosts-portrait/candles': CANDLE}


def cut(img, box, matter, hint, layer, foliage=None, key='', iid=''):
    """The object in `box`: a hard mask (uint8) and a soft matte, or None."""
    H, W = img.shape[:2]
    if foliage:
        b = rect(box, H, W)
        hard = hsv_cut(img, b, foliage['hsv'], foliage.get('exclude', ()), close=foliage.get('close', 3), hole=foliage.get('hole', 400))
        if foliage.get('refine', 6):
            # The colour rule finds the bright of each leaf; GrabCut grows it to the leaf's whole shape
            # (its shaded side too) so no leaf is cut in two.
            k = np.ones((3, 3), np.uint8)
            m = np.full(hard.shape, cv2.GC_BGD, np.uint8)
            m[cv2.dilate(hard, k, iterations=foliage.get('refine', 6)) > 0] = cv2.GC_PR_BGD
            m[hard > 0] = cv2.GC_PR_FGD
            m[cv2.erode(hard, k, iterations=2) > 0] = cv2.GC_FGD
            x0, y0, x1, y1 = b
            sub = m[y0:y1, x0:x1].copy()
            if (sub == cv2.GC_FGD).any() and (sub == cv2.GC_BGD).any():
                cv2.grabCut(img[y0:y1, x0:x1], sub, None, np.zeros((1, 65)), np.zeros((1, 65)), 4, cv2.GC_INIT_WITH_MASK)
                hard = np.zeros_like(hard)
                hard[y0:y1, x0:x1] = (sub == cv2.GC_FGD) | (sub == cv2.GC_PR_FGD)
                for e in foliage.get('exclude', ()):
                    hard[e[1]:e[3], e[0]:e[2]] = 0
        for poly in foliage.get('fg_polys', ()):
            # Whole leaves the colours only half find (a big leaf with a shaded side).
            cv2.fillPoly(hard, [np.array(poly, np.int32)], 1)
        hard[:b[1]] = 0; hard[b[3]:] = 0; hard[:, :b[0]] = 0; hard[:, b[2]:] = 0
        if foliage.get('taken') is not None:
            hard[cv2.dilate(foliage['taken'], np.ones((3, 3), np.uint8), iterations=2) > 0] = 0
        return finish(img, hard, hard.astype(np.float32), 0.5, True) if hard.sum() else None
    x0, y0, x1, y1 = rect(box, H, W)
    bw, bh = x1 - x0, y1 - y0
    # The object may reach past its box (the box was only where the old copy was cut): allow a
    # margin around it, but keep only parts that reach into the box's middle.
    e = hint.get('expand', int(round(0.25 * max(bw, bh))))
    region = rect([x0 - e, y0 - e, x1 + e, y1 + e], H, W)
    X0, Y0, X1, Y1 = region
    sx0, sy0 = x0 + int(bw * 0.2), y0 + int(bh * 0.2)
    core = np.zeros((H, W), np.uint8)
    core[sy0:max(sy0 + 1, y1 - int(bh * 0.2)), sx0:max(sx0 + 1, x1 - int(bw * 0.2))] = 1
    method = hint.get('method', 'model')
    thr = hint.get('thr', 0.5)
    if method == 'model':
        # The model sees the box with some surroundings (more context makes it pick other things).
        pad = int(max(10, 0.4 * max(bw, bh), hint.get('expand', 0) + 10))
        cx0, cy0, cx1, cy1 = rect([x0 - pad, y0 - pad, x1 + pad, y1 + pad], H, W)
        full = np.zeros((H, W), np.float32)
        full[cy0:cy1, cx0:cx1] = matter(cv2.cvtColor(img[cy0:cy1, cx0:cx1], cv2.COLOR_BGR2RGB))
    elif method == 'grabcut':
        g = hint.get('rect')
        full = grabcut(img, rect(g, H, W) if g else (x0, y0, x1, y1), region)
    elif method == 'bee':
        full = bee_cut(img)
    elif method == 'hsv':
        full = hsv_cut(img, region, hint['hsv'], close=hint.get('close', 1), min_area=4, hole=hint.get('max_hole', 20)).astype(np.float32)
    elif method == 'poly':
        # Outlined by hand ('polys', image px), then snapped to the painted edges ('refine' px band).
        full = np.zeros((H, W), np.float32)
        for poly in hint.get('polys', []):
            cv2.fillPoly(full, [np.array(np.round(poly), np.int32)], 1.0)
        for cx, cy, rx, ry, *ang in hint.get('ellipses', []):
            cv2.ellipse(full, ((cx, cy), (2 * rx, 2 * ry), ang[0] if ang else 0), 1.0, -1)
        for poly in hint.get('holes', []):
            cv2.fillPoly(full, [np.array(np.round(poly), np.int32)], 0.0)
        rf = hint.get('refine', 0)
        if rf:
            k = np.ones((3, 3), np.uint8)
            inner = cv2.erode(full.astype(np.uint8), k, iterations=rf)
            outer = cv2.dilate(full.astype(np.uint8), k, iterations=rf)
            m = np.full((H, W), cv2.GC_BGD, np.uint8)
            m[outer > 0] = cv2.GC_PR_BGD
            m[full > 0] = cv2.GC_PR_FGD
            m[inner > 0] = cv2.GC_FGD
            ys, xs = np.nonzero(outer)
            a, b, c, d = max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5)
            sub = m[b:d, a:c].copy()
            cv2.grabCut(img[b:d, a:c], sub, None, np.zeros((1, 65)), np.zeros((1, 65)), 5, cv2.GC_INIT_WITH_MASK)
            full = np.zeros((H, W), np.float32)
            full[b:d, a:c] = (sub == cv2.GC_FGD) | (sub == cv2.GC_PR_FGD)
    elif method == 'disc':
        # Round things that spin (a gear, a galaxy): the disc that fills the box.
        full = np.zeros((H, W), np.float32)
        c = hint.get('center', ((x0 + x1) / 2, (y0 + y1) / 2))
        r = hint.get('radius', min(bw, bh) / 2 - 1)
        cv2.circle(full, (int(round(c[0])), int(round(c[1]))), int(round(r)), 1.0, -1)
    else:
        raise ValueError(method)
    if hint.get('within'):
        # Only where another cut (a hint of its own, e.g. the model's) also finds the object.
        w = cut(img, box, matter, hint['within'], layer, None, key, iid)
        full = full * (cv2.dilate(w['mask'], np.ones((3, 3), np.uint8), iterations=hint['within'].get('pad', 2)) if w else 0)
    allowed = np.zeros((H, W), np.float32)
    for r in hint.get('keep') or [region]:
        a, b, c, d = rect(r, H, W)
        allowed[b:d, a:c] = 1
    full *= allowed
    hard = (full >= thr).astype(np.uint8)
    for r in hint.get('bg', []):
        a, b, c, d = rect(r, H, W)
        hard[b:d, a:c] = 0
    # Keep the parts that reach into the box's middle (drop specks and neighbours), fill pinholes.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    keep = np.zeros_like(hard)
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] >= hint.get('min_area', 6) and (core[lab == k]).any():
            keep[lab == k] = 1
    hard = keep
    # Parts surely of the object, even where they don't touch the rest (a leg, a cord).
    for r in hint.get('fg', []):
        a, b, c, d = rect(r, H, W)
        hard[b:d, a:c] = 1
    for poly in hint.get('fg_polys', []):
        cv2.fillPoly(hard, [np.array(poly, np.int32)], 1)
    if hint.get('grow'):
        hard = cv2.dilate(hard, np.ones((3, 3), np.uint8), iterations=hint['grow'])
    n, lab, stats, _ = cv2.connectedComponentsWithStats((1 - hard).astype(np.uint8), 4)
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] < hint.get('max_hole', 20):
            hard[lab == k] = 1
    if hard.sum() == 0:
        return None
    return finish(img, hard, full, thr, method != 'model')


def finish(img, hard, full, thr, whole):
    # Soft 1px edge: the model's own values on the rim, solid inside.
    core = cv2.erode(hard, np.ones((3, 3), np.uint8))
    alpha = np.where(core > 0, 1.0, np.where(hard > 0, np.clip(full / max(thr, 1e-3), 0.55, 1.0), 0.0)).astype(np.float32)
    if whole:
        alpha = cv2.GaussianBlur(hard.astype(np.float32), (3, 3), 0.6) * hard
    # The patch: the object painted out, over the object plus a 2px rim.
    hole = cv2.dilate(hard, np.ones((3, 3), np.uint8), iterations=2)
    plate = cv2.inpaint(img, hole * 255, 5, cv2.INPAINT_TELEA)
    ys, xs = np.nonzero(hole)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    obj = np.dstack([img[by0:by1, bx0:bx1], (alpha[by0:by1, bx0:bx1] * 255).astype(np.uint8)])
    pa = cv2.GaussianBlur(hole.astype(np.float32), (3, 3), 0.7)
    pa = np.maximum(pa, hole * 1.0)  # solid over the hole, a soft rim outside it
    patch = np.dstack([plate[by0:by1, bx0:bx1], (pa[by0:by1, bx0:bx1] * 255).astype(np.uint8)])
    return {'box': [int(bx0), int(by0), int(bx1), int(by1)], 'obj': obj, 'patch': patch, 'mask': hard}


def pack(items):
    """Shelf-pack the objects and patches into one atlas; returns atlas and positions."""
    tiles = []
    for iid, it in items.items():
        tiles.append((iid, 'obj', it['obj']))
        tiles.append((iid, 'patch', it['patch']))
        if 'cover' in it:
            tiles.append((iid, 'cover', it['cover']))
    tiles.sort(key=lambda t: -t[2].shape[0])
    width = 1024
    x = y = shelf = 0
    pos = {}
    for iid, kind, t in tiles:
        h, w = t.shape[:2]
        if x + w + 1 > width:
            x, y, shelf = 0, y + shelf + 1, 0
        pos[(iid, kind)] = (x, y)
        x += w + 1
        shelf = max(shelf, h)
    atlas = np.zeros((y + shelf + 1, width, 4), np.uint8)
    for iid, kind, t in tiles:
        px, py = pos[(iid, kind)]
        atlas[py:py + t.shape[0], px:px + t.shape[1]] = t
    return atlas, pos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('keys', nargs='*')
    ap.add_argument('--model', default=os.environ.get('ISNET_MODEL'))
    ap.add_argument('--preview', help='write per-object review sheets into this folder')
    a = ap.parse_args()
    if not a.model:
        sys.exit('pass --model (the IS-Net onnx) or set ISNET_MODEL')
    defs = load_defs()
    matter = Matter(a.model)
    manifest = {}
    if os.path.exists(MANIFEST):
        txt = open(MANIFEST).read()
        manifest = json.loads(txt[txt.index('= {') + 2:txt.rindex('}') + 1])
    keys = a.keys or [k for k in defs if moving_items(defs[k])]
    os.makedirs(OUT_DIR, exist_ok=True)
    for key in keys:
        d = defs[key]
        img = cv2.imread(board_path(key))
        items = {}
        # Objects first, foliage after: a ripple never takes pixels that already belong to an object
        # (or to an earlier ripple), so nothing is drawn twice.
        taken = np.zeros(img.shape[:2], np.uint8)
        foliage_last = lambda x: (x[2]['type'] == 'warp' and bool(x[2].get('mask')), (x[1][2] - x[1][0]) * (x[1][3] - x[1][1]))
        order = sorted(moving_items(d), key=foliage_last)  # and the smaller ripples (kelp on an anchor) before the wide ones
        for iid, box, layer in order:
            fol = None
            if layer['type'] == 'warp' and layer.get('mask'):
                f = FOLIAGE.get(key, {})
                fol = f.get(iid, f.get('*'))
                if not fol:
                    sys.exit(f'{key}/{iid}: a foliage warp needs a FOLIAGE entry')
            hint = HINTS.get(f'{key}/{iid}') or DEFAULT_HINTS.get(f"{key}/{iid.split('.')[0]}", {})
            if fol:
                fol = dict(fol, taken=taken)
            r = cut(img, box, matter, hint, layer, fol, key, iid)
            if r:
                taken |= r['mask']
            if r and HINTS.get(f'{key}/{iid}', {}).get('cover'):
                # Scenery painted in front of the object (a cloud across a sun) stays in front of it.
                c = HINTS[f'{key}/{iid}']['cover']
                if 'polys' in c:
                    cm = np.zeros(img.shape[:2], np.uint8)
                    for poly in c['polys']:
                        cv2.fillPoly(cm, [np.array(poly, np.int32)], 1)
                else:
                    cm = hsv_cut(img, rect(c['area'], *img.shape[:2]), c['hsv'], close=1, min_area=20, hole=30)
                ys, xs = np.nonzero(cm)
                bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
                ca = cv2.GaussianBlur(cm.astype(np.float32), (3, 3), 0.7)[by0:by1, bx0:bx1]
                r['cover'] = np.dstack([img[by0:by1, bx0:bx1], (np.maximum(ca, cm[by0:by1, bx0:bx1]) * 255).astype(np.uint8)])
                r['cover_box'] = [int(bx0), int(by0), int(bx1), int(by1)]
            if r:
                items[iid] = r
            else:
                print(f'  {key}/{iid}: nothing found in the box', file=sys.stderr)
        if not items:
            manifest.pop(key, None)
            continue
        atlas, pos = pack(items)
        rel = f'art/boards-fx/objects/{key}.png'
        cv2.imwrite(os.path.join(ROOT, rel), atlas, [cv2.IMWRITE_PNG_COMPRESSION, 9])
        manifest[key] = {'src': rel, 'items': {}}
        for iid, it in items.items():
            e = {'box': it['box'], 'obj': list(pos[(iid, 'obj')]), 'patch': list(pos[(iid, 'patch')])}
            if 'cover' in it:
                e['cover'] = {'box': it['cover_box'], 'at': list(pos[(iid, 'cover')])}
            manifest[key]['items'][iid] = e
        print(f'{key}: {len(items)} objects')
        if a.preview:
            os.makedirs(os.path.join(a.preview, 'masks'), exist_ok=True)
            for iid, it in items.items():
                x0, y0, x1, y1 = it['box']
                pad = 10
                X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(img.shape[1], x1 + pad), min(img.shape[0], y1 + pad)
                orig = img[Y0:Y1, X0:X1].copy()
                over = orig.copy()
                m = it['mask'][Y0:Y1, X0:X1].astype(bool)
                over[~m] = (over[~m] * 0.25).astype(np.uint8)
                over[~m, 2] = np.clip(over[~m, 2] + 90, 0, 255)  # background tinted red
                pl = orig.copy()
                p = it['patch']
                al = p[..., 3:4] / 255.0
                py0, px0 = y0 - Y0, x0 - X0
                region = pl[py0:py0 + p.shape[0], px0:px0 + p.shape[1]]
                pl[py0:py0 + p.shape[0], px0:px0 + p.shape[1]] = (region * (1 - al) + p[..., :3] * al).astype(np.uint8)
                sheet = np.hstack([orig, over, pl])
                sc = max(1, int(220 / max(1, sheet.shape[0])))
                sheet = cv2.resize(sheet, (sheet.shape[1] * sc, sheet.shape[0] * sc), interpolation=cv2.INTER_NEAREST)
                cv2.imwrite(os.path.join(a.preview, f'{key}__{iid}.png'), sheet)
                cv2.imwrite(os.path.join(a.preview, 'masks', f'{key}__{iid}.png'), it['mask'] * 255)
    body = json.dumps(manifest, separators=(',', ':'), sort_keys=True)
    with open(MANIFEST, 'w') as f:
        f.write('// Generated by tools/board-objects.py: each living board\'s moving objects cut out of the painting\n'
                '// (obj: the object alone; patch: the board with it painted out), packed in one atlas per board.\n'
                '// { "<board>-land|portrait": { src, items: { id: { box, obj: [ax, ay], patch: [ax, ay] } } } }, image px. Do not edit.\n'
                f'export const BOARD_OBJECTS = {body};\n')


if __name__ == '__main__':
    main()
