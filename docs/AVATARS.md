# Player avatars

20 silly sticker avatars that players get when they join (random by default, one-tap shuffle or pick).

| slug | name | slug | name |
|---|---|---|---|
| goose | Silly Goose | snail | Snail Mail |
| tomato | Tow Truck Tomato | waffle | Waffle Wizard |
| pickle | Pickle Pilot | broccoli | Broccoli Rockstar |
| donut | Disco Donut | moon | Moody Moon |
| cactus | Sleepy Cactus | cupcake | Cupcake Knight |
| toast | Toast Ghost | penguin | Sweater Penguin |
| avocado | Avocado Astronaut | jelly | Jelly Jellyfish |
| cloud | Grumpy Cloud | egg | Egg Roll |
| banana | Banana Detective | lemon | Lemon Lifeguard |
| taco | Taco Cat | frog | Party Frog |

**Files (not in the repo):** Google Drive → `My Drive/Dev Assets/Ladle/marketing/avatars-v2/`
- `transparent-512/` — use these in the app (crisp up to 256 CSS px)
- `transparent-1024/` — marketing and print
- `source-raw/` — original 1024px generations on a cream background

`avatars-v1/` holds the first five made in Canva, used as the style reference.

**Regenerating:** `tools/avatars/gen.py` (Gemini `gemini-3-pro-image-preview`, key read from `server/.env`) and `tools/avatars/cutout.py` (removes the background, exports 1024 and 512).
