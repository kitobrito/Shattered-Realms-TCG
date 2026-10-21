#!/usr/bin/env python3
# Dev helper: a gridded, zoomed crop of an image for reading coordinates.
#   python3 tools/gridcrop.py IMG x0 y0 x1 y1 SCALE OUT
import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, sc, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.LANCZOS)
d = ImageDraw.Draw(im)
for x in range((x0 // 10 + 1) * 10, x1, 10):
    X = (x - x0) * sc
    d.line([(X, 0), (X, im.height)], fill=(0, 255, 255) if x % 50 == 0 else (0, 90, 90))
    if x % 50 == 0: d.text((X + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // 10 + 1) * 10, y1, 10):
    Y = (y - y0) * sc
    d.line([(0, Y), (im.width, Y)], fill=(255, 0, 255) if y % 50 == 0 else (90, 0, 90))
    if y % 50 == 0: d.text((2, Y + 2), str(y), fill=(255, 255, 0))
im.save(out)
