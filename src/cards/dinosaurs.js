// DINOSAUR FACTION — the designer's complete 30-card list + Hero Spell.
// Text is the designer's wording; `pending` marks cards waiting on a rule.
//
// Tribes: Dinosaurs carry 'Dinosaur'; eggs carry 'Egg' (a "Dinosaur Egg").
// Q: eggs are not also Dinosaurs (the list labels them "Egg").

const D = { faction: 'Dinosaurs', type: 'minion', tribes: ['Dinosaur'] };
const EGG = { faction: 'Dinosaurs', type: 'minion', tribes: ['Egg'] };
const S = { faction: 'Dinosaurs', type: 'spell' };
const T = { faction: 'Dinosaurs', type: 'trap' };

export const DINOSAUR_EGGS = ['large_dinosaur_egg', 'nest_of_dinosaur_eggs'];
export const BABY_DINOSAURS = ['baby_t_rex', 'baby_spinosaurus', 'baby_velociraptor', 'baby_triceratops', 'baby_stegosaurus'];
const FRIENDLY_DINO = { side: 'friendly', tribe: 'Dinosaur' };
const FRIENDLY_EGG = { side: 'friendly', tribe: 'Egg' };

export const DINOSAUR_CARDS = [
  // ---- Hero Spell (passive) ----
  {
    ...S, id: 'extinction_cycle', name: 'Extinction Cycle', art: '☄️', heroSpell: true, passive: true,
    cost: 0,
    text: 'Passive. You gain 2 Mana Crystals per turn instead of 1 (only 1 on your first turn); the extra one is Primal Mana. Every 7 turns, EXTINCTION: Destroy all of your Mana Crystals and all friendly minions. Mana progression begins again from 0.',
    // Mana: engine/factions.js. Extinction: engine.js, at the end of the Dinosaur player's turn.
    effects: [],
  },

  // ---- Minions (16) ----
  {
    ...EGG, id: 'large_dinosaur_egg', name: 'Large Dinosaur Egg', art: '🥚',
    cost: 1, attack: 0, health: 3,
    text: 'Exit: Summon a 3/3 Baby T. Rex with Charge.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', cardId: 'baby_t_rex' }] }],
  },
  { ...D, id: 'baby_t_rex', name: 'Baby T. Rex', art: '🦖', cost: 3, attack: 3, health: 3, keywords: ['Charge'], text: 'Charge.' },
  {
    ...D, id: 'baby_spinosaurus', name: 'Baby Spinosaurus', art: '🐊', cost: 3, attack: 3, health: 3, keywords: ['Elusive'],
    text: 'Elusive.',
  },
  { ...D, id: 'baby_velociraptor', name: 'Baby Velociraptor', art: '🦎', cost: 3, attack: 3, health: 1, keywords: ['Lifesteal'], text: 'Lifesteal.' },
  { ...D, id: 'baby_triceratops', name: 'Baby Triceratops', art: '🦏', cost: 3, attack: 2, health: 4, keywords: ['Taunt'], text: 'Taunt.' },
  { ...D, id: 'baby_stegosaurus', name: 'Baby Stegosaurus', art: '🦕', cost: 3, attack: 3, health: 3, keywords: ['Evade'], text: 'Evade.' },
  {
    ...EGG, id: 'nest_of_dinosaur_eggs', name: 'Nest of Dinosaur Eggs', art: '🪺',
    cost: 3, attack: 0, health: 3,
    text: 'Exit: Summon 3 random Baby Dinosaurs.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', pool: BABY_DINOSAURS, count: 3 }] }],
  },
  {
    ...D, id: 'egg_incubator', name: 'Egg Incubator', art: '🌡️',
    cost: 3, attack: 2, health: 3,
    text: 'At the end of your turn, if you control a Dinosaur Egg, summon a copy of it.',
    // Q: with several Eggs, one is copied at random; a "copy" is a fresh copy of the card.
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [
      { op: 'summon', copyOf: { randomOf: { minions: FRIENDLY_EGG } } },
    ] }],
  },
  {
    ...D, id: 'raptor_pack', name: 'Raptor Pack', art: '🦖',
    cost: 2, attack: 2, health: 2,
    text: 'Arrival: Summon a 1/1 Raptor.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'raptor' }] }],
  },
  {
    ...D, id: 'pterodactyl', name: 'Pterodactyl', art: '🦅',
    cost: 3, attack: 3, health: 2,
    text: 'Arrival: Discover a Dinosaur from your deck.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'discover', from: 'deck', filter: { type: 'minion', tribe: 'Dinosaur' } }] }],
  },
  {
    ...D, id: 'fossil_hunter', name: 'Fossil Hunter', art: '⛏️',
    cost: 3, attack: 2, health: 4,
    text: 'Arrival: Draw a Dinosaur Egg.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'draw', filter: { tribe: 'Egg' } }] }],
  },
  { ...D, id: 'triceratops', name: 'Triceratops', art: '🦏', cost: 4, attack: 4, health: 5, keywords: ['Taunt'], text: 'Taunt.' },
  {
    ...D, id: 'spinosaurus', name: 'Spinosaurus', art: '🐊',
    cost: 5, attack: 5, health: 5,
    text: 'Arrival: Deal 2 damage to an enemy minion.',
    target: { type: 'minion', side: 'enemy' },
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2 }] }],
  },
  {
    ...D, id: 'velociraptor_packleader', name: 'Velociraptor Packleader', art: '🦖',
    cost: 4, attack: 3, health: 4,
    text: 'Whenever another friendly Dinosaur attacks, give it +1 Attack this turn.',
    triggers: [{ on: 'attackDeclared', filter: { source: { ...FRIENDLY_DINO, notSelf: true } },
      effects: [{ op: 'buff', target: 'eventSource', attack: 1, temporary: true }] }],
  },
  { ...D, id: 'tyrannosaurus_rex', name: 'Tyrannosaurus Rex', art: '🦖', cost: 8, attack: 8, health: 8, keywords: ['Charge'], text: 'Charge.' },
  {
    ...D, id: 'broodmother', name: 'Broodmother', art: '🐉',
    cost: 5, attack: 4, health: 5,
    text: 'Whenever a friendly Dinosaur Egg is destroyed, summon a copy of that Egg.',
    triggers: [{ on: 'minionDied', filter: { source: FRIENDLY_EGG }, effects: [{ op: 'summon', eventCard: true }] }],
  },

  // ---- Spells (7) ----
  {
    ...S, id: 'extremely_large_meteor', name: 'Extremely Large Meteor', art: '☄️',
    cost: 5,
    text: 'The next time Extinction Cycle activates, it destroys both players\' boards instead of only your board.',
    effects: [{ op: 'setExtinctionMode', mode: 'bothBoards' }],
  },
  {
    ...S, id: 'meteor_shower', name: 'Meteor Shower', art: '🌠',
    cost: 4,
    text: 'The next time Extinction Cycle activates, instead of destroying your friendly minions, destroy 1 random minion at the end of each turn for 3 turns.',
    // Ruling: each of the 3 turn-ends destroys 1 random minion (either side) and 3 of your Mana Crystals.
    effects: [{ op: 'setExtinctionMode', mode: 'meteorShower' }],
  },
  {
    ...S, id: 'not_yet', name: 'Not Yet', art: '✋',
    cost: 3,
    text: 'Delay the next activation of Extinction Cycle by 2 turns.',
    effects: [{ op: 'delayExtinction', turns: 2 }],
  },
  {
    ...S, id: 'fossilization', name: 'Fossilization', art: '🦴',
    cost: 2,
    text: 'Transform a friendly Dinosaur into a Dinosaur Egg with the same Mana Cost. Exit: Summon a random Dinosaur that costs the same as the Egg.',
    target: { type: 'minion', side: 'friendly', tribe: 'Dinosaur' },
    effects: [{ op: 'transform', target: 'chosen', into: 'fossilized_egg', storeCost: true }],
  },
  {
    ...S, id: 'primal_roar', name: 'Primal Roar', art: '📣',
    cost: 4,
    text: 'Give all friendly Dinosaurs +2 Attack this turn. Draw a Dinosaur.',
    effects: [
      { op: 'buff', target: { minions: FRIENDLY_DINO }, attack: 2, temporary: true },
      { op: 'draw', filter: { type: 'minion', tribe: 'Dinosaur' } },
    ],
  },
  {
    ...S, id: 'rapid_evolution', name: 'Rapid Evolution', art: '🧬',
    cost: 5,
    text: 'Transform a friendly Dinosaur into a random Dinosaur that costs 2 more Mana.',
    target: { type: 'minion', side: 'friendly', tribe: 'Dinosaur' },
    effects: [{ op: 'transform', target: 'chosen', pool: { type: 'minion', tribe: 'Dinosaur', costDelta: 2 } }],
  },
  {
    ...S, id: 'egg_retrieval', name: 'Egg Retrieval', art: '🧺',
    cost: 2,
    text: 'Add a copy of a Dinosaur Egg you control to your hand.',
    target: { type: 'minion', side: 'friendly', tribe: 'Egg' },
    effects: [{ op: 'copyToHand', target: 'chosen' }],
  },

  // ---- Quick Plays (3) ----
  {
    ...S, id: 'sudden_stampede', name: 'Sudden Stampede', art: '🐾',
    cost: 2,
    text: 'Give a friendly Dinosaur +3 Attack this turn. It can attack immediately.',
    // Ruling: "attack immediately" = ignores summoning sickness (Charge this turn).
    quickPlay: {},
    target: { type: 'minion', side: 'friendly', tribe: 'Dinosaur' },
    effects: [{ op: 'buff', target: 'chosen', attack: 3, temporary: true, temporaryKeywords: ['Charge'] }],
  },
  {
    ...S, id: 'protective_mother', name: 'Protective Mother', art: '🤱',
    cost: 2,
    text: 'When a friendly Dinosaur would take lethal damage, prevent the damage and give it +2 Health.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: FRIENDLY_DINO, lethal: true } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 'all' },
      { op: 'buff', target: 'eventTarget', health: 2 },
    ],
  },
  {
    ...S, id: 'primitive_instinct', name: 'Primitive Instinct', art: '🧠',
    cost: 3,
    text: 'When a friendly Dinosaur dies, draw a Dinosaur and gain 1 temporary Mana next turn.',
    quickPlay: { windows: ['minionDied'], filter: { source: FRIENDLY_DINO } },
    effects: [
      { op: 'draw', filter: { type: 'minion', tribe: 'Dinosaur' } },
      { op: 'gainManaNextTurn', amount: 1 },
    ],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'hidden_nest', name: 'Hidden Nest', art: '🪺',
    cost: 2,
    text: 'When an enemy minion attacks your Hero, summon a 0/3 Dinosaur Egg.',
    // Ruling: a random Dinosaur Egg.
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' },
      effects: [{ op: 'summon', pool: DINOSAUR_EGGS }] },
  },
  {
    ...T, id: 'territorial_roar', name: 'Territorial Roar', art: '📯',
    cost: 3,
    text: 'When your opponent plays a minion, give a random friendly Dinosaur +3 Attack and Taunt this turn.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      { op: 'buff', target: { randomOf: { minions: FRIENDLY_DINO } }, attack: 3, temporary: true, temporaryKeywords: ['Taunt'] },
    ] },
  },
  {
    ...T, id: 'meteor_impact', name: 'Meteor Impact', art: '💥',
    cost: 3,
    text: 'When a friendly Dinosaur dies, deal 3 damage to a random enemy minion.',
    trap: { on: 'minionDied', filter: { source: FRIENDLY_DINO }, effects: [
      { op: 'damage', target: { randomOf: { minions: { side: 'enemy' } } }, amount: 3 },
    ] },
  },
  {
    ...T, id: 'ancient_ambush', name: 'Ancient Ambush', art: '🌿',
    cost: 4,
    text: 'When your opponent attacks with a minion, summon a random Baby Dinosaur and give it Taunt.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' },
      effects: [{ op: 'summon', pool: BABY_DINOSAURS, keywords: ['Taunt'] }] },
  },

  // ---- Tokens ----
  { ...D, id: 'raptor', name: 'Raptor', art: '🦎', token: true, cost: 1, attack: 1, health: 1, text: '' },
  {
    ...EGG, id: 'fossilized_egg', name: 'Fossilized Egg', art: '🦴', token: true, cost: 0, attack: 0, health: 3,
    text: 'Exit: Summon a random Dinosaur that costs the same as the Dinosaur that became this Egg.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', randomMinion: { tribe: 'Dinosaur', costFromDead: true } }] }],
  },
];
