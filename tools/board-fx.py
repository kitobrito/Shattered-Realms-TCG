#!/usr/bin/env python3
"""Living boards: cut the moving and glowing parts out of each painted board.

For every board in tools/board_fx_spec.py (key "<board>-land" or "<board>-portrait"; the
painting is art/boards-v2/<board>.jpg or art/boards-portrait/<board>.jpg) this writes:

  * masks   small transparent PNGs of the pixels that should glow or shimmer (ice, crystals,
            handprints, snow): RGB is the painting, alpha how strongly the pixel belongs.
  * sprites every separate little thing that should move on its own (a grass tuft, a twig, a
            reed): an atlas PNG plus each part's box, so src/ui/circle-fx.js can sway each one
            around its own root with its own phase.
  * plate   the painting with the sprites' pixels painted out (inpainted), drawn under the
            moving sprites so no still copy shows behind them.

A spec entry is { name: [rule, [box, ...], options] } like tools/circle-fx-masks.py, plus:
  thin: k          keep only strokes thinner than k px (twigs, not rock outlines)
  split: {join, min, max, pad}   cut into separate sprites: strokes closer than `join` px
                   belong to one sprite; parts smaller than `min` px are dropped
  plate: True      paint this mask's pixels out of the plate (sprites always are)
Special key '_plate': extra boxes to paint out of the plate.

Writes src/cards/board-fx-masks.js and, with --preview DIR, a check image per board.

  python3 tools/board-fx.py [--only KEY] [--preview DIR]
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'art', 'boards-fx')


def hsv(a):
    a = a.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0); gc = np.where(m, (mx - g) / np.where(m, d, 1), 0); bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc))
    h = (h / 6) % 1 * 360
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    return h, s, mx


def ramp(x, lo, hi):
    return np.clip((x - lo) / max(hi - lo, 1e-6), 0, 1)


def hue_near(h, c, w):
    d = np.abs(((h - c + 180) % 360) - 180)
    return np.clip(1 - d / w, 0, 1)


# ---- Rules: (h, s, v) -> strength 0..1 ----
RULES = {
    'any': lambda h, s, v: np.ones_like(v),
    # dry grass and reeds: straw yellow
    'straw': lambda h, s, v: hue_near(h, 40, 22) * ramp(s, 0.25, 0.45) * ramp(v, 0.45, 0.7),
    # dark thin twigs and branches (use with hp and thin, inside tight boxes: the ink outlines
    # of rocks and snow look the same to a colour rule)
    'twig': lambda h, s, v: 1 - ramp(v, 0.28, 0.4),
    # green leaves, fronds, grass
    'leaf': lambda h, s, v: hue_near(h, 105, 45) * ramp(s, 0.3, 0.55) * ramp(v, 0.25, 0.55),
    # snow: bright and nearly grey
    'snow': lambda h, s, v: ramp(v, 0.8, 0.93) * (1 - ramp(s, 0.1, 0.22)),
    # pale ice and frozen water: light blue to white
    'ice': lambda h, s, v: hue_near(h, 205, 30) * ramp(s, 0.1, 0.25) * ramp(v, 0.55, 0.8),
    # glowing blue crystal
    'crystal': lambda h, s, v: hue_near(h, 210, 25) * ramp(s, 0.35, 0.6) * ramp(v, 0.5, 0.8),
    # pale bone and ivory
    'bone': lambda h, s, v: hue_near(h, 40, 30) * ramp(v, 0.6, 0.8) * (1 - ramp(s, 0.35, 0.55)),
    # red ochre paint
    'ochre': lambda h, s, v: hue_near(h, 8, 18) * ramp(s, 0.5, 0.7) * ramp(v, 0.35, 0.6),
    # grey stone
    'stone': lambda h, s, v: (1 - ramp(s, 0.12, 0.25)) * ramp(v, 0.35, 0.55) * (1 - ramp(v, 0.85, 0.95)),
    # ash and soot: dark grey
    'ash': lambda h, s, v: (1 - ramp(s, 0.15, 0.3)) * (1 - ramp(v, 0.25, 0.4)),
    # glowing green acid and slime
    'acid': lambda h, s, v: hue_near(h, 105, 40) * ramp(s, 0.45, 0.7) * ramp(v, 0.5, 0.75),
    # the brightest acid (glowing puddles, lit slime)
    'acidglow': lambda h, s, v: hue_near(h, 100, 40) * ramp(s, 0.4, 0.65) * ramp(v, 0.72, 0.92),
    # bioluminescent teal and cyan
    'biolum': lambda h, s, v: hue_near(h, 175, 35) * ramp(s, 0.3, 0.55) * ramp(v, 0.55, 0.8),
    # lit violet and magenta (alien flesh, nebulae, magic)
    'violet': lambda h, s, v: hue_near(h, 285, 40) * ramp(s, 0.3, 0.55) * ramp(v, 0.45, 0.75),
    # glossy honey and amber: deep orange, bright
    'honey': lambda h, s, v: hue_near(h, 34, 16) * ramp(s, 0.65, 0.85) * ramp(v, 0.7, 0.9),
    # glowing things in general
    'bright': lambda h, s, v: ramp(v, 0.75, 0.95),
    'dark': lambda h, s, v: 1 - ramp(v, 0.35, 0.55),
}


def strength(img, rule, boxes, opts):
    a = np.asarray(img).astype(np.float32)
    h, s, v = hsv(a)
    m = np.clip(RULES[rule](h, s, v), 0, 1)
    # hp: [radius, sign, lo, hi] -- local contrast: how much brighter (sign 1) or darker (-1)
    # than its blurred surroundings. Picks out thin strokes from the ground they lie on.
    if opts.get('hp'):
        r, sign, lo, hi = opts['hp']
        vb = cv2.GaussianBlur(v, (0, 0), r)
        m = m * ramp(sign * (v - vb), lo, hi)
    keep = np.zeros(m.shape, bool)
    for x0, y0, x1, y1 in boxes:
        keep[max(0, y0):y1, max(0, x0):x1] = True
    for x0, y0, x1, y1 in opts.get('exclude', []):
        keep[max(0, y0):y1, max(0, x0):x1] = False
    m = m * keep
    if opts.get('thin'):
        # Strokes thinner than k px: what an opening with a k x k square removes.
        k = opts['thin']
        b = (m > 0.3).astype(np.uint8)
        opened = cv2.morphologyEx(b, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
        thin = cv2.dilate(b - opened, np.ones((2, 2), np.uint8))
        m = m * (thin > 0)
    if opts.get('grow'):
        m = cv2.dilate(m, np.ones((opts['grow'] * 2 + 1,) * 2, np.uint8))
    if opts.get('blur'):
        m = cv2.GaussianBlur(m, (0, 0), opts['blur'])
    m[m < opts.get('floor', 0.06)] = 0
    return a, m


def save_png(im, path):
    # A 256-colour palette keeps the files small; the glows don't need more.
    im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def save_mask(a, m, key, name, opts):
    ys, xs = np.nonzero(m)
    if not len(xs):
        return None
    bx = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    rgb = a.copy()
    if opts.get('tint'):
        rgb = rgb * 0.35 + np.array(opts['tint'], np.float32) * 0.65
    out = np.dstack([np.clip(rgb, 0, 255), m * 255]).astype(np.uint8)[bx[1]:bx[3], bx[0]:bx[2]]
    file = f'art/boards-fx/{key}-{name}.png'
    im = Image.fromarray(out, 'RGBA')
    # Big soft masks (snow, water) are stored at a fraction of the size; the board scales them back.
    if opts.get('scale'):
        im = im.resize((max(1, round(im.width * opts['scale'])), max(1, round(im.height * opts['scale']))), Image.LANCZOS)
    save_png(im, os.path.join(ROOT, file))
    return {'src': file, 'box': bx}


def save_sprites(a, m, key, name, opts):
    """Each connected group of strokes becomes its own sprite, packed into one atlas."""
    sp = opts['split']
    join, mn, mx, pad = sp.get('join', 3), sp.get('min', 10), sp.get('max', 600), sp.get('pad', 2)
    b = (m > 0.25).astype(np.uint8)
    grouped = cv2.dilate(b, np.ones((join * 2 + 1,) * 2, np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(grouped, 8)
    parts = []
    H, W = m.shape
    # Alpha: the strokes, a touch wider and soft, so the sprite fully covers its painted copy.
    alpha = cv2.GaussianBlur(cv2.dilate(m, np.ones((3, 3), np.uint8)), (0, 0), 0.6)
    used = np.zeros(m.shape, np.float32)
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        strokes = int(((lab == i) & (b > 0)).sum())
        if strokes < mn or w * h > mx * mx:
            continue
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = min(W, x + w + pad), min(H, y + h + pad)
        comp = (cv2.dilate((lab == i).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)[y0:y1, x0:x1]
        al = alpha[y0:y1, x0:x1] * comp
        used[y0:y1, x0:x1] = np.maximum(used[y0:y1, x0:x1], al)
        parts.append((x0, y0, x1, y1, al))
    if not parts:
        return None, used
    # Shelf-pack into an atlas.
    AW = 512
    cx = cy = shelf = 0
    placed = []
    for x0, y0, x1, y1, al in sorted(parts, key=lambda p: -(p[3] - p[1])):
        w, h = x1 - x0, y1 - y0
        if cx + w > AW:
            cx, cy, shelf = 0, cy + shelf + 1, 0
        placed.append((x0, y0, x1, y1, cx, cy, al))
        cx += w + 1
        shelf = max(shelf, h)
    AH = cy + shelf + 1
    atlas = np.zeros((AH, AW, 4), np.uint8)
    for x0, y0, x1, y1, ax, ay, al in placed:
        atlas[ay:ay + (y1 - y0), ax:ax + (x1 - x0), :3] = a[y0:y1, x0:x1].astype(np.uint8)
        atlas[ay:ay + (y1 - y0), ax:ax + (x1 - x0), 3] = (np.clip(al, 0, 1) * 255).astype(np.uint8)
    file = f'art/boards-fx/{key}-{name}.png'
    save_png(Image.fromarray(atlas, 'RGBA'), os.path.join(ROOT, file))
    return {'src': file, 'parts': [[int(v) for v in (x0, y0, x1, y1, ax, ay)] for x0, y0, x1, y1, ax, ay, _ in placed]}, used


def main():
    from board_fx_spec import SPEC
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for key, spec in SPEC.items():
        if only and key != only and not key.startswith(only + '-'):
            continue
        board, orient = key.rsplit('-', 1)
        src = os.path.join(ROOT, 'art', 'boards-v2' if orient == 'land' else 'boards-portrait', f'{board}.jpg')
        img = Image.open(src).convert('RGB')
        entry = {}
        hole = np.zeros(img.size[::-1], np.float32)
        prev = np.asarray(img).astype(np.float32) * 0.35 if preview else None
        for name, val in spec.items():
            if name.startswith('_'):
                continue
            rule, boxes, *rest = val
            opts = rest[0] if rest else {}
            a, m = strength(img, rule, boxes, opts)
            if opts.get('split'):
                info, used = save_sprites(a, m, key, name, opts)
                if info:
                    hole = np.maximum(hole, used)
            else:
                info = save_mask(a, m, key, name, opts)
                if info and opts.get('plate'):
                    hole = np.maximum(hole, m)
                used = m
            if not info:
                print(f'  {key} {name}: EMPTY')
                continue
            entry[name] = info
            if preview is not None:
                col = np.array(opts.get('show', [255, 0, 255]), np.float32)
                al = np.clip(used, 0, 1)[..., None]
                prev = prev * (1 - al) + col * al
        for x0, y0, x1, y1 in spec.get('_plate', []):
            hole[y0:y1, x0:x1] = 1
        if hole.max() > 0:
            # The plate: what the ground looks like without the moving things.
            bgr = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGB2BGR)
            holes = cv2.dilate((hole > 0.15).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
            plate = cv2.inpaint(bgr, holes, 4, cv2.INPAINT_TELEA)
            file = f'art/boards-fx/{key}-plate.jpg'
            cv2.imwrite(os.path.join(ROOT, file), plate, [cv2.IMWRITE_JPEG_QUALITY, 90])
            entry['_plate'] = file
        manifest[key] = entry
        if preview:
            Image.fromarray(np.clip(prev, 0, 255).astype(np.uint8)).save(os.path.join(preview, f'fx-{key}.png'))
        print(key, ', '.join(f'{k}:{len(v["parts"]) if isinstance(v, dict) and "parts" in v else "mask"}' for k, v in entry.items() if k != '_plate'))
    path = os.path.join(ROOT, 'src', 'cards', 'board-fx-masks.js')
    old = {}
    if os.path.exists(path):
        txt = open(path).read()
        body = txt[txt.index('BOARD_MASKS = ') + len('BOARD_MASKS = '):]
        old = json.loads(body[:body.rindex('}') + 1])
    old.update(manifest)
    with open(path, 'w') as f:
        f.write('// Generated by tools/board-fx.py: masks, sprite atlases and clean plates cut from each living\n')
        f.write('// board ({ "<board>-land|portrait": { name: { src, box } | { src, parts }, _plate } }, image px). Do not edit.\n')
        f.write('export const BOARD_MASKS = ' + json.dumps(old, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
