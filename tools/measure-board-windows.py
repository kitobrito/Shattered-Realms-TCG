#!/usr/bin/env python3
"""Find each board's painted hero windows (the dark, empty openings the hero portraits sit in)
and compare them with board-art.js. A window is the dark region around the configured box's
centre; its shape is 'circle' (fills ~78% of its box) or 'arch' (round top, straight sides).
  python3 tools/measure-board-windows.py            # report
  python3 tools/measure-board-windows.py --json f   # also write the measurements to f"""
import json, os, subprocess, sys
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.loads(subprocess.check_output(['node', '-e', """
import('./src/cards/board-art.js').then((m) => console.log(JSON.stringify({ L: m.LANDSCAPE_BOARDS, P: m.PORTRAIT_BOARDS, LS: m.LANDSCAPE_SIZE, PS: m.PORTRAIT_SIZE })));
"""], cwd=ROOT))

def detect(im, box):
    x0, y0, x1, y1 = box[:4]
    bw, bh = x1 - x0, y1 - y0
    pad = int(max(bw, bh) * 0.5)
    H, W = im.shape[:2]
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    crop = im[Y0:Y1, X0:X1].astype(float)
    lum = crop.mean(axis=2)
    cx, cy = (x0 + x1) // 2 - X0, (y0 + y1) // 2 - Y0
    seed = lum[max(0, cy - 3):cy + 4, max(0, cx - 3):cx + 4].mean()
    if seed > 70:
        return None  # no dark painted window here (the board draws its own frame)
    dark = (lum < max(seed + 28, 42)).astype(np.uint8)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(dark, connectivity=4)
    lab = labels[cy, cx]
    if lab == 0:
        return None
    x, y, w, h, area = stats[lab]
    if w > bw * 1.8 or h > bh * 1.8 or w < bw * 0.5 or h < bh * 0.5:
        return None  # leaked into the scenery: not a closed window
    fill = area / float(w * h)
    shape = 'arch' if fill > 0.84 else 'circle'
    return [int(X0 + x), int(Y0 + y), int(X0 + x + w), int(Y0 + y + h), shape, round(fill, 3)]

report = {}
for kind, size in (('L', 'LS'), ('P', 'PS')):
    W, H = data[size]
    for name, b in data[kind].items():
        src = os.path.join(ROOT, b['src'].split('?')[0])
        im = np.array(Image.open(src).convert('RGB').resize((W, H)))
        for side in ('opp', 'me'):
            got = detect(im, b[side])
            cfg = b[side]
            report[f'{kind}|{name}|{side}'] = {'cfg': cfg, 'found': got}
            if not got:
                print(f'{kind} {name:28s} {side:3s} cfg={cfg}  (no painted window)')
                continue
            d = max(abs(got[i] - cfg[i]) for i in range(4))
            cfg_shape = cfg[4] if len(cfg) > 4 else '-'
            flag = '  <-- OFF' if d > 6 or (cfg_shape != got[4]) else ''
            print(f'{kind} {name:28s} {side:3s} cfg={cfg[:4]} {cfg_shape:6s} found={got[:4]} {got[4]:6s} fill={got[5]} diff={d}{flag}')
if '--json' in sys.argv:
    json.dump(report, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)
