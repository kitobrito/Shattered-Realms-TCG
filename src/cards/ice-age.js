// ICE AGE FACTION — Survive the Long Winter. Big hardy beasts and neanderthal tribes that wall up
// and outlast. The designer's 30-card list, the passive Hero Spell The Great Freeze and the
// Cave Bear Cub token.
//
// The Great Freeze (engine.js greatFreeze): at the end of every 4th turn of the Ice Age player,
// every character without Thick Fur is Frozen (both sides, Heroes too).
// Thick Fur (effects.js addKeyword): can't be Frozen. Hardy (core.js dealDamage): takes 1 less
// damage from each hit, never less than 1.

const BEAST = { faction: 'Ice Age', type: 'minion', tribes: ['Beast'] };
const MAN = { faction: 'Ice Age', type: 'minion', tribes: ['Neanderthal'] };
const S = { faction: 'Ice Age', type: 'spell' };
const T = { faction: 'Ice Age', type: 'trap' };

const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const FRIENDLY_MINIONS = { minions: { side: 'friendly' } };
const OTHER_FRIENDLY = { minions: { side: 'friendly', excludeSelf: true } };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const FREEZE = (target) => ({ op: 'buff', target, keywords: ['Frozen'] });
const MY_TURN_END = { on: 'endOfTurn', filter: { player: 'friendly' } };

export const ICE_AGE_CARDS = [
  // ---- Hero Spell (passive) ----
  {
    ...S, id: 'the_great_freeze', name: 'The Great Freeze', art: '❄️', heroSpell: true, passive: true, cost: 0,
    text: 'Passive. At the end of every 4th turn of yours, every character without Thick Fur is Frozen (both sides, Heroes too).',
    effects: [],
  },

  // ---- Minions (18) ----
  { ...BEAST, id: 'arctic_fox', name: 'Arctic Fox', art: '🦊', cost: 1, attack: 1, health: 2, keywords: ['Thick Fur'], text: 'Thick Fur.' },
  {
    ...MAN, id: 'neanderthal_gatherer', name: 'Neanderthal Gatherer', art: '🧺', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Restore 2 Health to your Hero.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'heal', target: 'friendlyHero', amount: 2 }] }],
  },
  {
    ...BEAST, id: 'cave_hyena', name: 'Cave Hyena', art: '🐺', cost: 2, attack: 2, health: 2,
    text: 'Whenever a minion dies, gain +1 Health.',
    triggers: [{ on: 'minionDied', effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...MAN, id: 'neanderthal_spearman', name: 'Neanderthal Spearman', art: '🔱', cost: 2, attack: 2, health: 3,
    text: 'Arrival: Deal 1 damage to a minion.',
    target: { type: 'minion', side: 'any' },
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 1 }] }],
  },
  {
    ...BEAST, id: 'dire_wolf', name: 'Dire Wolf', art: '🐺', cost: 3, attack: 3, health: 4, keywords: ['Thick Fur'],
    text: 'Thick Fur. Has +2 Attack while an enemy minion is Frozen.',
    aura: { target: 'self', attack: 2, if: { enemyFrozen: true } },
  },
  { ...BEAST, id: 'glyptodon', name: 'Glyptodon', art: '🐢', cost: 3, attack: 1, health: 6, keywords: ['Taunt', 'Hardy'], text: 'Taunt. Hardy.' },
  {
    ...MAN, id: 'neanderthal_firekeeper', name: 'Neanderthal Firekeeper', art: '🔥', cost: 3, attack: 2, health: 4,
    text: 'At the end of your turn, restore 1 Health to your other minions.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'heal', target: OTHER_FRIENDLY, amount: 1 }] }],
  },
  {
    ...MAN, id: 'cave_painter', name: 'Cave Painter', art: '🎨', cost: 3, attack: 2, health: 4,
    text: 'Arrival: The next Great Freeze comes 1 turn sooner.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'hastenFreeze', turns: 1 }] }],
  },
  {
    ...BEAST, id: 'cave_lion', name: 'Cave Lion', art: '🦁', cost: 4, attack: 4, health: 4, keywords: ['Thick Fur'],
    text: 'Thick Fur. Arrival: Deal 2 damage to a Frozen enemy minion.',
    target: { type: 'minion', side: 'enemy', frozen: true },
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2 }] }],
  },
  {
    ...BEAST, id: 'sabertooth_cat', name: 'Sabertooth Cat', art: '🐅', cost: 4, attack: 4, health: 3, keywords: ['Rush', 'Thick Fur'], doubleVsFrozen: true,
    text: 'Rush. Thick Fur. Deals double damage to Frozen minions.',
  },
  {
    ...BEAST, id: 'giant_beaver', name: 'Giant Beaver', art: '🦫', cost: 4, attack: 2, health: 6,
    text: 'Arrival: Give a friendly minion +0/+2 and Taunt.',
    target: FRIENDLY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', health: 2, keywords: ['Taunt'] }] }],
  },
  {
    ...BEAST, id: 'irish_elk', name: 'Irish Elk', art: '🦌', cost: 5, attack: 4, health: 6, keywords: ['Thick Fur'],
    text: 'Thick Fur. Arrival: Freeze an enemy minion.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [FREEZE('chosen')] }],
  },
  { ...BEAST, id: 'cave_bear', name: 'Cave Bear', art: '🐻', cost: 5, attack: 4, health: 7, keywords: ['Taunt', 'Hardy'], text: 'Taunt. Hardy.' },
  { ...BEAST, id: 'woolly_rhinoceros', name: 'Woolly Rhinoceros', art: '🦏', cost: 5, attack: 4, health: 5, keywords: ['Rush', 'Thick Fur'], text: 'Rush. Thick Fur.' },
  {
    ...BEAST, id: 'giant_ground_sloth', name: 'Giant Ground Sloth', art: '🦥', cost: 6, attack: 2, health: 9, keywords: ['Taunt'],
    text: 'Taunt. At the end of your turn, restore 2 Health to this minion.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'heal', target: 'self', amount: 2 }] }],
  },
  {
    ...MAN, id: 'grog_the_neanderthal_chieftain', name: 'Grog, the Neanderthal Chieftain', art: '👑', cost: 7, attack: 5, health: 8, keywords: ['Taunt'],
    text: 'Taunt. Your other minions have Hardy.',
    aura: { target: OTHER_FRIENDLY, keywords: ['Hardy'] },
  },
  { ...BEAST, id: 'woolly_mammoth', name: 'Woolly Mammoth', art: '🦣', cost: 7, attack: 5, health: 8, keywords: ['Taunt', 'Thick Fur', 'Hardy'], text: 'Taunt. Thick Fur. Hardy.' },
  {
    ...BEAST, id: 'old_tusker_the_herd_mother', name: 'Old Tusker, the Herd Mother', art: '🦣', cost: 9, attack: 6, health: 10, keywords: ['Taunt', 'Thick Fur'],
    text: 'Taunt. Thick Fur. Arrival: Give your other minions +0/+2 and Thick Fur.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: OTHER_FRIENDLY, health: 2, keywords: ['Thick Fur'] }] }],
  },

  // ---- Spells (8) ----
  {
    ...S, id: 'thick_fur_cloak', name: 'Thick Fur Cloak', art: '🧥', cost: 1,
    text: 'Give a minion +0/+3 and Thick Fur.', target: { type: 'minion', side: 'any' },
    effects: [{ op: 'buff', target: 'chosen', health: 3, keywords: ['Thick Fur'] }],
  },
  {
    ...S, id: 'huddle_for_warmth', name: 'Huddle for Warmth', art: '🫂', cost: 2,
    text: 'Give your minions +0/+2.',
    effects: [{ op: 'buff', target: FRIENDLY_MINIONS, health: 2 }],
  },
  {
    ...S, id: 'flint_spear_volley', name: 'Flint Spear Volley', art: '🗡️', cost: 2,
    text: 'Deal 3 damage to a minion. If it is Frozen, deal 5 instead.', target: { type: 'minion', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 3, amountIf: { if: { subject: 'chosen', keyword: 'Frozen' }, amount: 5 } }],
  },
  {
    ...S, id: 'campfire', name: 'Campfire', art: '🔥', cost: 3,
    text: 'Restore 3 Health to all friendly characters.',
    effects: [{ op: 'heal', target: { characters: { side: 'friendly' } }, amount: 3 }],
  },
  {
    ...S, id: 'survival_of_the_fittest', name: 'Survival of the Fittest', art: '🦣', cost: 3,
    text: 'Draw 2 cards. If you control a minion with 8 or more Health, draw 3 instead.',
    effects: [{ op: 'draw', count: 3, if: { controls: { minHealth: 8 } }, else: [{ op: 'draw', count: 2 }] }],
  },
  {
    ...S, id: 'glacial_fortress', name: 'Glacial Fortress', art: '🧊', cost: 4,
    text: 'Give a friendly minion +2/+4 and Taunt.', target: FRIENDLY_MINION,
    effects: [{ op: 'buff', target: 'chosen', attack: 2, health: 4, keywords: ['Taunt'] }],
  },
  {
    ...S, id: 'avalanche', name: 'Avalanche', art: '🏔️', cost: 5,
    text: 'Deal 2 damage to all enemy minions. Freeze the survivors.',
    effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 2, freeze: true }],
  },
  {
    ...S, id: 'ice_storm', name: 'Ice Storm', art: '🌨️', cost: 6,
    text: 'Freeze all enemy characters. Draw a card.',
    effects: [FREEZE({ characters: { side: 'enemy' } }), { op: 'draw', count: 1 }],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'pitfall_snare', name: 'Pitfall Snare', art: '🕳️', cost: 2,
    text: 'When an enemy minion attacks: deal 2 damage to it and Freeze it.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [{ op: 'damage', target: 'eventSource', amount: 2, freeze: true }] },
  },
  {
    ...T, id: 'hidden_den', name: 'Hidden Den', art: '🐻', cost: 2,
    text: 'When your Hero takes damage: summon a 2/5 Cave Bear Cub with Taunt.',
    trap: { on: 'damageDealt', filter: { target: 'friendlyHero' }, effects: [{ op: 'summon', cardId: 'cave_bear_cub' }] },
  },
  {
    ...T, id: 'thin_ice', name: 'Thin Ice', art: '🧊', cost: 1,
    text: 'When your opponent plays a minion: Freeze it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [FREEZE('eventSource')] },
  },
  {
    ...T, id: 'hunker_down', name: 'Hunker Down', art: '🛡️', cost: 2,
    text: 'When an enemy minion attacks your Hero: gain 6 Armor.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [{ op: 'gainArmor', amount: 6 }] },
  },

  // ---- Token ----
  { ...BEAST, id: 'cave_bear_cub', name: 'Cave Bear Cub', art: '🐻', token: true, cost: 3, attack: 2, health: 5, keywords: ['Taunt'], text: 'Taunt.' },
];
