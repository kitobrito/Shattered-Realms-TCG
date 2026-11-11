#!/usr/bin/env python3
"""Write the measured hero windows (tools/measure-board-windows.py --json) into board-art.js:
for each reliable measurement (a closed window, within 12px of the configured box) the box
becomes the window plus 1px of overlap, and its shape is set to circle or arch.
  python3 tools/apply-board-windows.py measurements.json [--keep 'L|Board|side' ...]"""
import json, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meas = json.load(open(sys.argv[1]))
keep = set(a for i, a in enumerate(sys.argv) if i > 0 and sys.argv[i - 1] == '--keep')
path = os.path.join(ROOT, 'src', 'cards', 'board-art.js')
src = open(path).read()
L_start = src.index('export const LANDSCAPE_BOARDS')
P_start = src.index('export const PORTRAIT_BOARDS')
changed = []
for key, m in meas.items():
    kind, name, side = key.split('|')
    got, cfg = m['found'], m['cfg']
    if key in keep or not got:
        continue
    fill = got[5]
    d = max(abs(got[i] - cfg[i]) for i in range(4))
    if not (0.70 <= fill <= 0.95) or d > 12:
        continue
    shape = 'arch' if fill >= 0.835 else 'circle'
    new = [got[0] - 1, got[1] - 1, got[2] + 1, got[3] + 1]
    # Find this board's line in the right table.
    start = L_start if kind == 'L' else P_start
    end = len(src) if start > (P_start if kind == 'L' else L_start) else (P_start if kind == 'L' else L_start)
    qname = re.escape(name)
    pat = re.compile(r"(\n  (?:'%s'|%s): \{[^\n]*?\b%s: )\[[^\]]*\]" % (qname, qname, side))
    seg = src[start:end]
    mm = pat.search(seg)
    if not mm:
        print('not found', key); continue
    rep = f"{mm.group(1)}[{new[0]}, {new[1]}, {new[2]}, {new[3]}, '{shape}']"
    seg = seg[:mm.start()] + rep + seg[mm.end():]
    src = src[:start] + seg + src[end:]
    # Positions shift after edits: recompute anchors.
    L_start = src.index('export const LANDSCAPE_BOARDS'); P_start = src.index('export const PORTRAIT_BOARDS')
    changed.append((key, cfg, new + [shape]))
open(path, 'w').write(src)
for k, a, b in changed:
    print(f'{k:42s} {a} -> {b}')
print(len(changed), 'windows updated')
