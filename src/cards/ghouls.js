// GHOULS FACTION — the 24th realm. Flesh-eating ghouls who hide among humans, the CCG investigators
// who hunt them with weapons forged from ghoul organs (Quinques), and the Quinx: humans implanted
// with a ghoul's kakuhou, fighting with both. All characters and Quinques are original.
//
// Three tribes, three styles:
//   Ghoul         regeneration, Lifesteal, Devour, and feeding on Corpses (core.js CORPSE_FACTIONS).
//   Investigator  Quinques (Hero Weapons, like Monster Hunter's) and precise removal.
//   Quinx         human tactics plus a kagune: cheap, sturdy, risky (Frame Release).
// Each kagune type is a second tribe with its own job, and its Kagune card teaches any minion that job:
//   Rinkaku  regenerates and enrages (Regenerate, Rage)
//   Ukaku    fast and ranged (Rush, projectiles)
//   Koukaku  armour and walls (Taunt, Evade, Armor)
//   Bikaku   the precise killing blow (Venomous)
// Corpses: whenever one of your minions dies it leaves a Corpse on your side. Ghoul cards consume
// them for bigger effects, and always do something smaller when there are none.

const G = (kagune) => ({ faction: 'Ghouls', type: 'minion', tribes: ['Ghoul', ...kagune] });
const INV = { faction: 'Ghouls', type: 'minion', tribes: ['Investigator'] };
const QX = (kagune) => ({ faction: 'Ghouls', type: 'minion', tribes: ['Quinx', ...kagune] });
const S = { faction: 'Ghouls', type: 'spell' };
const T = { faction: 'Ghouls', type: 'trap' };
const X = { extra: true }; // the Kakuja Nights expansion (EXPANSION_NAMES)

const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const FRIENDLY_CHARACTER = { type: 'character', side: 'friendly' };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_CHARACTER = { type: 'character', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const ENEMY_CHARACTERS = { characters: { side: 'enemy' } };
const rnd = (from, count = 1) => ({ randomOf: from, count, aliveOnly: true });
const buff = (target, attack, health, extra = {}) => ({ op: 'buff', target, ...(attack ? { attack } : {}), ...(health ? { health } : {}), ...extra });
// Eat a Corpse for the big version, or do the small one when there's none.
const feed = (count, effects, otherwise) => ({ op: 'consumeCorpses', count, effects, otherwise });
// Quinques: Hero Weapons. Their triggers act as the Hero ('self' is the Hero).
const quinque = (cardId, name, attack, durability, triggers, extra = {}) =>
  ({ op: 'equipHeroWeapon', cardId, name, attack, durability, ...(triggers ? { triggers } : {}), ...extra });
const ON_HERO_ATTACK_MINION = { on: 'attackDeclared', filter: { source: 'self', target: { side: 'enemy', type: 'minion' } } };
const AFTER_HERO_ATTACK_MINION = { on: 'afterAttack', filter: { source: 'self', target: { side: 'enemy', type: 'minion' } } };
const AFTER_HERO_ATTACK = { on: 'afterAttack', filter: { source: 'self' } };

export const GHOUL_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'hunter_or_hunted', name: 'Hunter or Hunted', art: '🎭', heroSpell: true, passive: true, cost: 0,
    text: 'Passive. When you build your deck, choose your Hero: a Ghoul with a Kagune, or an Investigator with a Quinque. '
      + 'You start the game holding it. A Kagune is part of the Ghoul: it regains 1 Durability each turn, and when it breaks it starts growing back next turn. '
      + 'A Quinque hits harder, but when it breaks it is gone for good.',
    // The choices (player config heroChoice; engine createGame equips it). regrow: a Kagune grows back (1 Durability a turn; engine startTurn).
    heroChoices: {
      rinkaku: { side: 'Ghoul', label: 'Rinkaku', blurb: 'Lifesteal: every hit heals your Hero.',
        weapon: { cardId: 'rinkaku_kagune', name: 'Rinkaku Kagune', attack: 1, durability: 2, keywords: ['Lifesteal'], regrow: true } },
      ukaku: { side: 'Ghoul', label: 'Ukaku', blurb: 'Ranged: fires shards, so your Hero takes no damage back.',
        weapon: { cardId: 'ukaku_kagune', name: 'Ukaku Kagune', attack: 1, durability: 2, ranged: true, regrow: true } },
      koukaku: { side: 'Ghoul', label: 'Koukaku', blurb: 'Armored: gain 1 Armor after each attack.',
        weapon: { cardId: 'koukaku_kagune', name: 'Koukaku Kagune', attack: 1, durability: 2, regrow: true,
          triggers: [{ ...AFTER_HERO_ATTACK, effects: [{ op: 'gainArmor', amount: 1 }] }] } },
      bikaku: { side: 'Ghoul', label: 'Bikaku', blurb: 'Double hit: your Hero can attack twice a turn.',
        weapon: { cardId: 'bikaku_kagune', name: 'Bikaku Kagune', attack: 1, durability: 2, attacksPerTurn: 2, regrow: true } },
      guillotine: { side: 'Investigator', label: 'Guillotine', blurb: 'Executes: destroys a damaged minion it attacks.',
        weapon: { cardId: 'guillotine', name: 'Guillotine', attack: 2, durability: 2,
          triggers: [{ ...ON_HERO_ATTACK_MINION, effects: [{ op: 'destroy', target: 'eventTarget', if: { subject: 'eventTarget', damaged: true } }] }] } },
      thunderclap: { side: 'Investigator', label: 'Thunderclap', blurb: 'Fires from afar: your Hero takes no damage back.',
        weapon: { cardId: 'thunderclap', name: 'Thunderclap', attack: 2, durability: 2, wand: true } },
      marionette: { side: 'Investigator', label: 'Marionette', blurb: 'Freezes a minion before hitting it.',
        weapon: { cardId: 'marionette', name: 'Marionette', attack: 2, durability: 3,
          triggers: [{ ...ON_HERO_ATTACK_MINION, effects: [buff('eventTarget', 0, 0, { keywords: ['Frozen'] })] }] } },
      gravebreaker: { side: 'Investigator', label: 'Gravebreaker', blurb: 'Each attack hits all enemy minions for 1.',
        weapon: { cardId: 'gravebreaker', name: 'Gravebreaker', attack: 1, durability: 2,
          triggers: [{ ...AFTER_HERO_ATTACK, effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 1 }] }] } },
    },
  },

  // ---- Ghoul minions (6) ----
  {
    ...G(['Rinkaku']), id: 'renji_kurose_the_butcher', name: 'Renji Kurose, The Butcher', art: '🔪', cost: 5, attack: 4, health: 4,
    keywords: ['Rage'], regenerate: 2,
    text: 'Rage. Regenerate 2.',
  },
  {
    ...G(['Ukaku']), id: 'shiori_amagasa_glasswing', name: 'Shiori Amagasa, Glasswing', art: '🦋', cost: 4, attack: 3, health: 2, keywords: ['Rush'],
    text: 'Rush. Arrival: Deal 1 damage to two random enemy minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: rnd(ENEMY_MINIONS, 2), amount: 1 }] }],
  },
  {
    ...G(['Koukaku']), id: 'daigo_iwamine_iron_coffin', name: 'Daigo Iwamine, Iron Coffin', art: '⚰️', cost: 6, attack: 3, health: 5, keywords: ['Taunt', 'Evade'],
    text: 'Taunt. Evade.',
  },
  {
    ...G(['Bikaku']), id: 'natsume_sagara_scorpion', name: 'Natsume Sagara, Scorpion', art: '🦂', cost: 4, attack: 2, health: 2, keywords: ['Stealth', 'Venomous'],
    text: 'Stealth. Venomous.',
  },
  {
    ...G(['Ukaku', 'Rinkaku']), id: 'itsuki_shidara_chimera', name: 'Itsuki Shidara, Chimera', art: '🪽', cost: 7, attack: 5, health: 5, keywords: ['Rush'], regenerate: 2,
    text: 'Rush. Regenerate 2. Arrival: Deal 2 damage to a random enemy minion.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: rnd(ENEMY_MINIONS), amount: 2 }] }],
  },
  {
    ...G(['Rinkaku']), id: 'goro_mikazuki_the_carrion_king', name: 'Goro Mikazuki, The Carrion King', art: '🦅', cost: 8, attack: 5, health: 5,
    keywords: ['Lifesteal', 'Devour'],
    text: 'Lifesteal. Devour. Arrival: Consume up to 4 Corpses. Gain +1/+1 for each.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'consumeCorpses', upTo: 4, each: [buff('self', 1, 1)] }] }],
  },

  // ---- CCG Investigators (4) ----
  {
    ...INV, id: 'reika_fushimi_the_executioner', name: 'Reika Fushimi, The Executioner', art: '✂️', cost: 7, attack: 5, health: 5,
    target: { ...ENEMY_MINION, damaged: true },
    text: 'Arrival: Destroy a damaged enemy minion.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'destroy', target: 'chosen' }] }],
  },
  {
    ...INV, id: 'masato_kirihara_thunderclap', name: 'Masato Kirihara, Thunderclap', art: '⚡', cost: 4, attack: 3, health: 2,
    target: ENEMY_CHARACTER,
    text: 'Arrival: Deal 2 damage to an enemy.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2 }] }],
  },
  {
    ...INV, id: 'akane_shimizu_the_puppeteer', name: 'Akane Shimizu, The Puppeteer', art: '🧵', cost: 3, attack: 2, health: 3,
    target: ENEMY_MINION,
    text: 'Arrival: Freeze an enemy minion.',
    triggers: [{ on: 'battlecry', effects: [buff('chosen', 0, 0, { keywords: ['Frozen'] })] }],
  },
  {
    ...INV, id: 'kenta_obayashi_the_undertaker', name: 'Kenta Obayashi, The Undertaker', art: '🔨', cost: 5, attack: 3, health: 5, heroWeaponAura: true,
    text: "Your Hero's Weapon has +1 Attack. Arrival: Give your Hero's Weapon +1 Durability.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'buffHeroWeapon', durability: 1 }] }],
  },

  // ---- Quinx (5) ----
  {
    ...QX(['Koukaku']), id: 'haruka_minase_the_shield', name: 'Haruka Minase, The Shield', art: '🦀', cost: 2, attack: 1, health: 3, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Gain 2 Armor.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'gainArmor', amount: 2 }] }],
  },
  {
    ...QX(['Bikaku']), id: 'toma_arakida_the_hound', name: 'Toma Arakida, The Hound', art: '🐕', cost: 5, attack: 2, health: 2, keywords: ['Rush', 'Venomous'],
    text: 'Rush. Venomous.',
  },
  {
    ...QX(['Ukaku']), id: 'mio_kisaragi_needlepoint', name: 'Mio Kisaragi, Needlepoint', art: '🪡', cost: 2, attack: 2, health: 1,
    target: ENEMY_CHARACTER,
    text: 'Arrival: Deal 1 damage to an enemy.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 1 }] }],
  },
  {
    ...QX(['Rinkaku']), id: 'sora_yanagihara_the_spider', name: 'Sora Yanagihara, The Spider', art: '🕷️', cost: 3, attack: 3, health: 3, keywords: ['Stealth'],
    text: 'Stealth. After this attacks a minion, Freeze it.',
    triggers: [{ on: 'afterAttack', filter: { source: 'self', target: { type: 'minion' } }, effects: [buff('eventTarget', 0, 0, { keywords: ['Frozen'] })] }],
  },
  {
    ...QX(['Koukaku']), id: 'yuzuki_kurobane_black_lotus', name: 'Yuzuki Kurobane, Black Lotus', art: '🪷', cost: 6, attack: 4, health: 3, keywords: ['Evade', 'Twin Strike'],
    text: 'Evade. Twin Strike.',
  },

  // ---- Kagune (4): each teaches a minion its kagune's job ----
  {
    ...S, id: 'rinkaku_kagune', name: 'Rinkaku Kagune', art: '🐙', cost: 3, target: FRIENDLY_MINION,
    text: 'Give a friendly minion +2/+1 and Rage. Restore 3 Health to it.',
    effects: [buff('chosen', 2, 1, { keywords: ['Rage'] }), { op: 'heal', target: 'chosen', amount: 3 }],
  },
  {
    ...S, id: 'ukaku_kagune', name: 'Ukaku Kagune', art: '🪶', cost: 1, target: FRIENDLY_MINION,
    text: 'Give a friendly minion +1 Attack and Rush. Deal 1 damage to a random enemy minion.',
    effects: [buff('chosen', 1, 0, { keywords: ['Rush'] }), { op: 'damage', target: rnd(ENEMY_MINIONS), amount: 1 }],
  },
  {
    ...S, id: 'koukaku_kagune', name: 'Koukaku Kagune', art: '🛡️', cost: 2, target: FRIENDLY_MINION,
    text: 'Give a friendly minion +0/+2 and Taunt. Gain 2 Armor.',
    effects: [buff('chosen', 0, 2, { keywords: ['Taunt'] }), { op: 'gainArmor', amount: 2 }],
  },
  {
    ...S, id: 'bikaku_kagune', name: 'Bikaku Kagune', art: '🦂', cost: 3, target: FRIENDLY_MINION,
    text: 'Give a friendly minion +1/+1 and Venomous.',
    effects: [buff('chosen', 1, 1, { keywords: ['Venomous'] })],
  },

  // ---- Quinques (4): Hero Weapons ----
  {
    ...S, id: 'guillotine', name: 'Guillotine', art: '✂️', cost: 6, heroWeapon: true, attack: 3, durability: 1,
    text: 'Equip a 3/1 Guillotine. After your Hero attacks a minion, destroy it.',
    effects: [quinque('guillotine', 'Guillotine', 3, 1, [{ ...AFTER_HERO_ATTACK_MINION, effects: [{ op: 'destroy', target: 'eventTarget' }] }])],
  },
  {
    ...S, id: 'thunderclap', name: 'Thunderclap', art: '🔫', cost: 4, heroWeapon: true, attack: 2, durability: 3,
    text: 'Equip a 2/3 Thunderclap. It fires from afar: your Hero takes no damage when attacking with it.',
    effects: [quinque('thunderclap', 'Thunderclap', 2, 3, null, { wand: true })],
  },
  {
    ...S, id: 'marionette', name: 'Marionette', art: '🎎', cost: 3, heroWeapon: true, attack: 1, durability: 3,
    text: 'Equip a 1/3 Marionette. Whenever your Hero attacks a minion, Freeze it first.',
    effects: [quinque('marionette', 'Marionette', 1, 3, [{ ...ON_HERO_ATTACK_MINION, effects: [buff('eventTarget', 0, 0, { keywords: ['Frozen'] })] }])],
  },
  {
    ...S, id: 'gravebreaker', name: 'Gravebreaker', art: '🔨', cost: 6, heroWeapon: true, attack: 3, durability: 2,
    text: 'Equip a 3/2 Gravebreaker. After your Hero attacks, deal 1 damage to all enemy minions.',
    effects: [quinque('gravebreaker', 'Gravebreaker', 3, 2, [{ ...AFTER_HERO_ATTACK, effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 1 }] }])],
  },

  // ---- Armor (1): power with a price ----
  {
    ...S, id: 'arata_prototype', name: 'Arata Prototype', art: '🦾', cost: 5,
    text: 'Gain 6 Armor. Your Hero has +2 Attack this turn. At the start of each of your turns, your Hero loses 1 Health.',
    effects: [
      { op: 'gainArmor', amount: 6 },
      buff('friendlyHero', 2, 0, { temporary: true }),
      { op: 'heroTrigger', trigger: { on: 'startOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'loseHealth', target: 'friendlyHero', amount: 1 }] },
        log: 'The Arata Prototype starts to consume its wearer.' },
    ],
  },

  // ---- Spells (2) ----
  {
    ...S, id: 'rc_cell_regeneration', name: 'RC Cell Regeneration', art: '🧬', cost: 3, target: FRIENDLY_CHARACTER,
    text: 'Restore 4 Health to a friendly character. Consume a Corpse to restore 8 instead.',
    effects: [feed(1, [{ op: 'heal', target: 'chosen', amount: 8 }], [{ op: 'heal', target: 'chosen', amount: 4 }])],
  },
  {
    ...S, id: 'cannibalistic_evolution', name: 'Cannibalistic Evolution', art: '🍖', cost: 3, target: FRIENDLY_MINION,
    text: 'Give a friendly minion +2/+2 and Devour. Consume 2 Corpses to also give it Lifesteal.',
    effects: [buff('chosen', 2, 2, { keywords: ['Devour'] }), feed(2, [buff('chosen', 0, 0, { keywords: ['Lifesteal'] })], [])],
  },

  // ---- Traps (2) ----
  {
    ...T, id: 'ccg_ambush', name: 'CCG Ambush', art: '🚨', cost: 4,
    text: 'When your opponent summons a minion, deal 3 damage to it.',
    trap: { on: 'minionSummoned', filter: { player: 'enemy' }, effects: [{ op: 'damage', target: 'eventSource', amount: 3 }] },
  },
  {
    ...T, id: 'hidden_predator', name: 'Hidden Predator', art: '🎭', cost: 4,
    text: 'When an enemy minion attacks, deal 2 damage to it and summon a 2/2 Masked Ghoul with Stealth.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [
      { op: 'damage', target: 'eventSource', amount: 2 },
      { op: 'summon', cardId: 'masked_ghoul' },
    ] },
  },

  // ---- Quick Plays (2) ----
  {
    ...S, id: 'kagune_counterattack', name: 'Kagune Counterattack', art: '💥', cost: 3,
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    text: 'Quick Play: when an enemy minion attacks, deal 3 damage to it.',
    effects: [{ op: 'damage', target: 'eventSource', amount: 3 }],
  },
  {
    ...S, id: 'emergency_frame_release', name: 'Emergency Frame Release', art: '🧷', cost: 2, target: FRIENDLY_MINION, quickPlay: {},
    text: 'Quick Play. Give a friendly minion +3/+3 and Recoil. If it is a Quinx, give it +4/+4 instead.',
    effects: [
      { op: 'buff', target: 'chosen', attack: 4, health: 4, keywords: ['Recoil'], if: { subject: 'chosen', tribe: 'Quinx' },
        else: [{ op: 'buff', target: 'chosen', attack: 3, health: 3, keywords: ['Recoil'] }] },
    ],
  },

  // ---- Kakuja Nights (expansion): four Legendaries, swapped into a deck from the collection ----
  {
    ...G(['Kakuja']), ...X, id: 'mukuro_the_thousand_mouthed', name: 'Mukuro, the Thousand-Mouthed', art: '👄', cost: 9, attack: 7, health: 7,
    keywords: ['Devour', 'Lifesteal'], regenerate: 3,
    text: 'Devour. Lifesteal. Regenerate 3. Arrival: Consume up to 3 Corpses. For each, deal 3 damage to a random enemy minion.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'consumeCorpses', upTo: 3, each: [{ op: 'damage', target: rnd(ENEMY_MINIONS), amount: 3 }] }] }],
  },
  {
    ...INV, ...X, id: 'ren_takamori_arata_vanguard', name: 'Captain Ren Takamori, Arata Vanguard', art: '🛡️', cost: 6, attack: 4, health: 6,
    keywords: ['Taunt'], heroWeaponAura: true,
    text: "Taunt. Your Hero's Weapon has +1 Attack. Arrival: Gain 4 Armor and give your Hero's Weapon +1 Durability.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'gainArmor', amount: 4 }, { op: 'buffHeroWeapon', durability: 1 }] }],
  },
  {
    ...QX(['Rinkaku', 'Ukaku', 'Koukaku', 'Bikaku']), ...X, id: 'aiko_sendo_frameless', name: 'Aiko Sendo, Frameless', art: '💢', typeLine: 'Quinx · Every Kagune', cost: 5, attack: 5, health: 6,
    keywords: ['Rush', 'Twin Strike', 'Lifesteal'],
    text: 'Rush. Twin Strike. Lifesteal. Every frame released: at the end of your turn, she takes 2 damage.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'damage', target: 'self', amount: 2 }] }],
  },
  {
    ...S, ...X, id: 'requiem', name: 'Requiem', art: '⚰️', cost: 8, heroWeapon: true, attack: 3, durability: 3, frameArt: 'art/frames/legendary-weapon-ghouls.png',
    text: 'Equip a 3/3 Requiem with Lifesteal. After your Hero attacks a minion, destroy it.',
    effects: [quinque('requiem', 'Requiem', 3, 3, [{ ...AFTER_HERO_ATTACK_MINION, effects: [{ op: 'destroy', target: 'eventTarget' }] }], { keywords: ['Lifesteal'] })],
  },

  // ---- Token ----
  {
    ...G([]), id: 'masked_ghoul', name: 'Masked Ghoul', art: '🎭', token: true, cost: 2, attack: 2, health: 2, keywords: ['Stealth'],
    text: 'Stealth.',
  },
];
