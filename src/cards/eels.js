// EELS FACTION — Storm Eels. Electric eels that store up electricity (Volts) and release it as
// Chain lightning that jumps from enemy to enemy. The designer's 30-card list, the Hero Spell
// Static Field and the Elver token.
//
// Volts (core.js gainVolts): stored on a minion, up to 5 (Capacitor Eel: 10). Silence drains them.
// Discharge (effects.js dischargeMinion): spend all of a minion's Volts on a Chain of that strength.
//   A minion that dies holding Volts Discharges half of them at a random enemy (engine deaths step).
// Chain X (effects.js chainLightning): X damage, then a jump to the nearest enemy minion it hasn't
//   hit, 1 weaker each jump; power left over hits the enemy Hero. Conductive minions pass it on at
//   full power.

const EEL = { faction: 'Eels', type: 'minion', tribes: ['Eel'] };
const BEAST = { faction: 'Eels', type: 'minion', tribes: ['Beast'] };
const S = { faction: 'Eels', type: 'spell' };
const T = { faction: 'Eels', type: 'trap' };

// A Chain starts at the enemy you choose (a minion, or the Hero to hit it alone).
const ENEMY_CHAR = { type: 'character', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const FRIENDLY_MINIONS = { minions: { side: 'friendly' } };
const OTHER_FRIENDLY = { minions: { side: 'friendly', excludeSelf: true } };
const MY_TURN_START = { on: 'startOfTurn', filter: { player: 'friendly' } };
const MY_TURN_END = { on: 'endOfTurn', filter: { player: 'friendly' } };
const chain = (amount, extra = {}) => ({ op: 'chain', amount, start: 'chosen', ...extra });
const volts = (target, amount) => ({ op: 'gainVolts', target, amount });
// Charges up whenever it takes damage (and lives).
const SHOCKED = { on: 'damageDealt', filter: { target: 'self', selfAlive: true }, effects: [volts('self', 1)] };

export const EEL_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'static_field', name: 'Static Field', art: '⚡', heroSpell: true, cost: 2,
    target: { type: 'minion', side: 'friendly' }, target2: { type: 'minion', side: 'enemy' }, target2Optional: true,
    text: 'Give a friendly minion 1 Volt and make an enemy minion Conductive.',
    effects: [volts('chosen', 1), { op: 'conductive', target: 'chosen2' }],
  },

  // ---- Minions (18) ----
  {
    ...EEL, id: 'glass_eel', name: 'Glass Eel', art: '🫧', cost: 1, attack: 1, health: 1,
    text: 'Whenever you cast a spell, gain 1 Volt.',
    triggers: [{ on: 'cardPlayed', filter: { player: 'friendly', cardType: 'spell' }, effects: [volts('self', 1)] }],
  },
  {
    ...EEL, id: 'elver_swarm', name: 'Elver Swarm', art: '🐟', cost: 1, attack: 1, health: 1,
    text: 'Arrival: Summon a 1/1 Elver with 1 Volt.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'elver' }] }],
  },
  {
    ...EEL, id: 'spark_fry', name: 'Spark Fry', art: '✨', cost: 2, attack: 1, health: 1,
    text: 'Arrival: Chain 2.', target: ENEMY_CHAR,
    triggers: [{ on: 'battlecry', effects: [chain(2)] }],
  },
  {
    ...EEL, id: 'dynamo_eel', name: 'Dynamo Eel', art: '⚙️', cost: 2, attack: 2, health: 2,
    text: 'At the start of your turn, gain 1 Volt.',
    triggers: [{ ...MY_TURN_START, effects: [volts('self', 1)] }],
  },
  {
    ...EEL, id: 'riverbed_lurker', name: 'Riverbed Lurker', art: '🪨', cost: 2, attack: 1, health: 4, keywords: ['Taunt'],
    text: 'Taunt. Whenever it takes damage, gain 1 Volt.',
    triggers: [SHOCKED],
  },
  {
    faction: 'Eels', type: 'minion', tribes: ['Beast'], id: 'volt_leech', name: 'Volt Leech', art: '🩸', cost: 2, attack: 2, health: 2,
    text: 'Whenever a friendly minion Discharges, restore 1 Health to your Hero.',
    triggers: [{ on: 'discharged', filter: { player: 'friendly' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 1 }] }],
  },
  {
    ...EEL, id: 'shock_trooper_eel', name: 'Shock Trooper Eel', art: '🪖', cost: 3, attack: 2, health: 2,
    text: 'Arrival: Chain 2.', target: ENEMY_CHAR,
    triggers: [{ on: 'battlecry', effects: [chain(2)] }],
  },
  {
    ...EEL, id: 'capacitor_eel', name: 'Capacitor Eel', art: '🔋', cost: 3, attack: 2, health: 4, voltCap: 10,
    text: 'Can hold up to 10 Volts. At the start of your turn, gain 1 Volt.',
    triggers: [{ ...MY_TURN_START, effects: [volts('self', 1)] }],
  },
  {
    ...EEL, id: 'eelectrician', name: 'Eelectrician', art: '🔧', cost: 3, attack: 3, health: 3,
    text: 'Arrival: Give every other friendly minion 1 Volt.',
    triggers: [{ on: 'battlecry', effects: [volts(OTHER_FRIENDLY, 1)] }],
  },
  {
    ...EEL, id: 'ampere_moray', name: 'Ampere Moray', art: '🐍', cost: 4, attack: 4, health: 5, voltsOnConductiveHit: 1,
    text: 'Whenever one of your Chains hits a Conductive minion, gain 1 Volt.',
  },
  {
    ...EEL, id: 'brackwater_shocker', name: 'Brackwater Shocker', art: '⚡', cost: 4, attack: 4, health: 4, keywords: ['Rush'],
    text: 'Rush. Whenever it attacks a minion, Chain 2 jumps from that minion to the next.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [{ op: 'chain', amount: 2, jumpFrom: 'eventTarget' }] }],
  },
  {
    ...EEL, id: 'galvanic_guardian', name: 'Galvanic Guardian', art: '🛡️', cost: 4, attack: 3, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Whenever it takes damage, gain 1 Volt.',
    triggers: [SHOCKED],
  },
  {
    ...EEL, id: 'storm_coil_eel', name: 'Storm Coil Eel', art: '🌀', cost: 5, attack: 4, health: 6, chainFirstJumpFree: true,
    text: "Your Chains don't get weaker on their first jump.",
  },
  {
    ...BEAST, id: 'tidal_generator', name: 'Tidal Generator', art: '🐢', cost: 5, attack: 3, health: 7,
    text: 'At the end of your turn, give every friendly minion 1 Volt.',
    triggers: [{ ...MY_TURN_END, effects: [volts(FRIENDLY_MINIONS, 1)] }],
  },
  {
    ...EEL, id: 'voltage_matriarch', name: 'Voltage Matriarch', art: '👑', cost: 6, attack: 4, health: 5,
    text: 'At the start of your turn, your other minions gain 1 Volt.',
    triggers: [{ ...MY_TURN_START, effects: [volts(OTHER_FRIENDLY, 1)] }],
  },
  {
    ...EEL, id: 'megavolt_eel', name: 'Megavolt Eel', art: '⚡', cost: 7, attack: 6, health: 6, startVolts: 4,
    text: 'Starts with 4 Volts.',
  },
  {
    ...EEL, id: 'the_thunderhead', name: 'The Thunderhead', art: '🌩️', cost: 7, attack: 6, health: 6, chainLossless: true,
    text: 'Your Chains never get weaker when they jump.',
  },
  {
    ...EEL, id: 'leviathan_of_the_deep_storm', name: 'Leviathan of the Deep Storm', art: '🐉', cost: 8, attack: 8, health: 8,
    text: 'Arrival: Every other friendly minion Discharges, one after another.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'dischargeAll' }] }],
  },

  // ---- Spells (9) ----
  { ...S, id: 'static_spark', name: 'Static Spark', art: '⚡', cost: 2, target: ENEMY_CHAR, text: 'Chain 2.', effects: [chain(2)] },
  {
    ...S, id: 'wet_net', name: 'Wet Net', art: '🕸️', cost: 1,
    text: 'Make all enemy minions Conductive. Draw a card.',
    effects: [{ op: 'conductive', target: ENEMY_MINIONS }, { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'copper_coil', name: 'Copper Coil', art: '🧲', cost: 2, target: { type: 'minion', side: 'friendly' },
    text: 'Give a friendly minion 3 Volts.', effects: [volts('chosen', 3)],
  },
  {
    ...S, id: 'arc_flash', name: 'Arc Flash', art: '💥', cost: 2, target: { type: 'minion', side: 'friendly', minVolts: 1 },
    text: 'A friendly minion Discharges. If the Chain hits 3 or more targets, draw a card.',
    effects: [{ op: 'discharge', target: 'chosen', drawIfHits: 3 }],
  },
  {
    ...S, id: 'thunder_shoal', name: 'Thunder Shoal', art: '🌊', cost: 3, target: ENEMY_CHAR,
    text: 'Chain 2. If a friendly minion has 3 or more Volts, Chain 2 again.',
    effects: [chain(2), { op: 'chain', amount: 2, if: { controls: { minVolts: 3 } } }],
  },
  {
    ...S, id: 'storm_drain', name: 'Storm Drain', art: '🌀', cost: 3, target: { type: 'minion', side: 'enemy', conductive: true },
    text: 'Destroy a Conductive enemy minion.', effects: [{ op: 'destroy', target: 'chosen' }],
  },
  {
    ...S, id: 'overcharge', name: 'Overcharge', art: '🔆', cost: 3, target: { type: 'minion', side: 'friendly', minVolts: 1 },
    text: "Double a friendly minion's Volts (it can go over the limit).", effects: [{ op: 'doubleVolts', target: 'chosen' }],
  },
  { ...S, id: 'live_wire', name: 'Live Wire', art: '🌩️', cost: 6, target: ENEMY_CHAR, text: 'Chain 4.', effects: [chain(4)] },
  {
    ...S, id: 'reef_blackout', name: 'Reef Blackout', art: '🌑', cost: 7, target: ENEMY_CHAR,
    text: 'Make all enemy minions Conductive, then Chain 3.',
    effects: [{ op: 'conductive', target: ENEMY_MINIONS }, chain(3)],
  },

  // ---- Traps (3) ----
  {
    ...T, id: 'live_current', name: 'Live Current', art: '💧', cost: 2,
    text: 'When an enemy minion attacks: make all enemy minions Conductive, then Chain 2 starting at the attacker.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [{ op: 'conductive', target: ENEMY_MINIONS }, { op: 'chain', amount: 2, start: 'eventSource' }] },
  },
  {
    ...T, id: 'short_circuit', name: 'Short Circuit', art: '🔌', cost: 3,
    text: 'When an enemy minion attacks while you have a minion with Volts: your minion with the most Volts Discharges, starting at the attacker.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', myVoltsAtLeast: 1 }, effects: [{ op: 'dischargeMost', at: 'eventSource' }] },
  },
  {
    ...T, id: 'lightning_rod', name: 'Lightning Rod', art: '🗼', cost: 3,
    text: 'When your opponent casts a spell: give your minions 2 Volts.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'spell' }, effects: [volts(FRIENDLY_MINIONS, 2)] },
  },

  // ---- Token ----
  { ...EEL, token: true, id: 'elver', name: 'Elver', art: '🐟', cost: 1, attack: 1, health: 1, startVolts: 1, text: 'Starts with 1 Volt.' },
];
