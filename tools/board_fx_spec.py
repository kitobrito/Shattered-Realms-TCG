# What tools/board-fx.py cuts from each living board (image px: landscape 1024x572,
# portrait 459x1024). See that file for the rules and options.
FULL_L = [[0, 0, 1024, 572]]
FULL_P = [[0, 0, 459, 1024]]

SPEC = {
    # ---- Ice Age: a half-thawed tundra ----
    'ice-age-land': {
        # Dry grass tufts all over the dirt: each tuft sways on its own.
        'grass': ['straw', FULL_L, {'hp': [3, 1, 0.03, 0.12], 'split': {'join': 3, 'min': 8, 'max': 60}, 'show': [255, 230, 0],
                  'exclude': [[40, 15, 205, 165], [60, 428, 230, 556], [800, 405, 990, 548], [862, 5, 985, 132]]}],
        # Bare twigs and thorn bushes, one box each (thin dark strokes inside it).
        'twigs': ['twig', [[740, 28, 812, 92], [598, 88, 722, 142], [826, 8, 858, 42], [898, 155, 972, 202], [958, 122, 1024, 205],
                           [788, 198, 862, 232], [38, 312, 102, 368], [0, 362, 58, 438], [198, 282, 242, 338], [278, 455, 352, 512],
                           [183, 508, 252, 572], [428, 472, 492, 512], [372, 528, 418, 572], [300, 0, 345, 28], [228, 74, 262, 106],
                           [118, 170, 160, 205], [920, 355, 1000, 400], [965, 520, 1024, 572], [560, 520, 620, 572]],
                  {'hp': [3, -1, 0.06, 0.16], 'thin': 3, 'split': {'join': 3, 'min': 12, 'max': 90}, 'show': [255, 60, 60]}],
        # The frozen streams and pools: light shifting under the ice.
        'stream': ['ice', [[245, 0, 515, 140], [0, 175, 255, 345], [925, 195, 1024, 255]], {'blur': 0.8, 'scale': 0.5, 'show': [0, 160, 255]}],
        # Snow: sparkles land only on snow; a slow sheen of sunlight crosses it.
        'snow': ['snow', FULL_L, {'scale': 0.5, 'show': [200, 200, 200], 'exclude': [[245, 0, 515, 140], [0, 175, 255, 345]]}],
        # Corners.
        'crystal': ['crystal', [[862, 5, 985, 132]], {'blur': 0.6, 'show': [255, 0, 255]}],
        'bone': ['bone', [[40, 15, 205, 165]], {'show': [255, 255, 160]}],
        'hands': ['ochre', [[845, 425, 965, 545]], {'grow': 1, 'blur': 0.8, 'show': [0, 255, 0]}],
        'rock': ['stone', [[805, 410, 988, 548]], {'exclude': [[845, 425, 965, 510]], 'show': [120, 120, 255]}],
    },
    'ice-age-portrait': {
        'grass': ['straw', FULL_P, {'hp': [3, 1, 0.03, 0.12], 'split': {'join': 3, 'min': 8, 'max': 50}, 'show': [255, 230, 0],
                  'exclude': [[18, 10, 114, 102], [24, 258, 130, 340], [376, 4, 452, 82], [372, 584, 459, 664], [18, 940, 102, 1016], [356, 930, 448, 1010]]}],
        'twigs': ['twig', [[172, 0, 202, 16], [308, 26, 346, 56], [248, 54, 320, 86], [398, 84, 459, 122], [344, 118, 386, 136], [18, 188, 56, 226],
                           [0, 220, 32, 272], [114, 174, 136, 206], [64, 102, 92, 124], [28, 92, 56, 110], [158, 278, 186, 312], [224, 288, 262, 312],
                           [348, 364, 382, 396], [414, 424, 459, 466], [28, 448, 52, 466], [0, 526, 22, 558], [44, 596, 74, 628], [64, 640, 96, 672],
                           [114, 618, 152, 642], [268, 730, 326, 758], [334, 700, 366, 728], [408, 762, 459, 800], [20, 772, 56, 792], [0, 862, 32, 904],
                           [0, 922, 26, 944], [134, 956, 152, 984], [378, 852, 402, 884], [448, 902, 459, 928]],
                  {'hp': [3, -1, 0.06, 0.16], 'thin': 3, 'split': {'join': 3, 'min': 10, 'max': 70}, 'show': [255, 60, 60]}],
        'stream': ['ice', [[135, 0, 268, 88], [0, 108, 142, 202], [0, 452, 102, 512], [0, 788, 118, 884], [398, 800, 459, 842]], {'blur': 0.8, 'scale': 0.5, 'show': [0, 160, 255]}],
        'snow': ['snow', FULL_P, {'scale': 0.5, 'show': [200, 200, 200], 'exclude': [[135, 0, 268, 88], [0, 108, 142, 202], [0, 788, 118, 884]]}],
        'crystal': ['crystal', [[376, 4, 452, 82]], {'blur': 0.6, 'show': [255, 0, 255]}],
        'bone': ['bone', [[18, 10, 114, 102]], {'show': [255, 255, 160]}],
        'hands': ['ochre', [[384, 592, 459, 640], [368, 940, 440, 990]], {'grow': 1, 'blur': 0.8, 'show': [0, 255, 0]}],
        'rock': ['stone', [[372, 584, 459, 664], [356, 930, 448, 1010]], {'exclude': [[384, 592, 459, 640], [368, 940, 440, 990]], 'show': [120, 120, 255]}],
    },
    # ---- Acidic: an acid cavern ----
    'acidic-land': {
        'pools': ['acid', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [0, 255, 0]}],
        'glow': ['acidglow', FULL_L, {'blur': 1, 'show': [255, 255, 0]}],
        'crystal': ['acidglow', [[880, 400, 1000, 548]], {'blur': 0.6, 'show': [255, 0, 255]}],
        'flask': ['acid', [[40, 10, 122, 126]], {'blur': 0.6, 'show': [0, 255, 255]}],
    },
    'acidic-portrait': {
        'pools': ['acid', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [0, 255, 0]}],
        'glow': ['acidglow', FULL_P, {'blur': 1, 'show': [255, 255, 0]}],
        'crystal': ['acidglow', [[368, 556, 436, 694], [356, 886, 436, 1014]], {'blur': 0.6, 'show': [255, 0, 255]}],
        'flask': ['acid', [[28, 22, 88, 108]], {'blur': 0.6, 'show': [0, 255, 255]}],
    },
    # ---- Aliens: a crashed hive ship ----
    'aliens-land': {
        'veins': ['biolum', FULL_L, {'hp': [4, 1, 0.03, 0.12], 'blur': 0.6, 'show': [0, 255, 255]}],
        'bulb': ['bright', [[880, 0, 1024, 95]], {'blur': 0.8, 'show': [255, 255, 0]}],
        'sac': ['any', [[812, 396, 934, 506]], {'hp': [6, 1, 0.02, 0.12], 'blur': 1, 'show': [255, 255, 0]}],
    },
    'aliens-portrait': {
        'veins': ['biolum', FULL_P, {'hp': [4, 1, 0.03, 0.12], 'blur': 0.6, 'show': [0, 255, 255]}],
        'bulb': ['bright', [[360, 15, 450, 115]], {'blur': 0.8, 'show': [255, 255, 0]}],
        'sac': ['any', [[312, 846, 436, 974]], {'hp': [6, 1, 0.02, 0.12], 'blur': 1, 'show': [255, 255, 0]}],
    },
    # ---- Bees: inside a giant hive ----
    'bees-land': {
        'honey': ['honey', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [255, 120, 0]}],
        'comb': ['bright', FULL_L, {'hp': [3, 1, 0.04, 0.12], 'scale': 0.5, 'show': [255, 255, 255], 'exclude': [[860, 10, 1000, 150]]}],
        'jar': ['honey', [[48, 440, 128, 548]], {'blur': 0.6, 'show': [255, 0, 255]}],
    },
    'bees-portrait': {
        'honey': ['honey', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [255, 120, 0]}],
        'comb': ['bright', FULL_P, {'hp': [3, 1, 0.04, 0.12], 'scale': 0.5, 'show': [255, 255, 255], 'exclude': [[330, 10, 450, 150]]}],
        'jar': ['honey', [[30, 890, 104, 990]], {'blur': 0.6, 'show': [255, 0, 255]}],
    },
    # ---- Demons: the shore of a lake of fire ----
    'demons-land': {
        'lava': ['lava', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [255, 120, 0], 'exclude': [[820, 400, 952, 522], [835, 15, 950, 128]]}],
        'hot': ['lavahot', FULL_L, {'blur': 1, 'scale': 0.5, 'show': [255, 255, 0], 'exclude': [[820, 400, 952, 522], [835, 15, 950, 128]]}],
        'cauldron': ['lava', [[828, 410, 944, 470]], {'blur': 0.6, 'show': [255, 0, 255]}],
        'book': ['any', [[66, 412, 182, 545]], {'hp': [4, 1, 0.04, 0.14], 'show': [0, 255, 255]}],
    },
    'demons-portrait': {
        'lava': ['lava', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [255, 120, 0], 'exclude': [[322, 852, 428, 952], [338, 36, 434, 120]]}],
        'hot': ['lavahot', FULL_P, {'blur': 1, 'scale': 0.5, 'show': [255, 255, 0], 'exclude': [[322, 852, 428, 952], [338, 36, 434, 120]]}],
        'cauldron': ['lava', [[330, 860, 420, 905]], {'blur': 0.6, 'show': [255, 0, 255]}],
        'book': ['any', [[46, 858, 158, 992]], {'hp': [4, 1, 0.04, 0.14], 'show': [0, 255, 255]}],
    },
    # ---- Dinosaurs: a prehistoric riverbank ----
    'dinosaurs-land': {
        'leaves': ['leaf', FULL_L, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0], 'exclude': [[40, 36, 150, 128]]}],
        'river': ['riverpale', [[420, 0, 640, 95], [560, 60, 1024, 205]], {'blur': 0.8, 'scale': 0.5, 'show': [0, 160, 255]}],
        'lava': ['lava', [[700, 0, 790, 40], [900, 460, 980, 530]], {'blur': 0.6, 'show': [255, 120, 0]}],
    },
    'dinosaurs-portrait': {
        'leaves': ['leaf', FULL_P, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0], 'exclude': [[36, 46, 144, 152]]}],
        'river': ['water', [[310, 240, 459, 700]], {'blur': 0.8, 'scale': 0.5, 'show': [0, 160, 255]}],
        'lava': ['lava', [[340, 880, 410, 950]], {'blur': 0.6, 'show': [255, 120, 0]}],
    },
    # ---- Divine: a temple above the clouds ----
    'divine-land': {
        'gold': ['gold', FULL_L, {'blur': 0.6, 'scale': 0.5, 'show': [255, 200, 0]}],
        'star': ['bright', [[880, 430, 1006, 556]], {'blur': 0.6, 'show': [255, 0, 255]}],
    },
    'divine-portrait': {
        'gold': ['gold', FULL_P, {'blur': 0.6, 'scale': 0.5, 'show': [255, 200, 0]}],
        'star': ['bright', [[338, 878, 446, 1002]], {'blur': 0.6, 'show': [255, 0, 255]}],
    },
    # ---- Dragons: a dragon's volcanic lair ----
    'dragons-land': {
        'lava': ['lava', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [255, 120, 0], 'exclude': [[20, 400, 140, 545], [815, 10, 950, 140]]}],
        'coins': ['gold', FULL_L, {'scale': 0.5, 'show': [255, 220, 0], 'exclude': [[420, 0, 600, 150], [420, 400, 600, 572]]}],
        'egg': ['any', [[48, 418, 156, 545]], {'hp': [5, 1, 0.03, 0.12], 'show': [255, 0, 255]}],
        'fire': ['bright', [[830, 10, 940, 120]], {'blur': 0.8, 'show': [0, 160, 255]}],
    },
    'dragons-portrait': {
        'lava': ['lava', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [255, 120, 0], 'exclude': [[30, 860, 130, 990], [330, 20, 440, 150]]}],
        'coins': ['gold', FULL_P, {'scale': 0.5, 'show': [255, 220, 0], 'exclude': [[150, 0, 310, 150], [150, 780, 310, 920]]}],
        'egg': ['any', [[36, 870, 124, 990]], {'hp': [5, 1, 0.03, 0.12], 'show': [255, 0, 255]}],
        'fire': ['bright', [[336, 25, 432, 120]], {'blur': 0.8, 'show': [0, 160, 255]}],
    },
    # ---- Fungus: a glowing fungal cavern ----
    'fungus-land': {
        'violet': ['violet', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [255, 0, 255]}],
        'teal': ['biolum', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [0, 255, 255]}],
        'orange': ['honey', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [255, 140, 0]}],
        'threads': ['bright', FULL_L, {'hp': [3, 1, 0.05, 0.16], 'scale': 0.5, 'show': [255, 255, 255], 'exclude': [[0, 0, 1024, 140]]}],
    },
    'fungus-portrait': {
        'violet': ['violet', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [255, 0, 255]}],
        'teal': ['biolum', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [0, 255, 255]}],
        'orange': ['honey', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [255, 140, 0]}],
        'threads': ['bright', FULL_P, {'hp': [3, 1, 0.05, 0.16], 'scale': 0.5, 'show': [255, 255, 255], 'exclude': [[0, 0, 459, 130]]}],
    },
    # ---- Lycanthropes: a moonlit forest clearing ----
    'lycanthropes-land': {
        'grass': ['grass', [[150, 120, 900, 520]], {'hp': [2, 1, 0.03, 0.1], 'split': {'join': 2, 'min': 10, 'max': 45}, 'show': [0, 255, 0]}],
        'moon': ['bright', [[100, 35, 180, 110]], {'blur': 1, 'show': [255, 255, 0]}],
        'cloak': ['any', [[778, 392, 968, 508]], {'show': [255, 0, 255]}],
    },
    'lycanthropes-portrait': {
        'grass': ['grass', [[60, 120, 380, 760]], {'hp': [2, 1, 0.03, 0.1], 'split': {'join': 2, 'min': 10, 'max': 40}, 'show': [0, 255, 0]}],
        'moon': ['bright', [[35, 30, 105, 95]], {'blur': 1, 'show': [255, 255, 0]}],
        'cloak': ['any', [[52, 792, 132, 952]], {'show': [255, 0, 255]}],
    },
    # ---- Plants: an overgrown garden ----
    'plants-land': {
        'leaves': ['leaf', FULL_L, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0], 'exclude': [[440, 20, 590, 140], [440, 410, 590, 555]]}],
        'pond': ['water', [[790, 420, 1024, 572]], {'blur': 0.8, 'show': [0, 160, 255]}],
        'flower': ['any', [[52, 26, 206, 172]], {'show': [255, 0, 255]}],
    },
    'plants-portrait': {
        'leaves': ['leaf', FULL_P, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0], 'exclude': [[160, 100, 300, 260], [155, 760, 305, 910]]}],
        'pond': ['water', [[300, 830, 459, 1000]], {'blur': 0.8, 'show': [0, 160, 255]}],
        'flower': ['any', [[30, 112, 136, 220]], {'show': [255, 0, 255]}],
    },
    # ---- Radioactive: an abandoned nuclear plant ----
    'radioactive-land': {
        'sludge': ['acid', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [0, 255, 0]}],
        'hot': ['acidglow', FULL_L, {'blur': 1, 'scale': 0.5, 'show': [255, 255, 0]}],
        'lamp': ['warmlight', [[790, 40, 900, 200]], {'blur': 1, 'show': [255, 160, 0]}],
    },
    'radioactive-portrait': {
        'sludge': ['acid', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [0, 255, 0]}],
        'hot': ['acidglow', FULL_P, {'blur': 1, 'scale': 0.5, 'show': [255, 255, 0]}],
        'lamp': ['warmlight', [[360, 70, 440, 180]], {'blur': 1, 'show': [255, 160, 0]}],
    },
    # ---- Robots: a steampunk robot foundry ----
    'robots-land': {
        'tracks': ['blueglow', [[340, 80, 690, 572]], {'blur': 0.6, 'show': [0, 160, 255]}],
        'furnace': ['warmlight', [[880, 180, 980, 330], [700, 0, 760, 80], [300, 10, 340, 70]], {'blur': 1, 'show': [255, 120, 0]}],
    },
    'robots-portrait': {
        'tracks': ['blueglow', [[50, 50, 410, 920]], {'blur': 0.6, 'show': [0, 160, 255]}],
        'furnace': ['warmlight', [[110, 0, 140, 40], [340, 0, 370, 40]], {'blur': 1, 'show': [255, 120, 0]}],
    },
    # ---- Sharks: a sunlit shallow sea ----
    'sharks-land': {
        'caustics': ['bright', FULL_L, {'hp': [4, 1, 0.04, 0.14], 'scale': 0.5, 'show': [255, 255, 255]}],
        'water': ['biolum', FULL_L, {'blur': 1, 'scale': 0.5, 'show': [0, 200, 255]}],
        'kelp': ['grass', FULL_L, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0]}],
        'pearl': ['bright', [[140, 440, 172, 476]], {'blur': 0.6, 'show': [255, 0, 255]}],
    },
    'sharks-portrait': {
        'caustics': ['bright', FULL_P, {'hp': [4, 1, 0.04, 0.14], 'scale': 0.5, 'show': [255, 255, 255]}],
        'water': ['biolum', FULL_P, {'blur': 1, 'scale': 0.5, 'show': [0, 200, 255]}],
        'kelp': ['grass', FULL_P, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0]}],
        'pearl': ['bright', [[64, 908, 92, 936]], {'blur': 0.6, 'show': [255, 0, 255]}],
    },
    # ---- Ultraterrestrials: an impossible pocket dimension ----
    'ultraterrestrials-land': {
        'plane': ['bright', FULL_L, {'blur': 1.5, 'scale': 0.5, 'show': [255, 255, 255]}],
        'stars': ['bright', FULL_L, {'hp': [2, 1, 0.15, 0.35], 'show': [255, 255, 0]}],
        'crystal': ['any', [[64, 398, 176, 528]], {'hp': [4, 1, 0.03, 0.12], 'blur': 0.6, 'show': [255, 0, 255]}],
    },
    'ultraterrestrials-portrait': {
        'plane': ['bright', FULL_P, {'blur': 1.5, 'scale': 0.5, 'show': [255, 255, 255]}],
        'stars': ['bright', FULL_P, {'hp': [2, 1, 0.15, 0.35], 'show': [255, 255, 0]}],
        'crystal': ['any', [[40, 820, 140, 940]], {'hp': [4, 1, 0.03, 0.12], 'blur': 0.6, 'show': [255, 0, 255]}],
    },
    # ---- Vampires: a gothic courtyard under a red moon ----
    'vampires-land': {
        'blood': ['blood', FULL_L, {'blur': 0.8, 'scale': 0.5, 'show': [255, 0, 0], 'exclude': [[380, 0, 640, 30]]}],
        'roses': ['roses', FULL_L, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0]}],
        'moon': ['any', [[380, 0, 640, 40]], {'hp': [6, 1, 0.02, 0.1], 'blur': 1, 'show': [255, 255, 0]}],
    },
    'vampires-portrait': {
        'blood': ['blood', FULL_P, {'blur': 0.8, 'scale': 0.5, 'show': [255, 0, 0], 'exclude': [[120, 0, 340, 60]]}],
        'roses': ['roses', FULL_P, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 255, 0]}],
        'moon': ['any', [[120, 0, 340, 70]], {'hp': [6, 1, 0.02, 0.1], 'blur': 1, 'show': [255, 255, 0]}],
    },
    # ---- Void: a floating island in deep space ----
    'void-land': {
        'nebula': ['violet', FULL_L, {'blur': 1.5, 'scale': 0.5, 'show': [255, 0, 255]}],
        'stars': ['bright', FULL_L, {'hp': [2, 1, 0.15, 0.35], 'show': [255, 255, 0]}],
        'cracks': ['bright', [[200, 120, 820, 470]], {'hp': [2, 1, 0.1, 0.3], 'show': [0, 255, 255]}],
    },
    'void-portrait': {
        'nebula': ['violet', FULL_P, {'blur': 1.5, 'scale': 0.5, 'show': [255, 0, 255]}],
        'stars': ['bright', FULL_P, {'hp': [2, 1, 0.15, 0.35], 'show': [255, 255, 0]}],
        'cracks': ['bright', [[60, 180, 400, 840]], {'hp': [2, 1, 0.1, 0.3], 'show': [0, 255, 255]}],
    },
    # ---- Zombies: a misty graveyard at night ----
    'zombies-land': {
        'mist': ['mist', FULL_L, {'blur': 2, 'scale': 0.5, 'show': [0, 255, 120]}],
        'lantern': ['warmlight', [[900, 60, 976, 176]], {'blur': 1, 'show': [255, 160, 0]}],
    },
    'zombies-portrait': {
        'mist': ['mist', FULL_P, {'blur': 2, 'scale': 0.5, 'show': [0, 255, 120]}],
        'lantern': ['bright', [[380, 50, 422, 120]], {'blur': 1, 'show': [255, 160, 0]}],
    },
    # ---- The Circles of Hell (new paintings) ----
    'circle1-land': {
        'fog': ['fogpale', FULL_L, {'blur': 2, 'scale': 0.5, 'exclude': [[0, 0, 1024, 60]]}],
    },
    'circle1-portrait': {
        'fog': ['fogpale', FULL_P, {'blur': 2, 'scale': 0.5, 'exclude': [[0, 0, 459, 90]]}],
    },
    'circle2-land': {
        'storm': ['violet', FULL_L, {'blur': 1.5, 'scale': 0.5}],
        'bolts': ['bolt', FULL_L, {'blur': 0.6}],
    },
    'circle2-portrait': {
        'storm': ['violet', FULL_P, {'blur': 1.5, 'scale': 0.5}],
        'bolts': ['bolt', FULL_P, {'blur': 0.6}],
    },
    'circle3-land': {
        'puddles': ['puddle', FULL_L, {'blur': 1, 'scale': 0.5, 'exclude': [[0, 0, 1024, 150]]}],
    },
    'circle3-portrait': {
        'puddles': ['puddle', FULL_P, {'blur': 1, 'scale': 0.5, 'exclude': [[0, 0, 459, 200]]}],
    },
    'circle4-land': {
        'gold': ['gold', FULL_L, {'scale': 0.5}],
        'molten': ['lavahot', FULL_L, {'blur': 1, 'scale': 0.5}],
        'lava': ['lava', FULL_L, {'blur': 0.8, 'scale': 0.5}],
    },
    'circle4-portrait': {
        'gold': ['gold', FULL_P, {'scale': 0.5}],
        'molten': ['lavahot', FULL_P, {'blur': 1, 'scale': 0.5}],
        'lava': ['lava', FULL_P, {'blur': 0.8, 'scale': 0.5}],
    },
    'circle5-land': {
        'swamp': ['swamp', FULL_L, {'blur': 1.5, 'scale': 0.5}],
    },
    'circle5-portrait': {
        'swamp': ['swamp', FULL_P, {'blur': 1.5, 'scale': 0.5}],
    },
    'circle6-land': {
        'fire': ['fire', FULL_L, {'blur': 1}],
        'lava': ['lava', FULL_L, {'blur': 0.8, 'scale': 0.5}],
    },
    'circle6-portrait': {
        'fire': ['fire', FULL_P, {'blur': 1}],
        'lava': ['lava', FULL_P, {'blur': 0.8, 'scale': 0.5}],
    },
    'circle7-land': {
        'lava': ['lava', FULL_L, {'blur': 0.8, 'scale': 0.5}],
        'blood': ['blood', FULL_L, {'blur': 0.8}],
    },
    'circle7-portrait': {
        'lava': ['lava', FULL_P, {'blur': 0.8, 'scale': 0.5}],
        'blood': ['blood', FULL_P, {'blur': 0.8}],
    },
    'circle8-land': {
        'green': ['acid', FULL_L, {'blur': 1, 'scale': 0.5}],
        'lava': ['lava', FULL_L, {'blur': 0.8, 'scale': 0.5}],
        'gold': ['gold', FULL_L, {'blur': 0.6}],
    },
    'circle8-portrait': {
        'green': ['acid', FULL_P, {'blur': 1, 'scale': 0.5}],
        'lava': ['lava', FULL_P, {'blur': 0.8, 'scale': 0.5}],
        'gold': ['gold', FULL_P, {'blur': 0.6}],
    },
    'circle9-land': {
        'ice': ['ice', FULL_L, {'blur': 1, 'scale': 0.5}],
        'snow': ['snow', FULL_L, {'scale': 0.5}],
    },
    'circle9-portrait': {
        'ice': ['ice', FULL_P, {'blur': 1, 'scale': 0.5}],
        'snow': ['snow', FULL_P, {'scale': 0.5}],
    },
    # ---- Basic: a quiet hilltop that belongs to no realm ----
    'basic-land': {
        'grass': ['grass', [[0, 0, 1024, 572]], {'hp': [2, 1, 0.03, 0.1], 'split': {'join': 2, 'min': 10, 'max': 40}, 'show': [0, 255, 0], 'exclude': [[0, 400, 210, 572], [480, 430, 740, 572], [820, 380, 1024, 572]]}],
        'leaves': ['leaf', FULL_L, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 200, 0]}],
    },
    'basic-portrait': {
        'grass': ['grass', [[0, 0, 459, 1024]], {'hp': [2, 1, 0.03, 0.1], 'split': {'join': 2, 'min': 10, 'max': 40}, 'show': [0, 255, 0], 'exclude': [[0, 880, 120, 1024], [200, 900, 459, 1024]]}],
        'leaves': ['leaf', FULL_P, {'grow': 2, 'blur': 1, 'scale': 0.5, 'show': [0, 200, 0]}],
    },
    # ---- Eels: a flooded river cave lit by its own electricity ----
    'eels-land': {
        # The glowing shallows (caustics, flow and sheen are kept to these pixels).
        'water': ['eelwater', [[250, 170, 820, 540], [0, 240, 260, 340]], {'blur': 0.8, 'scale': 0.5, 'show': [0, 200, 255]}],
        # The painted streaks of light in the water: light glides along them (never flashes).
        'cracks': ['bolt', [[430, 185, 710, 410]], {'blur': 0.5, 'show': [255, 255, 255]}],
        # The blue cave fungus, one mask per cluster so each breathes on its own.
        'shroom1': ['biolum', [[335, 10, 402, 68]], {'grow': 1, 'blur': 0.6, 'show': [0, 255, 255]}],
        'shroom2': ['biolum', [[402, 82, 445, 112]], {'grow': 1, 'blur': 0.6, 'show': [0, 200, 255]}],
        'shroom3': ['biolum', [[455, 25, 585, 52]], {'grow': 1, 'blur': 0.6, 'show': [80, 255, 255]}],
        'shroom4': ['biolum', [[720, 5, 765, 40]], {'grow': 1, 'blur': 0.6, 'show': [0, 160, 255]}],
        'shroom5': ['biolum', [[795, 50, 835, 80]], {'grow': 1, 'blur': 0.6, 'show': [0, 120, 255]}],
        'shroom6': ['biolum', [[700, 72, 728, 98]], {'grow': 1, 'blur': 0.6, 'show': [120, 200, 255]}],
        # The glass insulators on the post (top right).
        'glass': ['biolum', [[865, 5, 1010, 160]], {'grow': 1, 'blur': 0.6, 'show': [0, 255, 160]}],
        # The sparks off the water-wheel.
        'sparks': ['fire', [[800, 370, 1000, 500]], {'grow': 1, 'blur': 0.5, 'show': [255, 140, 0]}],
    },
    'eels-portrait': {
        'water': ['eelwater', [[0, 230, 350, 1000], [140, 40, 260, 220]], {'blur': 0.8, 'scale': 0.5, 'show': [0, 200, 255]}],
        'cracks': ['bolt', [[170, 470, 340, 730]], {'blur': 0.5, 'show': [255, 255, 255]}],
        # The blue cave fungus down the right-hand wall, one mask per cluster.
        'shroom1': ['biolum', [[425, 325, 459, 392]], {'grow': 1, 'blur': 0.6, 'show': [0, 255, 255]}],
        'shroom2': ['biolum', [[378, 392, 416, 432]], {'grow': 1, 'blur': 0.6, 'show': [0, 200, 255]}],
        'shroom3': ['biolum', [[385, 498, 459, 582]], {'grow': 1, 'blur': 0.6, 'show': [80, 255, 255]}],
        'shroom4': ['biolum', [[400, 688, 459, 746]], {'grow': 1, 'blur': 0.6, 'show': [0, 160, 255]}],
        'shroom5': ['biolum', [[402, 792, 446, 822]], {'grow': 1, 'blur': 0.6, 'show': [0, 120, 255]}],
        'sparks': ['fire', [[300, 800, 459, 920]], {'grow': 1, 'blur': 0.5, 'show': [255, 140, 0]}],
    },
}
