# Usage: python3 tools/shard-frames.py art/frames
# Generates the "Shard" card frames: art/frames/shard-<type>.svg (frame, with holes for the
# art and the rules panel) and shard-<type>-accent.svg (white shapes, used as a CSS mask
# filled with the faction colour). Canvas 728x1024.
import sys, os
OUT = sys.argv[1]
W, H = 728, 1024
def pts(p): return ' '.join(f'{x},{y}' for x, y in p)
def poly(p): return 'M' + ' L'.join(f'{x},{y}' for x, y in p) + ' Z'
def oct_(x0, y0, x1, y1, c): return [(x0+c,y0),(x1-c,y0),(x1,y0+c),(x1,y1-c),(x1-c,y1),(x0+c,y1),(x0,y1-c),(x0,y0+c)]
def circ(cx, cy, r): return f'M{cx-r},{cy} a{r},{r} 0 1,0 {2*r},0 a{r},{r} 0 1,0 {-2*r},0 Z'

OUTER = oct_(0, 0, W, H, 46)
TRIM = oct_(14, 14, W-14, H-14, 38)
PENNANT = [(16,0),(142,0),(142,158),(79,200),(16,158)]
PENNANT_IN = [(30,12),(128,12),(128,150),(79,182),(30,150)]
SIGIL = (652, 76, 46)
TEXT = oct_(58, 664, 670, 936, 22)
TYPE_TAB = [(226,944),(502,944),(478,1004),(250,1004)]
ATK = [(20,602),(58,536),(136,536),(174,602),(136,668),(58,668)]  # same size as the Health heart
HP = [(W-x, y) for x, y in ATK]
# Health sits in a heart-shaped socket (100x90 heart, scaled into a box).
HEART = 'M50,88 C20,66 2,48 2,28 C2,12 14,2 28,2 C38,2 46,8 50,16 C54,8 62,2 72,2 C86,2 98,12 98,28 C98,48 80,66 50,88 Z'
def heart(x0, y0, w, h):
    import re
    nums = iter(float(n) for n in re.findall(r'[\d.]+', HEART))
    out = re.sub(r'[\d.]+,[\d.]+', lambda m: '{:.1f},{:.1f}'.format(x0 + next(nums) * w / 100, y0 + next(nums) * h / 90), HEART)
    return out
HP_HEART = (552, 536, 154, 132)
def inset_hex(h, d):
    cx = sum(x for x,_ in h)/6; cy = sum(y for _,y in h)/6
    return [(cx+(x-cx)*(1-d), cy+(y-cy)*(1-d)) for x, y in h]
PLATE_MINION = [(184,570),(544,570),(562,604),(544,638),(184,638),(166,604)]
PLATE_WIDE = [(64,570),(664,570),(690,604),(664,638),(64,638),(38,604)]

# Art windows
MINION_WIN = [(72,40),(656,40),(688,72),(688,522),(642,540),(588,514),(522,550),(456,520),(392,556),(330,524),(264,552),(200,518),(140,546),(88,516),(40,534),(40,72)]
SPELL_C = (364, 298, 248)
TRAP_WIN = [(364,44),(668,186),(668,444),(364,562),(60,444),(60,186)]

DEFS = '''<defs>
<linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="#fbeab5"/><stop offset=".22" stop-color="#c79a4a"/><stop offset=".45" stop-color="#5e3f15"/>
 <stop offset=".62" stop-color="#e8c87e"/><stop offset=".82" stop-color="#7c5722"/><stop offset="1" stop-color="#f1d690"/></linearGradient>
<linearGradient id="bronzeV" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#f8e2a2"/><stop offset=".5" stop-color="#9c7130"/><stop offset="1" stop-color="#4a300e"/></linearGradient>
<linearGradient id="stone" x1="0" y1="0" x2=".35" y2="1">
 <stop offset="0" stop-color="#3a3540"/><stop offset=".45" stop-color="#211d26"/><stop offset="1" stop-color="#121016"/></linearGradient>
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#3b3542"/><stop offset=".5" stop-color="#1c1921"/><stop offset="1" stop-color="#0d0b10"/></linearGradient>
<radialGradient id="sheen" cx=".3" cy=".08" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/>
 <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .55  0 0 0 .55 0"/>
 <feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="veins" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="turbulence" baseFrequency=".012 .02" numOctaves="2" seed="3"/>
 <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 1.1"/>
 <feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity=".75"/></filter>
<filter id="inner" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>'''

# Decorative shatter cracks on the stone (accent coloured): from the corners and the sockets.
CRACKS_SIDE = ['M14,330 L28,346 L22,372 L38,392', 'M714,300 L700,322 L708,346 L692,368', 'M14,700 L30,716 L24,742', 'M714,720 L698,738 L706,764',
               'M120,1010 L138,992 L132,972', 'M608,1010 L590,990 L598,970']

def frame(kind):
    if kind == 'minion':
        win = poly(MINION_WIN); plate = PLATE_MINION
    elif kind == 'spell':
        win = circ(*SPELL_C); plate = PLATE_WIDE
    else:
        win = poly(TRAP_WIN); plate = PLATE_WIDE
    holes = win + ' ' + poly(TEXT)
    body = poly(OUTER) + ' ' + holes
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">', DEFS]
    # stone body with holes
    s.append(f'<path d="{body}" fill="url(#stone)" fill-rule="evenodd"/>')
    s.append(f'<path d="{body}" fill="#000" fill-rule="evenodd" filter="url(#grain)" opacity=".55"/>')
    s.append(f'<path d="{body}" fill="#000" fill-rule="evenodd" filter="url(#veins)" opacity=".35"/>')
    s.append(f'<path d="{body}" fill="url(#sheen)" fill-rule="evenodd"/>')
    # outer trim: bronze band + dark keyline
    s.append(f'<path d="{poly(OUTER)}" fill="none" stroke="#0a0806" stroke-width="6"/>')
    s.append(f'<path d="{poly(TRIM)}" fill="none" stroke="url(#bronze)" stroke-width="9" stroke-linejoin="bevel"/>')
    s.append(f'<path d="{poly(oct_(22,22,W-22,H-22,34))}" fill="none" stroke="#0a0806" stroke-width="2.5" opacity=".8"/>')
    # window bezel
    if kind == 'spell':
        cx, cy, r = SPELL_C
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r+14}" fill="none" stroke="#0a0806" stroke-width="6" filter="url(#shadow)"/>')
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r+7}" fill="none" stroke="url(#bronze)" stroke-width="13"/>')
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#0a0806" stroke-width="3"/>')
        # four bronze clasps on the ring
        import math
        for a in (45, 135, 225, 315):
            x = cx + (r+7)*math.cos(math.radians(a)); y = cy + (r+7)*math.sin(math.radians(a))
            s.append(f'<g transform="translate({x:.1f},{y:.1f}) rotate({a+45})" filter="url(#shadow)"><path d="M0,-17 L17,0 L0,17 L-17,0 Z" fill="url(#bronze)" stroke="#2a1a08" stroke-width="2.5"/><path d="M0,-7 L7,0 L0,7 L-7,0 Z" fill="#0d0b10"/></g>')
    else:
        s.append(f'<path d="{win}" fill="none" stroke="#0a0806" stroke-width="16" stroke-linejoin="round" filter="url(#shadow)"/>')
        s.append(f'<path d="{win}" fill="none" stroke="url(#bronze)" stroke-width="10" stroke-linejoin="{"miter" if kind=="trap" else "round"}"/>')
        s.append(f'<path d="{win}" fill="none" stroke="#0a0806" stroke-width="2.5" stroke-linejoin="round"/>')
    # rules panel bezel
    s.append(f'<path d="{poly(TEXT)}" fill="none" stroke="#0a0806" stroke-width="15" filter="url(#shadow)"/>')
    s.append(f'<path d="{poly(TEXT)}" fill="none" stroke="url(#bronzeV)" stroke-width="8"/>')
    s.append(f'<path d="{poly(oct_(62,668,666,932,19))}" fill="none" stroke="#3a2a10" stroke-width="2" opacity=".7"/>')
    # name plate
    s.append(f'<path d="{poly(plate)}" fill="url(#plate)" stroke="url(#bronze)" stroke-width="7" stroke-linejoin="miter" filter="url(#shadow)"/>')
    s.append(f'<path d="{poly([(x, y+2 if y < 604 else y-2) for x, y in plate])}" fill="none" stroke="#000" stroke-width="2" opacity=".6" transform="translate(0,0)"/>')
    # type tab
    s.append(f'<path d="{poly(TYPE_TAB)}" fill="url(#plate)" stroke="url(#bronze)" stroke-width="5" filter="url(#shadow)"/>')
    # sockets: cost pennant, sigil, and (minions) the two stat shards
    s.append(f'<path d="{poly(PENNANT)}" fill="#0b0a0d" stroke="url(#bronze)" stroke-width="8" stroke-linejoin="miter" filter="url(#shadow)"/>')
    s.append(f'<path d="{poly(PENNANT_IN)}" fill="none" stroke="#000" stroke-width="3"/>')
    cx, cy, r = SIGIL
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#0b0a0d" stroke="url(#bronze)" stroke-width="8" filter="url(#shadow)"/>')
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r-9}" fill="none" stroke="#000" stroke-width="3"/>')
    if kind == 'minion':
        s.append(f'<path d="{poly(ATK)}" fill="#0b0a0d" stroke="url(#bronze)" stroke-width="8" stroke-linejoin="miter" filter="url(#shadow)"/>')
        s.append(f'<path d="{poly(inset_hex(ATK, .1))}" fill="none" stroke="#000" stroke-width="3"/>')
        x, y, w, h = HP_HEART
        s.append(f'<path d="{heart(x, y, w, h)}" fill="#0b0a0d" stroke="url(#bronze)" stroke-width="8" filter="url(#shadow)"/>')
        s.append(f'<path d="{heart(x+9, y+8, w-18, h-16)}" fill="none" stroke="#000" stroke-width="3"/>')
    s.append('</svg>')
    return '\n'.join(s)

def accent(kind):
    """White = faction colour. Thin inner trim line, cracks, and per-type flourishes."""
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
         '<g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">']
    s.append(f'<path d="{poly(oct_(28,28,W-28,H-28,30))}" stroke-width="3"/>')
    for c in CRACKS_SIDE: s.append(f'<path d="{c}" stroke-width="3.5"/>')
    # seam under the name plate and around the type tab
    s.append('<path d="M70,652 H658" stroke-width="2.5" opacity=".8"/>')
    if kind == 'minion':
        # glowing crack following the art's shattered edge
        s.append(f'<path d="{"M" + " L".join(f"{x},{y+12}" for x, y in MINION_WIN[3:15])}" stroke-width="3"/>')
        s.append(f'<path d="{poly(inset_hex(ATK, .1))}" stroke-width="3"/>')
        x, y, w, h = HP_HEART
        s.append(f'<path d="{heart(x+9, y+8, w-18, h-16)}" stroke-width="3"/>')
    elif kind == 'spell':
        cx, cy, r = SPELL_C
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r+24}" stroke-width="3" stroke-dasharray="2 14"/>')
        s.append(f'<circle cx="{cx}" cy="{cy}" r="{r+30}" stroke-width="2" opacity=".6"/>')
    else:
        # jaws: inward teeth along the trap window's edges
        import math
        for i in range(len(TRAP_WIN)):
            (x0, y0), (x1, y1) = TRAP_WIN[i], TRAP_WIN[(i+1) % len(TRAP_WIN)]
            L = math.hypot(x1-x0, y1-y0); n = max(3, int(L // 46))
            nx, ny = (y1-y0)/L, -(x1-x0)/L  # outward normal for clockwise polygon
            for k in range(n):
                a = (k+.5)/n; mx, my = x0+(x1-x0)*a, y0+(y1-y0)*a
                bx, by = mx + nx*13, my + ny*13
                ux, uy = (x1-x0)/L*10, (y1-y0)/L*10
                s.append(f'<path d="M{bx-ux:.1f},{by-uy:.1f} L{mx+nx*24:.1f},{my+ny*24:.1f} L{bx+ux:.1f},{by+uy:.1f} Z" fill="#fff" stroke-width="1"/>')
    s.append(f'<path d="{poly(PENNANT_IN)}" stroke-width="2.5"/>')
    cx, cy, r = SIGIL
    s.append(f'<circle cx="{cx}" cy="{cy}" r="{r-9}" stroke-width="2.5"/>')
    s.append('</g></svg>')
    return '\n'.join(s)

for k in ('minion', 'spell', 'trap'):
    open(os.path.join(OUT, f'shard-{k}.svg'), 'w').write(frame(k))
    open(os.path.join(OUT, f'shard-{k}-accent.svg'), 'w').write(accent(k))
print('ok')
