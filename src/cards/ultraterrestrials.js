// ULTRATERRESTRIAL FACTION — The Beyond. The designer's 30-card list and the Hero Spell,
// Between Worlds.
//
// Displace (effects.js displace / displaceMinion): the minion leaves the battlefield for
// Beyond Reality. It can't attack, be attacked or be targeted, doesn't use a board slot,
// and its abilities stop. It returns at the start of the named turn under its controller
// (unless a card says otherwise), with any return bonus; if that board is full it waits
// until there is room. Temporary (this-turn) effects end when it leaves.
// Rulings made while building are marked "Ruling:".

const U = { faction: 'Ultraterrestrials', type: 'minion', tribes: ['Ultraterrestrial'] };
const S = { faction: 'Ultraterrestrials', type: 'spell' };
const T = { faction: 'Ultraterrestrials', type: 'trap' };

const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ANY_MINION = { type: 'minion', side: 'any' };
// Displace until the start of your next turn (the default), with extra options.
const displace = (target, extra = {}) => ({ op: 'displace', target, ...extra });
const once = (key, effects) => ({ op: 'oncePerTurn', key, effects });
const BREAK = (effects) => ({ on: 'minionReturned', filter: { source: 'self' }, effects });

export const ULTRATERRESTRIAL_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'between_worlds', name: 'Between Worlds', art: '🌀', heroSpell: true, cost: 2,
    text: "Displace a minion until the start of your next turn. If it's friendly, it returns with +1/+1. If it's an enemy, it returns exhausted and can't attack during its next turn.",
    target: ANY_MINION,
    effects: [displace('chosen', { ifFriendly: { attack: 1, health: 1 }, ifEnemy: { exhausted: true } })],
  },

  // ---- Minions (14) ----
  {
    ...U, id: 'riftling', name: 'Riftling', art: '👾', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Your next Displacement this turn lasts 1 additional turn.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'riftBonus' }] }],
  },
  {
    ...U, id: 'phase_skitter', name: 'Phase Skitter', art: '🦗', cost: 1, attack: 2, health: 1, keywords: ['Evade'],
    text: 'Evade. When Evade is removed, Displace this minion until the start of your next turn.',
    triggers: [{ on: 'keywordLost', filter: { target: 'self', keyword: 'Evade' }, effects: [displace('self')] }],
  },
  {
    ...U, id: 'paradox_crystal', name: 'Paradox Crystal', art: '💎', cost: 2, attack: 2, health: 4,
    text: 'The first time you Displace a friendly minion each turn, gain 1 Armor.',
    triggers: [{ on: 'minionDisplaced', filter: { player: 'friendly', by: 'friendly' }, effects: [once('paradox_crystal', [{ op: 'gainArmor', amount: 1 }])] }],
  },
  {
    ...U, id: 'observer_outside_time', name: 'Observer Outside Time', art: '👁️', cost: 2, attack: 2, health: 3,
    text: 'Arrival: Look at the top 3 cards of your deck. Put one on top and the rest on the bottom.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'scry', count: 3 }] }],
  },
  {
    ...U, id: 'rift_hunter', name: 'Rift Hunter', art: '🏹', cost: 3, attack: 3, health: 3,
    text: 'Arrival: Displace a random enemy minion with 2 or less Attack until the start of your next turn.',
    triggers: [{ on: 'battlecry', effects: [displace({ randomOf: { minions: { side: 'enemy', maxAttack: 2 } } })] }],
  },
  {
    ...U, id: 'phase_jelly', name: 'Phase Jelly', art: '🪼', cost: 3, attack: 3, health: 4,
    text: 'Whenever this returns from Displacement, restore 2 Health to your Hero.',
    triggers: [{ on: 'minionReturned', filter: { source: 'self' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 2 }] }],
  },
  {
    ...U, id: 'chrono_warp_adept', name: 'Chrono-Warp Adept', art: '⏳', cost: 3, attack: 2, health: 3,
    text: 'Arrival: Reduce the remaining Displacement of a friendly minion by 1 turn.',
    // Ruling: it picks the friendly minion with the longest time left; one due back at your next turn returns now.
    triggers: [{ on: 'battlecry', effects: [{ op: 'hastenBeyond' }] }],
  },
  {
    ...U, id: 'reality_stalker', name: 'Reality Stalker', art: '🐺', cost: 4, attack: 4, health: 4,
    text: 'Arrival: Deal 2 damage to a minion that returned from Displacement this turn.',
    target: { type: 'minion', side: 'any', returnedThisTurn: true },
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2 }] }],
  },
  {
    ...U, id: 'dimensional_sentinel', name: 'Dimensional Sentinel', art: '🗿', cost: 4, attack: 3, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Whenever you Displace a friendly minion, gain +1 Attack this turn.',
    triggers: [{ on: 'minionDisplaced', filter: { player: 'friendly', by: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true }] }],
  },
  {
    ...U, id: 'parallel_self', name: 'Parallel Self', art: '🪞', cost: 4, attack: 3, health: 3,
    text: 'Arrival: Summon a 1/1 Echo Copy of this minion. It has no effects.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'echo_copy' }] }],
  },
  {
    ...U, id: 'probability_engine', name: 'Probability Engine', art: '🎲', cost: 5, attack: 3, health: 5,
    text: 'Whenever a minion returns from Displacement, gain 1 temporary Mana next turn. Once per turn.',
    triggers: [{ on: 'minionReturned', effects: [once('probability_engine', [{ op: 'gainManaNextTurn', amount: 1 }])] }],
  },
  {
    ...U, id: 'null_behemoth', name: 'Null Behemoth', art: '🌑', cost: 6, attack: 6, health: 6,
    text: 'Arrival: Displace another friendly minion until the start of your next turn. Gain +2/+2 when it returns.',
    target: { type: 'minion', side: 'friendly' },
    triggers: [{ on: 'battlecry', effects: [displace('chosen', { onReturn: [{ op: 'buff', target: 'self', attack: 2, health: 2 }] })] }],
  },
  {
    ...U, id: 'sovereign_of_elsewhere', name: 'Sovereign of Elsewhere', art: '👑', cost: 7, attack: 5, health: 7,
    text: 'The first time you Displace a minion each turn, give it +1/+1 when it returns.',
    triggers: [{ on: 'minionDisplaced', filter: { by: 'friendly' }, effects: [once('sovereign', [{ op: 'boostBeyond', attack: 1, health: 1 }])] }],
  },
  {
    ...U, id: 'the_unplaceable', name: 'The Unplaceable', art: '🔺', cost: 9, attack: 8, health: 8,
    text: 'Arrival: Displace all other minions until the start of your next turn. They return under their previous controllers.',
    triggers: [{ on: 'battlecry', effects: [displace({ minions: { side: 'any', excludeSelf: true } })] }],
  },

  // ---- Spells (8) ----
  {
    ...S, id: 'pocket_dimension', name: 'Pocket Dimension', art: '👜', cost: 1,
    text: 'Displace a friendly minion until the start of your next turn.',
    target: FRIENDLY_MINION, effects: [displace('chosen')],
  },
  {
    ...S, id: 'banish_from_this_world', name: 'Banish from This World', art: '🚪', cost: 1,
    text: 'Displace an enemy minion with 3 or less Attack until the start of your next turn.',
    target: { type: 'minion', side: 'enemy', maxAttack: 3 }, effects: [displace('chosen')],
  },
  {
    ...S, id: 'temporal_reversal', name: 'Temporal Reversal', art: '⏪', cost: 2,
    text: 'Return a friendly minion to your hand. It costs 1 less.',
    target: FRIENDLY_MINION, effects: [{ op: 'returnToHand', target: 'chosen', costChange: -1 }],
  },
  {
    ...S, id: 'folded_space', name: 'Folded Space', art: '📐', cost: 2,
    text: 'Displace a friendly minion and an enemy minion until the start of your next turn.',
    target: FRIENDLY_MINION, target2: ENEMY_MINION,
    effects: [displace('chosen'), displace('chosen2')],
  },
  {
    ...S, id: 'impossible_blueprint', name: 'Impossible Blueprint', art: '📜', cost: 3,
    text: 'Discover an Ultraterrestrial minion. It costs 2 less (minimum 1).',
    effects: [{ op: 'discoverFaction', faction: 'Ultraterrestrials', costMod: -2, minCost: 1 }],
  },
  {
    ...S, id: 'scale_paradox', name: 'Scale Paradox', art: '⚖️', cost: 4,
    text: 'Give a friendly minion +4/+4 this turn. At the end of your turn, Displace it until the start of your next turn.',
    target: FRIENDLY_MINION,
    effects: [
      { op: 'buff', target: 'chosen', attack: 4, temporary: true, health: 4, temporaryHealth: true },
      { op: 'grantTrigger', target: 'chosen', temporary: true, trigger: { on: 'endOfTurn', filter: { player: 'friendly' }, effects: [displace('self')] } },
    ],
  },
  {
    ...S, id: 'reality_overlap', name: 'Reality Overlap', art: '🌫️', cost: 5,
    text: 'Displace all minions with 2 or less Attack until the start of your next turn.',
    effects: [displace({ minions: { side: 'any', maxAttack: 2 } })],
  },
  {
    ...S, id: 'collapse_the_coordinates', name: 'Collapse the Coordinates', art: '🕳️', cost: 8,
    text: 'Displace all enemy minions until the start of your next turn. Draw a card for every 2 Displaced.',
    effects: [displace({ minions: { side: 'enemy' } }, { drawPer: 2 })],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'invisible_threshold', name: 'Invisible Threshold', art: '🚧', cost: 2,
    text: "When an enemy minion attacks your Hero: Displace that attacker until the start of your opponent's next turn.",
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [displace('eventSource', { until: 'theirNextTurn' })] },
  },
  {
    ...T, id: 'paradox_mine', name: 'Paradox Mine', art: '💣', cost: 2,
    text: 'When your opponent plays a minion that costs 4 or more: give it -2 Attack this turn.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion', minCost: 4 }, effects: [{ op: 'buff', target: 'eventSource', attack: -2, temporary: true }] },
  },
  {
    ...T, id: 'mirror_of_elsewhere', name: 'Mirror of Elsewhere', art: '🪞', cost: 3,
    text: 'When an enemy spell targets a friendly minion: Displace that minion until the start of your next turn. The spell has no effect on it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'spell', target: 'friendlyMinion' }, effects: [displace('eventTarget')] },
  },
  {
    ...T, id: 'wrong_reality', name: 'Wrong Reality', art: '🔀', cost: 4,
    text: 'When your opponent plays a minion: return it to their hand. It costs 1 more.',
    // Ruling: it goes back before its Arrival happens.
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [{ op: 'returnToHand', target: 'eventSource', costChange: 1 }] },
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'out_of_phase', name: 'Out of Phase', art: '👻', cost: 1,
    text: 'Quick Play: When a friendly minion would take damage from an attack, Displace it until the start of your next turn.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: 'friendlyMinion' } },
    effects: [displace('eventTarget')],
  },
  {
    ...S, id: 'spatial_redirection', name: 'Spatial Redirection', art: '↪️', cost: 2,
    text: 'Quick Play: When an enemy spell targets a friendly minion, change its target to another random valid character.',
    quickPlay: { windows: ['cardPlayed'], filter: { player: 'enemy', cardType: 'spell', target: 'friendlyMinion' } },
    effects: [{ op: 'redirectTarget' }],
  },
  {
    ...S, id: 'borrowed_seconds', name: 'Borrowed Seconds', art: '⌛', cost: 2,
    text: 'Quick Play: Give a friendly minion +2 Health this turn. If it survives the turn, draw a card.',
    target: FRIENDLY_MINION, quickPlay: {},
    effects: [
      { op: 'buff', target: 'chosen', health: 2, temporaryHealth: true },
      { op: 'grantTrigger', target: 'chosen', temporary: true, trigger: { on: 'endOfTurn', effects: [{ op: 'draw', count: 1 }] } },
    ],
  },
  {
    ...S, id: 'emergency_dimensional_shift', name: 'Emergency Dimensional Shift', art: '🚨', cost: 4,
    text: 'Quick Play: Displace all friendly minions until the start of your next turn.',
    quickPlay: {},
    effects: [displace({ minions: { side: 'friendly' } })],
  },

  // ---- Tokens ----
  {
    ...U, id: 'echo_copy', name: 'Echo Copy', art: '🪞', token: true, cost: 1, attack: 1, health: 1,
    text: 'A 1/1 echo of Parallel Self. It has no effects.',
  },

  // ---- Hyperspace expansion (unlockable) ----
  // Breakthrough: happens when the minion comes back from Displacement (a minionReturned trigger on
  // itself). Machine Elf Choir repeats every return once more as an `echo` only Breakthrough hears.
  {
    ...U, id: 'waiting_room_usher', name: 'Waiting Room Usher', art: '🚪', extra: true, cost: 1, attack: 1, health: 2,
    text: 'Arrival: Displace another friendly minion until your next turn. It comes back with +1/+1.',
    target: FRIENDLY_MINION,
    triggers: [{ on: 'battlecry', effects: [displace('chosen', { attack: 1, health: 1 })] }],
  },
  {
    ...U, id: 'self_dribbling_jewel', name: 'Self-Dribbling Jewel', art: '💎', extra: true, cost: 2, attack: 2, health: 2,
    text: 'Breakthrough: Summon a copy of this.',
    triggers: [BREAK([{ op: 'summon', copyOf: 'self' }])],
  },
  {
    ...U, id: 'fractal_elf', name: 'Fractal Elf', art: '🧝', extra: true, cost: 2, attack: 2, health: 3,
    text: 'Breakthrough: Gain +2/+2.',
    triggers: [BREAK([{ op: 'buff', target: 'self', attack: 2, health: 2 }])],
  },
  {
    ...U, id: 'kaleidoscope_jester', name: 'Kaleidoscope Jester', art: '🃏', extra: true, cost: 3, attack: 3, health: 3,
    text: "Arrival: Swap an enemy minion's Attack and Health.",
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'swapStats', target: 'chosen' }] }],
  },
  {
    ...U, id: 'mantis_surgeon', name: 'Mantis Surgeon', art: '🦗', extra: true, cost: 3, attack: 3, health: 5,
    text: 'Breakthrough: Fully heal your other minions and cleanse them.',
    triggers: [BREAK([{ op: 'heal', target: { minions: { side: 'friendly', excludeSelf: true } }, amount: 99 }, { op: 'cleanse', target: { minions: { side: 'friendly', excludeSelf: true } } }])],
  },
  {
    ...U, id: 'tessellated_guardian', name: 'Tessellated Guardian', art: '🧱', extra: true, cost: 4, attack: 3, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Whenever a friendly minion comes back from Displacement, gain +1/+1.',
    triggers: [{ on: 'minionReturned', filter: { source: { side: 'friendly' }, echo: false }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...U, id: 'chrysanthemum_gate', name: 'Chrysanthemum Gate', art: '🌼', extra: true, cost: 4, attack: 0, health: 6,
    text: 'At the end of your turn, Displace another random friendly minion until your next turn. It comes back with +1/+1.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [displace({ randomOf: { minions: { side: 'friendly', excludeSelf: true } } }, { attack: 1, health: 1 })] }],
  },
  {
    ...U, id: 'hyperdimensional_architect', name: 'Hyperdimensional Architect', art: '📐', extra: true, cost: 5, attack: 5, health: 5,
    text: 'Breakthrough: Draw 2 cards.',
    triggers: [BREAK([{ op: 'draw', count: 2 }])],
  },
  {
    ...U, id: 'machine_elf_choir', name: 'Machine Elf Choir', art: '🎶', extra: true, cost: 4, attack: 4, health: 5, doubleBreakthrough: true,
    text: 'Your Breakthrough effects happen twice.',
  },
  {
    ...U, id: 'the_teacher_beyond', name: 'The Teacher Beyond', art: '👁️', extra: true, cost: 9, attack: 7, health: 7,
    text: 'Arrival: Displace all other minions until your next turn. Yours come back with +2/+2.',
    triggers: [{ on: 'battlecry', effects: [displace({ minions: { side: 'any', excludeSelf: true } }, { ifFriendly: { attack: 2, health: 2 } })] }],
  },
  {
    ...S, id: 'geometry_lesson', name: 'Geometry Lesson', art: '🔷', extra: true, cost: 1,
    text: 'Displace a friendly minion until your next turn. It comes back with +1/+1. Draw a card.',
    target: FRIENDLY_MINION,
    effects: [displace('chosen', { attack: 1, health: 1 }), { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'fold_space', name: 'Fold Space', art: '🗺️', extra: true, cost: 3,
    text: 'Displace an enemy minion until your next turn. Deal 2 damage to all other enemy minions.',
    target: ENEMY_MINION,
    effects: [displace('chosen'), { op: 'damage', target: { minions: { side: 'enemy' } }, amount: 2 }],
  },
  {
    ...S, id: 'the_breakthrough', name: 'The Breakthrough', art: '💥', extra: true, cost: 3,
    text: 'Quick Play: When a friendly minion would take lethal damage, prevent it and Displace that minion until your next turn.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly' }, lethal: true } },
    effects: [{ op: 'preventDamage', target: 'eventTarget', amount: 'all' }, displace('eventTarget')],
  },
  {
    ...T, id: 'mirror_hall', name: 'Mirror Hall', art: '🪞', extra: true, cost: 1,
    text: 'Trap: When your opponent plays a minion, Displace it until their next turn.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [displace('eventSource', { until: 'theirNextTurn' })] },
  },
  {
    ...T, id: 'welcome_back', name: 'Welcome Back', art: '🌟', extra: true, cost: 2,
    text: 'Trap: When a friendly minion comes back from Displacement, give it +2/+2 and Taunt.',
    trap: { on: 'minionReturned', filter: { source: { side: 'friendly' }, echo: false }, effects: [{ op: 'buff', target: 'eventSource', attack: 2, health: 2, keywords: ['Taunt'] }] },
  },
];
