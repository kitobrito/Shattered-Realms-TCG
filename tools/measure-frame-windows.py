#!/usr/bin/env python3
"""Measure the picture window of every card frame in art/frames.

The window is the transparent hole the card art shows through: the largest transparent region in
the top 60% of the frame that does not touch the image edge. Prints its box as percentages of the
frame (left, top, width, height) and whether it is round (an ellipse fills ~78.5% of its box).

  python3 tools/measure-frame-windows.py            # table
  python3 tools/measure-frame-windows.py --js       # writes src/ui/frame-windows.js
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES = os.path.join(ROOT, 'art', 'frames')

def window(path):
    im = np.array(Image.open(path).convert('RGBA'))
    h, w = im.shape[:2]
    clear = (im[:, :, 3] < 128).astype(np.uint8)
    n, labels, stats, cent = cv2.connectedComponentsWithStats(clear, connectivity=4)
    best = None
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if x == 0 or y == 0 or x + bw >= w or y + bh >= h:
            continue  # outside the card (rounded corners) or a cut-out edge
        if cent[i][1] > h * 0.6 or area < w * h * 0.03:
            continue
        if best is None or area > best[4]:
            best = (x, y, bw, bh, area)
    if not best:
        return None
    x, y, bw, bh, area = best
    fill = area / float(bw * bh)
    return {
        'l': round(x / w * 100, 2), 't': round(y / h * 100, 2),
        'w': round(bw / w * 100, 2), 'h': round(bh / h * 100, 2),
        'round': bool(0.7 < fill < 0.86), 'fill': round(fill, 3),
    }

def main():
    out = {}
    for f in sorted(os.listdir(FRAMES)):
        if not f.lower().endswith(('.png', '.webp')) or 'glow' in f:
            continue
        win = window(os.path.join(FRAMES, f))
        if win:
            out[f'art/frames/{f}'] = win
    if '--js' in sys.argv:
        body = json.dumps({k: {kk: v[kk] for kk in ('l', 't', 'w', 'h', 'round')} for k, v in out.items()}, indent=2)
        with open(os.path.join(ROOT, 'src', 'ui', 'frame-windows.js'), 'w') as fh:
            fh.write('// Picture windows of the card frames, measured from their transparent holes by\n'
                     '// tools/measure-frame-windows.py (re-run it after adding or repainting a frame):\n'
                     '// { l, t, w, h } in % of the frame, and whether the window is round.\n'
                     f'export const FRAME_WINDOWS = {body};\n')
        print(f'wrote {len(out)} frames')
    else:
        for k, v in out.items():
            print(f"{k:52s} l={v['l']:6.2f} t={v['t']:6.2f} w={v['w']:6.2f} h={v['h']:6.2f} fill={v['fill']:.3f} {'round' if v['round'] else ''}")

if __name__ == '__main__':
    main()
