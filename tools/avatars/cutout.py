"""Make the cream background outside each round sticker transparent, crop square, export 1024 + 256.
Usage: python3 cutout.py <indir> <outdir>
"""
import sys, os
from collections import deque
from PIL import Image, ImageFilter

def bg_like(p, ref):
    r, g, b = p[:3]
    # never eat the white sticker border
    if r > 246 and g > 246 and b > 242:
        return False
    return abs(r - ref[0]) + abs(g - ref[1]) + abs(b - ref[2]) < 70

def cut(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    ref = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    mask = Image.new('L', (w, h), 255)
    mp = mask.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not bg_like(px[x, y], ref):
            continue
        mp[x, y] = 0
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    # soften the edge a touch and tighten by 1px to drop the cream halo
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mask)
    bbox = mask.point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop(bbox)
    side = max(im.size)
    pad = int(side * 0.04)
    sq = Image.new('RGBA', (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
    sq.paste(im, ((sq.width - im.width) // 2, (sq.height - im.height) // 2), im)
    return sq

def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for fn in sorted(os.listdir(src)):
        if not fn.endswith('.png') or '.keep' in fn:
            continue
        slug = fn[:-4]
        sq = cut(os.path.join(src, fn))
        sq.resize((1024, 1024), Image.LANCZOS).save(os.path.join(out, f'{slug}.png'), optimize=True)
        sq.resize((512, 512), Image.LANCZOS).save(os.path.join(out, f'{slug}@512.png'), optimize=True)
        print(slug, 'ok')

main()
