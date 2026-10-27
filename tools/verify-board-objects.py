#!/usr/bin/env python3
"""Checks tools/verify-board-objects.mjs's recordings: every pixel that changed while a board's
objects moved must lie where an object is allowed to be, i.e. its painted spot (the patch) or
within the object's reach as it moves (its cut-out, grown by the most its motion can carry it).
Anything changed outside that is background that moved. Prints one line per board and writes
<dir>/<key>-check.png (changed pixels: green allowed, red outside).
  python3 tools/verify-board-objects.py <dir> [board-key ...]
"""
import json, math, os, subprocess, sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(js, name):
    code = f"import('{js}').then((m) => process.stdout.write(JSON.stringify(m.{name})))"
    return json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT))


def reach(layer, box):
    """The farthest (image px) any pixel of an object can move from where it is painted."""
    x0, y0, x1, y1 = box
    t = layer['type']
    if t == 'crawlers':
        return layer.get('amp', 1.6) * 3 * 1.6 + 0.12 * 3 * math.hypot(x1 - x0, y1 - y0) / 2 + 2
    if t == 'warp':
        amp = layer.get('amp', 2.5) * 2.5
        return amp + layer.get('gustAmp', amp * 1.6) + 2
    m = layer.get('motion', {'kind': 'sway', 'amp': 1.5})
    amp = m.get('amp', 1.5) * 3.5 + m.get('kickAmp', 0)
    pv = m.get('pivot', [(x0 + x1) / 2, (y0 + y1) / 2])
    r = max(math.hypot(x - pv[0], y - pv[1]) for x in (x0, x1) for y in (y0, y1))
    k = m.get('kind', 'sway')
    if k in ('bob',):
        return amp + 2
    if k == 'drift':
        return amp * 1.1 + 2
    if k == 'breathe':
        return r * amp * 0.01 + 2
    if k == 'spin':
        return r + 2  # turns all the way round: anywhere within its radius
    if k == 'claw':
        return amp + r * amp * 0.4 * math.pi / 180 + 2
    return r * amp * math.pi / 180 + amp * 0.3 + 2


def main():
    d = sys.argv[1]
    defs = load('./src/ui/board-fx-defs.js', 'BOARD_FX')
    objs = load('./src/cards/board-objects.js', 'BOARD_OBJECTS')
    keys = sys.argv[2:] or sorted(k for k in defs if os.path.exists(f'{d}/{k}-changed.png'))
    bad = 0
    for key in keys:
        ch = cv2.imread(f'{d}/{key}-changed.png', 0) > 127
        H, W = ch.shape
        allowed = np.zeros((H, W), np.uint8)
        info = objs.get(key, {'items': {}})
        atlas = cv2.imread(os.path.join(ROOT, info['src']), cv2.IMREAD_UNCHANGED) if info.get('src') else None
        for i, l in enumerate(defs[key]['layers']):
            ids = [l['id']] if l['type'] == 'echo' else [f"{l.get('id', f'crawl{i}')}.{j}" for j in range(len(l.get('boxes', [])))] if l['type'] == 'crawlers' else [l.get('id', f'warp{i}')] if l['type'] == 'warp' else []
            for iid in ids:
                it = info['items'].get(iid)
                if not it:
                    continue
                x0, y0, x1, y1 = it['box']
                w, h = x1 - x0, y1 - y0
                m = np.zeros((H, W), np.uint8)
                for kind in ('obj', 'patch'):
                    ax, ay = it[kind]
                    a = atlas[ay:ay + h, ax:ax + w, 3] > 0
                    m[y0:y0 + h, x0:x0 + w] |= a
                box = l['boxes'][int(iid.split('.')[-1])] if l['type'] == 'crawlers' else it['box']
                r = int(math.ceil(reach(l, box)))
                k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
                allowed |= cv2.dilate(m, k)
        out = ch & (allowed == 0)
        n_out, n_ch = int(out.sum()), int(ch.sum())
        vis = np.zeros((H, W, 3), np.uint8)
        vis[ch & (allowed > 0)] = (0, 200, 0)
        vis[out] = (0, 0, 255)
        vis[(allowed > 0) & ~ch] = (60, 60, 60)
        cv2.imwrite(f'{d}/{key}-check.png', vis)
        bad += n_out > 0
        print(f"{key:28s} changed {n_ch:6d} px, outside the objects {n_out:5d} px {'OK' if not n_out else 'FAIL'}")
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
