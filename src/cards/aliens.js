// ALIEN FACTION — the designer's complete 30-card list + Hero Spell.
// Text is the designer's wording. Interpretation choices are marked `Q:`
// (see docs/OPEN_QUESTIONS.md, Aliens).

const M = { faction: 'Aliens', type: 'minion', tribes: ['Alien'] };
const S = { faction: 'Aliens', type: 'spell' };
const T = { faction: 'Aliens', type: 'trap' };

const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const RANDOM_FRIENDLY = { randomOf: { minions: { side: 'friendly' } } };
const MY_TURN_END = { on: 'endOfTurn', filter: { player: 'friendly' } };
// Hive Brood expansion.
const IMPLANT_RANDOM = { op: 'implant', target: { randomOf: { minions: { side: 'enemy', implanted: false } } } };
const XENO = { ...M, art: '👽', token: true, cost: 4, evolvedXeno: true };
// The Qu: the Remade human tokens (not Aliens by blood: no tribe but Remade).
const REMADE = { faction: 'Aliens', type: 'minion', tribes: ['Remade'], art: '🧍', token: true, cost: 1 };

export const ALIEN_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'gene_splicing', name: 'Gene Splicing', art: '🧬', heroSpell: true,
    cost: 2,
    text: 'Target an enemy minion. Discover a minion from your deck to combine with it and shuffle the resulting Hybrid into the top half of your deck.',
    // The Hybrid adds both minions' Attack, Health and Mana Cost (max 10), keeps
    // both cards' keywords, abilities and text, and uses the enemy minion's art.
    target: ENEMY_MINION,
    effects: [{ op: 'geneSplice' }],
  },

  // ---- Traps (5) ----
  {
    ...T, id: 'alien_tripwire', name: 'Alien Tripwire', art: '🛸', cost: 2,
    text: 'When an enemy minion attacks, return it to its owner’s hand.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [{ op: 'returnToHand', target: 'eventSource' }] },
  },
  {
    ...T, id: 'genetic_snare', name: 'Genetic Snare', art: '🕸️', cost: 2,
    text: 'When your opponent plays a minion, remove all its Keywords and give those Keywords to a random friendly minion.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' },
      effects: [{ op: 'transferKeywords', from: 'eventSource', to: RANDOM_FRIENDLY }] },
  },
  {
    ...T, id: 'ufo_interception', name: 'UFO Interception', art: '🛸', cost: 3,
    text: 'When your opponent summons a minion, deal 3 damage to it and return it to their hand if it survives.',
    trap: { on: 'minionSummoned', filter: { player: 'enemy' }, effects: [
      { op: 'damage', target: 'eventSource', amount: 3 },
      { op: 'returnToHand', target: 'eventSource', if: { subject: 'eventSource', alive: true } },
    ] },
  },
  {
    ...T, id: 'experimental_containment', name: 'Experimental Containment', art: '🧫', cost: 3,
    text: 'When an enemy minion would die, prevent its death and Transform it into a random minion with the same Mana Cost.',
    // Q: the random minion can come from any faction.
    trap: { on: 'minionWouldDie', filter: { source: 'enemyMinion' },
      effects: [{ op: 'transform', target: 'eventSource', pool: { type: 'minion', costDelta: 0 } }] },
  },
  {
    ...T, id: 'alien_infection', name: 'Alien Infection', art: '🦠', cost: 2,
    text: "When an enemy minion attacks: it gets a random negative Keyword or effect, and a random friendly minion gets a random positive Keyword.",
    // Q: "gain" = a random friendly minion gains the positive Keyword.
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [
      { op: 'giveRandomKeyword', target: 'eventSource', negative: true },
      { op: 'giveRandomKeyword', target: RANDOM_FRIENDLY },
    ] },
  },

  // ---- Quick Plays (5) ----
  {
    ...S, id: 'phase_shift', name: 'Phase Shift', art: '🌀', cost: 1, quickPlay: {},
    text: 'Choose a friendly minion. Until your next turn, it becomes Immune and cannot attack.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'buff', target: 'chosen', untilYourNextTurn: true, lingerKeywords: ['Immune', 'Frozen'] }],
  },
  {
    ...S, id: 'abduction_ray', name: 'Abduction Ray', art: '🔦', cost: 2, quickPlay: {},
    text: 'Choose an enemy minion with 3 or fewer Attack. Return it to your opponent\'s hand and cost (1) more.',
    target: { ...ENEMY_MINION, maxAttack: 3 },
    effects: [{ op: 'returnToHand', target: 'chosen', costChange: 1 }],
  },
  {
    ...S, id: 'neural_disruptor', name: 'Neural Disruptor', art: '📡', cost: 2,
    text: 'When your opponent targets a minion with a spell or ability, redirect it to a random new target.',
    quickPlay: { windows: ['cardPlayed'], filter: { player: 'enemy', target: 'anyMinion' } },
    effects: [{ op: 'redirectTarget' }],
  },
  {
    ...S, id: 'sub_space_jump', name: 'Sub-Space Jump', art: '🌌', cost: 3, quickPlay: {},
    text: 'Choose a friendly minion. Remove it from the board until your next turn, then resummon it with +2/+2.',
    // Q: it returns at the start of your next turn and can attack that turn.
    target: FRIENDLY_MINION,
    effects: [{ op: 'banish', target: 'chosen', attack: 2, health: 2 }],
  },
  {
    ...S, id: 'overcharge_beam', name: 'Overcharge Beam', art: '⚡', cost: 4,
    text: 'Deal 4 damage to an attacking or casting enemy minion. If it dies, Discover a Keyword.',
    // Ruling: the window is when the enemy minion picks its attack target.
    // Q: the Discovered Keyword goes to a random friendly minion.
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [
      { op: 'damage', target: 'eventSource', amount: 4 },
      { op: 'discoverKeyword', target: RANDOM_FRIENDLY, if: { subject: 'eventSource', dead: true } },
    ],
  },

  // ---- Spells (9) ----
  {
    ...S, id: 'gene_mutation', name: 'Gene Mutation', art: '🧪', cost: 1,
    text: 'Give a friendly minion 2 random Keywords.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'giveRandomKeyword', target: 'chosen', count: 2 }],
  },
  {
    ...S, id: 'gene_corruption', name: 'Gene Corruption', art: '☣️', cost: 2,
    text: 'Choose an enemy minion. Remove all its Keywords and transfer them to a friendly minion.',
    target: ENEMY_MINION, target2: FRIENDLY_MINION,
    effects: [{ op: 'transferKeywords', from: 'chosen', to: 'chosen2' }],
  },
  {
    ...S, id: 'mind_control_beam', name: 'Mind Control Beam', art: '🧠', cost: 4,
    text: 'Take control of an enemy minion with 3 or less Attack until end of turn. Give it Rush.',
    target: { ...ENEMY_MINION, maxAttack: 3 },
    effects: [
      { op: 'takeControlTemporarily', target: 'chosen', until: 'endOfTurn', keepSick: true },
      { op: 'buff', target: 'chosen', temporaryKeywords: ['Rush'] },
    ],
  },
  {
    ...S, id: 'terraform', name: 'Terraform', art: '🪐', cost: 3,
    text: 'Discover a minion from any class. Set its stats to 4/4 and give it 2 random Keywords.',
    effects: [{ op: 'discoverAnyMinion', attack: 4, health: 4, randomKeywords: 2 }],
  },
  {
    ...S, id: 'mass_abduction', name: 'Mass Abduction', art: '🛸', cost: 5,
    text: 'Return all enemy minions with Keywords to their owner\'s hand.',
    effects: [{ op: 'returnToHand', target: { minions: { side: 'enemy', hasKeyword: true } } }],
  },
  {
    ...S, id: 'replication_protocol', name: 'Replication Protocol', art: '📠', cost: 3,
    text: 'Choose a friendly minion. Add two copies of it to your hand; they cost (1) less.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'copyToHand', target: 'chosen', count: 2, costChange: -1 }],
  },
  {
    ...S, id: 'planetary_quarantine', name: 'Planetary Quarantine', art: '🌐', cost: 6,
    text: 'Secretly set 3 different Traps from your deck. (Can exceed trap limits).',
    // Ruling: the 5-Trap limit is hard, so this stops at 5.
    effects: [{ op: 'setTrapsFromDeck', count: 3 }],
  },
  {
    ...S, id: 'genetic_scourge', name: 'Genetic Scourge', art: '☢️', cost: 4,
    text: 'Deal 3 damage to all minions. For each enemy minion destroyed this way, a random friendly minion gains a random Keyword.',
    // Q: each Keyword goes to a random surviving friendly minion.
    effects: [{ op: 'damageAll', amount: 3, perEnemyKilled: [
      { op: 'giveRandomKeyword', target: { randomOf: { minions: { side: 'friendly', alive: true } } } },
    ] }],
  },
  {
    ...S, id: 'hive_synchronization', name: 'Hive Synchronization', art: '🐝', cost: 5,
    text: 'Give all friendly minions every Keyword currently possessed by any friendly minion.',
    // Q: negative keywords (Frozen, Burned, …) are not shared.
    effects: [{ op: 'shareKeywords' }],
  },

  // ---- Minions (11) ----
  {
    ...M, id: 'grey_scout', name: 'Grey Scout', art: '👽', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Discover a Keyword. Gain it until end of turn.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'discoverKeyword', target: 'self', temporary: true }] }],
  },
  {
    ...M, id: 'probe_drone', name: 'Probe Drone', art: '🤖', tribes: ['Alien', 'Mech'], cost: 2, attack: 2, health: 2,
    text: 'Mech. Whenever a friendly minion gains a Keyword, this gains +1/+1.',
    // Q: "you" = any of your minions gaining a Keyword.
    triggers: [{ on: 'keywordGained', filter: { player: 'friendly', target: 'anyMinion' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...M, id: 'gene_thief_operative', name: 'Gene-Thief Operative', art: '🕵️', cost: 2, attack: 2, health: 3,
    text: 'Whenever an enemy minion loses a Keyword, this minion gains it.',
    triggers: [{ on: 'keywordLost', filter: { player: 'enemy' }, effects: [{ op: 'buff', target: 'self', eventKeyword: true }] }],
  },
  {
    ...M, id: 'bio_chamber_hatchery', name: 'Bio-Chamber Hatchery', art: '🧫', cost: 3, attack: 0, health: 4,
    text: 'At the end of your turn, add a random Alien minion with no keywords to your hand and give it 2 random Keywords.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'addVariantToHand', randomBase: { faction: 'Aliens', noKeywords: true }, randomKeywords: 2 }] }],
  },
  {
    ...M, id: 'fleet_commander', name: 'Fleet Commander', art: '🎖️', cost: 4, attack: 4, health: 4,
    text: 'Your Traps cost (1) less. Whenever a Trap is triggered, draw a card.',
    // Q: only your own Traps triggering draw you a card.
    costAura: { type: 'trap', amount: -1 },
    triggers: [{ on: 'trapTriggered', filter: { player: 'friendly' }, effects: [{ op: 'draw', count: 1 }] }],
  },
  {
    ...M, id: 'xeno_hive_mother', name: 'Xeno-Hive Mother', art: '🐛', cost: 5, attack: 4, health: 6,
    text: 'At the end of your turn, summon two 1/1 Facehuggers with random Keywords.',
    // Q: one random Keyword each (on top of Rush).
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'summon', cardId: 'facehugger', count: 2, randomKeywords: 1 }] }],
  },
  {
    ...M, id: 'subjugator_drone', name: 'Subjugator Drone', art: '🛰️', cost: 6, attack: 5, health: 6, keywords: ['Taunt', 'Evade'],
    text: 'Taunt, Evade. Arrival: Strip all Keywords from all enemy minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'stripKeywords', target: { minions: { side: 'enemy' } } }] }],
  },
  {
    ...M, id: 'ufo_abductor', name: 'UFO Abductor', art: '🛸', cost: 8, attack: 8, health: 8,
    text: 'When summoned, select an enemy minion and add them to your hand.',
    target: ENEMY_MINION,
    triggers: [{ on: 'summon', effects: [{ op: 'abduct', target: 'chosen' }] }],
  },
  {
    ...M, id: 'devolved_scientist', name: 'Devolved Scientist', art: '🧟', cost: 5, attack: 2, health: 6,
    keywords: ['Taunt', 'Poisonous'],
    text: 'Taunt, Poisonous.',
  },
  {
    ...M, id: 'overmind_xalat', name: 'Overmind Xal\'at', art: '🧠', cost: 6, attack: 5, health: 5,
    text: 'Arrival: Combine the stats and Keywords of all friendly minions on the board into this minion.',
    // Q: the absorbed minions leave the board (no Exits).
    triggers: [{ on: 'battlecry', effects: [{ op: 'absorbFriendly' }] }],
  },
  {
    ...M, id: 'qu_bio_engineer', name: 'The Qu Bio-Engineer', art: '🧪', cost: 7, attack: 7, health: 5,
    text: 'Summon: Choose 3 times: grant one allied minion a random keyword or one enemy minion a random negative keyword.',
    triggers: [{ on: 'summon', effects: [{ op: 'boonOrBane', times: 3 }] }],
  },

  // ---- Hive Brood expansion (unlockable) ----
  // Implant: a parasite in an enemy minion; when it dies, a 1/1 Chestburster bursts out on your
  // side, remembering its host's realm. After 2 of your turns it Evolves into that realm's Xeno
  // (effects.js implant / chestburst / tickChestbursters).
  {
    ...M, id: 'facehugger_swarmling', name: 'Facehugger Swarmling', art: '🦀', extra: true, cost: 1, attack: 1, health: 1,
    text: 'Arrival: Implant a random enemy minion.',
    triggers: [{ on: 'battlecry', effects: [IMPLANT_RANDOM] }],
  },
  {
    ...M, id: 'ovomorph_clutch', name: 'Ovomorph Clutch', art: '🥚', extra: true, cost: 3, attack: 0, health: 4, keywords: ['Taunt'],
    text: "Taunt. At the start of your turn, Implant a random enemy minion that isn't Implanted.",
    triggers: [{ on: 'startOfTurn', filter: { player: 'friendly' }, effects: [IMPLANT_RANDOM] }],
  },
  {
    ...M, id: 'parasite_carrier', name: 'Parasite Carrier', art: '🐛', extra: true, cost: 2, attack: 1, health: 2,
    text: 'Exit: Implant a random enemy minion.',
    triggers: [{ on: 'deathrattle', effects: [IMPLANT_RANDOM] }],
  },
  {
    ...M, id: 'acid_blood_drone', name: 'Acid-Blood Drone', art: '🧪', extra: true, cost: 3, attack: 3, health: 2,
    text: 'Whenever this takes damage, deal 2 damage to whatever damaged it.',
    triggers: [{ on: 'damageDealt', filter: { target: 'self' }, effects: [{ op: 'damage', target: 'eventSource', amount: 2 }] }],
  },
  {
    ...M, id: 'hive_stalker', name: 'Hive Stalker', art: '👽', extra: true, cost: 3, attack: 3, health: 3, keywords: ['Stealth'],
    text: 'Stealth. Arrival: Implant an enemy minion.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'implant', target: 'chosen' }] }],
  },
  {
    ...M, id: 'brood_tender', name: 'Brood Tender', art: '🍼', extra: true, cost: 3, attack: 2, health: 4, fasterEvolve: true,
    text: 'Your Chestbursters Evolve 1 turn sooner.',
  },
  {
    ...M, id: 'hive_brute', name: 'Hive Brute', art: '👽', extra: true, cost: 4, attack: 4, health: 3,
    text: 'Whenever an Implanted enemy minion dies, gain +1/+1.',
    triggers: [{ on: 'minionDied', filter: { player: 'enemy', deadImplanted: true }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...M, id: 'xeno_runner', name: 'Xeno Runner', art: '👽', extra: true, cost: 4, attack: 4, health: 2, keywords: ['Rush'], implantAttack: 3,
    text: 'Rush. Has +3 Attack while attacking an Implanted minion.',
  },
  {
    ...M, id: 'hive_warrior', name: 'Hive Warrior', art: '👽', extra: true, cost: 6, attack: 4, health: 4,
    text: 'Arrival: Implant 2 random enemy minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'implant', target: { randomOf: { minions: { side: 'enemy', implanted: false } }, count: 2 } }] }],
  },
  {
    ...M, id: 'praetorian_guard', name: 'Praetorian Guard', art: '🛡️', extra: true, cost: 6, attack: 5, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Your Evolved Xenos have +1 Attack.',
    aura: { target: { minions: { side: 'friendly', evolved: true } }, attack: 1 },
  },
  {
    ...M, id: 'hive_queen_xaral', name: "Hive Queen Xa'ral", art: '👑', extra: true, cost: 9, attack: 5, health: 7, instantEvolve: true,
    text: 'Arrival: Implant all enemy minions. While she lives, Chestbursters burst out already Evolved.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'implant', target: { minions: { side: 'enemy' } } }] }],
  },
  {
    ...S, id: 'gestation', name: 'Gestation', art: '🫃', extra: true, cost: 2,
    text: 'Implant an enemy minion. Draw a card.',
    target: { type: 'minion', side: 'enemy', implanted: false },
    effects: [{ op: 'implant', target: 'chosen' }, { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'it_bursts_out', name: 'It Bursts Out', art: '💥', extra: true, cost: 3,
    text: 'Destroy an Implanted enemy minion.',
    target: { type: 'minion', side: 'enemy', implanted: true },
    effects: [{ op: 'destroy', target: 'chosen' }],
  },
  {
    ...S, id: 'acid_blood_spray', name: 'Acid Blood Spray', art: '🧪', extra: true, cost: 2,
    text: 'Quick Play: When a friendly Alien dies, deal 3 damage to whatever killed it.',
    quickPlay: { windows: ['minionDied'], filter: { source: { side: 'friendly', tribe: 'Alien' } } },
    effects: [{ op: 'damage', target: 'killer', amount: 3 }],
  },
  {
    ...T, id: 'egg_chamber', name: 'Egg Chamber', art: '🥚', extra: true, cost: 2,
    text: 'Trap: When your opponent plays a minion, Implant it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [{ op: 'implant', target: 'eventSource' }] },
  },

  // ---- Hive Brood tokens: the Chestburster and the Xenos it Evolves into ----
  { ...M, id: 'chestburster', name: 'Chestburster', art: '🐍', token: true, cost: 1, attack: 1, health: 1,
    text: 'After 2 of your turns, Evolves into the Xeno of the realm it burst from.' },
  { ...XENO, id: 'xeno_nosferatu', name: 'Xeno Nosferatu', attack: 3, health: 4, keywords: ['Lifesteal'], text: 'Lifesteal. (Evolved from a Vampire.)' },
  { ...XENO, id: 'xeno_warrior', name: 'Xeno Warrior', attack: 4, health: 5, text: '(Evolved from an Alien: the pure strain.)' },
  { ...XENO, id: 'xeno_raptor', name: 'Xeno Raptor', attack: 4, health: 3, keywords: ['Rush'], text: 'Rush. (Evolved from a Dinosaur.)' },
  { ...XENO, id: 'xeno_thornback', name: 'Xeno Thornback', attack: 2, health: 5, keywords: ['Taunt', 'Devour'], text: 'Taunt. Devour. (Evolved from a Plant.)' },
  { ...XENO, id: 'spore_xeno', name: 'Spore Xeno', attack: 3, health: 4, text: 'Exit: Implant a random enemy minion. (Evolved from a Fungus.)',
    triggers: [{ on: 'deathrattle', effects: [IMPLANT_RANDOM] }] },
  { ...XENO, id: 'xeno_revenant', name: 'Xeno Revenant', attack: 3, health: 3, keywords: ['Reborn'], text: 'Reborn. (Evolved from a Zombie.)' },
  { ...XENO, id: 'deep_xeno', name: 'Deep Xeno', attack: 3, health: 4, keywords: ['Stealth'], text: 'Stealth. (Evolved from a Shark.)' },
  { ...XENO, id: 'xeno_drake', name: 'Xeno Drake', attack: 3, health: 4, keywords: ['Charge'], text: 'Charge. (Evolved from a Dragon.)' },
  { ...XENO, id: 'xeno_fiend', name: 'Xeno Fiend', attack: 4, health: 4, keywords: ['Poisonous'], text: 'Poisonous. (Evolved from a Demon.)' },
  { ...XENO, id: 'xeno_seraph', name: 'Xeno Seraph', attack: 3, health: 4, keywords: ['Evade'], text: 'Evade. (Evolved from a Divine minion.)' },
  { ...XENO, id: 'xeno_mech', name: 'Xeno Mech', attack: 3, health: 6, keywords: ['Taunt'], text: 'Taunt. (Evolved from a Robot.)' },
  { ...XENO, id: 'glowing_xeno', name: 'Glowing Xeno', attack: 3, health: 4, text: 'Radiation 1. (Evolved from a Radioactive minion.)',
    triggers: [{ on: 'summon', effects: [{ op: 'radiate', target: 'self', amount: 1 }] }] },
  { ...XENO, id: 'xeno_hornet', name: 'Xeno Hornet', attack: 2, health: 3, keywords: ['Twin Strike'], text: 'Twin Strike. (Evolved from a Bee.)' },
  { ...XENO, id: 'phantom_xeno', name: 'Phantom Xeno', attack: 3, health: 4, keywords: ['Elusive'], text: 'Elusive. (Evolved from a Ghost.)' },
  { ...XENO, id: 'void_xeno', name: 'Void Xeno', attack: 3, health: 4, keywords: ['Elusive', 'Evade'], text: 'Elusive. Evade. (Evolved from an Ultraterrestrial.)' },
  { ...XENO, id: 'acid_xeno', name: 'Acid Xeno', attack: 3, health: 4, keywords: ['Venomous'], text: 'Venomous. (Evolved from an Acidic minion.)' },
  { ...XENO, id: 'xeno_drone', name: 'Xeno Drone', attack: 2, health: 3, text: '(Evolved from a minion with no realm.)' },

  // ---- Tokens ----
  // Ruling: Facehugger is a token (made by Xeno-Hive Mother), not a deck card.
  // ---- The Qu (All Tomorrows) (unlockable) ----
  // Godlike gene-sculptors. Remake: an enemy minion Transforms into a Remade human, a weak
  // body built wrong on purpose (effects.js remake / chooseRemake, rules.js REMADE_FORMS).
  {
    ...M, id: 'qu_remaker', name: 'Qu Remaker', art: '🧬', extra: true, cost: 4, attack: 3, health: 4,
    text: 'Arrival: Remake an enemy minion that costs (3) or less.',
    target: { type: 'minion', side: 'enemy', maxCost: 3 },
    triggers: [{ on: 'battlecry', effects: [{ op: 'remake', target: 'chosen' }] }],
  },
  {
    ...M, id: 'qu_gene_priest', name: 'Qu Gene-Priest', art: '🧪', extra: true, cost: 3, attack: 2, health: 3,
    text: 'Whenever an enemy minion is Remade, this gains +1/+1 and a random Keyword.',
    triggers: [{ on: 'remade', filter: { player: 'enemy' }, effects: [
      { op: 'buff', target: 'self', attack: 1, health: 1 },
      { op: 'giveRandomKeyword', target: 'self' },
    ] }],
  },
  {
    ...M, id: 'the_qu_shapers_of_worlds', name: 'The Qu, Shapers of Worlds', art: '🪽', extra: true, cost: 9, attack: 6, health: 8, keywords: ['Evade'],
    text: 'Evade. Arrival: Remake an enemy minion. At the end of your turn, Remake the most expensive enemy minion.',
    target: ENEMY_MINION,
    triggers: [
      { on: 'battlecry', effects: [{ op: 'remake', target: 'chosen' }] },
      { ...MY_TURN_END, effects: [{ op: 'remake', target: { costliest: { side: 'enemy', notTribe: 'Remade' } } }] },
    ],
  },
  {
    ...S, id: 'the_remaking', name: 'The Remaking', art: '🧬', extra: true, cost: 4,
    text: 'Remake an enemy minion. You choose what it becomes.',
    target: ENEMY_MINION,
    effects: [{ op: 'chooseRemake', target: 'chosen' }],
  },
  {
    ...S, id: 'the_great_remaking', name: 'The Great Remaking', art: '🌍', extra: true, cost: 8,
    text: 'Remake all enemy minions.',
    effects: [{ op: 'remake', target: { minions: { side: 'enemy' } } }],
  },
  {
    ...T, id: 'sentence_of_the_qu', name: 'Sentence of the Qu', art: '⚖️', extra: true, cost: 3,
    text: 'When an enemy minion attacks, stop the attack and Remake it.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [
      { op: 'stopAttack' },
      { op: 'remake', target: 'eventSource' },
    ] },
  },
  // The Remade humans (tokens): what Remake turns a minion into.
  { ...REMADE, id: 'remade_gravital', name: 'Gravital', attack: 1, health: 6, cantAttack: true,
    text: "Can't attack. (Remade by the Qu for a crushing heavy world.)" },
  { ...REMADE, id: 'remade_swimmer', name: 'Swimmer', attack: 2, health: 1, keywords: ['Blind'],
    text: 'Blind. (Remade by the Qu for life in the water.)' },
  { ...REMADE, id: 'remade_loper', name: 'Loper', attack: 3, health: 1, keywords: ['Recoil'],
    text: 'Recoil. (Remade by the Qu to run the frozen plains.)' },
  { ...REMADE, id: 'remade_worm_person', name: 'Worm Person', attack: 1, health: 1, keywords: ['Silenced'],
    text: 'Silenced. (Remade by the Qu to burrow through the dark.)' },
  { ...REMADE, id: 'remade_snake_person', name: 'Snake Person', attack: 2, health: 3, arrivesFrozen: true,
    text: 'Arrives Frozen. (Remade by the Qu: cold-blooded and slow.)' },
  { ...REMADE, id: 'remade_colonial', name: 'Colonial', attack: 2, health: 3, keywords: ['Burned'],
    text: 'Burned. (Remade by the Qu into a colony of tiny beings.)' },
  { ...M, id: 'facehugger', name: 'Facehugger', art: '🦀', token: true, cost: 1, attack: 1, health: 1, keywords: ['Rush'], text: 'Rush.' },
];
