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
// Expansion cards use this wider list (adds the expansion's Baby Dinosaurs).
export const ALL_BABY_DINOSAURS = [...BABY_DINOSAURS, 'nestling_triceratops', 'pterodactyl_hatchling'];
const FRIENDLY_DINO = { side: 'friendly', tribe: 'Dinosaur' };
const FRIENDLY_EGG = { side: 'friendly', tribe: 'Egg' };

export const DINOSAUR_CARDS = [
  // ---- Hero Spell (passive) ----
  {
    ...S, id: 'extinction_cycle', name: 'Extinction Cycle', art: '☄️', heroSpell: true, passive: true,
    cost: 0,
    text: "Passive. Gain 2 Mana Crystals a turn (1 on your first turn); the extra one is Primal Mana. Every 7 turns, EXTINCTION: destroy all your Mana Crystals and friendly minions.",
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
    text: "Your next Extinction instead destroys 1 random minion at each turn's end for 3 turns, plus all your Primal Mana. No Primal Mana until it ends.",
    // Ruling: each of the 3 turn-ends destroys 1 random minion (either side). Normal Mana Crystals are kept.
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
    text: "Transform a friendly Dinosaur into a Dinosaur Egg of the same cost. Exit: Summon a random Dinosaur of that cost.",
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

  // ---- Expansion: Babies, Eggs & Evolution (15 extra cards) ----
  // `extra`: not in the standard 30; players swap them in ("Swap cards").
  // "Summon a 0/3 Dinosaur Egg" = a random 0/3 Egg, as with Hidden Nest.
  {
    ...D, id: 'hatchling_keeper', name: 'Hatchling Keeper', art: '🧺', extra: true, cost: 2, attack: 2, health: 3,
    text: 'Arrival: Summon a 0/3 Dinosaur Egg.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', pool: DINOSAUR_EGGS }] }],
  },
  {
    ...D, id: 'nestling_triceratops', name: 'Nestling Triceratops', art: '🦏', extra: true, cost: 2, attack: 2, health: 2,
    text: 'Baby Dinosaur. Exit: Summon a 0/3 Dinosaur Egg.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', pool: DINOSAUR_EGGS }] }],
  },
  {
    ...D, id: 'raptor_brood', name: 'Raptor Brood', art: '🦖', extra: true, cost: 3, attack: 3, health: 2,
    text: 'Arrival: Summon two 1/1 Raptors.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'raptor', count: 2 }] }],
  },
  {
    ...D, id: 'eggguard_ankylosaur', name: 'Eggguard Ankylosaur', art: '🛡️', extra: true, cost: 3, attack: 2, health: 4, keywords: ['Taunt'],
    guardsEggsFromSpells: true,
    text: 'Taunt. Your Dinosaur Eggs can\'t be targeted by enemy spells.',
  },
  {
    ...D, id: 'pterodactyl_hatchling', name: 'Pterodactyl Hatchling', art: '🐣', extra: true, cost: 3, attack: 2, health: 3,
    text: 'Baby Dinosaur. Arrival: Give a friendly Dinosaur Egg +1 Health. Exit: If you control a Dinosaur Egg, draw a Dinosaur Egg.',
    // Ruling: "if it survives" = you still have an Egg when this leaves play.
    target: { type: 'minion', side: 'friendly', tribe: 'Egg' },
    triggers: [
      { on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', health: 1 }] },
      { on: 'deathrattle', effects: [{ op: 'draw', filter: { tribe: 'Egg' }, if: { controls: { tribe: 'Egg' } } }] },
    ],
  },
  {
    ...D, id: 'nesting_mother', name: 'Nesting Mother', art: '🦕', extra: true, cost: 4, attack: 3, health: 5,
    text: 'At the end of your turn, if you control a Dinosaur Egg, summon a 1/1 Baby Raptor.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'summon', cardId: 'baby_raptor', if: { controls: { tribe: 'Egg' } } }] }],
  },
  {
    ...D, id: 'brood_architect', name: 'Brood Architect', art: '🏗️', extra: true, cost: 5, attack: 3, health: 6,
    firstEggDiscount: 1,
    text: 'Whenever you summon a Dinosaur Egg, give it +1 Health. The first Egg you play each turn costs (1) less.',
    triggers: [{ on: 'minionSummoned', filter: { source: FRIENDLY_EGG }, effects: [{ op: 'buff', target: 'eventSource', health: 1 }] }],
  },
  {
    ...EGG, id: 'colossal_brood_egg', name: 'Colossal Brood Egg', art: '🥚', extra: true, cost: 5, attack: 0, health: 6,
    text: 'Exit: Summon two random Baby Dinosaurs.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', pool: ALL_BABY_DINOSAURS, count: 2 }] }],
  },
  {
    ...S, id: 'relocate_the_nest', name: 'Relocate the Nest', art: '🧳', extra: true, cost: 1,
    text: 'Return a friendly Dinosaur Egg to your hand. It costs (2) less.',
    target: { type: 'minion', side: 'friendly', tribe: 'Egg' },
    effects: [{ op: 'returnToHand', target: 'chosen', costChange: -2 }],
  },
  {
    ...S, id: 'accelerated_incubation', name: 'Accelerated Incubation', art: '⚗️', extra: true, cost: 2,
    text: 'Give a friendly Dinosaur Egg +2 Health. The next time it leaves play (even returned to hand or transformed), its Exit activates.',
    target: { type: 'minion', side: 'friendly', tribe: 'Egg' },
    effects: [{ op: 'buff', target: 'chosen', health: 2 }, { op: 'exitOnLeave', target: 'chosen' }],
  },
  {
    ...S, id: 'emergency_hatching', name: 'Emergency Hatching', art: '🐣', extra: true, cost: 3,
    text: 'Destroy a friendly Dinosaur Egg (its Exit does not activate). Summon a random Baby Dinosaur that costs (3) or less.',
    // Ruling: "trades the Egg's delayed value" — the Egg's own Exit is skipped.
    target: { type: 'minion', side: 'friendly', tribe: 'Egg' },
    effects: [{ op: 'destroy', target: 'chosen', noExit: true }, { op: 'summon', pool: ALL_BABY_DINOSAURS }],
  },
  {
    ...S, id: 'selective_breeding', name: 'Selective Breeding', art: '🧬', extra: true, cost: 4,
    text: 'Transform a friendly Dinosaur Egg into a different Dinosaur Egg of your choice. It keeps any extra Health.',
    // Ruling: no two Eggs share a Mana Cost, so "same cost" is dropped (any other Egg).
    target: { type: 'minion', side: 'friendly', tribe: 'Egg' },
    effects: [{ op: 'chooseEgg', target: 'chosen' }],
  },
  {
    ...T, id: 'false_nest', name: 'False Nest', art: '🪹', extra: true, cost: 2,
    text: "When your opponent summons a minion: if you have a Dinosaur Egg, give it -2 Attack this turn. If not, summon a 0/3 Dinosaur Egg.",
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      { op: 'buff', target: 'eventSource', attack: -2, temporary: true, if: { controls: { tribe: 'Egg' } }, else: [{ op: 'summon', pool: DINOSAUR_EGGS }] },
    ] },
  },
  {
    ...T, id: 'maternal_fury', name: 'Maternal Fury', art: '😤', extra: true, cost: 3, needsBoardSpace: true,
    text: 'When an enemy attacks one of your Dinosaur Eggs: Summon a 2/2 Baby Dinosaur with Taunt. It takes the attack instead.',
    trap: { on: 'attackDeclared', filter: { target: FRIENDLY_EGG }, effects: [
      { op: 'summon', cardId: 'baby_dinosaur' }, { op: 'redirectAttack', to: 'summoned' },
    ] },
  },
  {
    ...S, id: 'hatchling_intercept', name: 'Hatchling Intercept', art: '🛡️', extra: true, cost: 2,
    text: "When an enemy minion attacks a friendly Dinosaur: if you have a Dinosaur Egg, a 1/1 Baby Raptor with Taunt takes the attack this turn.",
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion', target: FRIENDLY_DINO } },
    effects: [{ op: 'sequence', if: { controls: { tribe: 'Egg' } }, effects: [
      { op: 'summon', cardId: 'baby_raptor' },
      { op: 'buff', target: 'summoned', temporaryKeywords: ['Taunt'] },
      { op: 'redirectAttack', to: 'summoned' },
    ] }],
  },

  // ---- Expansion tokens ----
  { ...D, id: 'baby_raptor', name: 'Baby Raptor', art: '🦎', token: true, cost: 1, attack: 1, health: 1, text: 'Baby Dinosaur.' },
  { ...D, id: 'baby_dinosaur', name: 'Baby Dinosaur', art: '🦕', token: true, cost: 2, attack: 2, health: 2, keywords: ['Taunt'], text: 'Baby Dinosaur. Taunt.' },

  // ---- Tokens ----
  { ...D, id: 'raptor', name: 'Raptor', art: '🦎', token: true, cost: 1, attack: 1, health: 1, text: '' },
  {
    ...EGG, id: 'fossilized_egg', name: 'Fossilized Egg', art: '🦴', token: true, cost: 0, attack: 0, health: 3,
    text: 'Exit: Summon a random Dinosaur that costs the same as the Dinosaur that became this Egg.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', randomMinion: { tribe: 'Dinosaur', costFromDead: true } }] }],
  },
  // ---- Legendary (named): the Spinosaurus that broke loose in the natural history museum ----
  {
    ...D, id: 'sobek_terror_of_the_museum', name: 'Sobek, Terror of the Museum', art: '🦖', extra: true, cost: 8, attack: 7, health: 7, keywords: ['Reborn'],
    rebornAs: 'sobeks_fossil',
    text: 'Reborn: comes back as Sobek\'s Fossil (5/5, Rush). Arrival: Deal 2 damage to all enemy minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: { minions: { side: 'enemy' } }, amount: 2 }] }],
  },
  { ...D, id: 'sobeks_fossil', name: "Sobek's Fossil", art: '🦴', token: true, formLabel: 'Fossil', cost: 8, attack: 5, health: 5, keywords: ['Rush'],
    text: 'Rush. The skeleton of Sobek, risen from its museum display at full strength.' },
  // ---- Meteorite and the new Dinosaurs (unlockable) ----
  // Meteorite is a deck rule, not a card you draw: it takes a deck slot, leaves the deck when the
  // game starts (engine.js createGame) and swaps Extinction Cycle for Meteor Strike.
  {
    ...S, id: 'meteorite', name: 'Meteorite', art: '☄️', extra: true, cost: 0, deckRule: true,
    text: "Never drawn: it takes a deck slot. Your Hero Spell becomes Meteor Strike: spend all your Mana to deal 1 damage to a random minion (yours or the enemy's) for each Mana spent. You no longer gain Primal Mana, and Extinction never comes.",
    effects: [],
  },
  {
    ...S, id: 'meteor_strike', name: 'Meteor Strike', art: '☄️', heroSpell: true, altHeroSpell: true, costsAllMana: true, cost: 1,
    text: 'Spend all your Mana. Deal 1 damage to a random minion (yours or the enemy\'s) for each Mana spent. (From Meteorite.)',
    effects: [{ op: 'meteorStrike' }],
  },
  {
    ...D, id: 'ankylosaurus_bone_crusher', name: 'Ankylosaurus Bone-Crusher', art: '🦕', extra: true, cost: 5, attack: 3, health: 7, keywords: ['Taunt'],
    text: 'Taunt.',
  },
  {
    ...D, id: 'dilophosaurus_venom_spitter', name: 'Dilophosaurus Venom-Spitter', art: '🦎', extra: true, cost: 4, attack: 2, health: 3, keywords: ['Venomous'],
    text: 'Venomous.',
  },
  {
    ...D, id: 'pachycephalosaurus', name: 'Pachycephalosaurus', art: '🦖', extra: true, cost: 6, attack: 7, health: 3, keywords: ['Rush'],
    text: 'Rush.',
  },
  {
    ...D, id: 'juvenile_ceratosaurus', name: 'Juvenile Ceratosaurus', art: '🦖', extra: true, cost: 3, attack: 2, health: 3,
    text: 'Arrival: Draw a Bull Ceratosaurus from your deck.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'draw', filter: { cardId: 'bull_ceratosaurus' } }] }],
  },
  {
    ...D, id: 'bull_ceratosaurus', name: 'Bull Ceratosaurus', art: '🦖', extra: true, cost: 9, attack: 7, health: 6, keywords: ['Rush'],
    text: 'Rush. Arrival: Summon a Female Ceratosaurus from your hand.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summonFromHand', cardId: 'female_ceratosaurus' }] }],
  },
  {
    ...D, id: 'female_ceratosaurus', name: 'Female Ceratosaurus', art: '🦖', extra: true, cost: 6, attack: 6, health: 6,
    text: 'Whenever this attacks the enemy Hero, summon a Large Dinosaur Egg.',
    triggers: [{ on: 'afterAttack', filter: { source: 'self', target: 'enemyHero' }, effects: [{ op: 'summon', cardId: 'large_dinosaur_egg' }] }],
  },
  {
    ...D, id: 'pterodactyl_dive_bomber', name: 'Pterodactyl Dive Bomber', art: '🦅', extra: true, cost: 7, attack: 5, health: 4, keywords: ['Elusive'],
    text: 'Elusive. Arrival: Summon two 2/1 Pterodactyl Divelings. They attack an enemy minion right away.',
    target: { type: 'minion', side: 'enemy' },
    triggers: [{ on: 'battlecry', effects: [
      { op: 'summon', cardId: 'pterodactyl_diveling' }, { op: 'fight', attacker: 'summoned', defender: 'chosen' },
      { op: 'summon', cardId: 'pterodactyl_diveling' }, { op: 'fight', attacker: 'summoned', defender: 'chosen' },
    ] }],
  },
  { ...D, id: 'pterodactyl_diveling', name: 'Pterodactyl Diveling', art: '🦅', token: true, cost: 1, attack: 2, health: 1, text: 'Summoned by the Pterodactyl Dive Bomber.' },
];
