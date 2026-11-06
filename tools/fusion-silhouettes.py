#!/usr/bin/env python3
"""Blacked-out silhouettes of the fused heroes, shown on the menu until a player meets that pair.

For each art/fusion-heroes/<pair>.jpg: cut the hero out of the painting (IS-Net salient-object
matte, as tools/board-objects.py uses) and write art/fusion-silhouettes/<pair>.png, the figure in
solid black on transparency, no features.
  python3 tools/fusion-silhouettes.py --model path/to/model.onnx [pair ...]
"""
import argparse, glob, os, sys
import cv2, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIDE = 512


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--model', default=os.environ.get('ISNET_MODEL')); ap.add_argument('pairs', nargs='*')
    a = ap.parse_args()
    import importlib.util
    spec = importlib.util.spec_from_file_location('bo', os.path.join(ROOT, 'tools/board-objects.py')); bo = importlib.util.module_from_spec(spec); spec.loader.exec_module(bo)
    matter = bo.Matter(a.model)
    out = os.path.join(ROOT, 'art/fusion-silhouettes'); os.makedirs(out, exist_ok=True)
    files = sorted(glob.glob(os.path.join(ROOT, 'art/fusion-heroes/*.jpg')))
    if a.pairs: files = [f for f in files if os.path.basename(f)[:-4] in a.pairs]
    for f in files:
        im = Image.open(f).convert('RGB'); im.thumbnail((SIDE, SIDE), Image.LANCZOS)
        m = matter(np.asarray(im))
        m = cv2.GaussianBlur(np.clip((m - 0.35) / 0.3, 0, 1), (0, 0), 1.2)  # firm edge, soft by a pixel
        rgba = np.zeros((*m.shape, 4), np.uint8); rgba[..., 3] = (m * 255).astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out, os.path.basename(f)[:-4] + '.png'), optimize=True)
    print(len(files), 'silhouettes')


if __name__ == '__main__':
    main()
