#!/usr/bin/env python3
"""Builds the shipped game (itch.io and Android) into a folder, default dist/.

The repo keeps every card picture as its own JPG. For shipping, this script
  * converts the card art, hero portraits and card backs to WebP (same size, far fewer bytes), and
  * bundles them into a few "pack" files per art folder, so itch.io gets far fewer
    files than its 1000-file limit;
then writes src/ui/art-packs-index.js in the output so the game knows where each picture
sits (see src/ui/art-packs.js). Everything else is copied as it is.

Usage: python3 tools/build-dist.py [out-dir]     (needs Pillow: pip install pillow)
"""
import hashlib
import io
import json
import os
import re
import shutil
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist'))

# Art the game never loads (old boards, app-store icons).
SKIP_ART = {'boards', 'boards-portrait-old', 'app'}
# Folders holding card art, heroes and backs: these go into packs.
NOT_PACKED = {'board-props', 'boards-portrait', 'boards-v2', 'fonts', 'frames', 'fx', 'music', 'ui'} | SKIP_ART
IMAGE_EXT = ('.jpg', '.jpeg', '.png', '.webp')
QUALITY = 72  # visually identical to the source JPGs at full size, under half the bytes
PACK_LIMIT = 5 * 1024 * 1024  # start a new pack part past this many bytes
EAGER = ('heroes', 'backs')  # the menus show these at once


def to_webp(path):
    im = Image.open(os.path.join(ROOT, path))
    im = im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB')
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=5)
    return path, buf.getvalue()


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    shutil.copy2(os.path.join(ROOT, 'index.html'), OUT)
    shutil.copytree(os.path.join(ROOT, 'src'), os.path.join(OUT, 'src'))

    packed = {}  # folder → [art paths]
    for folder in sorted(os.listdir(os.path.join(ROOT, 'art'))):
        src_dir = os.path.join(ROOT, 'art', folder)
        if folder in SKIP_ART or not os.path.isdir(src_dir):
            continue
        if folder in NOT_PACKED:
            shutil.copytree(src_dir, os.path.join(OUT, 'art', folder))
            continue
        for name in sorted(os.listdir(src_dir)):
            rel = f'art/{folder}/{name}'
            if name.lower().endswith(IMAGE_EXT):
                packed.setdefault(folder, []).append(rel)
            elif os.path.isfile(os.path.join(src_dir, name)):
                os.makedirs(os.path.join(OUT, 'art', folder), exist_ok=True)
                shutil.copy2(os.path.join(src_dir, name), os.path.join(OUT, 'art', folder, name))

    # Every picture the game names must be in a pack.
    manifest = open(os.path.join(ROOT, 'src/cards/art-manifest.js')).read()
    wanted = set(re.findall(r"'(art/[^']+)'", manifest))
    have = {p for paths in packed.values() for p in paths}
    missing = sorted(p for p in wanted if p not in have)
    if missing:
        sys.exit('These pictures are in the art manifest but missing from art/:\n  ' + '\n  '.join(missing))

    all_paths = [p for paths in packed.values() for p in paths]
    with ProcessPoolExecutor() as pool:
        webp = dict(pool.map(to_webp, all_paths, chunksize=8))

    os.makedirs(os.path.join(OUT, 'art', 'packs'))
    index = {'packs': {}, 'files': {}, 'eager': []}
    before = after = 0
    for folder, paths in packed.items():
        parts, cur = [], []
        for p in paths:
            if cur and sum(len(webp[q]) for q in cur) + len(webp[p]) > PACK_LIMIT:
                parts.append(cur)
                cur = []
            cur.append(p)
        parts.append(cur)
        for i, part in enumerate(parts):
            name = folder if len(parts) == 1 else f'{folder}-{i + 1}'
            data = b''.join(webp[p] for p in part)
            file = f'art/packs/{name}.{hashlib.sha1(data).hexdigest()[:10]}.pack'
            with open(os.path.join(OUT, file), 'wb') as f:
                f.write(data)
            index['packs'][name] = {'file': file, 'size': len(data)}
            if folder in EAGER:
                index['eager'].append(name)
            at = 0
            for p in part:
                index['files'][p] = [name, at, len(webp[p]), 'image/webp']
                at += len(webp[p])
                before += os.path.getsize(os.path.join(ROOT, p))
            after += len(data)

    with open(os.path.join(OUT, 'src/ui/art-packs-index.js'), 'w') as f:
        f.write('// Written by tools/build-dist.py: where each card picture sits in the art packs.\n')
        f.write('export const PACKS = ' + json.dumps(index, separators=(',', ':')) + ';\n')

    n_files = sum(len(fs) for _, _, fs in os.walk(OUT))
    print(f'Packed {len(all_paths)} pictures into {len(index["packs"])} packs: '
          f'{before / 2**20:.1f} MB -> {after / 2**20:.1f} MB')
    print(f'{OUT}: {n_files} files')


if __name__ == '__main__':
    main()
