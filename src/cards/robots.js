// ROBOT FACTION — modular machines, weapon systems and giant Mechs. The designer's
// complete 30-card list + Hero Spell. Text is the designer's wording ("Battlecry"
// shown as Arrival, "Windfury" as Twin Strike, "Divine Shield" as Evade).
// Interpretation choices are marked "Ruling:" and listed in docs/OPEN_QUESTIONS.md (Q17).
//
// Upgrade: a card with `upgrade: true` (and the Hero Spell) played on a friendly
// Robot; the Robot counts its Upgrades (m.upgrades) — effects check "has an
// Upgrade" / "at least 2 Upgrades". Weapon: an Upgrade with an Attack bonus and an
// effect; one Weapon slot, a new one replaces the old (effects equipWeapon).
// Tribes: every Robot minion is a 'Robot'; Mechs are also 'Mech'; Drones also 'Drone'.

const R = { faction: 'Robots', type: 'minion', tribes: ['Robot'] };
const MECH = { ...R, tribes: ['Robot', 'Mech'] };
const S = { faction: 'Robots', type: 'spell' };
const T = { faction: 'Robots', type: 'trap' };

const FRIENDLY_ROBOT = { type: 'minion', side: 'friendly', tribe: 'Robot' };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const upgraded = { op: 'markUpgrade', target: 'chosen' };
const drones = (count, extra = {}) => ({ op: 'summon', cardId: 'drone', count, ...extra });

export const ROBOT_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'modular_upgrade', name: 'Modular Upgrade', art: '🔧', heroSpell: true, cost: 2,
    text: 'Choose one Upgrade for a friendly Robot: Reinforced Frame (+1/+2) or Offensive Calibration (+2/+1).',
    target: FRIENDLY_ROBOT,
    effects: [
      { op: 'chooseOne', prompt: 'Modular Upgrade', options: [
        { label: 'Reinforced Frame: +1 Attack, +2 Health', effects: [{ op: 'buff', target: 'chosen', attack: 1, health: 2 }, upgraded] },
        { label: 'Offensive Calibration: +2 Attack, +1 Health', effects: [{ op: 'buff', target: 'chosen', attack: 2, health: 1 }, upgraded] },
      ] },
    ],
  },

  // ---- Minions (16) ----
  {
    ...R, id: 'maintenance_bot', name: 'Maintenance Bot', art: '🔩', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Give a friendly Robot +1 Health.',
    target: FRIENDLY_ROBOT,
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', health: 1 }] }],
  },
  {
    ...R, id: 'scout_drone', name: 'Scout Drone', art: '🛸', cost: 1, attack: 1, health: 1, tribes: ['Robot', 'Drone'],
    text: 'Arrival: Discover a Robot Upgrade that costs 2 Mana or less. Add it to your hand.',
    // Ruling (Q17): Discover picks from your deck, like every Discover in the game.
    triggers: [{ on: 'battlecry', effects: [{ op: 'discover', from: 'deck', filter: { upgrade: true, maxCost: 2 } }] }],
  },
  {
    ...R, id: 'scrapper_spider', name: 'Scrapper Spider', art: '🕷️', cost: 2, attack: 2, health: 3,
    text: 'Whenever you play an Upgrade on this minion, gain +1 Attack.',
    triggers: [{ on: 'upgradeInstalled', filter: { target: 'self' }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...R, id: 'bulwark_unit', name: 'Bulwark Unit', art: '🧱', cost: 2, attack: 1, health: 4, keywords: ['Taunt'],
    text: 'Taunt. Whenever this gains Attack, gain +1 maximum Health.',
    triggers: [{ on: 'attackGained', filter: { target: 'self' }, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...R, id: 'laser_trooper', name: 'Laser Trooper', art: '🔫', cost: 3, attack: 3, health: 2,
    text: 'Arrival: Deal 2 damage to an enemy minion if you control a Robot with a Weapon attached.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2, if: { controls: { tribe: 'Robot', hasWeapon: true } } }] }],
  },
  {
    ...R, id: 'chief_engineer', name: 'Chief Engineer', art: '👷', cost: 3, attack: 2, health: 4,
    text: 'Arrival: Reduce the cost of the next Robot Upgrade you play by 2 Mana, to a minimum of 0.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'upgradeDiscount', amount: 2 }] }],
  },
  {
    ...R, id: 'drone_fabricator', name: 'Drone Fabricator', art: '🏭', cost: 3, attack: 2, health: 4,
    text: 'At the end of your turn, summon a 1/1 Drone. A Drone is a Robot.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [drones(1)] }],
  },
  {
    ...R, id: 'heavy_gunner', name: 'Heavy Gunner', art: '💥', cost: 4, attack: 4, health: 4,
    text: 'Whenever this attacks, deal 1 damage to a random enemy minion. If this has a Weapon attached, deal 2 instead.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self' }, effects: [
      { op: 'damage', target: { randomOf: ENEMY_MINIONS }, amount: 1, amountIf: { if: { subject: 'self', hasWeapon: true }, amount: 2 } },
    ] }],
  },
  {
    ...R, id: 'repair_specialist', name: 'Repair Specialist', art: '🧰', cost: 4, attack: 3, health: 5,
    text: 'Arrival: Restore 3 Health to a friendly Robot. If it has an Upgrade, restore 5 instead.',
    target: FRIENDLY_ROBOT,
    triggers: [{ on: 'battlecry', effects: [
      { op: 'heal', target: 'chosen', amount: 5, if: { subject: 'chosen', hasUpgrade: true }, else: [{ op: 'heal', target: 'chosen', amount: 3 }] },
    ] }],
  },
  {
    ...R, id: 'adaptive_warframe', name: 'Adaptive Warframe', art: '🤖', cost: 4, attack: 3, health: 5,
    text: 'Arrival: Choose one: gain +2 Attack, gain +2 Health, or gain Taunt and +1 Health.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'chooseOne', prompt: 'Adaptive Warframe', options: [
      { label: '+2 Attack', effects: [{ op: 'buff', target: 'self', attack: 2 }] },
      { label: '+2 Health', effects: [{ op: 'buff', target: 'self', health: 2 }] },
      { label: 'Taunt and +1 Health', effects: [{ op: 'buff', target: 'self', health: 1, keywords: ['Taunt'] }] },
    ] }] }],
  },
  {
    ...R, id: 'swarm_commander', name: 'Swarm Commander', art: '🎖️', cost: 6, attack: 4, health: 5,
    text: 'Your other friendly Robots have +1 Attack. Your Drones have an additional +1 Attack.',
    aura: [
      { target: { minions: { side: 'friendly', tribe: 'Robot', excludeSelf: true } }, attack: 1 },
      { target: { minions: { side: 'friendly', tribe: 'Drone', excludeSelf: true } }, attack: 1 },
    ],
  },
  {
    ...MECH, id: 'siege_mech', name: 'Siege Mech', art: '🦾', cost: 5, attack: 5, health: 5,
    text: 'Arrival: Deal 2 damage to an enemy minion. If you control a Robot with a Weapon attached, also deal 2 damage to the enemy Hero.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: 'chosen', amount: 2 },
      { op: 'damage', target: 'enemyHero', amount: 2, if: { controls: { tribe: 'Robot', hasWeapon: true } } },
    ] }],
  },
  {
    ...R, id: 'overclocked_destroyer', name: 'Overclocked Destroyer', art: '⚙️', cost: 6, attack: 6, health: 4, keywords: ['Rush'],
    text: 'Rush. Whenever you play an Upgrade on this minion, deal 1 damage to all enemy minions.',
    triggers: [{ on: 'upgradeInstalled', filter: { target: 'self' }, effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 1 }] }],
  },
  {
    ...MECH, id: 'titan_guard', name: 'Titan Guard', art: '🛡️', cost: 7, attack: 5, health: 9, keywords: ['Taunt'],
    text: 'Taunt. At the end of your turn, if this has at least 2 Upgrades, restore 2 Health to it.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'heal', target: 'self', amount: 2, if: { subject: 'self', minUpgrades: 2 } }] }],
  },
  {
    ...MECH, id: 'omega_assembly', name: 'Omega Assembly', art: '🏗️', cost: 8, attack: 7, health: 7,
    text: 'Arrival: If you control at least two other Robots, give this +3/+3 and Taunt.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'buff', target: 'self', attack: 3, health: 3, keywords: ['Taunt'], if: { controls: { tribe: 'Robot', excludeSelf: true, min: 2 } } },
    ] }],
  },
  {
    ...MECH, id: 'colossus_prime', name: 'Colossus Prime', art: '🗿', cost: 10, attack: 8, health: 10,
    text: 'Arrival: Deal 3 damage to all enemies. For each friendly Robot with an Upgrade, deal 1 additional damage to all enemy minions, up to 3 additional damage.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: 'enemyHero', amount: 3 },
      { op: 'damage', target: ENEMY_MINIONS, amount: 3, amountPerCount: { count: { minions: { side: 'friendly', tribe: 'Robot', hasUpgrade: true } }, each: 1, max: 3 } },
    ] }],
  },

  // ---- Spells and Upgrades (6) ----
  {
    ...S, id: 'reinforced_plating', name: 'Reinforced Plating', art: '🪖', cost: 1, upgrade: true,
    text: 'Upgrade. Give a friendly Robot +0/+3. If it already has an Upgrade, give it Taunt as well.',
    target: FRIENDLY_ROBOT,
    effects: [
      { op: 'buff', target: 'chosen', keywords: ['Taunt'], if: { subject: 'chosen', hasUpgrade: true } },
      { op: 'buff', target: 'chosen', health: 3 },
      upgraded,
    ],
  },
  {
    ...S, id: 'laser_cannon', name: 'Laser Cannon', art: '🔦', cost: 2, upgrade: true, weapon: true,
    text: 'Weapon Upgrade. Give a friendly Robot +2 Attack and: "Whenever it attacks, deal 1 damage to the enemy Hero."',
    target: FRIENDLY_ROBOT,
    effects: [{ op: 'equipWeapon', target: 'chosen', name: 'Laser Cannon', attack: 2,
      trigger: { on: 'attackDeclared', filter: { source: 'self' }, effects: [{ op: 'damage', target: 'enemyHero', amount: 1 }] } }],
  },
  {
    ...S, id: 'thruster_system', name: 'Thruster System', art: '🚀', cost: 2, upgrade: true,
    text: 'Upgrade. Give a friendly Robot Rush and +1 Attack. If it already has Rush, give it +2 Attack instead.',
    target: FRIENDLY_ROBOT,
    effects: [
      { op: 'buff', target: 'chosen', attack: 2, if: { subject: 'chosen', keyword: 'Rush' }, else: [{ op: 'buff', target: 'chosen', attack: 1, keywords: ['Rush'] }] },
      upgraded,
    ],
  },
  {
    ...S, id: 'targeting_matrix', name: 'Targeting Matrix', art: '🎯', cost: 4, upgrade: true,
    text: 'Upgrade. Give a friendly Robot Twin Strike. If it already has Twin Strike, give it +2 Attack instead.',
    target: FRIENDLY_ROBOT,
    effects: [
      { op: 'buff', target: 'chosen', attack: 2, if: { subject: 'chosen', keyword: 'Twin Strike' }, else: [{ op: 'buff', target: 'chosen', keywords: ['Twin Strike'] }] },
      upgraded,
    ],
  },
  {
    ...S, id: 'overclock_protocol', name: 'Overclock Protocol', art: '⚡', cost: 3,
    text: 'Give a friendly Robot +3 Attack this turn. It can attack immediately if it has Rush or Charge.',
    target: FRIENDLY_ROBOT,
    effects: [{ op: 'buff', target: 'chosen', attack: 3, temporary: true }],
  },
  {
    ...S, id: 'annihilation_beam', name: 'Annihilation Beam', art: '☢️', cost: 6,
    text: 'Deal 6 damage to an enemy minion. If you control a Mech with at least 2 Upgrades, deal 8 damage instead.',
    target: ENEMY_MINION,
    effects: [{ op: 'damage', target: 'chosen', amount: 6, amountIf: { if: { controls: { tribe: 'Mech', minUpgrades: 2 } }, amount: 8 } }],
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'emergency_shielding', name: 'Emergency Shielding', art: '🔰', cost: 1,
    text: 'When a friendly Robot would take damage: Reduce that damage by 2. If it survives, give it +1 Health.',
    // Ruling (Q17): the +1 Health is given right away (before the reduced hit lands).
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly', tribe: 'Robot' } } },
    effects: [{ op: 'preventDamage', target: 'eventTarget', amount: 2 }, { op: 'buff', target: 'eventTarget', health: 1 }],
  },
  {
    ...S, id: 'laser_retaliation', name: 'Laser Retaliation', art: '🔴', cost: 2,
    text: 'When an enemy minion attacks: Deal 3 damage to it. If you control a Robot with a Weapon attached, deal 5 instead.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [{ op: 'damage', target: 'eventSource', amount: 3, amountIf: { if: { controls: { tribe: 'Robot', hasWeapon: true } }, amount: 5 } }],
  },
  {
    ...S, id: 'rapid_deployment', name: 'Rapid Deployment', art: '📦', cost: 2, needsBoardSpace: true,
    text: 'When your opponent summons a minion: Summon two 1/1 Drones. They cannot attack until your next turn.',
    // Ruling (Q17): "summons" = plays a minion. New minions can't attack until your turn anyway.
    quickPlay: { windows: ['cardPlayed'], filter: { player: 'enemy', cardType: 'minion' } },
    effects: [drones(2)],
  },
  {
    ...S, id: 'emergency_overclock', name: 'Emergency Overclock', art: '🔥', cost: 3,
    text: 'When a friendly Mech attacks: Give it +4 Attack for that attack and prevent the next 2 damage it would take this turn.',
    // Ruling (Q17): offered on your own turn, when your Mech attacks; the +4 lasts until the end of the turn.
    quickPlay: { windows: ['friendlyAttack'], filter: { source: { side: 'friendly', tribe: 'Mech' } } },
    effects: [{ op: 'buff', target: 'eventSource', attack: 4, temporary: true }, { op: 'preventDamage', target: 'eventSource', amount: 2 }],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'automated_turret', name: 'Automated Turret', art: '🗼', cost: 2,
    text: 'When an enemy minion attacks your Hero: Deal 3 damage to the attacker.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [{ op: 'damage', target: 'eventSource', amount: 3 }] },
  },
  {
    ...T, id: 'emp_snare', name: 'EMP Snare', art: '📡', cost: 2,
    text: 'When your opponent plays a Robot: Give it -3 Attack this turn and remove its Evade, if it has it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion', source: { side: 'enemy', tribe: 'Robot' } }, effects: [
      { op: 'buff', target: 'eventSource', attack: -3, temporary: true }, { op: 'removeKeyword', target: 'eventSource', keyword: 'Evade' },
    ] },
  },
  {
    ...T, id: 'countermeasure_swarm', name: 'Countermeasure Swarm', art: '🐝', cost: 3, needsBoardSpace: true,
    text: 'When an enemy minion attacks one of your minions: Summon two 1/1 Drones. One Drone receives the attack.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyMinion' }, effects: [
      drones(2), { op: 'redirectAttack', to: 'summoned' },
    ] },
  },
  {
    ...T, id: 'final_assembly', name: 'Final Assembly', art: '🔩', cost: 5, needsBoardSpace: true,
    text: 'When one of your Mechs is destroyed: Summon a 4/4 Combat Mech with Taunt. If the destroyed Mech had at least 2 Upgrades, give the Combat Mech +2/+2.',
    trap: { on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Mech' } }, effects: [
      { op: 'summon', cardId: 'combat_mech', attack: 6, health: 6, if: { eventDeadUpgrades: 2 }, else: [{ op: 'summon', cardId: 'combat_mech' }] },
    ] },
  },

  // ---- Tokens ----
  { ...R, id: 'drone', name: 'Drone', art: '🛸', token: true, tribes: ['Robot', 'Drone'], cost: 1, attack: 1, health: 1, text: '' },
  { ...MECH, id: 'combat_mech', name: 'Combat Mech', art: '🤖', token: true, cost: 4, attack: 4, health: 4, keywords: ['Taunt'], text: 'Taunt.' },
];
