// FRUIT PIRATES FACTION — Fruit Eaters. A cheerful pirate crew that eats strange glowing Fruits:
// each Fruit gives one minion one wild power, for good. The designer's 30-card list, the Hero Spell
// Feast! and Rubber Captain Ruddy's four Gears.
//
// Fruit (effects.js eatFruit): a spell a friendly minion eats. It gains the Fruit's stats, keywords and
// ability for good. A minion eats only one Fruit, ever (targets need fruitless). Silence strips the power.
// Gear (effects.js gearUp): Ruddy shifts into his next Gear at the end of your turn if he attacked.

const PIRATE = { faction: 'Fruit Pirates', type: 'minion', tribes: ['Pirate'] };
const BEAST = { faction: 'Fruit Pirates', type: 'minion', tribes: ['Beast'] };
const S = { faction: 'Fruit Pirates', type: 'spell' };
const T = { faction: 'Fruit Pirates', type: 'trap' };

const FRUITLESS = { type: 'minion', side: 'friendly', fruitless: true };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const OTHER_FRIENDLY = { minions: { side: 'friendly', excludeSelf: true } };
const MY_TURN_END = { on: 'endOfTurn', filter: { player: 'friendly' } };
const MY_TURN_START = { on: 'startOfTurn', filter: { player: 'friendly' } };
const WHEN_IT_ATTACKS = { on: 'attackDeclared', filter: { source: 'self' } };
// A Fruit: { fruit: { attack?, health?, keywords?, triggers? } } — what the minion that eats it keeps.
const FRUIT = (id, name, art, cost, text, fruit) => ({
  ...S, id, name, art, cost, fruit, text: `Fruit. A friendly minion that hasn't eaten a Fruit ${text}`,
  target: FRUITLESS, effects: [{ op: 'eatFruit', target: 'chosen' }],
});
// Ruddy and his Gears: born fruit eaters (rubber), shifting up at the end of a turn he attacked in.
const GEAR = () => ({ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'gearUp' }] });
const RUDDY = { ...PIRATE, fruitEater: true };

export const FRUIT_PIRATE_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'feast', name: 'Feast!', art: '🍖', heroSpell: true, cost: 2, target: { type: 'minion', side: 'friendly' },
    text: 'Give a friendly minion +1/+1. If it has eaten a Fruit, give it +2/+2 instead.',
    effects: [
      { op: 'buff', target: 'chosen', attack: 1, health: 1 },
      { op: 'buff', target: 'chosen', attack: 1, health: 1, if: { subject: 'chosen', fruitEater: true } },
    ],
  },

  // ---- Minions (19) ----
  {
    ...PIRATE, id: 'cabin_boy', name: 'Cabin Boy', art: '🧹', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Draw a Fruit from your deck.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'draw', count: 1, filter: { fruit: true } }] }],
  },
  { ...BEAST, id: 'parrot_lookout', name: 'Parrot Lookout', art: '🦜', cost: 1, attack: 1, health: 2, keywords: ['Elusive'], text: 'Elusive.' },
  {
    ...BEAST, id: 'powder_monkey', name: 'Powder Monkey', art: '🐒', cost: 1, attack: 1, health: 1,
    text: 'Exit: Deal 2 damage to a random enemy minion.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'damage', target: { randomOf: { minions: { side: 'enemy', alive: true } } }, amount: 2 }] }],
  },
  { ...PIRATE, id: 'deckhand_brawler', name: 'Deckhand Brawler', art: '👊', cost: 2, attack: 3, health: 2, keywords: ['Rush'], text: 'Rush.' },
  {
    ...PIRATE, id: 'fruit_forager', name: 'Fruit Forager', art: '🍍', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Add a random Fruit to your hand.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'addToHand', randomFruit: true }] }],
  },
  {
    ...PIRATE, id: 'slingshot_sniper', name: 'Slingshot Sniper', art: '🎯', cost: 2, attack: 2, health: 1,
    text: 'Arrival: Deal 2 damage to a minion.', target: { type: 'minion', side: 'any' },
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2 }] }],
  },
  {
    ...BEAST, id: 'little_feline_medic', name: 'Little Feline Medic', art: '🐱', cost: 2, attack: 1, health: 4,
    text: 'At the end of your turn, restore 1 Health to your other minions.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'heal', target: OTHER_FRIENDLY, amount: 1 }] }],
  },
  { ...PIRATE, id: 'three_blade_duelist', name: 'Three-Blade Duelist', art: '⚔️', cost: 3, attack: 2, health: 3, keywords: ['Twin Strike'], text: 'Twin Strike.' },
  {
    ...PIRATE, id: 'sea_kitchen_cook', name: 'Sea Kitchen Cook', art: '🍳', cost: 3, attack: 2, health: 4,
    text: 'Arrival: Restore 3 Health to a friendly character and give it +1 Attack.', target: { type: 'character', side: 'friendly' },
    triggers: [{ on: 'battlecry', effects: [{ op: 'heal', target: 'chosen', amount: 3 }, { op: 'buff', target: 'chosen', attack: 1 }] }],
  },
  {
    ...PIRATE, id: 'storm_navigator', name: 'Storm Navigator', art: '🌩️', cost: 3, attack: 2, health: 3,
    text: 'Arrival: Deal 1 damage to all enemy minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 1 }] }],
  },
  {
    ...PIRATE, id: 'seastone_bounty_hunter', name: 'Seastone Bounty Hunter', art: '⛓️', cost: 4, attack: 4, health: 4,
    text: 'Arrival: Silence an enemy minion. If it had eaten a Fruit, destroy it instead.', target: { type: 'minion', side: 'enemy' },
    triggers: [{ on: 'battlecry', effects: [{ op: 'destroy', target: 'chosen', if: { subject: 'chosen', fruitEater: true },
      else: [{ op: 'buff', target: 'chosen', keywords: ['Silenced'] }] }] }],
  },
  {
    ...PIRATE, id: 'many_hands_scholar', name: 'Many-Hands Scholar', art: '🌸', cost: 4, attack: 3, health: 5,
    text: 'Arrival: Freeze all enemy minions with 3 or less Attack.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: { minions: { side: 'enemy', maxAttack: 3 } }, keywords: ['Frozen'] }] }],
  },
  {
    ...PIRATE, id: 'skeleton_drummer', name: 'Skeleton Drummer', art: '🥁', cost: 4, attack: 3, health: 2, keywords: ['Reborn'],
    text: 'Reborn. Your other minions have +1 Attack.',
    aura: { target: OTHER_FRIENDLY, attack: 1 },
  },
  {
    ...PIRATE, id: 'iron_hull_shipwright', name: 'Iron-Hull Shipwright', art: '🔧', cost: 5, attack: 4, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Gain 5 Armor.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'gainArmor', amount: 5 }] }],
  },
  {
    ...PIRATE, id: 'whale_shark_helmsman', name: 'Whale-Shark Helmsman', art: '🌊', cost: 5, attack: 5, health: 5,
    text: "Arrival: Return an enemy minion to its owner's hand.", target: { type: 'minion', side: 'enemy' },
    triggers: [{ on: 'battlecry', effects: [{ op: 'returnToHand', target: 'chosen' }] }],
  },
  {
    faction: 'Fruit Pirates', type: 'minion', tribes: ['Ship'], id: 'the_moon_tiger', name: 'The Moon Tiger', art: '⛵', cost: 6, attack: 4, health: 8, keywords: ['Taunt'],
    text: 'Taunt. At the end of your turn, give a random other friendly minion +1/+1.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'buff', target: { randomOf: OTHER_FRIENDLY }, attack: 1, health: 1 }] }],
  },
  {
    ...BEAST, id: 'sea_queen', name: 'Sea Queen', art: '🐉', cost: 7, attack: 6, health: 6,
    text: 'Arrival: Deal 3 damage to all enemy minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 3 }] }],
  },
  {
    ...RUDDY, id: 'rubber_captain_ruddy', name: 'Rubber Captain Ruddy', art: '🏴‍☠️', cost: 4, attack: 4, health: 4, nextGear: 'ruddy_steam_gear',
    text: 'Born a fruit eater. Gear: at the end of your turn, if he attacked, he shifts into Steam Gear.',
    triggers: [GEAR()],
  },
  {
    ...PIRATE, id: 'old_quakebeard', name: 'Old Quakebeard', art: '🌋', cost: 9, attack: 8, health: 8,
    text: 'Arrival: Deal 3 damage to all other minions and the enemy Hero.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: { minions: { side: 'any', excludeSelf: true } }, amount: 3 },
      { op: 'damage', target: 'enemyHero', amount: 3 },
    ] }],
  },

  // ---- Fruits (7) ----
  FRUIT('flame_fruit', 'Flame Fruit', '🔥', 2, 'gains +2 Attack and "Whenever this attacks, apply Burn 2 to its target."',
    { attack: 2, triggers: [{ ...WHEN_IT_ATTACKS, effects: [{ op: 'applyBurn', target: 'eventTarget', amount: 2 }] }] }),
  FRUIT('smoke_fruit', 'Smoke Fruit', '💨', 2, 'gains +0/+2, Evade, and "At the start of your turn, gain Evade."',
    { health: 2, keywords: ['Evade'], triggers: [{ ...MY_TURN_START, effects: [{ op: 'buff', target: 'self', keywords: ['Evade'] }] }] }),
  FRUIT('frost_fruit', 'Frost Fruit', '❄️', 3, 'gains +1/+2 and "Whenever this attacks a minion, Freeze it."',
    { attack: 1, health: 2, triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [{ op: 'buff', target: 'eventTarget', keywords: ['Frozen'] }] }] }),
  FRUIT('thunder_fruit', 'Thunder Fruit', '⚡', 3, 'gains +1/+1 and "At the end of your turn, deal 2 damage to a random enemy minion."',
    { attack: 1, health: 1, triggers: [{ ...MY_TURN_END, effects: [{ op: 'damage', target: { randomOf: { minions: { side: 'enemy', alive: true } } }, amount: 2 }] }] }),
  FRUIT('magma_fruit', 'Magma Fruit', '🌋', 4, 'gains +2/+2 and "Whenever this attacks, deal 2 damage to the enemy Hero."',
    { attack: 2, health: 2, triggers: [{ ...WHEN_IT_ATTACKS, effects: [{ op: 'damage', target: 'enemyHero', amount: 2 }] }] }),
  FRUIT('light_fruit', 'Light Fruit', '✨', 4, 'gains +1 Attack and Twin Strike.',
    { attack: 1, keywords: ['Twin Strike'] }),
  FRUIT('shadow_pull_fruit', 'Shadow-Pull Fruit', '🌑', 3, 'gains +1/+1, Lifesteal, and "Whenever an enemy minion dies, gain +1/+1."',
    { attack: 1, health: 1, keywords: ['Lifesteal'], triggers: [{ on: 'minionDied', filter: { player: 'enemy' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }] }),

  // ---- Spells (2) ----
  {
    ...S, id: 'treasure_chest', name: 'Treasure Chest', art: '💰', cost: 3,
    text: 'Draw 2 cards. Add a random Fruit to your hand.',
    effects: [{ op: 'draw', count: 2 }, { op: 'addToHand', randomFruit: true }],
  },
  {
    ...S, id: 'set_sail', name: 'Set Sail!', art: '⛵', cost: 3,
    text: 'Give your minions +1/+1 and Rush.',
    effects: [{ op: 'buff', target: { minions: { side: 'friendly' } }, attack: 1, health: 1, keywords: ['Rush'] }],
  },

  // ---- Traps (2) ----
  {
    ...T, id: 'seastone_net', name: 'Seastone Net', art: '🕸️', cost: 2,
    text: 'When an enemy minion attacks: Silence it and deal 2 damage to it.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [{ op: 'buff', target: 'eventSource', keywords: ['Silenced'] }, { op: 'damage', target: 'eventSource', amount: 2 }] },
  },
  {
    ...T, id: 'cannon_ambush', name: 'Cannon Ambush', art: '💣', cost: 2,
    text: 'When your opponent plays a minion: deal 3 damage to it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [{ op: 'damage', target: 'eventSource', amount: 3 }] },
  },

  // ---- Tokens: Ruddy's Gears ----
  {
    ...RUDDY, token: true, id: 'ruddy_steam_gear', name: 'Ruddy, Steam Gear', art: '♨️', cost: 5, attack: 5, health: 5, keywords: ['Twin Strike'], nextGear: 'ruddy_titan_gear',
    text: 'Twin Strike. Gear: at the end of your turn, if he attacked, he shifts into Titan Gear.',
    triggers: [GEAR()],
  },
  {
    ...RUDDY, token: true, id: 'ruddy_titan_gear', name: 'Ruddy, Titan Gear', art: '👊', cost: 6, attack: 8, health: 7, nextGear: 'ruddy_bounce_gear',
    text: 'Whenever he attacks, deal 2 damage to all enemy minions. Gear: at the end of your turn, if he attacked, he shifts into Bounce Gear.',
    triggers: [{ ...WHEN_IT_ATTACKS, effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 2 }] }, GEAR()],
  },
  {
    ...RUDDY, token: true, id: 'ruddy_bounce_gear', name: 'Ruddy, Bounce Gear', art: '💪', cost: 8, attack: 9, health: 9, keywords: ['Evade'], nextGear: 'ruddy_dawn_gear',
    text: 'Evade. At the start of your turn, gain Evade. Gear: at the end of your turn, if he attacked, he shifts into Dawn Gear.',
    triggers: [{ ...MY_TURN_START, effects: [{ op: 'buff', target: 'self', keywords: ['Evade'] }] }, GEAR()],
  },
  {
    ...RUDDY, token: true, id: 'ruddy_dawn_gear', name: 'Ruddy, Dawn Gear', art: '☀️', cost: 10, attack: 12, health: 12, keywords: ['Twin Strike', 'Evade'],
    text: 'Twin Strike. Evade. When he reaches Dawn Gear, give your other minions +2/+2 and Rush.',
    triggers: [{ on: 'gear', effects: [{ op: 'buff', target: OTHER_FRIENDLY, attack: 2, health: 2, keywords: ['Rush'] }] }],
  },
];
