// VOID FACTION — The Hungering Dark. Shadow beasts of living dark matter that ate the stars.
// The designer's 30-card list, the Hero Spell Feed the Void and the Void Spawn token.
//
// Hollow: a bonus that is on only while your hand is empty (an aura on the card with
// `if: { handEmpty: true }`, recomputed every step like any aura, engine.js applyAuras).
// Discard (effects.js discard / discardHand / discardFromHand): you choose the card (if you
// hold only one, that one goes). "Discard a card. If you do, ..." puts the rest in `then`.
// Every discard counts toward "cards you've discarded this game" (player.discarded).
// Rulings made while building are marked "Ruling:".

const K = { faction: 'Void', type: 'minion', tribes: ['Void'] };
const S = { faction: 'Void', type: 'spell' };
const T = { faction: 'Void', type: 'trap' };

const HOLLOW = { handEmpty: true };
const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const VOIDS = { minions: { side: 'friendly', tribe: 'Void' } };
const OTHER_VOIDS = { minions: { side: 'friendly', tribe: 'Void', excludeSelf: true } };
const hollow = (bonus) => ({ aura: { target: 'self', if: HOLLOW, ...bonus } });
const discard = (then = [], extra = {}) => ({ op: 'discard', then, ...extra });
const pull = (extra = {}) => ({ op: 'pull', ...extra });
const spawn = (count, extra = {}) => ({ op: 'summon', cardId: 'void_spawn', count, ...extra });

export const VOID_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'feed_the_void', name: 'Feed the Void', art: '🌑', heroSpell: true, cost: 2,
    text: 'Discard a card. If you do, give a friendly minion +2/+2.',
    target: FRIENDLY_MINION, playIf: { handAtLeast: 1 },
    effects: [discard([{ op: 'buff', target: 'chosen', attack: 2, health: 2 }])],
  },

  // ---- Minions (18) ----
  {
    ...K, id: 'voidling', name: 'Voidling', art: '🌑', cost: 1, attack: 1, health: 2,
    text: 'Hollow: Has +2 Attack.', ...hollow({ attack: 2 }),
  },
  {
    ...K, id: 'shadow_mite', name: 'Shadow Mite', art: '🕷️', cost: 1, attack: 1, health: 2, keywords: ['Rush'],
    text: 'Rush.',
  },
  {
    ...K, id: 'starving_shade', name: 'Starving Shade', art: '🐺', cost: 2, attack: 3, health: 2,
    text: 'Hollow: Has Rush.', ...hollow({ keywords: ['Rush'] }),
  },
  {
    ...K, id: 'dark_matter_drifter', name: 'Dark Matter Drifter', art: '🪼', cost: 2, attack: 2, health: 2, keywords: ['Elusive'],
    text: 'Elusive. Hollow: Has +1/+1.', ...hollow({ attack: 1, health: 1 }),
  },
  {
    ...K, id: 'event_horizon_hound', name: 'Event Horizon Hound', art: '🐕', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Discard a card. If you do, gain +2/+2.',
    triggers: [{ on: 'battlecry', effects: [discard([{ op: 'buff', target: 'self', attack: 2, health: 2 }])] }],
  },
  {
    ...K, id: 'hungering_shade', name: 'Hungering Shade', art: '👻', cost: 2, attack: 2, health: 1,
    text: 'Exit: If your hand is empty, draw a card.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'draw', count: 1, if: HOLLOW }] }],
  },
  {
    ...K, id: 'gloom_lurker', name: 'Gloom Lurker', art: '🐆', cost: 3, attack: 2, health: 3, keywords: ['Stealth'],
    text: 'Stealth. Hollow: Has +2 Attack.', ...hollow({ attack: 2 }),
  },
  {
    ...K, id: 'nebula_gnawer', name: 'Nebula Gnawer', art: '🐀', cost: 3, attack: 4, health: 2,
    text: 'Whenever you discard a card, gain +1 Attack.',
    triggers: [{ on: 'cardDiscarded', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...K, id: 'starless_prowler', name: 'Starless Prowler', art: '🐈‍⬛', cost: 3, attack: 3, health: 2,
    text: 'Hollow: Has Charge.', ...hollow({ keywords: ['Charge'] }),
  },
  {
    ...K, id: 'hollow_herald', name: 'Hollow Herald', art: '👑', cost: 3, attack: 2, health: 4,
    text: 'Arrival: If your hand is empty, give your other Void minions +1 Attack.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: OTHER_VOIDS, attack: 1, if: HOLLOW }] }],
  },
  {
    ...K, id: 'vacuum_stalker', name: 'Vacuum Stalker', art: '🦗', cost: 4, attack: 4, health: 4,
    text: 'Hollow: Has +1 Attack and Elusive.', ...hollow({ attack: 1, keywords: ['Elusive'] }),
  },
  {
    ...K, id: 'eclipse_maw', name: 'Eclipse Maw', art: '🌘', cost: 4, attack: 5, health: 3, keywords: ['Rush'],
    text: 'Rush. Arrival: Discard a card. Deal damage equal to its Cost to the enemy Hero.',
    triggers: [{ on: 'battlecry', effects: [discard([{ op: 'damage', target: 'enemyHero', amountFromDiscardCost: true }])] }],
  },
  {
    ...K, id: 'shadow_brood_mother', name: 'Shadow Brood-Mother', art: '🕸️', cost: 4, attack: 3, health: 3,
    text: 'Arrival: Summon two 1/1 Void Spawn with Rush. Hollow: They are 2/2 instead.',
    triggers: [{ on: 'battlecry', effects: [spawn(2, { attack: 2, health: 2, if: HOLLOW, else: [spawn(2)] })] }],
  },
  {
    ...K, id: 'riftmaw_devourer', name: 'Riftmaw Devourer', art: '🐻', cost: 5, attack: 5, health: 5,
    text: 'Hollow: Has Charge.', ...hollow({ keywords: ['Charge'] }),
  },
  {
    ...K, id: 'lightless_behemoth', name: 'Lightless Behemoth', art: '🦏', cost: 5, attack: 4, health: 6,
    text: 'Whenever you discard a card, gain +1/+1.',
    triggers: [{ on: 'cardDiscarded', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...K, id: 'star_swallower', name: 'Star-Swallower', art: '🐋', cost: 6, attack: 6, health: 5,
    text: 'Arrival: Discard your hand. Deal 2 damage to the enemy Hero for each card discarded (up to 10).',
    triggers: [{ on: 'battlecry', effects: [{ op: 'discardHand', then: [{ op: 'damage', target: 'enemyHero', amountPerDiscarded: { each: 2, max: 10 } }] }] }],
  },
  {
    ...K, id: 'abyssal_leviathan', name: 'Abyssal Leviathan', art: '🐍', cost: 7, attack: 7, health: 7, costPerDiscard: { min: 1 },
    text: "Costs (1) less for each card you've discarded this game. Hollow: Has Rush.", ...hollow({ keywords: ['Rush'] }),
  },
  {
    ...K, id: 'nihilax_the_world_eater', name: 'Nihilax, the World-Eater', art: '🐉', cost: 8, attack: 8, health: 8, keywords: ['Charge'],
    costPerDiscard: { min: 4 },
    text: "Charge. Costs (1) less for each card you've discarded this game (not below 4). Arrival: Discard your hand. Gain +1/+1 for each card discarded.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'discardHand', then: [{ op: 'buff', target: 'self', perDiscarded: {} }] }] }],
  },

  // ---- Spells (9) ----
  {
    ...S, id: 'fade_to_nothing', name: 'Fade to Nothing', art: '🫥', cost: 0,
    text: 'Discard a card. If you do, give a friendly minion +2 Attack this turn.',
    target: FRIENDLY_MINION, playIf: { handAtLeast: 2 },
    effects: [discard([{ op: 'buff', target: 'chosen', attack: 2, temporary: true }])],
  },
  {
    ...S, id: 'hunger_of_the_void', name: 'Hunger of the Void', art: '🦷', cost: 1,
    text: 'Deal 2 damage. Hollow: Deal 4 instead.',
    target: { type: 'character', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 2, amountIf: { if: HOLLOW, amount: 4 } }],
  },
  {
    ...S, id: 'dark_matter_surge', name: 'Dark Matter Surge', art: '🌌', cost: 2,
    text: 'Give your Void minions +1 Attack. Hollow: +2 Attack instead.',
    effects: [{ op: 'buff', target: VOIDS, attack: 2, if: HOLLOW, else: [{ op: 'buff', target: VOIDS, attack: 1 }] }],
  },
  {
    ...S, id: 'starfall_feast', name: 'Starfall Feast', art: '🌠', cost: 2,
    text: 'Discard your hand. Give a friendly minion +1/+1 for each card discarded.',
    target: FRIENDLY_MINION, playIf: { handAtLeast: 2 },
    effects: [{ op: 'discardHand', then: [{ op: 'buff', target: 'chosen', perDiscarded: {} }] }],
  },
  {
    ...S, id: 'swallow_whole', name: 'Swallow Whole', art: '🌀', cost: 3,
    text: 'Destroy an enemy minion with 3 or less Attack. Discard a card.',
    target: { type: 'minion', side: 'enemy', maxAttack: 3 },
    effects: [{ op: 'destroy', target: 'chosen' }, discard()],
  },
  {
    ...S, id: 'event_horizon', name: 'Event Horizon', art: '🕳️', cost: 4,
    text: 'Deal 3 damage to a minion. If it dies, give a random friendly Void minion +2/+2.',
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 3 },
      { op: 'buff', target: { randomOf: VOIDS }, attack: 2, health: 2, if: { subject: 'chosen', dead: true } }],
  },
  {
    ...S, id: 'swallowed_by_darkness', name: 'Swallowed by Darkness', art: '🌚', cost: 4,
    text: 'Destroy a minion. Discard 2 cards.',
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'destroy', target: 'chosen' }, discard([discard()])],
  },
  {
    ...S, id: 'the_void_calls', name: 'The Void Calls', art: '👁️', cost: 5, needsBoardSpace: true,
    text: 'Summon three 2/1 Void Spawn with Rush.',
    effects: [spawn(3, { attack: 2, health: 1 })],
  },
  {
    ...S, id: 'devour_the_stars', name: 'Devour the Stars', art: '✨', cost: 6,
    text: 'Deal 2 damage to the enemy Hero for each friendly Void minion.',
    effects: [{ op: 'damage', target: 'enemyHero', amount: 0, amountPerCount: { count: VOIDS, each: 2 } }],
  },

  // ---- Traps (3) ----
  {
    ...T, id: 'void_ambush', name: 'Void Ambush', art: '🌑', cost: 2,
    text: 'When an enemy minion attacks: summon two 1/1 Void Spawn with Rush.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [spawn(2)] },
  },
  {
    ...T, id: 'swallowing_dark', name: 'Swallowing Dark', art: '🕳️', cost: 2,
    text: 'When your opponent plays a minion: deal 3 damage to it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [{ op: 'damage', target: 'eventSource', amount: 3 }] },
  },
  {
    ...T, id: 'hungry_silence', name: 'Hungry Silence', art: '🤫', cost: 1,
    text: 'When your Hero takes damage: give your Void minions +1 Attack.',
    trap: { on: 'damageDealt', filter: { target: 'friendlyHero' }, effects: [{ op: 'buff', target: VOIDS, attack: 1 }] },
  },

  // ---- Singularity (expansion, unlockable) ----
  // Pull (effects.js pull / pullFromEnemyDeck): Discover a card from the enemy deck (1 of 3) and
  // take it. Collapse: if your hand was empty, a Pulled minion gets a random bonus keyword and any
  // other card costs (1) less.
  {
    ...K, id: 'singularity_seed', name: 'Singularity Seed', art: '⚫', extra: true, cost: 2, attack: 1, health: 2,
    text: 'Arrival: Pull a card.',
    triggers: [{ on: 'battlecry', effects: [pull()] }],
  },
  {
    ...K, id: 'accretion_serpent', name: 'Accretion Serpent', art: '🐍', extra: true, cost: 2, attack: 2, health: 2,
    text: 'Whenever you Pull a card, gain +1/+1.',
    triggers: [{ on: 'cardPulled', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...K, id: 'lensing_wisp', name: 'Lensing Wisp', art: '🔮', extra: true, cost: 2, attack: 1, health: 2, keywords: ['Stealth'],
    text: 'Stealth. Arrival: Pull a spell.',
    triggers: [{ on: 'battlecry', effects: [pull({ filter: { type: 'spell' } })] }],
  },
  {
    ...K, id: 'spaghettifier', name: 'Spaghettifier', art: '🍝', extra: true, cost: 3, attack: 2, health: 3,
    text: 'Arrival: Pull a minion.',
    triggers: [{ on: 'battlecry', effects: [pull({ filter: { type: 'minion' } })] }],
  },
  {
    ...K, id: 'pulsar_hound', name: 'Pulsar Hound', art: '💫', extra: true, cost: 3, attack: 3, health: 3, keywords: ['Rush'],
    text: 'Rush. Whenever you play a card you Pulled, gain +1 Attack.',
    triggers: [{ on: 'cardPlayed', filter: { player: 'friendly', pulled: true }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...K, id: 'wormhole_stalker', name: 'Wormhole Stalker', art: '🌀', extra: true, cost: 3, attack: 2, health: 2, keywords: ['Elusive'], pullDiscount: 1,
    text: 'Elusive. Cards you Pull cost (1) less.',
  },
  {
    ...K, id: 'hawking_wraith', name: 'Hawking Wraith', art: '👻', extra: true, cost: 4, attack: 3, health: 4,
    text: 'Exit: Pull a card.',
    triggers: [{ on: 'deathrattle', effects: [pull()] }],
  },
  {
    ...K, id: 'white_hole_emissary', name: 'White Hole Emissary', art: '⚪', extra: true, cost: 6, attack: 4, health: 5,
    text: "Arrival: Summon a random minion from your opponent's deck. It's gone from their deck.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'summonFromEnemyDeck' }] }],
  },
  {
    ...K, id: 'quasar_maw', name: 'Quasar Maw', art: '🌟', extra: true, cost: 5, attack: 5, health: 4,
    text: 'Arrival: Pull a card. If it Collapses, Pull another.',
    triggers: [{ on: 'battlecry', effects: [pull({ ifCollapse: [pull()] })] }],
  },
  {
    ...K, id: 'dark_star', name: 'Dark Star', art: '🌑', extra: true, cost: 6, attack: 6, health: 6, costPerPulled: { min: 2 },
    text: "Costs (1) less for each card you've Pulled this game (not below 2).",
  },
  {
    ...K, id: 'gargantua_the_living_singularity', name: 'Gargantua, the Living Singularity', art: '🕳️', extra: true, cost: 7, attack: 7, health: 7,
    text: 'Arrival: Pull 3 cards. They always Collapse.',
    triggers: [{ on: 'battlecry', effects: [pull({ collapse: true, repeat: 2 })] }],
  },
  {
    ...S, id: 'spaghettification', name: 'Spaghettification', art: '🍝', extra: true, cost: 2,
    text: 'Deal 3 damage to a minion. If it dies, Pull a card.',
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 3 }, pull({ if: { subject: 'chosen', dead: true } })],
  },
  {
    ...S, id: 'gravitational_collapse', name: 'Gravitational Collapse', art: '💥', extra: true, cost: 3, playIf: { handAtLeast: 2 },
    text: 'Discard your hand. Pull that many cards (up to 4). They always Collapse.',
    effects: [{ op: 'discardHand', then: [pull({ collapse: true, repeatPerDiscarded: { max: 4 } })] }],
  },
  {
    ...S, id: 'wormhole', name: 'Wormhole', art: '🌀', extra: true, cost: 1,
    text: 'Pull a card.',
    effects: [pull()],
  },
  {
    ...T, id: 'gravity_snare', name: 'Gravity Snare', art: '🪤', extra: true, cost: 3,
    text: 'When your opponent draws a card: you Pull that card instead.',
    trap: { on: 'cardDrawn', filter: { player: 'enemy', burned: false }, effects: [{ op: 'pullDrawn' }] },
  },

  // ---- Token ----
  { ...K, id: 'void_spawn', name: 'Void Spawn', art: '🌑', token: true, cost: 1, attack: 1, health: 1, keywords: ['Rush'], text: 'Rush.' },
];
