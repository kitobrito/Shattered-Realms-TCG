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

  // ---- Tokens ----
  // Ruling: Facehugger is a token (made by Xeno-Hive Mother), not a deck card.
  { ...M, id: 'facehugger', name: 'Facehugger', art: '🦀', token: true, cost: 1, attack: 1, health: 1, keywords: ['Rush'], text: 'Rush.' },
];
