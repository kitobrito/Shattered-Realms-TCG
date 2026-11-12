// FRUIT NINJAS FACTION — shinobi of the enchanted orchard. Grow Fruit, Slice Fruit, unleash its power.
// The designer's 30-card list, the Hero Spell Harvest and three Shinobi tokens, plus the Shadow
// Orchard expansion (20, unlockable: stealth, Combo and the big legends).
//
// Fruit (tribe 'Fruit'): a 0/1 minion that can't attack. It carries a `slice` list of effects.
// Slice (effects.js sliceFruit): destroy one of your Fruits to run its slice effects. Only a Slice
//   does that; a Fruit killed any other way just dies. Slice effects pick their targets at random
//   (a friendly boost never lands on another Fruit).
// Multislice (X) (effects.js multislice): Slice up to X of your Fruits, leftmost first.
// Combo (engine playCard): a bonus when you played another card earlier this turn.

const NINJA = { faction: 'Fruit Ninjas', type: 'minion', tribes: ['Ninja'] };
const FRUIT = { faction: 'Fruit Ninjas', type: 'minion', tribes: ['Fruit'], attack: 0, health: 1, cantAttack: true };
const S = { faction: 'Fruit Ninjas', type: 'spell' };
const T = { faction: 'Fruit Ninjas', type: 'trap' };
const X = { extra: true }; // the Shadow Orchard expansion (EXPANSION_NAMES)

// Every Fruit that Harvest and "a random Fruit" can make.
export const FRUIT_IDS = ['blitz_cherry', 'thunder_lemon', 'healing_peach', 'shadow_kiwi', 'iron_coconut',
  'inferno_pineapple', 'frost_grape_cluster', 'phantom_dragonfruit', 'titan_watermelon', 'chrono_starfruit'];

const MY_FRUIT = { type: 'minion', side: 'friendly', tribe: 'Fruit' };
const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const FRIENDLY_NONFRUIT = { minions: { side: 'friendly', notTribe: 'Fruit', alive: true } };
const OTHER_NONFRUIT = { minions: { side: 'friendly', notTribe: 'Fruit', alive: true, excludeSelf: true } };
const ENEMY_MINIONS = { minions: { side: 'enemy', alive: true } };
const ENEMY_CHARACTERS = { characters: { side: 'enemy' } };
const rnd = (sel) => ({ randomOf: sel, aliveOnly: true });
const pick = (from) => ({ op: 'pickRandom', from, as: 'chosen' });

const slice = (target = 'chosen') => ({ op: 'slice', target });
const sliceAny = () => ({ op: 'slice' }); // your leftmost Fruit (no choice: Weapons, Quick Plays)
const summonFruit = (count = 1) => ({ op: 'summon', pool: FRUIT_IDS, count });
const fruitToHand = () => ({ op: 'addToHand', pool: FRUIT_IDS });
const ON_SLICE = (effects, filter = {}) => ({ on: 'fruitSliced', filter: { player: 'friendly', ...filter }, effects });
const ON_FRUIT_SUMMON = (effects) => ({ on: 'minionSummoned', filter: { player: 'friendly', source: { side: 'friendly', tribe: 'Fruit' } }, effects });
const SLICED = { ctxFlag: 'sliced' };
const COMBO = { combo: true };
const weapon = (id, name, attack, durability, triggers) => ({ op: 'equipHeroWeapon', cardId: id, name, attack, durability, triggers });
const AFTER_HERO_ATTACK = (effects) => ({ on: 'afterAttack', filter: { source: 'self' }, effects });

export const FRUIT_NINJA_CARDS = [
  // ---- Hero Spell ----
  {
    // Balance (sims, single realm vs every realm): "Summon a random Fruit" for 2 won 8%. Slicing the
    // oldest Fruit first, at 1 Mana, with every Fruit 1 cheaper, brings it to 52%.
    ...S, id: 'harvest', name: 'Harvest', art: '🧺', heroSpell: true, cost: 1,
    text: 'Slice your leftmost Fruit (if you have one), then summon a random Fruit.',
    effects: [{ op: 'slice', quiet: true }, summonFruit()],
  },

  // ---- Tokens ----
  { ...NINJA, token: true, id: 'phantom_shinobi', name: 'Phantom Shinobi', art: '👤', cost: 2, attack: 2, health: 2, keywords: ['Stealth'], text: 'Stealth.' },
  {
    ...NINJA, token: true, id: 'mirage', name: 'Mirage', art: '🌫️', cost: 1, attack: 1, health: 1, keywords: ['Rush'],
    text: 'Rush. Dies at the end of the turn.',
    triggers: [{ on: 'endOfTurn', effects: [{ op: 'destroy', target: 'self' }] }],
  },
  { ...NINJA, token: true, id: 'orchard_shinobi', name: 'Orchard Shinobi', art: '🥷', cost: 2, attack: 2, health: 2, keywords: ['Rush'], text: 'Rush.' },

  // ---- Apprentice Shinobi (1-10) ----
  {
    ...NINJA, id: 'orchard_initiate', name: 'Orchard Initiate', art: '🍊', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Add a random Fruit to your hand.',
    triggers: [{ on: 'battlecry', effects: [fruitToHand()] }],
  },
  {
    ...NINJA, id: 'cherryblade_scout', name: 'Cherryblade Scout', art: '🍒', cost: 1, attack: 2, health: 1,
    text: 'After you Slice a Fruit, gain Stealth until your next turn.',
    triggers: [ON_SLICE([{ op: 'buff', target: 'self', lingerKeywords: ['Stealth'], untilYourNextTurn: true }])],
  },
  {
    ...NINJA, id: 'citrus_runner', name: 'Citrus Runner', art: '🍋', cost: 1, attack: 1, health: 3,
    text: 'Whenever you summon a Fruit, gain +1 Attack this turn.',
    triggers: [ON_FRUIT_SUMMON([{ op: 'buff', target: 'self', attack: 1, temporary: true }])],
  },
  {
    ...NINJA, id: 'peach_blossom_disciple', name: 'Peach Blossom Disciple', art: '🌸', cost: 2, attack: 2, health: 3,
    text: 'The first time you Slice a Fruit each turn, restore 2 Health to your Hero.',
    triggers: [ON_SLICE([{ op: 'heal', target: 'friendlyHero', amount: 2 }], { firstSlice: true })],
  },
  {
    ...NINJA, ...X, id: 'kiwi_shadowstepper', name: 'Kiwi Shadowstepper', art: '🥝', cost: 2, attack: 3, health: 2,
    text: 'Combo: Gain Stealth until your next turn.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'self', lingerKeywords: ['Stealth'], untilYourNextTurn: true, if: COMBO }] }],
  },
  {
    ...NINJA, id: 'melon_guard', name: 'Melon Guard', art: '🍉', cost: 2, attack: 1, health: 4, keywords: ['Taunt'],
    text: 'Taunt. After you Slice a Fruit, gain +1 Attack.',
    triggers: [ON_SLICE([{ op: 'buff', target: 'self', attack: 1 }])],
  },
  {
    ...NINJA, id: 'razorleaf_apprentice', name: 'Razorleaf Apprentice', art: '🍃', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Your next Slice this turn also deals 1 damage to a random enemy minion.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'sliceBonus', damage: 1 }] }],
  },
  {
    ...NINJA, ...X, id: 'banana_acrobat', name: 'Banana Acrobat', art: '🍌', cost: 2, attack: 3, health: 1, keywords: ['Rush'],
    text: 'Rush. If this survives attacking, return it to your hand at the end of the turn.',
    triggers: [{ on: 'afterAttack', filter: { source: 'self', selfAlive: true }, effects: [{ op: 'returnAtEndOfTurn', target: 'self' }] }],
  },
  {
    ...NINJA, id: 'orchard_lookout', name: 'Orchard Lookout', art: '🔭', cost: 3, attack: 3, health: 3,
    text: 'Whenever you summon a Fruit, give a random other friendly minion +1 Attack this turn.',
    triggers: [ON_FRUIT_SUMMON([{ op: 'buff', target: rnd(OTHER_NONFRUIT), attack: 1, temporary: true }])],
  },
  {
    ...NINJA, id: 'twin_slice_trainee', name: 'Twin-Slice Trainee', art: '⚔️', cost: 3, attack: 2, health: 4, doubleFirstSlice: true,
    text: 'The first Fruit you Slice each turn unleashes its Slice effect twice.',
  },

  // ---- Enchanted Fruits (11-20): 0/1, can't attack ----
  {
    ...FRUIT, id: 'blitz_cherry', name: 'Blitz Cherry', art: '🍒', cost: 0,
    text: "Can't attack. Slice: Give a random friendly minion +2 Attack this turn.",
    slice: [{ op: 'buff', target: rnd(FRIENDLY_NONFRUIT), attack: 2, temporary: true }],
  },
  {
    ...FRUIT, id: 'thunder_lemon', name: 'Thunder Lemon', art: '🍋', cost: 0,
    text: "Can't attack. Slice: Deal 2 damage to a random enemy minion.",
    slice: [{ op: 'damage', target: rnd(ENEMY_MINIONS), amount: 2 }],
  },
  {
    ...FRUIT, id: 'healing_peach', name: 'Healing Peach', art: '🍑', cost: 0,
    text: "Can't attack. Slice: Restore 3 Health to your most damaged character.",
    slice: [{ op: 'heal', target: { mostDamaged: 'friendly' }, amount: 3 }],
  },
  {
    ...FRUIT, ...X, id: 'shadow_kiwi', name: 'Shadow Kiwi', art: '🥝', cost: 0,
    text: "Can't attack. Slice: Give a random friendly minion Stealth until your next turn.",
    slice: [{ op: 'buff', target: rnd(FRIENDLY_NONFRUIT), lingerKeywords: ['Stealth'], untilYourNextTurn: true }],
  },
  {
    ...FRUIT, id: 'iron_coconut', name: 'Iron Coconut', art: '🥥', cost: 1,
    text: "Can't attack. Slice: Give a random friendly minion +0/+3 and Taunt.",
    slice: [{ op: 'buff', target: rnd(FRIENDLY_NONFRUIT), health: 3, keywords: ['Taunt'] }],
  },
  {
    ...FRUIT, id: 'inferno_pineapple', name: 'Inferno Pineapple', art: '🍍', cost: 1,
    text: "Can't attack. Slice: Deal 2 damage to a random enemy minion and 1 damage to the minions next to it.",
    slice: [pick(ENEMY_MINIONS), { op: 'damage', target: { adjacent: 'chosen' }, amount: 1 }, { op: 'damage', target: 'chosen', amount: 2 }],
  },
  {
    ...FRUIT, id: 'frost_grape_cluster', name: 'Frost Grape Cluster', art: '🍇', cost: 1,
    text: "Can't attack. Slice: Freeze a random enemy minion and give it -1 Attack until your next turn.",
    slice: [pick(ENEMY_MINIONS), { op: 'buff', target: 'chosen', keywords: ['Frozen'] }, { op: 'buff', target: 'chosen', attack: -1, untilYourNextTurn: true }],
  },
  {
    ...FRUIT, ...X, id: 'phantom_dragonfruit', name: 'Phantom Dragonfruit', art: '🐉', cost: 2,
    text: "Can't attack. Slice: Summon a 2/2 Phantom Shinobi with Stealth.",
    slice: [{ op: 'summon', cardId: 'phantom_shinobi' }],
  },
  {
    ...FRUIT, id: 'titan_watermelon', name: 'Titan Watermelon', art: '🍉', cost: 2,
    text: "Can't attack. Slice: Give a random friendly minion +2/+2.",
    slice: [{ op: 'buff', target: rnd(FRIENDLY_NONFRUIT), attack: 2, health: 2 }],
  },
  {
    ...FRUIT, ...X, id: 'chrono_starfruit', name: 'Chrono Starfruit', art: '⭐', cost: 3,
    text: "Can't attack. Slice: Return a random friendly minion to your hand. It costs (2) less.",
    slice: [{ op: 'returnToHand', target: rnd(FRIENDLY_NONFRUIT), costChange: -2 }],
  },

  // ---- Elite Shinobi (21-30) ----
  {
    ...NINJA, id: 'pineapple_pyromancer', name: 'Pineapple Pyromancer', art: '🔥', cost: 3, attack: 3, health: 3,
    text: 'Whenever you Slice a Fruit, deal 1 damage to a random enemy minion.',
    triggers: [ON_SLICE([{ op: 'damage', target: rnd(ENEMY_MINIONS), amount: 1 }])],
  },
  {
    ...NINJA, ...X, id: 'grapevine_assassin', name: 'Grapevine Assassin', art: '🍇', cost: 3, attack: 4, health: 2, keywords: ['Stealth'],
    text: 'Stealth. After this attacks a minion, Freeze it.',
    triggers: [{ on: 'afterAttack', filter: { source: 'self', target: 'enemyMinion' }, effects: [{ op: 'buff', target: 'eventTarget', keywords: ['Frozen'] }] }],
  },
  {
    ...NINJA, id: 'coconut_ironfist', name: 'Coconut Ironfist', art: '🥥', cost: 3, attack: 2, health: 5, keywords: ['Taunt'], firstHitEachTurnLess: 1,
    text: 'Taunt. The first damage this takes each turn is reduced by 1.',
  },
  {
    ...NINJA, ...X, id: 'mango_mirage_dancer', name: 'Mango Mirage Dancer', art: '🥭', cost: 4, attack: 3, health: 4,
    text: 'Combo: Summon a 1/1 Mirage with Rush that dies at the end of the turn.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'mirage', if: COMBO }] }],
  },
  {
    ...NINJA, ...X, id: 'dragonfruit_duelist', name: 'Dragonfruit Duelist', art: '🐉', cost: 4, attack: 4, health: 3, keywords: ['Rush'], killAddsFrom: FRUIT_IDS,
    text: 'Rush. Whenever this kills a minion, add a random Fruit to your hand.',
  },
  {
    ...NINJA, ...X, id: 'papaya_windwalker', name: 'Papaya Windwalker', art: '🌬️', cost: 4, attack: 3, health: 5,
    text: 'After you Slice a Fruit, give a random other friendly minion Rush.',
    triggers: [ON_SLICE([{ op: 'buff', target: rnd(OTHER_NONFRUIT), keywords: ['Rush'] }])],
  },
  {
    ...NINJA, id: 'watermelon_executioner', name: 'Watermelon Executioner', art: '🪓', cost: 5, attack: 5, health: 4, target: MY_FRUIT,
    text: 'Arrival: Slice a friendly Fruit. If you do, gain +2/+2.',
    triggers: [{ on: 'battlecry', effects: [slice(), { op: 'buff', target: 'self', attack: 2, health: 2, if: SLICED }] }],
  },
  {
    ...NINJA, ...X, id: 'lychee_mistblade', name: 'Lychee Mistblade', art: '🌫️', cost: 5, attack: 4, health: 5, keywords: ['Elusive'],
    text: 'Elusive. Combo: Give a random other friendly minion Elusive until your next turn.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: rnd(OTHER_NONFRUIT), lingerKeywords: ['Elusive'], untilYourNextTurn: true, if: COMBO }] }],
  },
  {
    ...NINJA, ...X, id: 'starfruit_timecutter', name: 'Starfruit Timecutter', art: '⏳', cost: 5, attack: 4, health: 4, target: FRIENDLY_MINION,
    text: 'Arrival: Return another friendly minion to your hand. It costs (1) less.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'returnToHand', target: 'chosen', costChange: -1 }] }],
  },
  {
    ...NINJA, id: 'grand_orchard_sensei', name: 'Grand Orchard Sensei', art: '🧓', cost: 6, attack: 5, health: 6,
    costAura: { type: 'minion', tribe: 'Fruit', amount: -1 },
    text: 'Your Fruits cost (1) less.',
  },

  // ---- Spells, Quick Plays and Traps (31-40) ----
  {
    ...S, id: 'lightning_fast_julienne', name: 'Lightning-Fast Julienne', art: '⚡', cost: 1, target: MY_FRUIT, target2: FRIENDLY_MINION, target2Optional: true,
    text: 'Slice a friendly Fruit. Give a friendly minion +1 Attack this turn.',
    effects: [slice(), { op: 'buff', target: 'chosen2', attack: 1, temporary: true }],
  },
  {
    ...S, ...X, id: 'perfect_dice', name: 'Perfect Dice', art: '🎲', cost: 1, target: FRIENDLY_MINION, quickPlay: {},
    text: 'Quick Play. Give a friendly minion +0/+2 this turn. If you control a Fruit, it also gets Evade this turn.',
    effects: [
      { op: 'buff', target: 'chosen', health: 2, temporaryHealth: true },
      { op: 'buff', target: 'chosen', temporaryKeywords: ['Evade'], if: { controls: { tribe: 'Fruit' } } },
    ],
  },
  {
    ...S, id: 'fruitstorm_shuriken', name: 'Fruitstorm Shuriken', art: '✴️', cost: 2,
    text: 'Deal 1 damage to three random enemy minions. If you Sliced a Fruit this turn, deal 2 instead.',
    effects: [{ op: 'damage', target: { randomOf: ENEMY_MINIONS, count: 3 }, amount: 1, amountIf: { if: { slicedThisTurn: true }, amount: 2 } }],
  },
  {
    ...S, ...X, id: 'peel_and_vanish', name: 'Peel and Vanish', art: '🍌', cost: 2,
    quickPlay: { windows: ['attackDeclared', 'cardPlayed'], filter: { target: 'friendlyMinion', player: 'enemy' } },
    text: 'Quick Play: when an enemy attack or card targets a friendly minion, return it to your hand. It costs (1) less.',
    effects: [{ op: 'returnToHand', target: 'eventTarget', costChange: -1 }],
  },
  {
    ...S, id: 'sacred_fruit_offering', name: 'Sacred Fruit Offering', art: '⛩️', cost: 2, needsBoardSpace: true,
    text: 'Summon two random Fruits.',
    effects: [summonFruit(2)],
  },
  {
    ...S, id: 'precision_fruitcut', name: 'Precision Fruitcut', art: '🔪', cost: 2, target: MY_FRUIT,
    text: 'Slice a friendly Fruit. Draw a card.',
    effects: [slice(), { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'counter_slice', name: 'Counter-Slice', art: '🛡️', cost: 3, playIf: { controls: { tribe: 'Fruit' } },
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    text: 'Quick Play: when an enemy minion attacks, Slice your leftmost Fruit and give the character it attacks +0/+2 this turn.',
    effects: [sliceAny(), { op: 'buff', target: 'eventTarget', health: 2, temporaryHealth: true }],
  },
  {
    ...S, id: 'blender_barrage', name: 'Blender Barrage', art: '🌀', cost: 3,
    text: 'Multislice (3). Deal 1 damage to a random enemy for each Fruit Sliced.',
    effects: [{ op: 'multislice', count: 3, perSlice: [{ op: 'damage', target: rnd(ENEMY_CHARACTERS), amount: 1 }] }],
  },
  {
    ...T, ...X, id: 'hidden_orchard_ambush', name: 'Hidden Orchard Ambush', art: '🌳', cost: 3,
    text: 'When your opponent summons a minion, summon a 2/2 Orchard Shinobi with Rush. If you control a Fruit, it gets +1 Attack this turn.',
    trap: { on: 'minionSummoned', filter: { player: 'enemy' }, effects: [
      { op: 'summon', cardId: 'orchard_shinobi' },
      { op: 'buff', target: 'summoned', attack: 1, temporary: true, if: { controls: { tribe: 'Fruit' } } },
    ] },
  },
  {
    ...S, id: 'the_thousand_cuts', name: 'The Thousand Cuts', art: '🗡️', cost: 5, target: ENEMY_MINION,
    text: 'Deal 3 damage to an enemy minion. Repeat once for each Fruit you Sliced this turn (up to 3 more times). If it dies, the rest hit random enemy minions.',
    effects: [{ op: 'damage', target: 'chosen', amount: 3 }, { op: 'repeatPerSlice', max: 3, effects: [{ op: 'damage', target: 'chosen', amount: 3 }] }],
  },

  // ---- Legendary Shinobi (41-45) ----
  {
    ...NINJA, id: 'kenzaru_the_thousand_slice_master', name: 'Kenzaru, the Thousand-Slice Master', art: '🥷', cost: 6, attack: 5, health: 5,
    text: 'Arrival: Multislice (3). For each Fruit Sliced, deal 2 damage to a random enemy.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'multislice', count: 3, perSlice: [{ op: 'damage', target: rnd(ENEMY_CHARACTERS), amount: 2 }] }] }],
  },
  {
    ...NINJA, id: 'miyori_the_blossom_blade', name: 'Miyori, the Blossom Blade', art: '🌸', cost: 5, attack: 4, health: 6,
    text: 'The first time you Slice a Fruit each turn, give your other minions +1/+1.',
    triggers: [ON_SLICE([{ op: 'buff', target: OTHER_NONFRUIT, attack: 1, health: 1 }], { firstSlice: true })],
  },
  {
    ...NINJA, ...X, id: 'raiketsu_the_citrus_thunder', name: 'Raiketsu, the Citrus Thunder', art: '⚡', cost: 7, attack: 6, health: 5, keywords: ['Rush'], target: MY_FRUIT,
    text: 'Rush. Arrival: Slice a friendly Fruit. If you do, this can attack twice this turn.',
    triggers: [{ on: 'battlecry', effects: [slice(), { op: 'extraAttack', target: 'self', if: SLICED }] }],
  },
  {
    ...NINJA, ...X, id: 'shizuka_the_phantom_orchard', name: 'Shizuka, the Phantom Orchard', art: '👻', cost: 6, attack: 4, health: 5, keywords: ['Stealth'],
    text: 'Stealth. Arrival: Summon two 2/2 Phantom Shinobi with Stealth.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'phantom_shinobi', count: 2 }] }],
  },
  {
    ...NINJA, ...X, id: 'emperor_pomelo_the_forbidden_harvest', name: 'Emperor Pomelo, the Forbidden Harvest', art: '👑', cost: 8, attack: 7, health: 7,
    text: 'Arrival: Summon three random Fruits. Your next three Slices this turn unleash their effects twice.',
    triggers: [{ on: 'battlecry', effects: [summonFruit(3), { op: 'doubleSlices', count: 3 }] }],
  },

  // ---- Legendary Weapons ----
  {
    ...S, id: 'murakiri_the_forbidden_edge', name: 'Murakiri, the Forbidden Edge', art: '🗡️', cost: 6, attack: 4, durability: 3, heroWeapon: true,
    text: 'After your Hero attacks, Slice your leftmost Fruit.',
    effects: [weapon('murakiri_the_forbidden_edge', 'Murakiri', 4, 3, [AFTER_HERO_ATTACK([sliceAny()])])],
  },
  {
    ...S, ...X, id: 'the_eightfold_harvest', name: 'The Eightfold Harvest', art: '✴️', cost: 5, attack: 2, durability: 8, heroWeapon: true,
    text: 'After your Hero attacks, deal 1 damage to a random enemy minion.',
    effects: [weapon('the_eightfold_harvest', 'The Eightfold Harvest', 2, 8, [AFTER_HERO_ATTACK([{ op: 'damage', target: rnd(ENEMY_MINIONS), amount: 1 }])])],
  },
  {
    ...S, ...X, id: 'kagehana_the_silent_bloom', name: 'Kagehana, the Silent Bloom', art: '🌸', cost: 3, attack: 2, durability: 3, heroWeapon: true,
    text: 'After your Hero attacks, your Hero gains Stealth until your next turn.',
    effects: [weapon('kagehana_the_silent_bloom', 'Kagehana', 2, 3, [AFTER_HERO_ATTACK([{ op: 'buff', target: 'friendlyHero', lingerKeywords: ['Stealth'], untilYourNextTurn: true }])])],
  },
  {
    ...S, id: 'raijins_fang', name: "Raijin's Fang", art: '⚡', cost: 4, attack: 3, durability: 2, heroWeapon: true,
    text: 'After your Hero attacks, Slice your leftmost Fruit. If it was a Thunder Lemon, deal 2 damage to a random enemy minion.',
    effects: [weapon('raijins_fang', "Raijin's Fang", 3, 2, [AFTER_HERO_ATTACK([sliceAny(), { op: 'damage', target: rnd(ENEMY_MINIONS), amount: 2, if: { lastSliced: 'thunder_lemon' } }])])],
  },
  {
    ...S, ...X, id: 'kusanagi_no_kajitsu_the_divine_harvest', name: 'Kusanagi no Kajitsu, the Divine Harvest', art: '🔱', cost: 7, attack: 5, durability: 3, heroWeapon: true,
    text: 'After your Hero attacks, Multislice (2).',
    effects: [weapon('kusanagi_no_kajitsu_the_divine_harvest', 'Kusanagi no Kajitsu', 5, 3, [AFTER_HERO_ATTACK([{ op: 'multislice', count: 2 }])])],
  },
];
