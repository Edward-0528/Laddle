"""Generate Ladle avatar stickers with Gemini image model.
Usage: python3 -I gen.py <outdir> <slug> [<slug> ...]
Reads GEMINI_API_KEY from /Users/edward/Ladle/server/.env (never printed).
"""
import base64, json, sys, os, urllib.request, urllib.error

ENV = '/Users/edward/Ladle/server/.env'
REFS = sys.argv[1] if False else None
MODEL = os.environ.get('AV_MODEL', 'gemini-2.5-flash-image')

def key():
    for line in open(ENV):
        if line.startswith('GEMINI_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('no key')

STYLE = ("A single round die-cut sticker avatar for a kids' quiz game. Thick clean white sticker border around a "
         "solid flat color circle, the character centered inside and slightly overlapping the circle edge is OK. "
         "Bold dark purple-black outlines, flat cartoon colors with soft simple shading, cute and silly, big expressive eyes. "
         "Plain flat light cream (#FFF4E0) background outside the sticker. No text, no letters, no watermark. "
         "Crisp, sharp, high-resolution vector-style illustration with clean edges, vivid saturated colors, no blur, no paper texture. Match the art style, outline weight and framing of the reference stickers, but render far sharper than them.")

CHARS = {
 'goose': ('Silly Goose', 'a goofy white goose wearing a pink party hat and a yellow bow tie', '#3D8BFF'),
 'tomato': ('Tow Truck Tomato', 'a cheerful red tomato with a green leaf top that is also a little tow truck with black wheels and a tow hook arm', '#FFD23F'),
 'pickle': ('Pickle Pilot', 'a green pickle wearing aviator goggles and a flowing yellow scarf', '#FF6B5A'),
 'donut': ('Disco Donut', 'a pink-frosted donut with sprinkles wearing cool black sunglasses, grinning', '#2EE6A8'),
 'cactus': ('Sleepy Cactus', 'a drowsy green cactus in a terracotta pot wearing a blue nightcap with a pompom, eyes closed, little floating z shapes', '#7B3CFF'),
 'toast': ('Toast Ghost', 'a slice of toast shaped like a friendly little ghost with a wavy bottom edge and a round surprised mouth', '#FF4FA3'),
 'avocado': ('Avocado Astronaut', 'a half avocado with its brown pit as a belly, wearing a clear round space helmet, smiling, tiny stars around', '#3D2A6B'),
 'cloud': ('Grumpy Cloud', 'a fluffy white cloud with grumpy eyebrows and a frown, dripping two small blue raindrops', '#FFC83D'),
 'banana': ('Banana Detective', 'a yellow banana wearing a brown deerstalker detective hat and holding a magnifying glass, curious expression', '#3D8BFF'),
 'taco': ('Taco Cat', 'a crunchy taco with lettuce on top that has cat ears, whiskers and a cute cat face on the shell', '#FF4FA3'),
 'snail': ('Snail Mail', 'a happy snail whose shell is a white envelope with a red heart seal, eyes on stalks', '#2EE6A8'),
 'waffle': ('Waffle Wizard', 'a golden square waffle with a face wearing a tall blue wizard hat with yellow stars', '#7B3CFF'),
 'broccoli': ('Broccoli Rockstar', 'a broccoli floret with a lightning bolt on its head, wearing tiny sunglasses and grinning like a rock star', '#FF6B5A'),
 'moon': ('Moody Moon', 'a yellow crescent moon with a sleepy unimpressed face wearing pink headphones, a few music notes and stars', '#1B1033'),
 'cupcake': ('Cupcake Knight', 'a cupcake with pink frosting wearing a tiny silver knight helmet with a pink plume, holding a little toy sword', '#FFD23F'),
 'penguin': ('Sweater Penguin', 'a round little penguin wearing a cozy red knitted sweater with a white zigzag pattern', '#FF4FA3'),
 'jelly': ('Jelly Jellyfish', 'a cute purple jellyfish floating inside a glass jam jar with a pink lid', '#FFC83D'),
 'egg': ('Egg Roll', 'a happy egg riding a red roller skate with speed lines behind it', '#3D8BFF'),
 'lemon': ('Lemon Lifeguard', 'a yellow lemon wearing a red cap, sunglasses and a whistle on a cord, confident smile', '#FF6B5A'),
 'frog': ('Party Frog', 'a big-eyed green frog wearing a small blue party hat and blowing a pink party horn, rosy cheeks', '#FFC83D'),
}

def main():
    out = sys.argv[1]
    refdir = os.environ['AV_REFS']
    slugs = sys.argv[2:]
    os.makedirs(out, exist_ok=True)
    refs = []
    for fn in sorted(os.listdir(refdir)):
        if fn.endswith('.png'):
            refs.append({'inline_data': {'mime_type': 'image/png', 'data': base64.b64encode(open(os.path.join(refdir, fn), 'rb').read()).decode()}})
    k = key()
    for slug in slugs:
        name, desc, color = CHARS[slug]
        prompt = f"{STYLE} The sticker circle color is {color}. The character: {name}, {desc}."
        body = {'contents': [{'parts': refs + [{'text': prompt}]}],
                'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '1:1'}}}
        req = urllib.request.Request(
            f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
            data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': k})
        try:
            resp = json.load(urllib.request.urlopen(req, timeout=180))
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:400]
            print(f'{slug}: HTTP {e.code} {msg}')
            continue
        saved = False
        for c in resp.get('candidates', []):
            for p in c.get('content', {}).get('parts', []):
                d = p.get('inlineData') or p.get('inline_data')
                if d:
                    open(os.path.join(out, slug + '.png'), 'wb').write(base64.b64decode(d['data']))
                    saved = True
                    break
            if saved:
                break
        print(f'{slug}: {"ok" if saved else "no image " + json.dumps(resp)[:300]}')

main()
