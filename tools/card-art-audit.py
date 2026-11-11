#!/usr/bin/env python3
"""Scores tools/card-art-audit.mjs output: for every card, the share of its frame's picture window
(the frame's own transparent pixels, scaled to the card) that shows lime instead of art.
  python3 tools/card-art-audit.py audit-out [--threshold 0.5]
Prints one line per frame with the worst cards, and exits 1 if any card is over the threshold (%)."""
import json, os, sys
from collections import defaultdict
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'audit-out'
threshold = float(sys.argv[sys.argv.index('--threshold') + 1]) if '--threshold' in sys.argv else 0.5
shots = {}
def shot_of(name):
    if name not in shots:
        shots[name] = np.array(Image.open(os.path.join(out, name)).convert('RGB')).astype(int)
    return shots[name]
cells = json.load(open(os.path.join(out, 'cells.json')))
masks = {}

def window_mask(frame, w, h):
    key = (frame, w, h)
    if key not in masks:
        im = Image.open(os.path.join(ROOT, frame)).convert('RGBA').resize((w, h), Image.BILINEAR)
        a = np.array(im)[:, :, 3] < 60
        import cv2
        n, labels, stats, cent = cv2.connectedComponentsWithStats(a.astype(np.uint8), connectivity=4)
        m = np.zeros_like(a)
        best, area = 0, 0
        for i in range(1, n):
            x, y, bw, bh, ar = stats[i]
            if x == 0 or y == 0 or x + bw >= w or y + bh >= h or cent[i][1] > h * 0.6:
                continue
            if ar > area:
                best, area = i, ar
        if best:
            m = labels == best
            # Ignore the outermost pixel ring (anti-aliased frame edge).
            m = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
        spill = a & ~(labels == best) if best else a
        # Only the inside of the card counts (the outer corners are transparent too).
        inner = np.zeros_like(a); inner[int(h * 0.04):int(h * 0.96), int(w * 0.04):int(w * 0.96)] = True
        masks[key] = (m, cv2.erode((spill & inner).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool))
    return masks[key]

by_frame = defaultdict(list)
bad = []
for c in cells:
    if not c['frame']:
        continue
    x, y, w, h = int(round(c['x'])), int(round(c['y'])), int(round(c['w'])), int(round(c['h']))
    crop = shot_of(c['shot'])[y:y + h, x:x + w]
    m, spill = window_mask(c['frame'], crop.shape[1], crop.shape[0])
    if not m.any():
        continue
    sp = crop[spill]
    spill_px = int(((sp[:, 0] > 200) & (sp[:, 1] < 80) & (sp[:, 2] > 200)).sum()) if spill.any() else 0
    if spill_px > 20:
        bad.append((spill_px / 10.0, c['id'] + ' (art spills outside the window)', c['frame']))
    px = crop[m]
    lime = (px[:, 1] > 200) & (px[:, 0] < 80) & (px[:, 2] < 80)
    pct = 100.0 * lime.sum() / m.sum()
    by_frame[c['frame']].append((pct, c['id']))
    if pct > threshold:
        bad.append((pct, c['id'], c['frame']))
for frame, rows in sorted(by_frame.items()):
    rows.sort(reverse=True)
    worst = ', '.join(f'{cid} {pct:.1f}%' for pct, cid in rows[:3])
    print(f'{frame:52s} {len(rows):4d} cards  worst: {worst}')
print(f'\n{len(bad)} card(s) with more than {threshold}% of the window uncovered')
for pct, cid, frame in sorted(bad, reverse=True)[:60]:
    print(f'  {pct:5.1f}%  {cid:36s} {frame}')
sys.exit(1 if bad else 0)
