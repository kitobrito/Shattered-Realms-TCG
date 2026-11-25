# Card placement and attack input

Battle input shares the same `drag.js` controller and `card-motion.js` helpers in Shattered TCG and Anime Clash.

- Played minions travel from the held card into the selected board slot, then settle with a short bounce, shadow, impact ring and landing sound. Spells, traps and equipment have a short put-down before resolving.
- Drag an attacking minion or Hero directly onto a legal enemy. The character follows the pointer, the target highlights, and release produces a quick impact and return. Tap the attacker then the target still works. Targeted spells retain their aiming arrow.
- Targeting uses the engine's legal defenders. Fast crossings allow only a small edge overshoot (10 px mouse / 18 px touch) within 100 ms. A directional fling across empty space does not choose a target.
- Invalid releases, Escape, pointer cancellation and leaving the battle remove held copies and restore the original piece. Reduced motion uses short fades instead of travel, bounce and board shake.

Run `node tools/test-card-motion.mjs` for hit testing, legal-target exclusion and fast crossing checks. Serve the checkout, then run `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/test-card-motion-browser.mjs` for actual desktop and phone battle input. `MOTION_TEST_URL` overrides the local URL; `MENU_BROWSER=webkit` selects WebKit; `REDUCED_MOTION=1` checks reduced motion. Browser screenshots are written under `dist/card-motion-checks/`.
