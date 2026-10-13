// DRAGON FACTION — the designer's complete 30-card list + Hero Spell.
// Text is the designer's wording ("Battlecry" shown as Arrival). Interpretation
// choices are marked "Ruling:" and listed in docs/OPEN_QUESTIONS.md (Q14).
//
// Burn (Dragon rule): a character's Burn value. At the end of its controller's
// turn it takes that much damage, then the value rises by 1 (engine burn step).
// Applying Burn X sets the value to X if it was lower, otherwise adds X.
// Burning a card destroys it from the opponent's hand (random) or the top of
// their deck without it being drawn or played.
//
// Every Dragon-faction minion carries the 'Dragon' tribe.

const D = { faction: 'Dragons', type: 'minion', tribes: ['Dragon'] };
const S = { faction: 'Dragons', type: 'spell' };
const T = { faction: 'Dragons', type: 'trap' };

const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_CHARACTER = { type: 'character', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const ENEMY_CHARACTERS = { characters: { side: 'enemy' } };
const burn = (target, amount, extra = {}) => ({ op: 'applyBurn', target, amount, ...extra });

export const DRAGON_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'dragonfire', name: 'Dragonfire', art: '🔥', heroSpell: true, cost: 2,
    text: 'Apply Burn 2 to an enemy character. (Burn lasts 2 turns.)',
    target: ENEMY_CHARACTER,
    effects: [burn('chosen', 2)],
  },

  // ---- Minions (16) ----
  {
    ...D, id: 'ember_whelp', name: 'Ember Whelp', art: '🐉', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Apply Burn 1 to an enemy minion.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [burn('chosen', 1)] }],
  },
  {
    ...D, id: 'cinder_drake', name: 'Cinder Drake', art: '🐲', cost: 2, attack: 3, health: 3,
    text: 'Whenever an enemy character takes Burn damage, gain +1 Attack this turn.',
    // Ruling (Q14): taken literally. Enemy Burn ticks at the end of the enemy's turn,
    // so the Attack is gone by your turn unless Burn damage happens on your turn.
    triggers: [{ on: 'burnDamage', filter: { target: 'enemyCharacter' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true }] }],
  },
  {
    ...D, id: 'flamefang', name: 'Flamefang', art: '🦷', cost: 2, attack: 3, health: 2,
    text: 'Arrival: If the enemy Hero is Burning, deal 1 damage to it.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'enemyHero', amount: 1, if: { subject: 'enemyHero', burning: true } }] }],
  },
  {
    ...D, id: 'scorchscale_guardian', name: 'Scorchscale Guardian', art: '🛡️', cost: 3, attack: 2, health: 5, keywords: ['Taunt'],
    text: 'Taunt. Whenever this takes damage from a Burning character, gain +1 Attack.',
    triggers: [{ on: 'damageDealt', filter: { target: 'self', sourceBurning: true }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...D, id: 'ashwing_dragon', name: 'Ashwing Dragon', art: '🪽', cost: 3, attack: 3, health: 3,
    text: 'Arrival: Apply Burn 1 to an enemy character. If it is already Burning, deal 2 damage to it instead.',
    target: ENEMY_CHARACTER,
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: 'chosen', amount: 2, if: { subject: 'chosen', burning: true }, else: [burn('chosen', 1)] },
    ] }],
  },
  {
    ...D, id: 'charcoal_drake', name: 'Charcoal Drake', art: '⚫', cost: 3, attack: 3, health: 4,
    text: 'Whenever an enemy minion dies from Burn damage, gain +1/+1.',
    triggers: [{ on: 'minionDied', filter: { source: 'enemyMinion', byBurn: true }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...D, id: 'inferno_stalker', name: 'Inferno Stalker', art: '🐆', cost: 4, attack: 4, health: 3,
    text: 'Whenever this attacks a Burning character, gain +2 Attack for that attack.',
    // Ruling (Q14): the +2 lasts until the end of the turn.
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', targetBurning: true }, effects: [{ op: 'buff', target: 'self', attack: 2, temporary: true }] }],
  },
  {
    ...D, id: 'molten_hide', name: 'Molten Hide', art: '🌋', cost: 4, attack: 3, health: 6,
    text: 'Whenever this survives damage, apply Burn 1 to the character that damaged it.',
    // Ruling (Q14): only a character can be Burned; damage from a spell burns nothing.
    triggers: [{ on: 'damageDealt', filter: { target: 'self' },
      effects: [burn('eventSource', 1, { if: { subject: 'self', alive: true } })] }],
  },
  {
    ...D, id: 'ashen_tyrant', name: 'Ashen Tyrant', art: '👑', cost: 5, attack: 4, health: 5,
    text: 'Arrival: Apply Burn 2 to an enemy minion.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [burn('chosen', 2)] }],
  },
  {
    ...D, id: 'blazewing', name: 'Blazewing', art: '💥', cost: 5, attack: 4, health: 4,
    text: 'Arrival: Deal 1 damage to all enemy minions. Deal 1 additional damage to each Burning minion.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 1, burningBonus: 1 }] }],
  },
  {
    ...D, id: 'furnace_dragon', name: 'Furnace Dragon', art: '🏭', cost: 6, attack: 5, health: 6,
    text: "Whenever an enemy character takes Burn damage, its Burn value rises by 1 (once per character per turn).",
    triggers: [{ on: 'burnDamage', filter: { target: 'enemyCharacter' }, effects: [{ op: 'addBurn', target: 'eventTarget', amount: 1, oncePerTurn: 'furnace_dragon' }] }],
  },
  {
    ...D, id: 'magma_behemoth', name: 'Magma Behemoth', art: '🗻', cost: 6, attack: 6, health: 7,
    text: 'Arrival: If the enemy Hero is Burning, deal 2 damage to all enemy minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 2, if: { subject: 'enemyHero', burning: true } }] }],
  },
  {
    ...D, id: 'sunfire_dragon', name: 'Sunfire Dragon', art: '☀️', cost: 7, attack: 6, health: 6,
    text: 'Arrival: Apply Burn 2 to the enemy Hero and Burn 1 to all enemy minions.',
    triggers: [{ on: 'battlecry', effects: [burn('enemyHero', 2), burn(ENEMY_MINIONS, 1)] }],
  },
  {
    ...D, id: 'ash_collector', name: 'Ash Collector', art: '⚱️', cost: 7, attack: 5, health: 7,
    text: 'Whenever you burn an enemy card, deal 1 damage to the enemy Hero. This effect triggers up to 3 times per turn.',
    triggers: [{ on: 'cardBurned', filter: { player: 'enemy' }, effects: [{ op: 'damage', target: 'enemyHero', amount: 1, perTurnLimit: 3 }] }],
  },
  {
    ...D, id: 'inferno_tyrant', name: 'Inferno Tyrant', art: '😈', cost: 8, attack: 7, health: 7,
    text: "Arrival: Apply Burn 2 to all enemy characters and burn the top 3 cards of your opponent's deck.",
    triggers: [{ on: 'battlecry', effects: [burn(ENEMY_CHARACTERS, 2), { op: 'burnCards', from: 'deck', count: 3 }] }],
  },
  {
    ...D, id: 'the_worldflame', name: 'The Worldflame', art: '🌍', cost: 10, attack: 8, health: 10,
    text: "Arrival: Deal 2 damage to all enemies, +1 to each Burning one. Burn 2 random cards in your opponent's hand.",
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: ENEMY_CHARACTERS, amount: 2, burningBonus: 1 },
      { op: 'burnCards', from: 'hand', count: 2 },
    ] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'fireball', name: 'Fireball', art: '☄️', cost: 2,
    text: 'Deal 3 damage to a character. If it is Burning, deal 1 additional damage.',
    target: { type: 'character', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 3, burningBonus: 1 }],
  },
  {
    ...S, id: 'scorching_breath', name: 'Scorching Breath', art: '🌬️', cost: 3,
    text: 'Deal 1 damage to all enemy minions and apply Burn 1 to them.',
    // Ruling (Q14): minions the damage kills don't catch fire.
    effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 1 }, burn(ENEMY_MINIONS, 1)],
  },
  {
    ...S, id: 'ashen_curse', name: 'Ashen Curse', art: '🕯️', cost: 3,
    text: "Burn a random card in your opponent's hand. If they have no cards in hand, apply Burn 2 to the enemy Hero.",
    effects: [burn('enemyHero', 2, { if: { enemyHandEmpty: true }, else: [{ op: 'burnCards', from: 'hand', count: 1 }] })],
  },
  {
    ...S, id: 'dragons_breath', name: "Dragon's Breath", art: '🐉', cost: 4,
    text: 'Deal 5 damage to a minion. If it dies, apply Burn 2 to the enemy Hero.',
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 5 }, burn('enemyHero', 2, { if: { subject: 'chosen', dead: true } })],
  },
  {
    ...S, id: 'scorched_earth', name: 'Scorched Earth', art: '🏜️', cost: 4,
    text: 'Deal 2 damage to all minions. Burning minions take 2 additional damage.',
    effects: [{ op: 'damage', target: { minions: { side: 'any' } }, amount: 2, burningBonus: 2 }],
  },
  {
    ...S, id: 'dragonfire_storm', name: 'Dragonfire Storm', art: '🌪️', cost: 7,
    text: 'Deal 3 damage to all enemy characters. Apply Burn 2 to any that survive.',
    effects: [{ op: 'damage', target: ENEMY_CHARACTERS, amount: 3 }, burn(ENEMY_CHARACTERS, 2)],
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'flash_ignition', name: 'Flash Ignition', art: '⚡', cost: 1,
    text: 'When an enemy character takes damage, apply Burn 1 to it.',
    quickPlay: { windows: ['damageDealt'], filter: { target: 'enemyCharacter' } },
    effects: [burn('eventTarget', 1)],
  },
  {
    ...S, id: 'firebreak', name: 'Firebreak', art: '🧱', cost: 2,
    text: 'When a friendly character would take damage, reduce that damage by 3. If the source is a Burning character, apply Burn 1 to it.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: 'friendlyCharacter' } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 3 },
      burn('eventSource', 1, { if: { subject: 'eventSource', burning: true } }),
    ],
  },
  {
    ...S, id: 'explosive_reaction', name: 'Explosive Reaction', art: '💣', cost: 2,
    text: 'When an enemy minion attacks, deal 3 damage to it. If it is Burning, deal 5 damage instead.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [{ op: 'damage', target: 'eventSource', amount: 3, burningBonus: 2 }],
  },
  {
    ...S, id: 'feed_the_flames', name: 'Feed the Flames', art: '🪵', cost: 3,
    text: 'When an enemy character takes Burn damage, increase its Burn value by 2.',
    quickPlay: { windows: ['burnDamage'], filter: { target: 'enemyCharacter' } },
    effects: [{ op: 'addBurn', target: 'eventTarget', amount: 2 }],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'ignition_trap', name: 'Ignition Trap', art: '🪤', cost: 2,
    text: 'When your opponent plays a minion, apply Burn 2 to it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [burn('eventSource', 2)] },
  },
  {
    ...T, id: 'ashen_ambush', name: 'Ashen Ambush', art: '🌫️', cost: 3,
    text: 'When an enemy minion attacks your Hero, deal 3 damage to it. If it is Burning, destroy it if it has 3 or less Health remaining.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [
      { op: 'damage', target: 'eventSource', amount: 3 },
      { op: 'destroy', target: 'eventSource', if: { subject: 'eventSource', burning: true, alive: true, healthAtMost: 3 } },
    ] },
  },
  {
    ...T, id: 'scorched_hand', name: 'Scorched Hand', art: '✋', cost: 3,
    text: 'When your opponent draws a card, burn a random card in their hand. This Trap triggers only once per turn.',
    trap: { on: 'cardDrawn', filter: { player: 'enemy' }, effects: [{ op: 'burnCards', from: 'hand', count: 1 }] },
  },
  {
    ...T, id: 'infernos_wake', name: "Inferno's Wake", art: '🌊', cost: 5,
    text: 'When an enemy minion dies from Burn damage, deal 2 damage to all enemy minions and apply Burn 1 to them.',
    trap: { on: 'minionDied', filter: { source: 'enemyMinion', byBurn: true }, effects: [
      { op: 'damage', target: ENEMY_MINIONS, amount: 2 }, burn(ENEMY_MINIONS, 1),
    ] },
  },
];
