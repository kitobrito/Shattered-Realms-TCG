// RADIOACTIVE FACTION — the designer's complete 30-card list + Hero ability.
// Text is the designer's wording ("Battlecry" shown as Arrival, "Deathrattle" as Exit,
// "Divine Shield" as Evade). Interpretation choices are marked "Ruling:" and listed in
// docs/OPEN_QUESTIONS.md (Q18).
//
// Radiation X (engine applyAuras): while a character with Radiation X is alive, every
// other character without Radiation has X less Health (sources stack). Health
// reduction isn't damage. Characters losing Health this way can't be healed. A minion
// brought to 0 dies, and doesn't come back when the aura ends (designer ruling).
// Permanent Radiation stays until removed; "for N turns" counts the caster's turn ends.
// Obliterate: removed from the game, skipping Exit / Reborn / death effects.
// Faction passive: Radioactive minions ignore Attack / Health reductions their
// enemies cause (not Radiation auras).

const RM = { faction: 'Radioactive', type: 'minion', tribes: ['Mutant'] };
const S = { faction: 'Radioactive', type: 'spell' };
const T = { faction: 'Radioactive', type: 'trap' };

const rad = (target, amount = 1, turns) => ({ op: 'radiate', target, amount, ...(turns ? { turns } : {}) });
const reduce = (target, amount, extra = {}) => ({ op: 'reduceHealth', target, amount, ...extra });
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const RANDOM_ENEMY_MINION = { randomOf: ENEMY_MINIONS };
const ALL_MINIONS = { minions: { side: 'any' } };

export const RADIOACTIVE_CARDS = [
  // ---- Hero ability ----
  {
    ...S, id: 'controlled_irradiation', name: 'Controlled Irradiation', art: '☢️', heroSpell: true, cost: 0, cooldown: 3,
    text: 'Give a friendly minion Radiation 1 for 2 turns. Cooldown: 3 turns.',
    target: { type: 'minion', side: 'friendly' },
    effects: [rad('chosen', 1, 2)],
  },

  // ---- Minions (16) ----
  {
    ...RM, id: 'wasteland_ghoul', name: 'Wasteland Ghoul', art: '🧟', cost: 1, attack: 2, health: 1, attackWhileIrradiated: 2,
    text: 'Arrival: Give this minion Radiation 1 permanently. While it has Radiation, it has +2 Attack.',
    triggers: [{ on: 'battlecry', effects: [rad('self')] }],
  },
  {
    ...RM, id: 'radroach_swarm', name: 'Radroach Swarm', art: '🪳', cost: 1, attack: 2, health: 2,
    text: 'Exit: Give a random enemy minion Radiation 1 permanently.',
    triggers: [{ on: 'deathrattle', effects: [rad(RANDOM_ENEMY_MINION)] }],
  },
  {
    ...RM, id: 'irradiated_scavenger', name: 'Irradiated Scavenger', art: '🦝', cost: 2, attack: 2, health: 3,
    text: 'Whenever this minion takes damage from an enemy character, give that character Radiation 1 permanently.',
    triggers: [{ on: 'damageDealt', filter: { target: 'self', source: 'enemyCharacter' }, effects: [rad('eventSource')] }],
  },
  {
    ...RM, id: 'gamma_brute', name: 'Gamma Brute', art: '💪', cost: 2, attack: 4, health: 3,
    text: 'Drawback: Whenever this minion attacks, deal 1 damage to itself.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self' }, effects: [{ op: 'damage', target: 'self', amount: 1 }] }],
  },
  {
    ...RM, id: 'glowfang_stalker', name: 'Glowfang Stalker', art: '🐺', cost: 3, attack: 3, health: 3,
    text: 'Whenever this minion attacks an enemy minion, give that minion Radiation 1 permanently.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [rad('eventTarget')] }],
  },
  {
    ...RM, id: 'rad_tortoise', name: 'Rad-Tortoise', art: '🐢', cost: 3, attack: 2, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Whenever an enemy minion attacks this, give the attacker Radiation 1 permanently.',
    triggers: [{ on: 'attackDeclared', filter: { target: 'self', source: 'enemyMinion' }, effects: [rad('eventSource')] }],
  },
  {
    ...RM, id: 'feralized_survivor', name: 'Feralized Survivor', art: '🏃', cost: 3, attack: 4, health: 2, keywords: ['Rush'], cantAttackHeroes: true,
    text: 'Rush. Drawback: Cannot attack enemy Heroes.',
  },
  {
    ...RM, id: 'genetic_abomination', name: 'Genetic Abomination', art: '🧬', cost: 4, attack: 5, health: 6,
    text: "Drawback: At the end of your turn, reduce this minion's Health by 1. This is Health reduction, not damage.",
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [reduce('self', 1)] }],
  },
  {
    ...RM, id: 'radiation_surgeon', name: 'Radiation Surgeon', art: '🩺', cost: 4, attack: 4, health: 4,
    text: 'Arrival: Remove all Radiation from a character. If friendly, give it +2/+2. If enemy, reduce its Health by 2.',
    target: { type: 'character', side: 'any' },
    triggers: [{ on: 'battlecry', effects: [
      { op: 'clearRadiation', target: 'chosen' },
      { op: 'buff', target: 'chosen', attack: 2, health: 2, if: { subject: 'chosen', side: 'friendly' }, else: [reduce('chosen', 2)] },
    ] }],
  },
  {
    ...RM, id: 'isotope_scorpion', name: 'Isotope Scorpion', art: '🦂', cost: 4, attack: 4, health: 4,
    text: 'Whenever this minion damages an enemy character, give that character Radiation 1 permanently.',
    triggers: [{ on: 'damageDealt', filter: { source: 'self', target: 'enemyCharacter' }, effects: [rad('eventTarget')] }],
  },
  {
    ...RM, id: 'meltdown_mutant', name: 'Meltdown Mutant', art: '☣️', cost: 5, attack: 6, health: 6,
    text: 'Exit: Give a random enemy minion Radiation 2 permanently.',
    triggers: [{ on: 'deathrattle', effects: [rad(RANDOM_ENEMY_MINION, 2)] }],
  },
  {
    ...RM, id: 'nuclear_bear', name: 'Nuclear Bear', art: '🐻', cost: 5, attack: 6, health: 7,
    text: 'Drawback: Whenever this minion takes damage, reduce the Health of all other friendly minions by 1.',
    triggers: [{ on: 'damageDealt', filter: { target: 'self' }, effects: [reduce({ minions: { side: 'friendly', excludeSelf: true } }, 1)] }],
  },
  {
    ...RM, id: 'critical_mass_horror', name: 'Critical Mass Horror', art: '👾', cost: 6, attack: 5, health: 6,
    text: 'Arrival: Give an enemy minion Radiation 2 permanently.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [rad('chosen', 2)] }],
  },
  {
    ...RM, id: 'the_unstable_colossus', name: 'The Unstable Colossus', art: '🗿', cost: 7, attack: 7, health: 8, keywords: ['Taunt'],
    text: "Taunt. Drawback: At the end of your turn, reduce this minion's Health by 1.",
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [reduce('self', 1)] }],
  },
  {
    ...RM, id: 'the_irradiated_genius', name: 'The Irradiated Genius', art: '🧠', cost: 8, attack: 6, health: 8,
    text: "Arrival: Give all enemy minions Radiation 1 for 2 turns. Until your next turn, your other Radioactive minions ignore Radiation auras.",
    triggers: [{ on: 'battlecry', effects: [
      rad(ENEMY_MINIONS, 1, 2),
      { op: 'radProof', target: { minions: { side: 'friendly', faction: 'Radioactive', excludeSelf: true } } },
    ] }],
  },
  {
    ...RM, id: 'ground_zero', name: 'Ground Zero', art: '💥', cost: 9, attack: 8, health: 10,
    text: 'Arrival: Deal 4 damage to all other characters. Obliterate every minion destroyed by this effect.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: { characters: { side: 'any', excludeSelf: true } }, amount: 4, obliterateKilled: true }] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'radioactive_sludge', name: 'Radioactive Sludge', art: '🧪', cost: 1,
    text: 'Give an enemy minion Radiation 1 permanently. If it already has Radiation, increase its Radiation by 1 instead.',
    target: ENEMY_MINION,
    effects: [rad('chosen')],
  },
  {
    ...S, id: 'radiation_leak', name: 'Radiation Leak', art: '💧', cost: 2,
    text: 'Give an enemy minion Radiation 1 for 2 turns.',
    target: ENEMY_MINION,
    effects: [rad('chosen', 1, 2)],
  },
  {
    ...S, id: 'dna_destabilization', name: 'DNA Destabilization', art: '🧬', cost: 3,
    text: "Reduce an enemy minion's Health by 2. If it has Radiation, reduce its Health by 2 more.",
    target: ENEMY_MINION,
    effects: [reduce('chosen', 2, { irradiatedBonus: 2 })],
  },
  {
    ...S, id: 'forced_mutation', name: 'Forced Mutation', art: '🦠', cost: 3,
    text: 'Give a friendly Radioactive minion +4/+4. At the end of your turn, reduce its Health by 3.',
    target: { type: 'minion', side: 'friendly', faction: 'Radioactive' },
    effects: [
      { op: 'buff', target: 'chosen', attack: 4, health: 4 },
      { op: 'grantTrigger', target: 'chosen', temporary: true, trigger: { on: 'endOfTurn', filter: { player: 'friendly' }, effects: [reduce('self', 3)] } },
    ],
  },
  {
    ...S, id: 'reactor_meltdown', name: 'Reactor Meltdown', art: '☢️', cost: 4,
    text: 'Deal 3 damage to all minions. Obliterate every minion destroyed by this spell.',
    effects: [{ op: 'damage', target: ALL_MINIONS, amount: 3, obliterateKilled: true }],
  },
  {
    ...S, id: 'nuclear_erasure', name: 'Nuclear Erasure', art: '🌋', cost: 7,
    text: 'Reduce the Health of all minions by 4. Obliterate every minion whose Health reaches 0 or less as a result. Your Hero takes 3 damage.',
    // Ruling (Q18): enemy Radioactive minions shrug off the reduction (faction passive).
    effects: [reduce(ALL_MINIONS, 4, { obliterateKilled: true }), { op: 'damage', target: 'friendlyHero', amount: 3 }],
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'toxic_backlash', name: 'Toxic Backlash', art: '🤢', cost: 1,
    text: 'When an enemy minion damages a friendly character: Give the attacking minion Radiation 1 permanently.',
    quickPlay: { windows: ['damageDealt'], filter: { source: 'enemyMinion', target: 'friendlyCharacter' } },
    effects: [rad('eventSource')],
  },
  {
    ...S, id: 'adrenal_mutation', name: 'Adrenal Mutation', art: '💉', cost: 2,
    text: 'When a friendly Radioactive minion takes damage and survives: Give it +3 Attack until the end of the turn.',
    quickPlay: { windows: ['damageDealt'], filter: { target: { side: 'friendly', faction: 'Radioactive' } } },
    effects: [{ op: 'buff', target: 'eventTarget', attack: 3, temporary: true, if: { subject: 'eventTarget', alive: true } }],
  },
  {
    ...S, id: 'contamination_burst', name: 'Contamination Burst', art: '💨', cost: 2,
    text: 'When your opponent summons a minion: Give that minion Radiation 1 for 2 turns.',
    quickPlay: { windows: ['cardPlayed'], filter: { player: 'enemy', cardType: 'minion' } },
    effects: [rad('eventSource', 1, 2)],
  },
  {
    ...S, id: 'chain_reaction', name: 'Chain Reaction', art: '⚛️', cost: 3,
    text: 'When an enemy minion with Radiation dies: Give a random enemy minion Radiation 1 permanently.',
    quickPlay: { windows: ['minionDied'], filter: { source: 'enemyMinion', deadIrradiated: true } },
    effects: [rad(RANDOM_ENEMY_MINION)],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'rad_mine', name: 'Rad Mine', art: '💣', cost: 1,
    text: 'When an enemy minion attacks: Give it Radiation 1 permanently.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [rad('eventSource')] },
  },
  {
    ...T, id: 'containment_breach', name: 'Containment Breach', art: '🚨', cost: 2,
    text: 'When your opponent plays a minion: If it has no Radiation, give it Radiation 1 permanently. Otherwise, reduce its Health by 3.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      { ...rad('eventSource'), if: { subject: 'eventSource', irradiated: false }, else: [reduce('eventSource', 3)] },
    ] },
  },
  {
    ...T, id: 'feral_ambush', name: 'Feral Ambush', art: '🐾', cost: 2, needsBoardSpace: true,
    text: 'When an enemy minion attacks your Hero: Summon a 3/2 Feral Ghoul with Rush. It attacks the triggering minion if able.',
    // Ruling (Q18): the Ghoul fights the attacker right away.
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [
      { op: 'summon', cardId: 'feral_ghoul' }, { op: 'fight', attacker: 'summoned', defender: 'eventSource' },
    ] },
  },
  {
    ...T, id: 'last_resort_protocol', name: 'Last Resort Protocol', art: '🛑', cost: 5,
    text: "When your Hero would take lethal damage: prevent it. All minions lose 3 Health; Obliterate any that reach 0.",
    // Ruling (Q18): "once per game" is automatic — a Trap is used up when it triggers.
    trap: { on: 'heroLethal', effects: [reduce(ALL_MINIONS, 3, { obliterateKilled: true })] },
  },

  // ---- Expansion: 15 extra cards (designer's second set) ----
  // `extra`: not in the standard 30; players can swap them in (deck builder, "Swap cards").
  // Costs for this set are our proposals (the designer gave stats, not costs).
  {
    ...RM, id: 'fallout_scavenger', name: 'Fallout Scavenger', art: '🦴', extra: true, cost: 1, attack: 1, health: 2,
    text: 'Arrival: If your opponent controls a character with Radiation, gain +1/+1.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'self', attack: 1, health: 1, if: { enemyIrradiated: true } }] }],
  },
  {
    ...RM, id: 'isotope_rat', name: 'Isotope Rat', art: '🐀', extra: true, cost: 2, attack: 2, health: 2,
    text: 'Exit: Give a random enemy minion Radiation 1 permanently.',
    triggers: [{ on: 'deathrattle', effects: [rad(RANDOM_ENEMY_MINION)] }],
  },
  {
    ...RM, id: 'containment_officer', name: 'Containment Officer', art: '👮', extra: true, cost: 2, attack: 2, health: 3,
    text: 'Whenever another friendly minion gains Radiation, this gains +1 Health.',
    triggers: [{ on: 'radiationApplied', filter: { target: { side: 'friendly', notSelf: true } }, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...RM, id: 'gamma_hound', name: 'Gamma Hound', art: '🐕', extra: true, cost: 3, attack: 3, health: 3,
    text: 'Arrival: Deal 1 damage to each enemy minion with Radiation.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: { minions: { side: 'enemy', irradiated: true } }, amount: 1 }] }],
  },
  {
    ...RM, id: 'irradiated_behemoth', name: 'Irradiated Behemoth', art: '🦏', extra: true, cost: 5, attack: 3, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Whenever this gains Radiation, restore 2 Health to your Hero (even while Radiation blocks healing).',
    triggers: [{ on: 'radiationApplied', filter: { target: 'self' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 2, ignoreRadiation: true }] }],
  },
  {
    ...RM, id: 'isotope_engineer', name: 'Isotope Engineer', art: '🔧', extra: true, cost: 4, attack: 3, health: 4,
    text: 'Arrival: Give a friendly minion Radiation 1 permanently. Discover a spell from your deck.',
    target: { type: 'minion', side: 'friendly' },
    triggers: [{ on: 'battlecry', effects: [rad('chosen'), { op: 'discover', from: 'deck', filter: { type: 'spell' } }] }],
  },
  {
    ...RM, id: 'critical_mass_mutant', name: 'Critical Mass Mutant', art: '🧌', extra: true, cost: 6, attack: 5, health: 5,
    text: 'Arrival: Gain +1/+1 for each enemy character with Radiation.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'gainStatsPerCount', count: { characters: { side: 'enemy', irradiated: true } }, attack: 1, health: 1 }] }],
  },
  {
    ...RM, id: 'meltdown_colossus', name: 'Meltdown Colossus', art: '🏭', extra: true, cost: 8, attack: 7, health: 8,
    text: 'At the end of your turn, give a random enemy minion Radiation 1 permanently.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [rad(RANDOM_ENEMY_MINION)] }],
  },
  {
    ...S, id: 'controlled_exposure', name: 'Controlled Exposure', art: '🎯', extra: true, cost: 1,
    text: 'Give a friendly minion Radiation 1 permanently. Draw a card.',
    target: { type: 'minion', side: 'friendly' },
    effects: [rad('chosen'), { op: 'draw' }],
  },
  {
    ...S, id: 'reactor_overload', name: 'Reactor Overload', art: '⚡', extra: true, cost: 3,
    text: 'Remove all Radiation from your minions. For each Radiation removed, deal 1 damage to a random enemy minion.',
    effects: [{ op: 'overload', target: { minions: { side: 'friendly' } }, damageTo: { minions: { side: 'enemy', alive: true } } }],
  },
  {
    ...S, id: 'radioactive_fallout', name: 'Radioactive Fallout', art: '🌧️', extra: true, cost: 4,
    text: 'Deal 2 damage to all minions. Minions that survive gain Radiation 1 permanently.',
    effects: [
      { op: 'damage', target: ALL_MINIONS, amount: 2 },
      rad({ minions: { side: 'any', alive: true } }),
    ],
  },
  {
    ...S, id: 'emergency_decontamination', name: 'Emergency Decontamination', art: '🚿', extra: true, cost: 2,
    text: 'Remove all Radiation from a friendly character. Restore 3 Health to it.',
    quickPlay: {},
    target: { type: 'character', side: 'friendly' },
    effects: [{ op: 'clearRadiation', target: 'chosen' }, { op: 'heal', target: 'chosen', amount: 3 }],
  },
  {
    ...S, id: 'gamma_reversal', name: 'Gamma Reversal', art: '🌀', extra: true, cost: 2,
    text: 'When an enemy minion gains Radiation: Give it Radiation 2 more permanently.',
    // Ruling: it can answer Radiation from either player's effects, on either turn.
    quickPlay: { windows: ['enemyIrradiated'], filter: { target: 'enemyMinion' } },
    effects: [rad('eventTarget', 2)],
  },
  {
    ...T, id: 'breach_protocol', name: 'Breach Protocol', art: '🚪', extra: true, cost: 1,
    text: 'When your opponent summons a minion: Give it Radiation 1 permanently.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [rad('eventSource')] },
  },
  {
    ...T, id: 'critical_failure', name: 'Critical Failure', art: '🚨', extra: true, cost: 3,
    text: 'When an enemy minion attacks: Give it Radiation 2 permanently and deal 2 damage to it.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [rad('eventSource', 2), { op: 'damage', target: 'eventSource', amount: 2 }] },
  },

  // ---- Token ----
  { ...RM, id: 'feral_ghoul', name: 'Feral Ghoul', art: '🧟', token: true, cost: 2, attack: 3, health: 2, keywords: ['Rush'], text: 'Rush.' },

  // ---- Legendary add-ons ----
  {
    ...RM, id: 'ogrus_kamikaze_trooper', name: 'Ogrus, Kamikaze Trooper', art: '💣', extra: true, cost: 6, attack: 5, health: 5, keywords: ['Rush'],
    text: 'Rush. After Ogrus attacks, he explodes (destroy him). Exit: Deal 3 damage to all enemies and give them Radiation 1 for 2 turns.',
    triggers: [
      { on: 'afterAttack', filter: { source: 'self' }, effects: [{ op: 'destroy', target: 'self' }] },
      { on: 'deathrattle', effects: [{ op: 'damage', target: { characters: { side: 'enemy' } }, amount: 3 }, rad({ characters: { side: 'enemy' } }, 1, 2)] },
    ],
  },
  {
    ...RM, id: 'the_elephants_foot', name: "The Elephant's Foot", art: '🦶', extra: true, cost: 8, attack: 1, health: 10, keywords: ['Taunt'], radiation: 3, cantAttack: true,
    text: "Taunt. Radiation 3. Can't attack.",
  },
];
