// SHARK FACTION — The Red Wake. Hunt, Wound, Execute. The designer's 30-card list and the
// passive Hero Spell, Blood in the Water.
//
// Marked Prey (core.js markPrey / checkPrey): while a player has Sharks, an enemy minion
// brought to 3 Health or less becomes Marked Prey. Cards can also mark minions directly.
// The mark stays until it leaves play or is healed above 3 Health. Sharks can attack Prey
// in Stealth and their cards reach Prey through Stealth and Elusive (targeting.js); the
// first time each turn a Shark attacks Prey it gets +2 Attack (engine.js huntDamage).
// Rulings made while building are marked "Ruling:".

const K = { faction: 'Sharks', type: 'minion', tribes: ['Shark'] };
const S = { faction: 'Sharks', type: 'spell' };
const T = { faction: 'Sharks', type: 'trap' };

const PREY = { type: 'minion', side: 'enemy', prey: true };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const FRIENDLY_SHARKS = { minions: { side: 'friendly', tribe: 'Shark' } };
const dmg = (target, amount, extra = {}) => ({ op: 'damage', target, amount, ...extra });
const mark = (target, force = false) => ({ op: 'markPrey', target, ...(force ? { force: true } : {}) });
const ALIVE = { subject: 'chosen', alive: true };
const DEAD = { subject: 'chosen', dead: true };

export const SHARK_CARDS = [
  // ---- Hero Spell (passive) ----
  {
    ...S, id: 'blood_in_the_water', name: 'Blood in the Water', art: '🩸', heroSpell: true, passive: true, cost: 0,
    text: 'Passive. Enemy minions brought to 3 Health or less become Marked Prey. Your Sharks can hit Marked Prey through Stealth and Elusive. Once per turn, a Shark attacking Marked Prey gets +2 Attack.',
    effects: [],
  },

  // ---- Minions (16) ----
  {
    ...K, id: 'reef_nibbler', name: 'Reef Nibbler', art: '🐟', cost: 1, attack: 2, health: 2,
    text: 'Arrival: Deal 1 damage to a random enemy minion with 3 or less Health.',
    triggers: [{ on: 'battlecry', effects: [dmg({ randomOf: { minions: { side: 'enemy', maxHealth: 3 } } }, 1)] }],
  },
  {
    ...K, id: 'bloodscent_pup', name: 'Bloodscent Pup', art: '🦈', cost: 1, attack: 2, health: 2,
    text: 'Whenever an enemy becomes Marked Prey, gain +1 Attack this turn.',
    triggers: [{ on: 'preyMarked', filter: { player: 'enemy' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true }] }],
  },
  {
    ...K, id: 'hammerhead_scout', name: 'Hammerhead Scout', art: '🔨', cost: 2, attack: 2, health: 3,
    text: "Arrival: Reveal a random card in your opponent's hand. If it's a minion with 3 or less Health, it's Marked Prey while it stays there.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'huntHand', maxHealth: 3 }] }],
  },
  {
    ...K, id: 'mako_sprinter', name: 'Mako Sprinter', art: '💨', cost: 2, attack: 3, health: 2, keywords: ['Rush'], doubleVsPrey: true,
    text: 'Rush. Deals double damage when attacking Marked Prey.',
  },
  {
    ...K, id: 'tiger_shark', name: 'Tiger Shark', art: '🐯', cost: 3, attack: 3, health: 4,
    text: 'Arrival: Deal 2 damage to a Marked Prey. If it dies, gain 1 Armor.',
    target: PREY,
    triggers: [{ on: 'battlecry', effects: [dmg('chosen', 2), { op: 'gainArmor', amount: 1, if: DEAD }] }],
  },
  {
    ...K, id: 'goblin_shark', name: 'Goblin Shark', art: '👺', cost: 3, attack: 3, health: 4, seesStealth: true, woundBonus: true,
    text: 'Can attack enemy minions in Stealth. Deals +1 damage to damaged minions.',
  },
  {
    ...K, id: 'pack_hunters', name: 'Pack Hunters', art: '🦈', cost: 3, attack: 3, health: 3, packBonus: true,
    text: 'Arrival: Summon a 1/1 Shark Pup. Your Sharks have +1 Attack while attacking Marked Prey.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'shark_pup' }] }],
  },
  {
    ...K, id: 'wound_tracker', name: 'Wound Tracker', art: '🩸', cost: 3, attack: 3, health: 4,
    text: 'Arrival: Mark an enemy minion with 3 or less Health as Prey, even one in Stealth.',
    target: { type: 'minion', side: 'enemy', maxHealth: 3, ignoreStealth: true },
    triggers: [{ on: 'battlecry', effects: [mark('chosen', true)] }],
  },
  {
    ...K, id: 'great_white', name: 'Great White', art: '🦈', cost: 4, attack: 4, health: 5, keywords: ['Rush'], extraAttackOnPreyKill: true,
    text: 'Rush. If it kills a Marked Prey, it may attack again this turn.',
  },
  {
    ...K, id: 'sawshark_executioner', name: 'Sawshark Executioner', art: '🪚', cost: 4, attack: 4, health: 4,
    text: 'Arrival: Deal 3 damage to a Marked Prey. If it survives, give it -2 Attack this turn.',
    target: PREY,
    triggers: [{ on: 'battlecry', effects: [dmg('chosen', 3), { op: 'buff', target: 'chosen', attack: -2, temporary: true, if: ALIVE }] }],
  },
  {
    ...K, id: 'bull_shark', name: 'Bull Shark', art: '🐂', cost: 4, attack: 5, health: 3, keywords: ['Rush'],
    // Ruling: "Charge, but only minions on the turn it is played" is exactly Rush.
    text: 'Rush. (It can attack minions the turn it is played.)',
  },
  {
    ...K, id: 'abyssal_bloodhound', name: 'Abyssal Bloodhound', art: '🐕', cost: 5, attack: 4, health: 5,
    text: 'Arrival: Add a random Shark to your hand. If an enemy is Marked Prey, Discover one from two instead.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'discoverFaction', faction: 'Sharks', count: 2, if: { enemyPrey: true } },
      { op: 'discoverFaction', faction: 'Sharks', random: true, if: { enemyPrey: false } },
    ] }],
  },
  {
    ...K, id: 'thresher_shark', name: 'Thresher Shark', art: '🌊', cost: 5, attack: 4, health: 5,
    text: 'Arrival: Deal 1 damage to all enemy minions. Mark any at 3 Health or less as Prey.',
    triggers: [{ on: 'battlecry', effects: [dmg(ENEMY_MINIONS, 1), mark(ENEMY_MINIONS)] }],
  },
  {
    ...K, id: 'scarred_leviathan', name: 'Scarred Leviathan', art: '🐋', cost: 6, attack: 6, health: 6, leechPrey: true,
    text: 'Whenever this damages a Marked Prey in combat, restore that much Health to your Hero.',
  },
  {
    ...K, id: 'megalodon', name: 'Megalodon', art: '🦷', cost: 8, attack: 8, health: 8,
    text: 'Arrival: Destroy a Marked Prey with 3 or less Health, wherever it hides. If it is in their hand or deck, it is revealed first.',
    // Ruling: choose a Prey in play; with none, a Prey card in their hand (or deck) is destroyed.
    target: { type: 'minion', side: 'enemy', prey: true, maxHealth: 3 },
    triggers: [{ on: 'battlecry', effects: [{ op: 'executePrey', maxHealth: 3 }] }],
  },
  {
    ...K, id: 'king_of_the_red_wake', name: 'King of the Red Wake', art: '👑', cost: 9, attack: 7, health: 9,
    text: 'Whenever a Marked Prey dies, give your other Sharks +1/+1.',
    triggers: [{ on: 'minionDied', filter: { deadPrey: true }, effects: [{ op: 'buff', target: { minions: { side: 'friendly', tribe: 'Shark', excludeSelf: true } }, attack: 1, health: 1 }] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'first_blood', name: 'First Blood', art: '🩸', cost: 1,
    text: 'Deal 1 damage to an enemy minion. If it has 3 or less Health, mark it as Prey.',
    target: ENEMY_MINION, effects: [dmg('chosen', 1), mark('chosen')],
  },
  {
    ...S, id: 'razor_bite', name: 'Razor Bite', art: '🦷', cost: 2,
    text: 'Deal 3 damage to a minion. If it is Marked Prey and survives, deal 1 more.',
    target: { type: 'minion', side: 'any' },
    effects: [dmg('chosen', 3), dmg('chosen', 1, { if: { subject: 'chosen', alive: true, prey: true } })],
  },
  {
    ...S, id: 'frenzy_of_the_pack', name: 'Frenzy of the Pack', art: '🌀', cost: 3,
    text: 'Give your Sharks +2 Attack this turn. They can attack Marked Prey right away.',
    effects: [{ op: 'buff', target: FRIENDLY_SHARKS, attack: 2, temporary: true }, { op: 'preyRush', target: FRIENDLY_SHARKS }],
  },
  {
    ...S, id: 'echoes_of_blood', name: 'Echoes of Blood', art: '📡', cost: 3,
    text: 'Reveal all enemy minions in Stealth. Mark those with 3 or less Health as Prey.',
    effects: [{ op: 'revealStealth', target: ENEMY_MINIONS }, mark(ENEMY_MINIONS)],
  },
  {
    ...S, id: 'feeding_frenzy', name: 'Feeding Frenzy', art: '🍖', cost: 5,
    text: 'Deal 2 damage to all enemy minions. Destroy any left with 1 Health.',
    effects: [dmg(ENEMY_MINIONS, 2), { op: 'destroy', target: { minions: { side: 'enemy', maxHealth: 1 } } }],
  },
  {
    ...S, id: 'nothing_escapes_the_current', name: 'Nothing Escapes the Current', art: '🌊', cost: 7,
    text: 'Find a Marked Prey, in play, hand or deck, and reveal it. Destroy it if it has 2 or less Health; otherwise deal 4 damage to it.',
    // Ruling: it picks the weakest Prey in play; with none, a Prey card in their hand or deck.
    effects: [{ op: 'executePrey', auto: true, maxHealth: 2, otherwiseDamage: 4 }],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'beneath_the_sand', name: 'Beneath the Sand', art: '🏖️', cost: 2,
    text: 'When an enemy minion with 3 or less Health attacks: summon a 2/1 Shark with Rush that attacks it.',
    trap: { on: 'attackDeclared', filter: { source: { side: 'enemy', maxHealth: 3 } }, effects: [
      { op: 'summon', cardId: 'sand_lurker' }, { op: 'fight', attacker: 'summoned', defender: 'eventSource' },
    ] },
  },
  {
    ...T, id: 'blood_bait', name: 'Blood Bait', art: '🪝', cost: 2,
    text: 'When your opponent summons a minion: it has -1 Health this turn. If it has 3 or less Health, mark it as Prey.',
    trap: { on: 'minionSummoned', filter: { player: 'enemy' }, effects: [
      { op: 'buff', target: 'eventSource', health: -1, temporaryHealth: true }, mark('eventSource'),
    ] },
  },
  {
    ...T, id: 'the_killing_current', name: 'The Killing Current', art: '🌀', cost: 3,
    text: 'When a Marked Prey attacks: deal 2 damage to it before combat.',
    trap: { on: 'attackDeclared', filter: { source: { side: 'enemy', prey: true } }, effects: [dmg('eventSource', 2)] },
  },
  {
    ...T, id: 'ambush_from_below', name: 'Ambush from Below', art: '🦈', cost: 4,
    text: 'When your opponent plays a minion with 3 or less Health: summon a 4/3 Shark with Rush that attacks it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion', source: { side: 'enemy', maxHealth: 3 } }, effects: [
      { op: 'summon', cardId: 'reef_ambusher' }, { op: 'fight', attacker: 'summoned', defender: 'eventSource' },
    ] },
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'snap_reaction', name: 'Snap Reaction', art: '⚡', cost: 1, quickPlay: {},
    text: 'Quick Play: Deal 1 damage to a Marked Prey.',
    target: PREY, effects: [dmg('chosen', 1)],
  },
  {
    ...S, id: 'scent_through_stone', name: 'Scent Through Stone', art: '🪨', cost: 2, quickPlay: {},
    text: 'Quick Play: Reveal an enemy minion in Stealth. If it has 3 or less Health, mark it as Prey and deal 1 damage to it.',
    target: { type: 'minion', side: 'enemy', stealthed: true, ignoreStealth: true },
    effects: [{ op: 'revealStealth', target: 'chosen' }, mark('chosen'), dmg('chosen', 1, { if: { subject: 'chosen', prey: true } })],
  },
  {
    ...S, id: 'intercept', name: 'Intercept', art: '🎯', cost: 2, quickPlay: {},
    text: 'Quick Play: Give a friendly Shark +3 Attack this turn. It attacks a random Marked Prey, if any.',
    // Ruling: it can't make a normal attack on the opponent's turn, so it fights the Prey.
    target: { type: 'minion', side: 'friendly', tribe: 'Shark' },
    effects: [
      { op: 'buff', target: 'chosen', attack: 3, temporary: true },
      { op: 'fight', attacker: 'chosen', defender: { randomOf: { minions: { side: 'enemy', prey: true } } } },
    ],
  },
  {
    ...S, id: 'the_scent_is_fresh', name: 'The Scent Is Fresh', art: '👃', cost: 4, quickPlay: {},
    text: 'Quick Play: Choose an enemy minion with 3 or less Health, even in Stealth. Mark it as Prey. If it already is, deal 3 damage to it instead.',
    target: { type: 'minion', side: 'enemy', maxHealth: 3, ignoreStealth: true },
    effects: [dmg('chosen', 3, { if: { subject: 'chosen', prey: true }, else: [mark('chosen', true)] })],
  },

  // ---- Sand Shark expansion: The Dunes (unlockable) ----
  // Burrow: a Burrowed minion has Stealth until the start of your next turn, then it Surfaces
  // and its Surface effects happen (effects.js burrowMinion / surfaceMinion). A minion with the
  // Burrow keyword arrives Burrowed.
  {
    ...K, id: 'sand_pup', name: 'Sand Pup', art: '🦈', extra: true, cost: 1, attack: 1, health: 2, keywords: ['Burrow'],
    text: 'Burrow. Surface: Gain +1 Attack.',
    triggers: [{ on: 'surface', effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...K, id: 'dune_fin', name: 'Dune Fin', art: '🦈', extra: true, cost: 1, attack: 2, health: 1,
    text: 'Whenever a friendly minion Surfaces, gain +1 Attack this turn.',
    triggers: [{ on: 'minionSurfaced', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true }] }],
  },
  {
    ...K, id: 'gravel_grinder', name: 'Gravel Grinder', art: '🪨', extra: true, cost: 2, attack: 2, health: 3, keywords: ['Burrow'],
    text: 'Burrow. Surface: Deal 1 damage to all enemy minions.',
    triggers: [{ on: 'surface', effects: [dmg(ENEMY_MINIONS, 1)] }],
  },
  {
    ...K, id: 'quicksand_lurker', name: 'Quicksand Lurker', art: '🏜️', extra: true, cost: 2, attack: 1, health: 4, keywords: ['Taunt'],
    text: "Taunt. Arrival: An enemy minion can't attack next turn.",
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'exhaust', target: 'chosen' }] }],
  },
  {
    ...K, id: 'tunnel_shark', name: 'Tunnel Shark', art: '🦈', extra: true, cost: 3, attack: 3, health: 3, keywords: ['Burrow'],
    text: 'Burrow. Surface: Deal 3 damage to a random enemy minion.',
    // Ruling: Surfacing happens at the start of your turn, with no moment to choose, so it's random.
    triggers: [{ on: 'surface', effects: [dmg({ randomOf: { minions: { side: 'enemy' } } }, 3)] }],
  },
  {
    ...K, id: 'sandstorm_stalker', name: 'Sandstorm Stalker', art: '🌪️', extra: true, cost: 3, attack: 3, health: 2, keywords: ['Stealth'],
    text: 'Stealth. After this attacks, Burrow it.',
    triggers: [{ on: 'afterAttack', filter: { source: 'self' }, effects: [{ op: 'burrow', target: 'self' }] }],
  },
  {
    ...K, id: 'dune_matriarch', name: 'Dune Matriarch', art: '🦈', extra: true, cost: 5, attack: 4, health: 5, doubleSurface: true,
    text: 'Your Surface effects happen twice.',
  },
  {
    ...K, id: 'great_white_of_the_dunes', name: 'Great White of the Dunes', art: '🦈', extra: true, cost: 7, attack: 6, health: 7, keywords: ['Burrow'],
    text: 'Burrow. Surface: Destroy all enemy minions with 3 or less Health.',
    triggers: [{ on: 'surface', effects: [{ op: 'destroy', target: { minions: { side: 'enemy', maxHealth: 3 } } }] }],
  },
  {
    ...S, id: 'dig_in', name: 'Dig In', art: '⏬', extra: true, cost: 1,
    text: 'Burrow a friendly minion. Draw a card.',
    target: { type: 'minion', side: 'friendly' },
    effects: [{ op: 'burrow', target: 'chosen' }, { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'sinkhole', name: 'Sinkhole', art: '🕳️', extra: true, cost: 4,
    text: 'Deal 4 damage to an enemy minion. If it dies, Burrow a friendly minion.',
    target: ENEMY_MINION, target2: { type: 'minion', side: 'friendly' }, target2Optional: true,
    effects: [dmg('chosen', 4), { op: 'burrow', target: 'chosen2', if: DEAD }],
  },
  {
    ...S, id: 'duck_under', name: 'Duck Under', art: '🦈', extra: true, cost: 1,
    text: 'Quick Play: When a friendly minion is attacked, Burrow it. The attack is cancelled.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion', target: 'friendlyMinion' } },
    effects: [{ op: 'burrow', target: 'eventTarget' }, { op: 'stopAttack' }],
  },
  {
    ...S, id: 'erupt', name: 'Erupt', art: '🌋', extra: true, cost: 2, quickPlay: {},
    text: 'Quick Play: Surface a friendly Burrowed minion right now.',
    target: { type: 'minion', side: 'friendly', burrowed: true },
    effects: [{ op: 'surface', target: 'chosen' }],
  },
  {
    ...S, id: 'sand_undertow', name: 'Sand Undertow', art: '🌊', extra: true, cost: 3,
    text: "Quick Play: When an enemy minion attacks, cancel the attack. It can't attack until the end of its owner's next turn.",
    // Ruling: Burrowing an enemy would hide and protect it, so the sand drags it down instead.
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [{ op: 'stopAttack' }, { op: 'exhaust', target: 'eventSource', now: true }],
  },
  {
    ...T, id: 'tremor_sense', name: 'Tremor Sense', art: '👣', extra: true, cost: 1,
    text: 'Trap: When your opponent plays a minion while you have a Burrowed minion, your Burrowed minions Surface and gain +1 Attack.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion', hasBurrowed: true }, effects: [
      { op: 'surface', target: { minions: { side: 'friendly', burrowed: true } }, attack: 1 },
    ] },
  },
  {
    ...T, id: 'sand_trap', name: 'Sand Trap', art: '🪤', extra: true, cost: 2,
    text: "Trap: When an enemy minion attacks your Hero, deal 3 damage to it. It can't attack next turn.",
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [
      dmg('eventSource', 3), { op: 'exhaust', target: 'eventSource' },
    ] },
  },

  {
    ...K, id: 'king_meg_the_apex_predator', name: 'King Meg, The Apex Predator', art: '🦈', extra: true, cost: 10, attack: 8, health: 10, keywords: ['Rush'],
    text: 'Rush. Whenever this attacks a Marked Prey, destroy it and permanently gain its Attack and Health.',
    // Ruling: the Prey is swallowed before combat, so the attack ends without a fight.
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: { prey: true } }, effects: [{ op: 'swallow', target: 'eventTarget' }] }],
  },

  // ---- Tokens ----
  { ...K, id: 'shark_pup', name: 'Shark Pup', art: '🦈', token: true, cost: 1, attack: 1, health: 1, text: '' },
  { ...K, id: 'sand_lurker', name: 'Sand Lurker', art: '🏖️', token: true, cost: 2, attack: 2, health: 1, keywords: ['Rush'], text: 'Rush.' },
  { ...K, id: 'reef_ambusher', name: 'Reef Ambusher', art: '🦈', token: true, cost: 4, attack: 4, health: 3, keywords: ['Rush'], text: 'Rush.' },
  { ...K, id: 'hellmaw_shark', name: 'Hellmaw Shark', art: '😈', token: true, cost: 4, attack: 4, health: 3, keywords: ['Rush'], preyAttack: 2,
    text: 'Rush. +2 Attack while attacking Marked Prey.' },
];
