anything

### Shared weapon card frame

Weapon cards use the supplied green frame with a blue Mana orb and bottom Attack/Durability sockets. This includes equipment spells, Wands, relics, and Legendary weapons in both card appearance settings. Minion/spell frames and gameplay rules are unchanged. The overlay lives at `art/frames/weapon-universal.webp`; its art window and outer silhouette have real alpha transparency.

Check rendering with `node tools/test-weapon-frame.mjs`. Browser geometry checks: serve the repository at port 4185 and run `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/test-weapon-frame-browser.mjs`. Existing Arsenal, Robots and Witches rule suites remain passing.
