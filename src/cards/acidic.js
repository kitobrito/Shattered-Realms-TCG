// ACIDIC FACTION — The Corrosion Court. The designer's 30-card list, the Hero Spell
// Caustic Reservoir and the tokens made by the Acidic Fusions.
//
// Corrosion X (core.js corrode): permanently lowers a minion's Attack by X, never its Health.
// At 0 Attack it can't attack until its Attack rises again. It lasts while the minion stays
// in play. Dissolve (core.js dissolve): strip temporary buffs; failing that, one defensive
// effect; failing that, Corrosion 1. Acid-coated: the next Corrosion is 1 stronger.
// Caustic: abilities that trigger when Corrosion hits an enemy minion.
// `corrodes: true` marks spells that apply Corrosion (Living Flask).
// Rulings made while building are marked "Ruling:".

const K = { faction: 'Acidic', type: 'minion', tribes: ['Acidborn'] };
const S = { faction: 'Acidic', type: 'spell' };
const T = { faction: 'Acidic', type: 'trap' };

const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const corrode = (target, amount, extra = {}) => ({ op: 'corrode', target, amount, ...extra });
const dissolve = (target, extra = {}) => ({ op: 'dissolve', target, ...extra });
const once = (key, effects) => ({ op: 'oncePerTurn', key, effects });

export const ACIDIC_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'caustic_reservoir', name: 'Caustic Reservoir', art: '⚗️', heroSpell: true, cost: 2, corrodes: true,
    text: 'Apply Corrosion 1 to an enemy minion. At the start of each of your turns, if it survived, apply Corrosion 1 to it again.',
    // Ruling: one Reservoir target at a time; using it on a new minion moves the drip there.
    // Balance: the designer's first hit was Corrosion 2; 1 brought Acidic from 76% to ~50%.
    target: ENEMY_MINION,
    effects: [corrode('chosen', 1), { op: 'setReservoir', target: 'chosen' }],
  },

  // ---- Minions (16) ----
  {
    ...K, id: 'bubble_slime', name: 'Bubble Slime', art: '🫧', cost: 1, attack: 1, health: 1,
    text: 'Arrival: Apply Corrosion 1 to a random enemy minion.',
    triggers: [{ on: 'battlecry', effects: [corrode({ randomOf: ENEMY_MINIONS }, 1)] }],
  },
  {
    ...K, id: 'acid_newt', name: 'Acid Newt', art: '🦎', cost: 1, attack: 1, health: 2,
    text: 'Caustic: Whenever you apply Corrosion to an enemy minion, gain +1 Attack this turn. Once per turn.',
    triggers: [{ on: 'corrosionApplied', filter: { by: 'friendly', player: 'enemy' }, effects: [once('newt', [{ op: 'buff', target: 'self', attack: 1, temporary: true }])] }],
  },
  {
    ...K, id: 'corrosive_beetle', name: 'Corrosive Beetle', art: '🪲', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Apply Corrosion 2 to an enemy minion with 2 or less Attack.',
    target: { type: 'minion', side: 'enemy', maxAttack: 2 },
    triggers: [{ on: 'battlecry', effects: [corrode('chosen', 2)] }],
  },
  {
    ...K, id: 'caustic_jelly', name: 'Caustic Jelly', art: '🪼', cost: 2, attack: 1, health: 3, keywords: ['Taunt'],
    text: 'Taunt. The first time each turn an enemy minion attacks this, apply Corrosion 1 to the attacker.',
    triggers: [{ on: 'attackDeclared', filter: { target: 'self', source: 'enemyMinion' }, effects: [once('jelly', [corrode('eventSource', 1)])] }],
  },
  {
    ...K, id: 'fume_alchemist', name: 'Fume Alchemist', art: '⚗️', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Give an enemy minion Acid-coated. Its next Corrosion lowers its Attack by 1 more.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'acidCoat', target: 'chosen' }] }],
  },
  {
    ...K, id: 'shell_melter', name: 'Shell-Melter', art: '🐌', cost: 3, attack: 3, health: 3,
    text: 'Whenever this attacks a minion, apply Corrosion 1 to it before combat.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [corrode('eventTarget', 1)] }],
  },
  {
    ...K, id: 'armor_leech', name: 'Armor Leech', art: '🪱', cost: 3, attack: 2, health: 4,
    text: 'Arrival: Remove up to 3 Armor from the enemy Hero. Gain +1 Attack for every 2 Armor removed.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'stripArmor', amount: 3, attackPer: 2 }] }],
  },
  {
    ...K, id: 'spitfire_salamander', name: 'Spitfire Salamander', art: '🦎', cost: 3, attack: 3, health: 2,
    text: 'Arrival: Deal 2 damage to an enemy minion. If it has Corrosion, deal 1 more.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2, amountIf: { if: { subject: 'chosen', corroded: true }, amount: 3 } }] }],
  },
  {
    ...K, id: 'rust_eater_brute', name: 'Rust-Eater Brute', art: '🦏', cost: 4, attack: 3, health: 4,
    text: 'Arrival: Apply Corrosion 2 to all enemy minions that have buffs or defensive keywords.',
    triggers: [{ on: 'battlecry', effects: [corrode({ minions: { side: 'enemy', buffedOrDefended: true } }, 2)] }],
  },
  {
    ...K, id: 'living_flask', name: 'Living Flask', art: '🧪', cost: 4, attack: 2, health: 5,
    text: 'Whenever you play a spell that applies Corrosion, restore 2 Health to your Hero.',
    triggers: [{ on: 'corrosiveSpell', filter: { player: 'friendly' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 2 }] }],
  },
  {
    ...K, id: 'dissolver_mantis', name: 'Dissolver Mantis', art: '🦗', cost: 4, attack: 4, health: 3,
    text: "Arrival: Dissolve an enemy minion's defensive effect. If it has none, apply Corrosion 2.",
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [dissolve('chosen', { defenseOnly: true, fallback: 2 })] }],
  },
  {
    ...K, id: 'ooze_mimic', name: 'Ooze Mimic', art: '🟢', cost: 5, attack: 4, health: 3,
    text: "Arrival: This minion's Attack becomes an enemy minion's Attack. Then apply Corrosion 2 to that minion.",
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'copyAttack', from: 'chosen' }, corrode('chosen', 2)] }],
  },
  {
    ...K, id: 'caustic_crab', name: 'Caustic Crab', art: '🦀', cost: 5, attack: 2, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Caustic: Whenever an enemy minion loses Attack from Corrosion, gain +1 Attack permanently. Once per turn.',
    triggers: [{ on: 'corrosionApplied', filter: { player: 'enemy', lostAttack: true }, effects: [once('crab', [{ op: 'buff', target: 'self', attack: 1 }])] }],
  },
  {
    ...K, id: 'tri_maw_hydra', name: 'Tri-Maw Hydra', art: '🐍', cost: 6, attack: 4, health: 5,
    text: 'Arrival: Apply Corrosion 2 to up to three different random enemy minions.',
    triggers: [{ on: 'battlecry', effects: [corrode({ randomOf: ENEMY_MINIONS, count: 3 }, 2)] }],
  },
  {
    ...K, id: 'world_eater_slug', name: 'World-Eater Slug', art: '🐌', cost: 7, attack: 5, health: 6,
    text: 'Arrival: Apply Corrosion 3 to all enemy minions with 4 or more Attack.',
    triggers: [{ on: 'battlecry', effects: [corrode({ minions: { side: 'enemy', minAttack: 4 } }, 3)] }],
  },
  {
    ...K, id: 'the_great_dissolution', name: 'The Great Dissolution', art: '🌋', cost: 9, attack: 6, health: 8,
    text: 'Arrival: Apply Corrosion 2 to all enemy minions. Then deal 3 damage to each enemy minion with 0 Attack.',
    triggers: [{ on: 'battlecry', effects: [corrode(ENEMY_MINIONS, 2), { op: 'damage', target: { minions: { side: 'enemy', maxAttack: 0 } }, amount: 3 }] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'splash_of_acid', name: 'Splash of Acid', art: '💦', cost: 1, corrodes: true,
    text: 'Apply Corrosion 2 to a minion.',
    target: { type: 'minion', side: 'any' }, effects: [corrode('chosen', 2)],
  },
  {
    ...S, id: 'strip_the_plating', name: 'Strip the Plating', art: '🛡️', cost: 2,
    text: 'Dissolve an enemy minion. Repeat if it has 5 or more Attack.',
    target: ENEMY_MINION, effects: [dissolve('chosen', { repeatIfAttackAtLeast: 5 })],
  },
  {
    ...S, id: 'caustic_bath', name: 'Caustic Bath', art: '🛁', cost: 3, corrodes: true,
    text: 'Apply Corrosion 1 to all enemy minions. Draw a card for each one brought to 0 Attack (up to 2).',
    effects: [corrode(ENEMY_MINIONS, 1, { drawPerZeroed: 2 })],
  },
  {
    ...S, id: 'acid_rain', name: 'Acid Rain', art: '🌧️', cost: 4, corrodes: true,
    text: 'Deal 2 damage to all enemy minions. Apply Corrosion 1 to any that survive.',
    effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 2 }, corrode({ minions: { side: 'enemy', alive: true } }, 1)],
  },
  {
    ...S, id: 'molecular_breakdown', name: 'Molecular Breakdown', art: '⚛️', cost: 5, corrodes: true,
    text: 'Remove an enemy minion\'s temporary buffs and apply Corrosion 4 to it.',
    target: ENEMY_MINION, effects: [{ op: 'removeTempBuffs', target: 'chosen' }, corrode('chosen', 4)],
  },
  {
    ...S, id: 'total_dissolution', name: 'Total Dissolution', art: '☣️', cost: 8, corrodes: true,
    text: 'Apply Corrosion 3 to all enemy minions, then destroy any with 0 Attack.',
    effects: [corrode(ENEMY_MINIONS, 3), { op: 'destroy', target: { minions: { side: 'enemy', maxAttack: 0 } } }],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'false_floor', name: 'False Floor', art: '🕳️', cost: 2,
    text: 'When an enemy minion attacks: apply Corrosion 2 to it before combat.',
    trap: { on: 'attackDeclared', filter: { source: { side: 'enemy' } }, effects: [corrode('eventSource', 2)] },
  },
  {
    ...T, id: 'volatile_flask', name: 'Volatile Flask', art: '⚗️', cost: 2,
    text: 'When your opponent plays a minion: deal 2 damage to it. If it survives, apply Corrosion 1.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      { op: 'damage', target: 'eventSource', amount: 2 }, corrode('eventSource', 1, { if: { subject: 'eventSource', alive: true } }),
    ] },
  },
  {
    ...T, id: 'rusted_jaws', name: 'Rusted Jaws', art: '🪤', cost: 3,
    text: 'When an enemy minion with 4 or more Attack attacks your Hero: apply Corrosion 3 to it and stop its attack.',
    trap: { on: 'attackDeclared', filter: { source: { side: 'enemy', minAttack: 4 }, target: 'friendlyHero' }, effects: [
      corrode('eventSource', 3), { op: 'stopAttack' },
    ] },
  },
  {
    ...T, id: 'corrosion_chamber', name: 'Corrosion Chamber', art: '🏭', cost: 4,
    text: 'When your opponent summons their third minion in a turn: apply Corrosion 2 to all enemy minions.',
    trap: { on: 'minionSummoned', filter: { player: 'enemy', summonCount: 3 }, effects: [corrode(ENEMY_MINIONS, 2)] },
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'snap_corrosion', name: 'Snap Corrosion', art: '⚡', cost: 1, corrodes: true,
    text: 'Quick Play: When an enemy minion attacks, apply Corrosion 2 to it.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [corrode('eventSource', 2)],
  },
  {
    ...S, id: 'shield_eater', name: 'Shield-Eater', art: '🛡️', cost: 2, quickPlay: {},
    text: 'Quick Play: Dissolve an enemy minion. If a defensive effect was removed, deal 2 damage to it.',
    target: ENEMY_MINION,
    effects: [dissolve('chosen', { ifDefense: [{ op: 'damage', target: 'chosen', amount: 2 }] })],
  },
  {
    ...S, id: 'reactive_spill', name: 'Reactive Spill', art: '🧴', cost: 3, corrodes: true,
    text: 'Quick Play: When an enemy minion gains Attack, take that Attack away and apply Corrosion 2 to it.',
    quickPlay: { windows: ['enemyBuffed'], filter: { target: 'enemyMinion' } },
    effects: [{ op: 'undoAttackGain', target: 'eventTarget' }, corrode('eventTarget', 2)],
  },
  {
    ...S, id: 'emergency_neutralizer', name: 'Emergency Neutralizer', art: '🚨', cost: 4, corrodes: true,
    text: 'Quick Play: When an enemy minion attacks, apply Corrosion 3 to it. If its Attack reaches 0, stop the attack.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [corrode('eventSource', 3), { op: 'stopAttack', if: { subject: 'eventSource', attackAtMost: 0 } }],
  },

  // ---- Tokens (from the Acidic Fusions) ----
  {
    faction: 'Acidic', type: 'minion', tribes: ['Plant'], id: 'pitcher_bloom_plant', name: 'Pitcher Bloom', art: '🌱', token: true,
    cost: 2, attack: 1, health: 3, keywords: ['Taunt'],
    text: 'Taunt. Whenever an enemy minion attacks this, apply Corrosion 1 to the attacker.',
    triggers: [{ on: 'attackDeclared', filter: { target: 'self', source: 'enemyMinion' }, effects: [corrode('eventSource', 1)] }],
  },
  {
    faction: 'Acidic', type: 'minion', tribes: ['Zombie'], id: 'bile_zombie', name: 'Bile Zombie', art: '🧟', token: true,
    cost: 2, attack: 2, health: 2,
    text: 'Exit: Apply Corrosion 2 to all enemy minions.',
    triggers: [{ on: 'deathrattle', effects: [corrode(ENEMY_MINIONS, 2)] }],
  },
  {
    faction: 'Acidic', type: 'minion', tribes: ['Bee'], id: 'acid_wasp', name: 'Acid Wasp', art: '🐝', token: true,
    cost: 1, attack: 1, health: 1,
    text: 'Whenever this attacks a minion, apply Corrosion 1 to it first.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [corrode('eventTarget', 1)] }],
  },
  // ---- The Half-Digested expansion (unlockable): Acid Hide and Regenerate ----
  // Creatures that broke out of a giant acid stomach. Acid Hide: whatever attacks it
  // melts (a minion is Corroded by 1; a Hero loses its Weapon, or 2 Armor). Regenerate X: heals X
  // at the start of your turn (engine acidHideTouch / startTurn).
  {
    ...K, id: 'bile_slick_crawler', name: 'Bile-Slick Crawler', art: '🐛', extra: true, cost: 1, attack: 1, health: 2, keywords: ['Acid Hide'],
    text: 'Acid Hide.',
  },
  {
    ...S, id: 'regurgitate', name: 'Regurgitate', art: '🤮', extra: true, cost: 1,
    text: 'Return a friendly minion to your hand.',
    target: { type: 'minion', side: 'friendly' },
    effects: [{ op: 'returnToHand', target: 'chosen' }],
  },
  {
    ...K, id: 'half_melted_hound', name: 'Half-Melted Hound', art: '🐕', extra: true, cost: 2, attack: 2, health: 2, keywords: ['Acid Hide'], regenerate: 1,
    text: 'Acid Hide. Regenerate 1.',
  },
  {
    ...S, id: 'stomach_lining_plate', name: 'Stomach Lining Plate', art: '🛡️', extra: true, cost: 2,
    text: 'Give a friendly minion +0/+2 and Acid Hide.',
    target: { type: 'minion', side: 'friendly' },
    effects: [{ op: 'buff', target: 'chosen', health: 2, keywords: ['Acid Hide'] }],
  },
  {
    ...K, id: 'sloughing_brute', name: 'Sloughing Brute', art: '🧟', extra: true, cost: 3, attack: 2, health: 5, keywords: ['Taunt', 'Acid Hide'],
    text: 'Taunt. Acid Hide.',
  },
  {
    ...S, id: 'dissolve_arms', name: 'Dissolve Arms', art: '🫠', extra: true, cost: 2, corrodes: true,
    text: "Destroy the enemy Hero's Weapon. Corrode all enemy minions by 1.",
    effects: [{ op: 'destroyHeroWeapon', side: 'enemy' }, corrode(ENEMY_MINIONS, 1)],
  },
  {
    ...S, id: 'gastric_burst', name: 'Gastric Burst', art: '💥', extra: true, cost: 3, corrodes: true,
    text: 'Quick Play: When a friendly Acid Hide minion is attacked, deal 3 damage to the attacker and Corrode it by 2.',
    quickPlay: { windows: ['attackDeclared'], filter: { target: { side: 'friendly', keyword: 'Acid Hide' } } },
    effects: [{ op: 'damage', target: 'eventSource', amount: 3 }, corrode('eventSource', 2)],
  },
  {
    ...K, id: 'weeping_escapee', name: 'Weeping Escapee', art: '😭', extra: true, cost: 3, attack: 3, health: 3, regenerate: 2,
    text: 'Regenerate 2. Whenever this Regenerates, Corrode a random enemy minion by 1.',
    triggers: [{ on: 'regenerated', filter: { source: 'self' }, effects: [corrode({ randomOf: ENEMY_MINIONS }, 1)] }],
  },
  {
    ...T, id: 'peptic_snare', name: 'Peptic Snare', art: '🕸️', extra: true, cost: 2,
    text: 'Trap: When the enemy Hero equips a Weapon, destroy it and the enemy Hero loses 2 Armor.',
    trap: { on: 'weaponEquipped', filter: { player: 'enemy' }, effects: [{ op: 'destroyHeroWeapon', side: 'enemy' }, { op: 'loseArmor', side: 'enemy', amount: 2 }] },
  },
  {
    ...K, id: 'the_chewed_one', name: 'The Chewed One', art: '👹', extra: true, cost: 4, attack: 3, health: 5, keywords: ['Acid Hide'], regenerate: 2, attackWhileDamaged: 2,
    text: 'Acid Hide. Regenerate 2. Has +2 Attack while damaged.',
  },
  {
    ...S, id: 'melting_embrace', name: 'Melting Embrace', art: '🫂', extra: true, cost: 4, corrodes: true,
    text: 'Dissolve an enemy minion, then Corrode it by 3.',
    target: ENEMY_MINION,
    effects: [dissolve('chosen'), corrode('chosen', 3)],
  },
  {
    ...K, id: 'gut_burst_horror', name: 'Gut-Burst Horror', art: '😱', extra: true, cost: 5, attack: 4, health: 4,
    text: 'Arrival: Deal 2 damage to all other minions. Restore 2 Health to your Acid Hide minions.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: { minions: { side: 'any', excludeSelf: true } }, amount: 2 },
      { op: 'heal', target: { minions: { side: 'friendly', keyword: 'Acid Hide' } }, amount: 2 },
    ] }],
  },
  {
    ...K, id: 'stomach_wall_colossus', name: 'Stomach-Wall Colossus', art: '🗿', extra: true, cost: 7, attack: 3, health: 8, keywords: ['Taunt', 'Acid Hide'], regenerate: 1,
    text: 'Taunt. Acid Hide. Regenerate 1.',
  },
  {
    ...K, id: 'the_undigested_king', name: 'The Undigested King', art: '👑', extra: true, cost: 9, attack: 5, health: 5, keywords: ['Acid Hide'], regenerate: 2,
    text: 'Acid Hide. Regenerate 2. Arrival: Destroy all enemy Weapons and Relics, and remove the enemy Hero\'s Armor. Gain +1/+1 for each Weapon or Relic destroyed.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'meltEnemyArsenal' }] }],
  },
  {
    ...S, id: 'return_to_the_stomach', name: 'Return to the Stomach', art: '🌀', extra: true, cost: 8,
    text: 'Destroy an enemy minion; it is removed from the game. Summon a 2/2 copy of it with Acid Hide and Regenerate 1.',
    target: ENEMY_MINION,
    effects: [{ op: 'summon', copyOf: 'chosen', attack: 2, health: 2, keywords: ['Acid Hide'], regen: 1 }, { op: 'destroy', target: 'chosen', obliterate: true }],
  },
];
