// BEE FACTION — Queen & Hive. The designer's 30-card list, the passive
// Hero Spell The Living Hive (like Dinosaurs' Extinction Cycle) and the active one, Swarming Hive.
//
// The Living Hive (0/5, can't attack) starts the game on a Bee player's board
// (engine createGame). Its Exit summons the Queen (5/1 Venomous); when the Queen
// leaves play, her Hero takes 10 damage. The Queen is unique: she enters play at
// most once per game (core summonMinion), so nothing can bring her back.
//
// Tribes: every Insect is an 'Insect' plus 'Bee', 'Wasp' or 'Hornet'. The Hive is a
// 'Hive' (not an Insect). Rulings made while building are marked "Ruling:".

const I = (kind) => ({ faction: 'Bees', type: 'minion', tribes: ['Insect', kind] });
const BEE = I('Bee');
const WASP = I('Wasp');
const HORNET = I('Hornet');
const S = { faction: 'Bees', type: 'spell' };
const T = { faction: 'Bees', type: 'trap' };

const HIVE = { minions: { side: 'friendly', cardId: 'the_hive' } };
const QUEEN = { minions: { side: 'friendly', cardId: 'the_queen' } };
const HIVE_IN_PLAY = { controls: { cardId: 'the_hive' } };
const QUEEN_ALIVE = { controls: { cardId: 'the_queen' } };
const FRIENDLY_INSECT = { type: 'minion', side: 'friendly', tribe: 'Insect' };
const FRIENDLY_INSECTS = { minions: { side: 'friendly', tribe: 'Insect' } };
const IS_QUEEN = { subject: 'chosen', cardId: 'the_queen' };
const workers = (count = 1, extra = {}) => ({ op: 'summon', cardId: 'worker_bee', count, ...extra });
const soldiers = (count = 1, extra = {}) => ({ op: 'summon', cardId: 'soldier_wasp', count, ...extra });

export const BEE_CARDS = [
  // ---- Faction mechanic ----
  {
    ...S, id: 'hive_mind', name: 'The Living Hive', art: '🐝', heroSpell: true, passive: true, cost: 0,
    text: 'Passive. You start the game with a 0/5 Hive that can\'t attack and makes a 1/1 Worker Bee at the end of your turn. When it is destroyed, the Queen (5/1 Venomous) emerges. If the Queen dies, your Hero takes 10 damage.',
    effects: [],
  },
  {
    faction: 'Bees', type: 'minion', tribes: ['Hive'], id: 'the_hive', name: 'The Living Hive', art: '🐝', token: true, isHive: true,
    cost: 0, attack: 0, health: 5, cantAttack: true,
    text: "Can't attack. At the end of your turn, summon a 1/1 Worker Bee. Exit: Summon the Queen.",
    triggers: [
      { on: 'endOfTurn', filter: { player: 'friendly' }, effects: [workers(1)] },
      // Swarming Hive: every enemy attack is stung first.
      { on: 'attackDeclared', filter: { source: 'enemyCharacter' }, effects: [{
        op: 'damage', target: 'eventSource', amount: 1, if: { subject: 'self', swarming: true },
        amountPerCount: { count: { minions: { side: 'friendly', tribes: ['Bee', 'Wasp'] } }, each: 1 },
      }] },
      { on: 'deathrattle', effects: [{ op: 'queenEmerges' }] },
    ],
  },
  {
    faction: 'Bees', type: 'minion', tribes: ['Insect'], id: 'the_queen', name: 'The Queen', art: '👑', token: true, unique: true,
    cost: 5, attack: 5, health: 1, keywords: ['Venomous'],
    text: 'Venomous. Unique. Exit: Your Hero takes 10 damage.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'damage', target: 'friendlyHero', amount: 10 }] }],
  },

  // ---- Hero Spell ----
  {
    ...S, id: 'swarming_hive', name: 'Swarming Hive', art: '🐝', heroSpell: true, cost: 2, cooldown: 2, playIf: HIVE_IN_PLAY,
    text: 'Until your next turn, your Hive has Taunt and +2 temporary Health, and whenever an enemy attacks, it takes 1 damage, +1 for each Bee and Wasp you control. (Cooldown 2.)',
    // The damage lands before the attack, so an attacker it kills never hits.
    // Cooldown 2 (balance), like Controlled Irradiation's cooldown.
    effects: [
      { op: 'buff', target: HIVE, lingerKeywords: ['Taunt'], health: 2, temporaryHealth: true, untilYourNextTurn: true },
      { op: 'markSwarming', target: HIVE },
    ],
  },

  // ---- Minions (16) ----
  {
    ...BEE, id: 'waxworker', name: 'Waxworker', art: '🐝', cost: 1, attack: 1, health: 3,
    text: 'Arrival: Restore 2 Health to your Hive.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'heal', target: HIVE, amount: 2 }] }],
  },
  {
    ...BEE, id: 'nurse_bee', name: 'Nurse Bee', art: '🐝', cost: 1, attack: 1, health: 2,
    text: 'At the end of your turn, if your Hive is in play, give a random friendly Insect +1 Health.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [
      { op: 'buff', if: HIVE_IN_PLAY, target: { randomOf: FRIENDLY_INSECTS }, health: 1 },
    ] }],
  },
  {
    ...WASP, id: 'hive_sentinel', name: 'Hive Sentinel', art: '🐝', cost: 2, attack: 2, health: 3, keywords: ['Taunt'],
    text: 'Taunt. While your Hive is in play, this minion has +1 Health.',
    aura: { if: HIVE_IN_PLAY, target: 'self', health: 1 },
  },
  {
    ...BEE, id: 'honey_gatherer', name: 'Honey Gatherer', art: '🍯', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Add a Honey spell to your hand.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'addToHand', cardId: 'honey' }] }],
  },
  {
    ...HORNET, id: 'royal_bodyguard', name: 'Royal Bodyguard', art: '🛡️', cost: 3, attack: 3, health: 4,
    text: 'While the Queen is alive, enemy spells cannot target her.',
    // Ruling: the Queen has Elusive while this is in play.
    aura: { target: QUEEN, keywords: ['Elusive'] },
  },
  {
    ...HORNET, id: 'venom_guard', name: 'Venom Guard', art: '🐝', cost: 3, attack: 3, health: 3, keywords: ['Venomous', 'Taunt'],
    text: 'Venomous. Taunt.',
  },
  {
    ...BEE, id: 'royal_nurse', name: 'Royal Nurse', art: '🐝', cost: 4, attack: 3, health: 5,
    text: 'Arrival: Give your Hive +3 maximum Health and restore 3 Health to it.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: HIVE, health: 3 }, { op: 'heal', target: HIVE, amount: 3 }] }],
  },
  {
    ...HORNET, id: 'hive_enforcer', name: 'Hive Enforcer', art: '🐝', cost: 4, attack: 4, health: 4, guardsHive: true,
    text: 'While your Hive is in play, enemy minions must attack this minion before attacking your Hive, if able.',
    // Ruling: while this is in play, your Hive can't be attacked at all.
  },
  {
    ...BEE, id: 'larval_cluster', name: 'Larval Cluster', art: '🐛', cost: 2, attack: 0, health: 4,
    text: 'At the end of your turn, if your Hive is in play, gain +1 Attack. When this reaches 3 Attack, transform it into a 3/4 Soldier Wasp.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [
      { op: 'buff', if: HIVE_IN_PLAY, target: 'self', attack: 1 },
      { op: 'sequence', if: { subject: 'self', attackAtLeast: 3 }, effects: [
        { op: 'transform', target: 'self', into: 'soldier_wasp' },
        { op: 'setStats', target: 'self', attack: 3, health: 4 },
      ] },
    ] }],
  },
  {
    ...WASP, id: 'scout_wasp', name: 'Scout Wasp', art: '🐝', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Discover a Bee or Wasp from your deck.',
    // Ruling: "from your faction pool" became "from your deck" (like the other Discovers).
    triggers: [{ on: 'battlecry', effects: [{ op: 'discover', from: 'deck', filter: { type: 'minion', tribes: ['Bee', 'Wasp'] } }] }],
  },
  {
    ...BEE, id: 'construction_swarm', name: 'Construction Swarm', art: '🐝', cost: 3, attack: 2, health: 4,
    text: 'Arrival: Give your Hive +0/+2. Summon a 1/1 Worker Bee.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: HIVE, health: 2 }, workers(1)] }],
  },
  {
    ...HORNET, id: 'royal_executioner', name: 'Royal Executioner', art: '🐝', cost: 4, attack: 4, health: 3, keywords: ['Venomous'],
    text: 'Venomous. Whenever this minion destroys another minion, restore 2 Health to your Hive if it is in play.',
    triggers: [{ on: 'minionDied', filter: { killer: 'self' }, effects: [{ op: 'heal', target: HIVE, amount: 2 }] }],
  },
  {
    ...BEE, id: 'hive_matron', name: 'Hive Matron', art: '🐝', cost: 5, attack: 3, health: 6,
    text: 'At the end of your turn, summon a 1/1 Worker Bee if your Hive is in play.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ ...workers(1), if: HIVE_IN_PLAY }] }],
  },
  {
    ...HORNET, id: 'hive_champion', name: 'Hive Champion', art: '🐝', cost: 6, attack: 5, health: 6, keywords: ['Taunt'],
    text: 'Taunt. While the Queen is alive, this minion has +2 Attack.',
    aura: { if: QUEEN_ALIVE, target: 'self', attack: 2 },
  },
  {
    ...BEE, id: 'royal_jelly_keeper', name: 'Royal Jelly Keeper', art: '🍯', cost: 5, attack: 4, health: 5,
    text: 'Arrival: Give a friendly Insect +2/+2. If it is the Queen, give her +3/+3 instead.',
    target: FRIENDLY_INSECT,
    triggers: [{ on: 'battlecry', effects: [
      { op: 'buff', target: 'chosen', attack: 3, health: 3, if: IS_QUEEN, else: [{ op: 'buff', target: 'chosen', attack: 2, health: 2 }] },
    ] }],
  },
  {
    ...HORNET, id: 'hive_overlord', name: 'Hive Overlord', art: '🐝', cost: 8, attack: 7, health: 8,
    text: 'Arrival: If your Hive is in play, give it +0/+5 and summon two 2/2 Soldier Wasps.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'sequence', if: HIVE_IN_PLAY, effects: [{ op: 'buff', target: HIVE, health: 5 }, soldiers(2)] }] }],
  },

  // ---- Spells (8) ----
  {
    ...S, id: 'reinforce_the_hive', name: 'Reinforce the Hive', art: '🧱', cost: 1, playIf: HIVE_IN_PLAY,
    text: 'Give your Hive +0/+3.',
    effects: [{ op: 'buff', target: HIVE, health: 3 }],
  },
  {
    ...S, id: 'honey_reserve', name: 'Honey Reserve', art: '🍯', cost: 1,
    text: 'Add two Honey spells to your hand.',
    effects: [{ op: 'addToHand', cardId: 'honey' }, { op: 'addToHand', cardId: 'honey' }],
  },
  {
    ...S, id: 'emergency_repairs', name: 'Emergency Repairs', art: '🛠️', cost: 1, playIf: HIVE_IN_PLAY,
    text: 'Restore 5 Health to your Hive.',
    effects: [{ op: 'heal', target: HIVE, amount: 5 }],
  },
  {
    ...S, id: 'swarm_muster', name: 'Swarm Muster', art: '🐝', cost: 3, needsBoardSpace: true,
    text: 'Summon three 1/1 Worker Bees. If your Hive is in play, give them +1 Health.',
    effects: [{ ...workers(3, { health: 2 }), if: HIVE_IN_PLAY, else: [workers(3)] }],
  },
  {
    ...S, id: 'royal_chamber', name: 'Royal Chamber', art: '👑', cost: 3,
    text: 'Give your Hive +0/+4. While the Queen is alive, she has +1 Health.',
    // Ruling: the Queen gets +1 Health now if she's in play, otherwise when she emerges.
    effects: [{ op: 'buff', target: HIVE, health: 4 }, { op: 'royalChamber', amount: 1 }],
  },
  {
    ...S, id: 'royal_command', name: 'Royal Command', art: '📯', cost: 3,
    text: 'Give a friendly Insect +2/+2. If your Hive is in play, give it +3/+3 instead.',
    target: FRIENDLY_INSECT,
    effects: [{ op: 'buff', target: 'chosen', attack: 3, health: 3, if: HIVE_IN_PLAY, else: [{ op: 'buff', target: 'chosen', attack: 2, health: 2 }] }],
  },
  {
    ...S, id: 'venomous_uprising', name: 'Venomous Uprising', art: '☠️', cost: 5,
    text: 'Give all friendly Wasps and Hornets Venomous this turn.',
    // Ruling: Hornets count too (they are wasps), so the card has enough targets.
    effects: [
      { op: 'buff', target: { minions: { side: 'friendly', tribe: 'Wasp' } }, temporaryKeywords: ['Venomous'] },
      { op: 'buff', target: { minions: { side: 'friendly', tribe: 'Hornet' } }, temporaryKeywords: ['Venomous'] },
    ],
  },
  {
    ...S, id: 'royal_ascension', name: 'Royal Ascension', art: '👑', cost: 5,
    text: 'Give the Queen +4/+4 and Taunt. If she is not in play, summon a 2/2 Soldier Wasp instead.',
    effects: [{ op: 'buff', target: QUEEN, attack: 4, health: 4, keywords: ['Taunt'], if: QUEEN_ALIVE, else: [soldiers(1)] }],
  },

  // ---- Traps (3) ----
  {
    ...T, id: 'defensive_swarm', name: 'Defensive Swarm', art: '🐝', cost: 2,
    text: 'When an enemy minion attacks your Hive: Summon two 1/1 Worker Bees. One takes the attack instead.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: { side: 'friendly', cardId: 'the_hive' } }, effects: [
      workers(2), { op: 'redirectAttack', to: 'summoned' },
    ] },
  },
  {
    ...T, id: 'decoy_nest', name: 'Decoy Nest', art: '🪹', cost: 1,
    text: 'When your opponent summons a minion: Summon a 0/3 Hive Decoy. When the Decoy is destroyed, it deals 2 damage to the enemy minion that destroyed it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [{ op: 'summon', cardId: 'hive_decoy' }] },
  },
  {
    ...T, id: 'royal_ambush', name: 'Royal Ambush', art: '🐝', cost: 4,
    text: 'When an enemy attacks your Queen: Summon a 3/3 Hornet Guard with Taunt. It takes the attack instead.',
    trap: { on: 'attackDeclared', filter: { target: { side: 'friendly', cardId: 'the_queen' } }, effects: [
      { op: 'summon', cardId: 'hornet_guard' }, { op: 'redirectAttack', to: 'summoned' },
    ] },
  },

  // ---- Quick Plays (3) ----
  {
    ...S, id: 'royal_sacrifice', name: 'Royal Sacrifice', art: '🛡️', cost: 1,
    text: 'Play when the Queen would take damage. Prevent 3 of that damage. Destroy a friendly Worker Bee, if possible.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly', cardId: 'the_queen' } } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 3 },
      { op: 'destroy', target: { randomOf: { minions: { side: 'friendly', cardId: 'worker_bee' } } } },
    ],
  },
  {
    ...S, id: 'last_line_of_the_colony', name: 'Last Line of the Colony', art: '🐝', cost: 3,
    text: 'Play when your Hive would be destroyed. Give it +0/+5 this turn. If it survives, summon a 2/2 Soldier Wasp.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly', cardId: 'the_hive' }, lethal: true } },
    effects: [
      { op: 'buff', target: 'eventTarget', health: 5, temporaryHealth: true },
      { ...soldiers(1), if: { eventTargetSurvives: true } },
    ],
  },
  {
    ...S, id: 'stinger_interception', name: 'Stinger Interception', art: '🐝', cost: 2,
    text: 'Play when an enemy minion attacks your Hero. Give a friendly Wasp +3 Attack and Taunt this turn. It takes the attack instead.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion', target: 'friendlyHero' } },
    target: { type: 'minion', side: 'friendly', tribe: 'Wasp' },
    effects: [
      { op: 'buff', target: 'chosen', attack: 3, temporary: true, temporaryKeywords: ['Taunt'] },
      { op: 'redirectAttack', to: 'chosen' },
    ],
  },

  // ---- Tokens ----
  { ...BEE, id: 'worker_bee', name: 'Worker Bee', art: '🐝', token: true, cost: 1, attack: 1, health: 1, text: '' },
  { ...WASP, id: 'soldier_wasp', name: 'Soldier Wasp', art: '🐝', token: true, cost: 2, attack: 2, health: 2, text: '' },
  { ...HORNET, id: 'hornet_guard', name: 'Hornet Guard', art: '🐝', token: true, cost: 3, attack: 3, health: 3, keywords: ['Taunt'], text: 'Taunt.' },
  {
    faction: 'Bees', type: 'minion', tribes: ['Hive'], id: 'hive_decoy', name: 'Hive Decoy', art: '🪹', token: true,
    cost: 1, attack: 0, health: 3,
    text: 'Exit: Deal 2 damage to the enemy minion that destroyed this.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'damage', target: 'killer', amount: 2 }] }],
  },
  {
    ...S, id: 'honey', name: 'Honey', art: '🍯', token: true, cost: 1,
    text: 'Restore 2 Health to your Hive or a friendly Insect.',
    target: { type: 'minion', side: 'friendly', tribes: ['Insect', 'Hive'] },
    effects: [{ op: 'heal', target: 'chosen', amount: 2 }],
  },
];
