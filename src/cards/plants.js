// PLANTS FACTION — the designer's complete 30-card list + Hero Spell.
// Text is the designer's wording; `pending` marks cards waiting on a rule.
//
// Every Plant-faction minion carries the 'Plant' tribe. Seedlings also carry
// 'Seedling' ("if you control a Seedling"). Seedling rule: 0/1, no Stealth.

const P = { faction: 'Plants', type: 'minion', tribes: ['Plant'] };
const SEEDLING = { faction: 'Plants', type: 'minion', tribes: ['Plant', 'Seedling'] };
const S = { faction: 'Plants', type: 'spell' };
const T = { faction: 'Plants', type: 'trap' };

const FRIENDLY_PLANT = { type: 'minion', side: 'friendly', tribe: 'Plant' };
const FRIENDLY_SEEDLING = { type: 'minion', side: 'friendly', tribe: 'Seedling' };
const ALL_FRIENDLY_PLANTS = { minions: { side: 'friendly', tribe: 'Plant' } };
const MY_TURN_START = { on: 'startOfTurn', filter: { player: 'friendly' } };
const MY_TURN_END = { on: 'endOfTurn', filter: { player: 'friendly' } };
const IF_SEEDLING = { controls: { tribe: 'Seedling' } };

export const PLANT_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'seed_of_growth', name: 'Seed of Growth', art: '🌰', heroSpell: true,
    cost: 1, // was 2; lowered for balance after AI testing
    text: 'Summon a 0/1 Seedling. At the beginning of your turn, it randomly gains +1 Attack or +1 Health.',
    effects: [{ op: 'summon', cardId: 'seedling_of_growth' }],
  },

  // ---- Minions (16) ----
  {
    ...P, id: 'sproutling', name: 'Sproutling', art: '🌱',
    cost: 1, attack: 1, health: 1,
    text: 'At the beginning of your turn, if this has survived, gain +1 Health.',
    // Q: "if this has survived" is always true for a minion still on the board.
    triggers: [{ ...MY_TURN_START, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...P, id: 'vine_crawler', name: 'Vine Crawler', art: '🌿',
    cost: 1, attack: 1, health: 2,
    text: 'Whenever this gains Attack, gain +1 Health.',
    triggers: [{ on: 'attackGained', filter: { target: 'self' }, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...P, id: 'thornling', name: 'Thornling', art: '🌵',
    cost: 1, attack: 1, health: 1,
    text: 'Whenever this takes damage and survives, deal 1 damage to the attacker.',
    // Q: "the attacker" = whatever damaged it (a minion or Hero; not a spell).
    triggers: [{ on: 'damageDealt', filter: { target: 'self' }, effects: [
      { op: 'damage', target: 'eventSource', amount: 1, if: { subject: 'self', alive: true } },
    ] }],
  },
  {
    ...SEEDLING, id: 'wild_seedling', name: 'Wild Seedling', art: '🌾', token: false,
    cost: 2, attack: 0, health: 2,
    text: 'At the beginning of your turn, randomly gain +1 Attack or +1 Health.',
    // Ruling: Wild Seedling counts as a Seedling.
    triggers: [{ ...MY_TURN_START, effects: [{ op: 'randomBuff', target: 'self', options: [{ attack: 1 }, { health: 1 }] }] }],
  },
  {
    ...P, id: 'starflower', name: 'Starflower', art: '✨',
    cost: 2, attack: 1, health: 3,
    text: 'At the end of your turn, if you control a Seedling, gain 1 temporary Mana next turn.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'gainManaNextTurn', amount: 1, if: IF_SEEDLING }] }],
  },
  {
    ...P, id: 'venus_flytrap', name: 'Venus Flytrap', art: '🪴',
    cost: 2, attack: 2, health: 2,
    text: 'Whenever this destroys an enemy minion, gain +1/+1.',
    triggers: [{ on: 'minionDied', filter: { killer: 'self', player: 'enemy' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...P, id: 'growing_vine', name: 'Growing Vine', art: '🍃',
    cost: 2, attack: 1, health: 4,
    text: 'Whenever another friendly Plant gains Attack, gain +1 Attack.',
    // Ruling: Growing Vines don't trigger each other (no infinite loop with copies).
    triggers: [{ on: 'attackGained', filter: { target: { side: 'friendly', tribe: 'Plant', notSelf: true, notCardId: 'growing_vine' } },
      effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...P, id: 'garden_guardian', name: 'Garden Guardian', art: '🛡️',
    cost: 3, attack: 2, health: 5, keywords: ['Taunt'],
    text: 'Taunt. Whenever this gains Health, gain +1 Attack.',
    // Q: healing counts as gaining Health (as do +Health buffs).
    triggers: [{ on: 'healthGained', filter: { target: 'self' }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...P, id: 'sporeflower', name: 'Sporeflower', art: '🌼',
    cost: 3, attack: 2, health: 3,
    text: 'At the end of your turn, summon a 0/1 Seedling.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'summon', cardId: 'seedling' }] }],
  },
  {
    ...P, id: 'entangler', name: 'Entangler', art: '🪢',
    cost: 3, attack: 3, health: 3,
    text: 'Arrival: Give an enemy minion -2 Attack until your next turn.',
    target: { type: 'minion', side: 'enemy' },
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', attack: -2, untilYourNextTurn: true }] }],
  },
  {
    ...P, id: 'ancient_root', name: 'Ancient Root', art: '🌳',
    cost: 4, attack: 3, health: 5,
    text: 'Whenever a friendly Plant dies, gain +1 Health.',
    triggers: [{ on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Plant' } }, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...P, id: 'bloodrose', name: 'Bloodrose', art: '🌹',
    cost: 4, attack: 4, health: 3, keywords: ['Lifesteal'],
    text: 'Lifesteal. Whenever this gains Attack, gain +1 Health.',
    triggers: [{ on: 'attackGained', filter: { target: 'self' }, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...P, id: 'carnivorous_tree', name: 'Carnivorous Tree', art: '🌲',
    cost: 5, attack: 5, health: 5,
    text: 'Whenever this attacks an enemy minion, gain +1/+1 if that minion has less Attack than this.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [
      { op: 'buff', target: 'self', attack: 1, health: 1, if: { subject: 'eventTarget', attackLessThanSelf: true } },
    ] }],
  },
  {
    ...P, id: 'elder_treant', name: 'Elder Treant', art: '🌳',
    cost: 6, attack: 5, health: 7, keywords: ['Taunt'],
    text: 'Taunt. At the beginning of your turn, restore 2 Health to all friendly Plants.',
    triggers: [{ ...MY_TURN_START, effects: [{ op: 'heal', target: ALL_FRIENDLY_PLANTS, amount: 2 }] }],
  },
  {
    ...P, id: 'world_tree', name: 'World Tree', art: '🌍',
    cost: 7, attack: 6, health: 8,
    text: 'At the end of your turn, summon a 0/1 Seedling. If you already control one, give all friendly Plants +1/+1 instead.',
    triggers: [{ ...MY_TURN_END, effects: [{
      op: 'buff', target: ALL_FRIENDLY_PLANTS, attack: 1, health: 1, if: IF_SEEDLING,
      else: [{ op: 'summon', cardId: 'seedling' }],
    }] }],
  },
  {
    ...P, id: 'the_overgrowth', name: 'The Overgrowth', art: '🌴',
    cost: 9, attack: 8, health: 10,
    text: 'Arrival: Summon two 0/1 Seedlings. For each Seedling you control, gain +1/+1.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'summon', cardId: 'seedling', count: 2 },
      { op: 'gainStatsPerCount', attack: 1, health: 1, count: { minions: { side: 'friendly', tribe: 'Seedling' } } },
    ] }],
  },

  // ---- Spells (4) ----
  {
    ...S, id: 'plant_food', name: 'Plant Food', art: '🧪',
    cost: 2,
    text: 'Give a Plant +3 Attack or +3 Health and a random Keyword.',
    target: { type: 'minion', side: 'any', tribe: 'Plant' },
    effects: [
      { op: 'chooseOne', prompt: 'Plant Food', options: [
        { label: '+3 Attack', effects: [{ op: 'buff', target: 'chosen', attack: 3 }] },
        { label: '+3 Health', effects: [{ op: 'buff', target: 'chosen', health: 3 }] },
      ] },
      { op: 'giveRandomKeyword', target: 'chosen' },
    ],
  },
  {
    ...S, id: 'poison_ivy', name: 'Poison Ivy', art: '☠️',
    cost: 2,
    text: 'Give your Plants Poisonous.',
    effects: [{ op: 'buff', target: ALL_FRIENDLY_PLANTS, keywords: ['Poisonous'] }],
  },
  {
    ...S, id: 'super_growth', name: 'Super Growth', art: '💪',
    cost: 10,
    text: 'Give a friendly Seedling +10/+10.',
    target: FRIENDLY_SEEDLING,
    effects: [{ op: 'buff', target: 'chosen', attack: 10, health: 10 }],
  },
  {
    ...S, id: 'rapid_growth', name: 'Rapid Growth', art: '⏩',
    cost: 4,
    text: 'Give a friendly Plant +2/+2. If it is a Seedling, give it an additional +2/+2.',
    target: FRIENDLY_PLANT,
    effects: [
      { op: 'buff', target: 'chosen', attack: 2, health: 2 },
      { op: 'buff', target: 'chosen', attack: 2, health: 2, if: { subject: 'chosen', tribe: 'Seedling' } },
    ],
  },

  // ---- Quick Plays (6) ----
  {
    ...S, id: 'photosynthesis', name: 'Photosynthesis', art: '☀️',
    cost: 1,
    text: 'Restore 3 Health to a friendly Plant. If it is a Seedling, give it +1 Health.',
    quickPlay: {},
    target: FRIENDLY_PLANT,
    effects: [
      { op: 'heal', target: 'chosen', amount: 3 },
      { op: 'buff', target: 'chosen', health: 1, if: { subject: 'chosen', tribe: 'Seedling' } },
    ],
  },
  {
    ...S, id: 'vine_lash', name: 'Vine Lash', art: '🪢',
    cost: 2,
    text: 'Deal 3 damage to an enemy minion. If you control a Seedling, deal 4 instead.',
    quickPlay: {},
    target: { type: 'minion', side: 'enemy' },
    effects: [{ op: 'damage', target: 'chosen', amount: 3, amountIf: { if: IF_SEEDLING, amount: 4 } }],
  },
  {
    ...S, id: 'rooted_defense', name: 'Rooted Defense', art: '🪨',
    cost: 2,
    text: 'Give a friendly Plant +3 Health and Taunt until the end of the turn.',
    quickPlay: {},
    target: FRIENDLY_PLANT,
    effects: [{ op: 'buff', target: 'chosen', health: 3, temporaryHealth: true, temporaryKeywords: ['Taunt'] }],
  },
  {
    ...S, id: 'natural_regrowth', name: 'Natural Regrowth', art: '♻️',
    cost: 3,
    text: 'When a friendly Plant dies, summon a 0/1 Seedling.',
    quickPlay: { windows: ['minionDied'], filter: { source: { side: 'friendly', tribe: 'Plant' } } },
    effects: [{ op: 'summon', cardId: 'seedling' }],
  },
  {
    ...S, id: 'sudden_bloom', name: 'Sudden Bloom', art: '🌸',
    cost: 3,
    text: 'Give a friendly Seedling +3/+3.',
    quickPlay: {},
    target: FRIENDLY_SEEDLING,
    effects: [{ op: 'buff', target: 'chosen', attack: 3, health: 3 }],
  },
  {
    ...S, id: 'overgrown', name: 'Overgrown', art: '🌿',
    cost: 4,
    text: 'When an enemy minion attacks, give it -4 Attack this turn. If you control a Seedling, also Freeze it for 1 turn.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [
      { op: 'buff', target: 'eventSource', attack: -4, temporary: true },
      { op: 'buff', target: 'eventSource', keywords: ['Frozen'], if: IF_SEEDLING },
    ],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'hidden_thorns', name: 'Hidden Thorns', art: '🌵',
    cost: 2,
    text: 'When an enemy minion attacks a friendly Plant, deal 3 damage to the attacker.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: { side: 'friendly', tribe: 'Plant' } },
      effects: [{ op: 'damage', target: 'eventSource', amount: 3 }] },
  },
  {
    ...T, id: 'seed_trap', name: 'Seed Trap', art: '🫘',
    cost: 2,
    text: 'When a friendly Plant dies, summon two 0/1 Seedlings.',
    trap: { on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Plant' } },
      effects: [{ op: 'summon', cardId: 'seedling', count: 2 }] },
  },
  {
    ...T, id: 'predatory_garden', name: 'Predatory Garden', art: '🪤',
    cost: 3,
    text: 'When your opponent plays a minion, give a random friendly Plant +2/+2 and Poisonous this turn.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      { op: 'buff', target: { randomOf: ALL_FRIENDLY_PLANTS }, attack: 2, health: 2, temporaryKeywords: ['Poisonous'] },
    ] },
  },
  {
    ...T, id: 'natures_revenge', name: 'Nature\'s Revenge', art: '🌲',
    cost: 5,
    text: 'When an enemy destroys a friendly Plant, summon a 5/5 Treant with Taunt.',
    trap: { on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Plant' }, killerPlayer: 'enemy' },
      effects: [{ op: 'summon', cardId: 'treant' }] },
  },

  // ---- Tokens ----
  { ...SEEDLING, id: 'seedling', name: 'Seedling', art: '🌱', token: true, cost: 0, attack: 0, health: 1, text: '' },
  {
    ...SEEDLING, id: 'seedling_of_growth', name: 'Seedling', art: '🌱', token: true, cost: 0, attack: 0, health: 1,
    text: 'At the beginning of your turn, randomly gain +1 Attack or +1 Health.',
    triggers: [{ on: 'startOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'randomBuff', target: 'self', options: [{ attack: 1 }, { health: 1 }] }] }],
  },
  { ...P, id: 'treant', name: 'Treant', art: '🌳', token: true, cost: 5, attack: 5, health: 5, keywords: ['Taunt'], text: 'Taunt.' },
];
