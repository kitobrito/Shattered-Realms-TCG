// FUNGUS FACTION — the designer's complete 30-card list + Hero Spell.
// Text is the designer's wording. Interpretation choices are marked "Ruling:"
// and listed in docs/OPEN_QUESTIONS.md.
//
// Mushroom (global Fungus rule): a Mushroom is attached to a card in the enemy
// deck. When that card is drawn, the enemy Hero takes 1 damage for each
// Mushroom on it, then they are removed. See the placeMushrooms op and the
// engine's `mushrooms` step.
//
// Every Fungus-faction minion carries the 'Fungus' tribe.

const F = { faction: 'Fungus', type: 'minion', tribes: ['Fungus'] };
const S = { faction: 'Fungus', type: 'spell' };
const T = { faction: 'Fungus', type: 'trap' };

const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const FRIENDLY_FUNGUS = { side: 'friendly', tribe: 'Fungus' };
const shrooms = (count, extra = {}) => ({ op: 'placeMushrooms', count, ...extra });

export const FUNGUS_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'spore_infection', name: 'Spore Infection', art: '🍄', heroSpell: true,
    cost: 2,
    text: 'Place 2 Mushrooms onto random cards in the enemy deck. When a card with Mushrooms attached to it is drawn, the enemy Hero takes 1 damage for each Mushroom attached to that card, then those Mushrooms are removed.',
    effects: [shrooms(2)],
  },

  // ---- Minions (16) ----
  {
    ...F, id: 'death_cap', name: 'Death Cap', art: '🍄',
    cost: 3, attack: 3, health: 4, keywords: ['Poisonous'],
    text: 'Poisonous. Exit: Place 2 random Mushrooms onto cards in the enemy deck.',
    triggers: [{ on: 'deathrattle', effects: [shrooms(2)] }],
  },
  {
    ...F, id: 'sporeling', name: 'Sporeling', art: '🌱',
    cost: 1, attack: 1, health: 2, keywords: ['Poisonous'],
    text: 'Poisonous.',
  },
  {
    ...F, id: 'toxic_shroom', name: 'Toxic Shroom', art: '☣️',
    cost: 2, attack: 2, health: 3,
    text: 'Arrival: Place 2 random Mushrooms onto cards in the enemy deck.',
    triggers: [{ on: 'battlecry', effects: [shrooms(2)] }],
  },
  {
    ...F, id: 'rotting_fungus', name: 'Rotting Fungus', art: '🦠',
    cost: 2, attack: 2, health: 3,
    text: 'Arrival: Give an enemy minion -2 Attack until your next turn.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', attack: -2, untilYourNextTurn: true }] }],
  },
  {
    ...F, id: 'venomcap', name: 'Venomcap', art: '🍄',
    cost: 2, attack: 1, health: 4, keywords: ['Poisonous'],
    text: 'Poisonous. Whenever this damages an enemy minion, give it -1 Attack.',
    triggers: [{ on: 'damageDealt', filter: { source: 'self', target: 'enemyMinion' },
      effects: [{ op: 'buff', target: 'eventTarget', attack: -1 }] }],
  },
  {
    ...F, id: 'spore_crawler', name: 'Spore Crawler', art: '🐛',
    cost: 2, attack: 3, health: 3,
    text: 'Whenever this attacks, place 1 Mushroom onto a random card in the enemy deck.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self' }, effects: [shrooms(1)] }],
  },
  {
    ...F, id: 'deathspore', name: 'Deathspore', art: '💀',
    cost: 3, attack: 2, health: 4,
    text: 'Whenever an enemy minion dies, place 1 Mushroom onto a random card in the enemy deck.',
    triggers: [{ on: 'minionDied', filter: { source: { side: 'enemy' } }, effects: [shrooms(1)] }],
  },
  {
    ...F, id: 'blight_shroom', name: 'Blight Shroom', art: '🥀',
    cost: 3, attack: 3, health: 3,
    text: 'Arrival: Give an enemy minion -3/-1.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', attack: -3, health: -1 }] }],
  },
  {
    ...F, id: 'parasitic_fungus', name: 'Parasitic Fungus', art: '🕷️',
    cost: 3, attack: 2, health: 5,
    text: 'Whenever an enemy minion loses Attack or Health, gain +1 Attack.',
    // Ruling: damage counts as losing Health; each loss is one trigger.
    triggers: [{ on: 'minionLostStats', filter: { target: 'enemyMinion' }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...F, id: 'cordyceps_fungus', name: 'Cordyceps Fungus', art: '🧟',
    cost: 4, attack: 3, health: 4,
    text: 'Whenever an enemy minion attacks, place 2 Mushrooms onto random cards in the enemy deck.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [shrooms(2)] }],
  },
  {
    ...F, id: 'plague_mushroom', name: 'Plague Mushroom', art: '☠️',
    cost: 4, attack: 4, health: 5,
    text: 'Arrival: Place 4 random Mushrooms onto cards in the enemy deck.',
    triggers: [{ on: 'battlecry', effects: [shrooms(4)] }],
  },
  {
    ...F, id: 'fungus_giant', name: 'Fungus Giant', art: '🗿',
    cost: 5, attack: 5, health: 6, costPerEnemyMushrooms: 2,
    text: 'Costs 1 less Mana for each 2 Mushrooms in the enemy deck.',
  },
  {
    ...F, id: 'mycelium_lord', name: 'Mycelium Lord', art: '👑',
    cost: 5, attack: 4, health: 6,
    text: 'At the end of your turn, place 1 Mushroom onto a random card in the enemy deck for each enemy minion with reduced Attack.',
    // Ruling: "reduced Attack" = its Attack is below the card's printed Attack.
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' },
      effects: [shrooms(1, { countPer: { minions: { side: 'enemy', reducedAttack: true } } })] }],
  },
  {
    ...F, id: 'rotbeast', name: 'Rotbeast', art: '🐗',
    cost: 6, attack: 6, health: 6, keywords: ['Poisonous'],
    text: 'Poisonous. Whenever this destroys an enemy minion, place 3 Mushrooms onto random cards in the enemy deck.',
    // Ruling: "destroys" = the enemy minion dies from damage this dealt (or its Poisonous).
    triggers: [{ on: 'minionDied', filter: { source: { side: 'enemy' }, killer: 'self' }, effects: [shrooms(3)] }],
  },
  {
    ...F, id: 'the_spore_queen', name: 'The Spore Queen', art: '👸',
    cost: 7, attack: 5, health: 8,
    text: 'At the end of your turn, place 3 Mushrooms onto random cards in the enemy deck. Arrival: Give all enemy minions -2 Attack.',
    triggers: [
      { on: 'endOfTurn', filter: { player: 'friendly' }, effects: [shrooms(3)] },
      { on: 'battlecry', effects: [{ op: 'buff', target: ENEMY_MINIONS, attack: -2 }] },
    ],
  },
  {
    ...F, id: 'the_fungal_colossus', name: 'The Fungal Colossus', art: '🏔️',
    cost: 9, attack: 8, health: 10, keywords: ['Poisonous'],
    text: 'Poisonous. Arrival: Place 10 Mushrooms onto random cards in the enemy deck. Whenever a Mushroom is triggered, gain +1 Attack.',
    // Ruling: +1 Attack per Mushroom that bursts (a card with 3 Mushrooms = +3).
    triggers: [
      { on: 'battlecry', effects: [shrooms(10)] },
      { on: 'mushroomTriggered', effects: [{ op: 'buff', target: 'self', attackPerEventAmount: 1 }] },
    ],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'fungal_infection', name: 'Fungal Infection', art: '🧫',
    cost: 3,
    text: 'Give all enemy minions: "Whenever this minion attacks, place 2 random Mushrooms onto cards in the enemy deck."',
    // Ruling: "the enemy deck" is from the Fungus player's side: the infected minion's own deck.
    effects: [{ op: 'grantTrigger', target: ENEMY_MINIONS, log: 'Enemy minions are infected.',
      trigger: { on: 'attackDeclared', filter: { source: 'self' }, effects: [shrooms(2)] } }],
  },
  {
    ...S, id: 'mushroom_city', name: 'Mushroom City', art: '🏙️',
    cost: 5,
    text: 'Place 10 random Mushrooms onto cards in the enemy deck.',
    effects: [shrooms(10)],
  },
  {
    ...S, id: 'cordyceps_mind_control', name: 'Cordyceps Mind Control', art: '🧠',
    cost: 6, // designer change: was 3 (a permanent steal for 3 was the faction's main win source)
    text: 'Gain control of an enemy minion permanently. It cannot attack this turn.',
    target: ENEMY_MINION,
    effects: [{ op: 'takeControl', target: 'chosen', cantAttack: true }],
  },
  {
    ...S, id: 'consume_decay', name: 'Consume Decay', art: '🍂',
    cost: 4,
    text: 'Give all enemy minions: "Exit: Place 3 Mushrooms onto random cards in the enemy deck."',
    effects: [{ op: 'grantTrigger', target: ENEMY_MINIONS, log: 'Enemy minions begin to decay.',
      trigger: { on: 'deathrattle', effects: [shrooms(3)] } }],
  },
  {
    ...S, id: 'spore_burst', name: 'Spore Burst', art: '💥',
    cost: 4,
    text: 'Deal 3 damage to all enemy minions. For each enemy minion destroyed, place 2 Mushrooms onto random cards in the enemy deck.',
    effects: [{ op: 'damageAll', side: 'enemy', amount: 3, perEnemyKilled: [shrooms(2)] }],
  },
  {
    ...S, id: 'fungal_bloom', name: 'Fungal Bloom', art: '🌸',
    cost: 4,
    text: 'Place 5 Mushrooms onto random cards in the enemy deck. Then give all enemy minions -1 Attack.',
    effects: [shrooms(5), { op: 'buff', target: ENEMY_MINIONS, attack: -1 }],
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'toxic_spores', name: 'Toxic Spores', art: '💨',
    cost: 1,
    text: 'Give a friendly Fungus Poisonous this turn. If it already has Poisonous, place 2 Mushrooms onto random cards in the enemy deck.',
    quickPlay: {},
    target: { type: 'minion', ...FRIENDLY_FUNGUS },
    effects: [
      { ...shrooms(2), if: { subject: 'chosen', keyword: 'Poisonous' } },
      { op: 'buff', target: 'chosen', temporaryKeywords: ['Poisonous'] },
    ],
  },
  {
    ...S, id: 'rapid_decay', name: 'Rapid Decay', art: '⏳',
    cost: 2,
    text: 'Give an enemy minion -4 Health this turn. If this destroys it, place 3 Mushrooms onto random cards in the enemy deck.',
    quickPlay: {},
    target: ENEMY_MINION,
    effects: [
      { op: 'buff', target: 'chosen', health: -4, temporaryHealth: true },
      { ...shrooms(3), if: { subject: 'chosen', dead: true } },
    ],
  },
  {
    ...S, id: 'spore_cloud', name: 'Spore Cloud', art: '☁️',
    cost: 2,
    text: 'When an enemy minion attacks, give it -3 Attack this turn and place 2 Mushrooms onto random cards in the enemy deck.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [{ op: 'buff', target: 'eventSource', attack: -3, temporary: true }, shrooms(2)],
  },
  {
    ...S, id: 'mycelial_rebirth', name: 'Mycelial Rebirth', art: '♻️',
    cost: 3,
    text: 'When a friendly Fungus dies, return it to your hand with +1/+1. Place 2 Mushrooms onto random cards in the enemy deck.',
    // Ruling: it returns as a fresh copy of the card with +1/+1 on its printed stats.
    quickPlay: { windows: ['minionDied'], filter: { source: FRIENDLY_FUNGUS } },
    effects: [{ op: 'addVariantToHand', eventCard: true, attackDelta: 1, healthDelta: 1 }, shrooms(2)],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'hidden_spores', name: 'Hidden Spores', art: '🫥',
    cost: 2,
    text: 'When your opponent draws a card, place 2 Mushrooms onto that card.',
    // Ruling: the Mushrooms go onto the card as it is drawn, so they burst right away (2 damage).
    trap: { on: 'cardDrawn', filter: { player: 'enemy' }, effects: [shrooms(2, { onto: 'eventCard' })] },
  },
  {
    ...T, id: 'toxic_garden', name: 'Toxic Garden', art: '🪴',
    cost: 3,
    text: 'When your opponent plays a minion, give it -3 Attack and Poisonous.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' },
      effects: [{ op: 'buff', target: 'eventSource', attack: -3, keywords: ['Poisonous'] }] },
  },
  {
    ...T, id: 'spore_ambush', name: 'Spore Ambush', art: '🎯',
    cost: 2,
    text: 'When an enemy minion attacks, summon a 2/2 Sporeling with Poisonous. Place 2 Mushrooms onto random cards in the enemy deck.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' },
      effects: [{ op: 'summon', cardId: 'sporeling', attack: 2, health: 2 }, shrooms(2)] },
  },
  {
    ...T, id: 'fungal_contamination', name: 'Fungal Contamination', art: '☢️',
    cost: 4,
    text: 'When your opponent draws a card with Mushrooms attached to it, deal 2 additional damage to their Hero.',
    trap: { on: 'mushroomTriggered', filter: { player: 'enemy' },
      effects: [{ op: 'damage', target: 'enemyHero', amount: 2 }] },
  },
];
