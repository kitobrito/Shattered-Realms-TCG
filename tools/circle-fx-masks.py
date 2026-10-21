#!/usr/bin/env python3
"""Light masks for the Circles of Hell boards (Demons' Descent).

For each circle board (landscape art/boards-v2/circleN.jpg, portrait art/boards-portrait/circleN.jpg)
this pulls the painted pixels of the things that should glow or move -- lava cracks, runes,
ghosts, flames, gold, water, lightning -- into small transparent PNGs (art/boards-fx/), each
cropped to its own box. src/ui/circle-fx.js draws them over the painting and animates them,
so every glow sits exactly on the brushwork.

A mask is { name: [rule, [box, ...], options] }: `rule` says how strongly a pixel belongs
(0..1, from its colour), boxes [x0, y0, x1, y1] (image px) limit where to look.
Writes src/cards/circle-fx-masks.js (the boxes) and, with --preview DIR, a check image per board.

  python3 tools/circle-fx-masks.py [--preview DIR]
"""
import colorsys, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'art', 'boards-fx')

def hsv(a):
    a = a.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    h = np.zeros_like(mx)
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

# ---- Rules: (h, s, v, rgb) -> strength 0..1 ----
RULES = {
    # molten lava / embers: hot orange to yellow, bright
    'lava': lambda h, s, v, a: hue_near(h, 30, 26) * ramp(s, 0.45, 0.75) * ramp(v, 0.55, 0.9),
    # molten gold rivers (Greed): yellow-orange, very bright
    'gold': lambda h, s, v, a: hue_near(h, 38, 20) * ramp(s, 0.4, 0.7) * ramp(v, 0.62, 0.95),
    # coins / bars: yellow, mid-bright
    'coins': lambda h, s, v, a: hue_near(h, 45, 16) * ramp(s, 0.35, 0.65) * ramp(v, 0.5, 0.85),
    # flames in tombs and braziers: orange-yellow, very bright
    'fire': lambda h, s, v, a: hue_near(h, 30, 24) * ramp(s, 0.3, 0.6) * ramp(v, 0.72, 0.98),
    # gates for local-contrast masks (opts 'hp'): everything, or only greyish pixels
    'any': lambda h, s, v, a: np.ones_like(v),
    'lowsat': lambda h, s, v, a: 1 - ramp(s, 0.16, 0.34),
    'dark': lambda h, s, v, a: 1 - ramp(v, 0.45, 0.65),
    'bright': lambda h, s, v, a: ramp(v, 0.6, 0.85),
    'teal': lambda h, s, v, a: hue_near(h, 172, 45) * ramp(s, 0.15, 0.35),
    # pale spirits: bright, nearly grey
    'ghost': lambda h, s, v, a: ramp(v, 0.55, 0.85) * (1 - ramp(s, 0.12, 0.3)),
    # pink-crimson lightning: very bright magenta/red
    'pinkbolt': lambda h, s, v, a: (hue_near(h, 335, 40)) * ramp(v, 0.75, 1.0) * ramp(s, 0.15, 0.4) + ramp(v, 0.93, 1.0) * (1 - ramp(s, 0.2, 0.4)) * 0.8,
    # white / violet lightning
    'whitebolt': lambda h, s, v, a: ramp(v, 0.72, 0.95) * (1 - ramp(s, 0.25, 0.5)),
    # red silk ribbons
    'ribbon': lambda h, s, v, a: hue_near(h, 355, 18) * ramp(s, 0.6, 0.85) * ramp(v, 0.35, 0.7),
    # Styx water: teal, mid-bright crests
    'water': lambda h, s, v, a: hue_near(h, 168, 30) * ramp(s, 0.3, 0.55) * ramp(v, 0.35, 0.75),
    # glowing green slime / gems
    'slime': lambda h, s, v, a: hue_near(h, 120, 40) * ramp(s, 0.35, 0.6) * ramp(v, 0.4, 0.75),
    # boiling blood: deep red, bright
    'blood': lambda h, s, v, a: hue_near(h, 5, 20) * ramp(s, 0.6, 0.85) * ramp(v, 0.5, 0.85),
    # dark carved strokes (runes cut into pale stone)
    'carved': lambda h, s, v, a: 1 - ramp(v, 0.32, 0.55),
    # the deepest strokes only (glyphs cut into dark rune stones)
    'carveddeep': lambda h, s, v, a: 1 - ramp(v, 0.1, 0.2),
    # spirits on a pale board: only the brightest, near-white strokes
    'ghostbright': lambda h, s, v, a: ramp(v, 0.74, 0.92) * (1 - ramp(s, 0.1, 0.24)),
    # glints on black obsidian (pale violet-grey highlights)
    'obsidian': lambda h, s, v, a: ramp(v, 0.35, 0.6) * hue_near(h, 260, 70) * ramp(s, 0.05, 0.2),
    # bronze flame tips on a frame
    'bronze': lambda h, s, v, a: hue_near(h, 25, 25) * ramp(s, 0.3, 0.6) * ramp(v, 0.35, 0.7),
    # warm lit windows / doorways
    'window': lambda h, s, v, a: hue_near(h, 20, 30) * ramp(s, 0.5, 0.8) * ramp(v, 0.5, 0.85),
    # yellow eyes (Cerberus) and ember eyes
    'eyes': lambda h, s, v, a: hue_near(h, 50, 30) * ramp(s, 0.45, 0.75) * ramp(v, 0.6, 0.9),
    'redeyes': lambda h, s, v, a: hue_near(h, 10, 25) * ramp(s, 0.5, 0.8) * ramp(v, 0.55, 0.9),
    # red veins in the dead trees
    'veins': lambda h, s, v, a: hue_near(h, 0, 20) * ramp(s, 0.6, 0.85) * ramp(v, 0.45, 0.8),
    # purple-blue rune stones' glyphs (lighter strokes on dark stone)
    'stoneglyph': lambda h, s, v, a: ramp(v, 0.3, 0.5) * hue_near(h, 230, 50) * ramp(s, 0.1, 0.3),
}

def build_mask(img, rule, boxes, opts):
    a = np.asarray(img).astype(np.float32)
    h, s, v = hsv(a)
    m = np.clip(RULES[rule](h, s, v, a), 0, 1)
    # hp: [radius, sign, lo, hi] -- local contrast: how much brighter (sign 1) or darker (-1) a
    # pixel is than its blurred surroundings. Picks out faint spirits, carved strokes, glints.
    if opts.get('hp'):
        r, sign, lo, hi = opts['hp']
        vb = np.asarray(Image.fromarray((v * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
        m = m * ramp(sign * (v - vb), lo, hi)
    keep = np.zeros(m.shape, bool)
    for x0, y0, x1, y1 in boxes:
        keep[max(0, y0):y1, max(0, x0):x1] = True
    for x0, y0, x1, y1 in opts.get('exclude', []):
        keep[max(0, y0):y1, max(0, x0):x1] = False
    m = m * keep
    if opts.get('grow'):
        mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(opts['grow'] * 2 + 1))
        m = np.asarray(mi).astype(np.float32) / 255
    if opts.get('blur'):
        mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(opts['blur']))
        m = np.asarray(mi).astype(np.float32) / 255
    m[m < opts.get('floor', 0.06)] = 0
    ys, xs = np.nonzero(m)
    if not len(xs):
        return None, None
    bx = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    # RGB: the painting itself (optionally lifted); A: the strength.
    rgb = a.copy()
    if opts.get('tint'):
        t = np.array(opts['tint'], np.float32)
        rgb = rgb * 0.35 + t * 0.65
    out = np.dstack([np.clip(rgb, 0, 255), m * 255]).astype(np.uint8)
    crop = out[bx[1]:bx[3], bx[0]:bx[2]]
    return Image.fromarray(crop, 'RGBA'), bx

def main():
    from circle_fx_spec import SPEC
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for key, spec in SPEC.items():
        if only and key != only:
            continue
        n, orient = key.split('-')
        src = os.path.join(ROOT, 'art', 'boards-v2' if orient == 'land' else 'boards-portrait', f'circle{n}.jpg')
        img = Image.open(src).convert('RGB')
        entry = {}
        prev = np.asarray(img).astype(np.float32) * 0.35 if preview else None
        for name, (rule, boxes, *rest) in spec.items():
            opts = rest[0] if rest else {}
            crop, bx = build_mask(img, rule, boxes, opts)
            if crop is None:
                print(f'  {key} {name}: EMPTY'); continue
            file = f'art/boards-fx/circle{n}-{orient}-{name}.png'
            crop.save(os.path.join(ROOT, file), optimize=True)
            entry[name] = {'src': file, 'box': bx}
            if preview is not None:
                al = np.asarray(crop).astype(np.float32)[..., 3:4] / 255
                col = np.array(opts.get('show', [255, 0, 255]), np.float32)
                region = prev[bx[1]:bx[3], bx[0]:bx[2]]
                prev[bx[1]:bx[3], bx[0]:bx[2]] = region * (1 - al) + col * al
        manifest[key] = entry
        if preview:
            Image.fromarray(np.clip(prev, 0, 255).astype(np.uint8)).save(os.path.join(preview, f'mask-{key}.png'))
        print(key, ', '.join(f'{k}{v["box"]}' for k, v in entry.items()))
    path = os.path.join(ROOT, 'src', 'cards', 'circle-fx-masks.js')
    old = {}
    if only and os.path.exists(path):
        txt = open(path).read()
        body = txt[txt.index('CIRCLE_MASKS = ') + len('CIRCLE_MASKS = '):]
        old = json.loads(body[:body.rindex('}') + 1])
    old.update(manifest)
    with open(path, 'w') as f:
        f.write('// Generated by tools/circle-fx-masks.py: the light masks cut from each Circle of Hell board\n')
        f.write('// ({ "N-land|N-portrait": { name: { src, box: [x0, y0, x1, y1] } } }, image px). Do not edit.\n')
        f.write('export const CIRCLE_MASKS = ' + json.dumps(old, indent=1) + ';\n')

if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(__file__))
    main()
