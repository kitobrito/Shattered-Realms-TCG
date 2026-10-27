#!/usr/bin/env python3
"""Cut out the boards' moving corner props and paint clean plates without them.

A board prop whose fx moves the painted object itself (sway, bob, wobble, spin, peck, crawl)
needs two images so only the object moves, never a rectangle of background:
  art/board-props/<board>-<land|portrait>-<i>.png   the object alone (RGBA, soft 1px edge)
  art/boards-v2/<board>-plate.jpg / art/boards-portrait/<board>-plate.jpg
                                                     the board with the object painted out
and an entry in src/cards/board-cuts.js (BOARD_CUTS[orientation][faction]).

  python3 tools/board-props.py <Faction> [land|portrait] [prop index ...]
Hints per prop (in HINTS below) fix up what the automatic cut gets wrong: extra rectangles
that are surely the object (fg) or surely background (bg), in image pixels.
"""
import json, os, re, subprocess, sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOVING = {'sway', 'bob', 'wobble', 'spin', 'peck', 'crawl'}
# (faction, orientation, prop index) -> {'fg': [[x0,y0,x1,y1]...], 'bg': [...], 'pad': px}
HINTS = {
    # Ice Age: the mammoth skull, top left (cranium, snout bone, lower tusk, curved tusk).
    ('Ice Age', 'land', 0): {'regions': [[38, 12, 106, 96], [80, 44, 153, 119], [104, 106, 141, 164], [140, 52, 204, 109]],
                             'bg': [[132, 26, 172, 52]], 'light': 125, 'warm': 8, 'fill_from': [[0, 150], [0, 170], [150, 150]]},
    ('Ice Age', 'portrait', 0): {'regions': [[20, 10, 72, 60], [48, 28, 92, 74], [66, 66, 87, 101], [84, 36, 127, 72]],
                                 'bg': [[80, 18, 106, 38]], 'light': 125, 'warm': 8, 'fill_from': [[0, 110], [0, 130], [110, 120]]},
    # Void: the bitten planet (top left) and the crescent moon on its rock (bottom left).
    # Lycanthropes: the broken chains and shackles (top right) and the wolf skull (bottom left).
    ('Lycanthropes', 'land', 1): {'regions': [[812, 42, 918, 100], [905, 30, 964, 80], [905, 82, 964, 138], [855, 104, 898, 162]],
                                  'fg': [[913, 45, 919, 70], [921, 41, 950, 46], [947, 46, 957, 56], [884, 110, 893, 114]],
                                  'light': 115, 'close': 3, 'fill_holes': False, 'min_area': 12},
    ('Lycanthropes', 'land', 2): {'regions': [[44, 414, 182, 552]], 'light': 130},
    ('Lycanthropes', 'portrait', 1): {'regions': [[314, 32, 393, 76], [380, 27, 411, 59], [378, 61, 421, 100], [348, 77, 376, 119]],
                                      'fg': [[385, 34, 390, 52], [390, 30, 404, 34]], 'light': 115, 'close': 3, 'fill_holes': False, 'min_area': 8},
    ('Lycanthropes', 'portrait', 2): {'regions': [[20, 924, 101, 1004]], 'light': 130},
    # Sharks: the circling fin (top left) and the weed-wrapped anchor (top right).
    ('Sharks', 'land', 1): {'refine': 7, 'sea': True, 'max_hole': 250, 'polys': [
        [[911, 27], [919, 18], [984, 68], [978, 77]],                     # stock
        [[949, 9], [983, 9], [984, 43], [949, 43]],                       # ring
        [[931, 50], [949, 62], [905, 130], [883, 118]],                   # shank
        [[859, 71], [876, 55], [882, 89], [899, 116], [885, 134], [861, 118]],  # left fluke
        [[877, 116], [910, 132], [970, 119], [974, 124], [955, 151], [909, 147], [879, 144]],  # bottom arm, right fluke
        ], 'soft_polys': [  # seaweed: only suggested, the colours decide
        [[933, 38], [946, 38], [946, 106], [933, 106]], [[955, 53], [973, 53], [973, 103], [955, 103]],
        [[908, 131], [939, 131], [939, 181], [908, 181]], [[895, 93], [918, 93], [918, 127], [895, 127]]]},
    ('Sharks', 'portrait', 0): {'refine': 5, 'sea': True, 'polys': [[[58, 39], [66, 40], [83, 58], [96, 78], [105, 99], [80, 100], [59, 91], [57, 62]]]},
    ('Sharks', 'portrait', 1): {'refine': 5, 'sea': True, 'max_hole': 120, 'polys': [
        [[390, 32], [398, 23], [451, 60], [444, 71]],                     # stock
        [[422, 16], [446, 16], [446, 41], [422, 41]],                     # ring
        [[404, 45], [419, 56], [384, 119], [369, 110]],                   # shank
        [[339, 74], [352, 57], [361, 82], [373, 108], [362, 125], [344, 111]],  # left fluke
        [[354, 107], [385, 127], [440, 111], [443, 118], [425, 137], [385, 141], [357, 129]],  # bottom arm, right fluke
        ], 'soft_polys': [
        [[406, 39], [422, 39], [422, 101], [406, 101]], [[428, 49], [444, 49], [444, 91], [428, 91]],
        [[386, 121], [408, 121], [408, 167], [386, 167]], [[372, 93], [392, 93], [392, 123], [372, 123]]]},
    ('Void', 'land', 0): {'regions': [[36, 18, 120, 106]], 'light': 70},
    ('Void', 'portrait', 0): {'regions': [[18, 18, 90, 92]], 'light': 70},
    ('Void', 'portrait', 2): {'regions': [[10, 872, 112, 914], [20, 880, 64, 960], [16, 932, 106, 1002]], 'light': 70, 'fg': [[36, 976, 86, 994]]},
    ('Void', 'land', 2): {'regions': [[44, 418, 122, 492], [28, 478, 128, 556]], 'light': 70, 'fg': [[48, 522, 104, 544]]},
}


def boards():
    js = """import('./src/cards/board-art.js').then((A) => console.log(JSON.stringify({land: A.LANDSCAPE_BOARDS, portrait: A.PORTRAIT_BOARDS})))"""
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def load_cuts():
    src = open(os.path.join(ROOT, 'src/cards/board-cuts.js')).read()
    return json.loads(src[src.index('{'):src.rindex('}') + 1])


def save_cuts(cuts):
    head = ("// Generated by tools/board-props.py: cut-outs of the boards' moving corner props and\n"
            "// clean plates without them. Re-run the tool after changing a board.\n")
    open(os.path.join(ROOT, 'src/cards/board-cuts.js'), 'w').write(head + 'export const BOARD_CUTS = ' + json.dumps(cuts, indent=1) + ';\n')


def color_mask(img, hint):
    """A hand-guided cut: inside the hint's regions, the pixels that look like the object
    (bright enough; optionally warm, so bluish snow stays behind), joined up and with the
    dark painted outline included."""
    h, w = img.shape[:2]
    area = np.zeros((h, w), np.uint8)
    for r in hint.get('regions', []):
        area[r[1]:r[3], r[0]:r[2]] = 255
    for poly in hint.get('polys', []):
        cv2.fillPoly(area, [np.array(poly, np.int32)], 255)
    soft = np.zeros((h, w), np.uint8)
    for poly in hint.get('soft_polys', []):
        cv2.fillPoly(soft, [np.array(poly, np.int32)], 255)
    if hint.get('refine'):
        # A traced outline guides GrabCut: outside it is background, the middle of each traced
        # part is surely the object, and the colour model settles every edge pixel.
        gc = np.full((h, w), cv2.GC_BGD, np.uint8)
        gc[cv2.dilate(area, np.ones((7, 7), np.uint8)) > 0] = cv2.GC_PR_BGD
        gc[cv2.dilate(soft, np.ones((7, 7), np.uint8)) > 0] = cv2.GC_PR_BGD
        gc[(area > 0) | (soft > 0)] = cv2.GC_PR_FGD
        gc[cv2.erode(area, np.ones((hint['refine'], hint['refine']), np.uint8)) > 0] = cv2.GC_FGD
        if hint.get('sea'):
            # Inside the outline: bright sea is surely background; dark iron and olive weed surely object.
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            hue, sat, val = (hsv[..., i].astype(int) for i in range(3))
            sea = (((hue > 85) & (hue < 135) & (sat >= 55)) | ((hue >= 135) & (sat >= 30))) & (val >= 105)
            solid = (val < 85) | ((hue > 22) & (hue < 50) & (sat > 70))
            inside = (area > 0) | (soft > 0)
            core = cv2.erode(area, np.ones((hint['refine'], hint['refine']), np.uint8)) > 0
            # Shiny highlights in the middle of the iron look like sea; only the rim can be sea.
            gc[inside & sea & ~core] = cv2.GC_BGD
            gc[inside & solid & ~sea] = cv2.GC_FGD
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(img, gc, None, bgd, fgd, 10, cv2.GC_INIT_WITH_MASK)
        m = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        inv = cv2.bitwise_not(m)
        n, lab, stats, _ = cv2.connectedComponentsWithStats(inv)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] <= hint.get('max_hole', 60):
                m[lab == i] = 255
        return m
    if hint.get('direct'):
        # A traced outline, trimmed pixel by pixel wherever the water (or pink sea) shows through.
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hue, sat, val = (hsv[..., i].astype(int) for i in range(3))
        # Sea (blue to mauve) is brighter than the dark painted iron and fin.
        sea = (hue > 85) & (hue < 135) & (sat >= hint.get('water', 55)) & (val >= hint.get('sea_val', 88))
        pink = (hue >= 135) & (sat >= hint.get('pink', 30))
        m = np.where((area > 0) & ~sea & ~pink, 255, 0).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
        keep = np.zeros_like(m)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] >= hint.get('min_area', 30):
                keep[lab == i] = 255
        # Small specks of highlight inside the object stay part of it; big gaps (between arms) don't.
        inv = cv2.bitwise_not(keep)
        n, lab, stats, _ = cv2.connectedComponentsWithStats(inv)
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] <= hint.get('max_hole', 120):
                keep[lab == i] = 255
        return keep
    for r in hint.get('bg', []):
        area[r[1]:r[3], r[0]:r[2]] = 0
    b, g, r_ = [img[..., i].astype(int) for i in range(3)]
    lum = (r_ * 3 + g * 6 + b) // 10
    obj = lum > hint.get('light', 140) if hint.get('light') is not None else np.zeros((h, w), bool)
    # Lines drawn along the object (dark props on bright water): surely the object.
    lines = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1, t in hint.get('lines', []):
        cv2.line(lines, (x0, y0), (x1, y1), 255, t)
    obj |= lines > 0
    if hint.get('warm'):
        obj &= r_ >= b + hint.get('warm', 6)
    m = np.where(obj & (area > 0), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((hint.get('close', 7),) * 2, np.uint8))
    for r in hint.get('fg', []):
        m[r[1]:r[3], r[0]:r[2]] = 255
    if hint.get('fill_holes', True):
        flood = m.copy()
        ff = np.zeros((h + 2, w + 2), np.uint8)
        cv2.floodFill(flood, ff, (w - 1, h - 1), 255)
        m |= cv2.bitwise_not(flood)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= hint.get('min_area', 40):
            keep[lab == i] = 255
    # The bright pixels are surely the object; GrabCut learns its colours (shadows too) from
    # them and decides the rest of each region.
    gc = np.where(area > 0, cv2.GC_PR_BGD, cv2.GC_BGD).astype(np.uint8)
    gc[cv2.dilate(keep, np.ones((5, 5), np.uint8)) & area > 0] = cv2.GC_PR_FGD
    gc[cv2.erode(keep, np.ones((3, 3), np.uint8)) > 0] = cv2.GC_FGD
    gc[lines > 0] = cv2.GC_FGD
    if hint.get('water'):
        # Saturated blue water is surely background.
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        blue = (hsv[..., 0] > 85) & (hsv[..., 0] < 125) & (hsv[..., 1] > hint['water'])
        gc[blue & (gc != cv2.GC_FGD)] = cv2.GC_BGD
    for r in hint.get('fg', []):
        gc[r[1]:r[3], r[0]:r[2]] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, gc, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
    m = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    k = hint.get('close', 7) // 2 * 2 + 1 if hint.get('close', 7) < 5 else 5
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    if hint.get('fill_holes', True):
        flood = m.copy()
        ff = np.zeros((h + 2, w + 2), np.uint8)
        cv2.floodFill(flood, ff, (w - 1, h - 1), 255)
        m |= cv2.bitwise_not(flood)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= hint.get('min_area', 40):
            keep[lab == i] = 255
    # The painted dark outline belongs to the object too.
    return cv2.dilate(keep, np.ones((3, 3), np.uint8), iterations=hint.get('outline', 1)) & cv2.dilate(area, np.ones((5, 5), np.uint8))


def fill_plate(plate, hole, hint):
    """Paint the object out: copy real neighbouring texture from the given offsets (first
    one that isn't itself inside the hole wins), soften the seam, inpaint any leftovers."""
    h, w = hole.shape
    out = plate.copy()
    todo = hole > 0
    for dx, dy in hint.get('fill_from', []):
        ys, xs = np.nonzero(todo)
        sy, sx = ys + dy, xs + dx
        ok = (sx >= 0) & (sx < w) & (sy >= 0) & (sy < h)
        ok[ok] &= hole[sy[ok], sx[ok]] == 0
        out[ys[ok], xs[ok]] = plate[sy[ok], sx[ok]]
        todo[ys[ok], xs[ok]] = False
    if todo.any():
        out = cv2.inpaint(out, todo.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)
    # Soften the seam between copied and original pixels.
    ring = cv2.dilate(hole, np.ones((5, 5), np.uint8)) & ~cv2.erode(hole, np.ones((5, 5), np.uint8))
    blur = cv2.GaussianBlur(out, (5, 5), 0)
    out[ring > 0] = blur[ring > 0]
    return out


def cut_mask(img, at, hint):
    """GrabCut seeded by the prop's box: outside the (padded) box is background, the
    box's core is probably the object; hint rectangles force pixels either way."""
    h, w = img.shape[:2]
    pad = hint.get('pad', 14)
    x0, y0, x1, y1 = at
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    mask[Y0:Y1, X0:X1] = cv2.GC_PR_BGD
    mask[y0:y1, x0:x1] = cv2.GC_PR_FGD
    for r in hint.get('fg', []):
        mask[r[1]:r[3], r[0]:r[2]] = cv2.GC_FGD
    for r in hint.get('bg', []):
        mask[r[1]:r[3], r[0]:r[2]] = cv2.GC_BGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgd, fgd, 10, cv2.GC_INIT_WITH_MASK)
    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # Tidy: close small gaps, fill holes, keep the pieces that touch the box's core.
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    core = np.zeros_like(m); core[y0 + (y1 - y0) // 4:y1 - (y1 - y0) // 4, x0 + (x1 - x0) // 4:x1 - (x1 - x0) // 4] = 1
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 60:
            continue
        if (core[lab == i]).any() or stats[i, cv2.CC_STAT_AREA] > 0.08 * (x1 - x0) * (y1 - y0):
            keep[lab == i] = 255
    flood = keep.copy()
    ff = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(flood, ff, (0, 0) if keep[0, 0] == 0 else (w - 1, h - 1), 255)
    keep |= cv2.bitwise_not(flood)
    return keep


def process(faction, orient, idx, B, cuts):
    board = B[orient][faction]
    prop = board['props'][idx]
    src = os.path.join(ROOT, board['src'])
    slug = faction.lower().replace(' ', '-')
    entry = cuts.setdefault(orient, {}).setdefault(faction, {'plate': None, 'cuts': {}})
    plate_path = board['src'].replace('.jpg', '-plate.jpg')
    # Work on the plate if earlier props were already painted out of it.
    base = os.path.join(ROOT, entry['plate']) if entry.get('plate') and os.path.exists(os.path.join(ROOT, entry['plate'])) else src
    img = cv2.imread(src)
    plate = cv2.imread(base)
    hint = HINTS.get((faction, orient, idx), {})
    m = color_mask(img, hint) if 'regions' in hint or 'polys' in hint else cut_mask(img, prop['at'], hint)
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    # The cut-out: the original pixels with a 1px soft edge.
    alpha = cv2.GaussianBlur(m, (3, 3), 0)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[..., 3] = alpha
    os.makedirs(os.path.join(ROOT, 'art/board-props'), exist_ok=True)
    cut_rel = f'art/board-props/{slug}-{"land" if orient == "land" else "portrait"}-{idx}.png'
    cv2.imwrite(os.path.join(ROOT, cut_rel), rgba[by0:by1, bx0:bx1])
    # The plate: the object painted out (a little wider than the cut so no outline is left).
    hole = cv2.dilate(m, np.ones((7, 7), np.uint8), iterations=1)
    plate = fill_plate(plate, hole, hint)
    cv2.imwrite(os.path.join(ROOT, plate_path), plate, [cv2.IMWRITE_JPEG_QUALITY, 90])
    entry['plate'] = plate_path
    entry['cuts'][str(idx)] = {'src': cut_rel, 'box': [bx0, by0, bx1, by1]}
    print(f'{faction} {orient} #{idx} {prop["fx"]}: cut {bx1 - bx0}x{by1 - by0} -> {cut_rel}')


def main():
    B = boards()
    cuts = load_cuts()
    faction = sys.argv[1]
    orients = [sys.argv[2]] if len(sys.argv) > 2 and sys.argv[2] in ('land', 'portrait') else ['land', 'portrait']
    only = [int(a) for a in sys.argv[3:]]
    for o in orients:
        board = B[o].get(faction)
        if not board:
            continue
        # A fresh plate each run: start from the board itself.
        entry = cuts.get(o, {}).get(faction)
        if entry and not only:
            entry['plate'] = None
        for i, p in enumerate(board['props']):
            if p['fx'] in MOVING and (not only or i in only):
                process(faction, o, i, B, cuts)
    save_cuts(cuts)


if __name__ == '__main__':
    main()
