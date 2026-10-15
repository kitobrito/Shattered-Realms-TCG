// Card art packs. Shipped builds bundle each art folder's pictures (as WebP) into a few
// "pack" files, so itch.io gets far fewer files (it allows at most 1000) and players download
// less. The game still asks for art by its normal path (art/zombies/zombie.jpg); this module
// answers with a blob: URL cut from the loaded pack. A pack loads the first time one of its
// pictures is wanted. Until then the picture is a see-through placeholder that names the
// path after '#', and when the pack arrives every placeholder on the page is swapped in place.
// Without packs (playing straight from the repo) paths are returned unchanged.

import { PACKS } from './art-packs-index.js';

const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7#';
const urls = new Map(); // art path → blob: URL
const loading = new Map(); // pack name → Promise
const failures = new Map(); // pack name → failed attempts

export const artPacked = (path) => !!(PACKS && path && PACKS.files[path]);

function loadPack(name) {
  if (!loading.has(name)) {
    const pack = PACKS.packs[name];
    const p = fetch(new URL(pack.file, document.baseURI).href)
      .then((r) => { if (!r.ok) throw new Error(`${pack.file}: ${r.status}`); return r.blob(); })
      .then((blob) => {
        for (const [path, [packName, at, len, type]] of Object.entries(PACKS.files)) {
          if (packName === name) urls.set(path, URL.createObjectURL(blob.slice(at, at + len, type)));
        }
        swapPlaceholders();
      })
      .catch((err) => {
        // Try again a little later (a dropped connection shouldn't leave cards blank for good).
        console.warn('Art pack failed to load', err);
        const tries = (failures.get(name) ?? 0) + 1;
        failures.set(name, tries);
        if (tries < 4) setTimeout(() => { loading.delete(name); loadPack(name); }, 1500 * tries);
      });
    loading.set(name, p);
  }
  return loading.get(name);
}

// The URL to show for an art path: the real picture if its pack is in, else a placeholder
// (and its pack starts loading).
export function artSrc(path) {
  if (!artPacked(path)) return path;
  const url = urls.get(path);
  if (url) return url;
  loadPack(PACKS.files[path][0]);
  return PLACEHOLDER + path;
}

// Resolves once every packed picture among these paths is ready to show.
export function ensureArt(paths) {
  const names = new Set();
  for (const p of paths) if (artPacked(p) && !urls.has(p)) names.add(PACKS.files[p][0]);
  return Promise.all([...names].map(loadPack));
}

// Swap placeholders (in src attributes and inline styles) for the real pictures.
const MARK = '#art/';
const FIND = /data:image\/gif;base64,R0lGODlhAQABAIAAAAAAAP\/\/\/yH5BAEAAAAALAAAAAABAAEAAAIBRAA7#(art\/[^'")\s]+)/g;
function swapPlaceholders(root = document) {
  const swap = (s) => s.replace(FIND, (m, path) => urls.get(path) ?? m);
  for (const el of root.querySelectorAll(`[src*="${MARK}"], [style*="${MARK}"]`)) {
    const src = el.getAttribute('src');
    if (src?.includes(MARK)) el.setAttribute('src', swap(src));
    const style = el.getAttribute('style');
    if (style?.includes(MARK)) el.setAttribute('style', swap(style));
  }
}

// The menus show hero portraits and card backs straight away, so fetch those packs early.
if (PACKS && typeof document !== 'undefined') for (const name of PACKS.eager ?? []) loadPack(name);
