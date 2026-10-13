// GHOST FACTION — the Graveyard as a second battlefield. The designer's 30-card list
// and the Hero Spell, Call Beyond the Veil.
//
// Haunt: summon a minion that actually died this game from either player's Graveyard
// onto your side (effects.js haunt / hauntDead). It still belongs to its owner, so if it
// dies again it goes back to that player's Graveyard. Haunt needs board space; a full
// board means nothing is Haunted. Minions that never reached a Graveyard (Obliterated)
// can't be Haunted, nor can the Bees' Hive or Queen.
// Spell Ward: the next enemy spell that would affect the minion does nothing to it.
// Rulings made while building are marked "Ruling:".

const G = { faction: 'Ghosts', type: 'minion', tribes: ['Ghost'] };
const S = { faction: 'Ghosts', type: 'spell' };
const T = { faction: 'Ghosts', type: 'trap' };

const haunt = (extra = {}) => ({ op: 'haunt', ...extra });
const dead = (filter = {}) => ({ deadInGraveyard: filter });
const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const FRIENDLY_GHOST = { type: 'minion', side: 'friendly', tribe: 'Ghost' };
const OTHER_GHOSTS = { minions: { side: 'friendly', tribe: 'Ghost', excludeSelf: true } };

export const GHOST_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'call_beyond_the_veil', name: 'Call Beyond the Veil', art: '👻', heroSpell: true, cost: 2,
    text: "Haunt a random minion that died this game from either player's Graveyard. It enters with Reborn. Can't be used again until that minion is dead.",
    playIf: { all: [dead(), { noHauntAlive: 'veil' }] }, needsBoardSpace: true,
    effects: [haunt({ keywords: ['Reborn'], tag: 'veil' })],
  },

  // ---- Minions (16) ----
  {
    ...G, id: 'wandering_spirit', name: 'Wandering Spirit', art: '👻', cost: 1, attack: 1, health: 2, keywords: ['Elusive'],
    text: 'Elusive.',
  },
  {
    ...G, id: 'grave_lantern', name: 'Grave Lantern', art: '🏮', cost: 1, attack: 1, health: 2,
    text: 'Arrival: If a minion died this turn, gain Evade.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'self', keywords: ['Evade'], if: { deathsThisTurn: true } }] }],
  },
  {
    ...G, id: 'hollow_guard', name: 'Hollow Guard', art: '🛡️', cost: 2, attack: 2, health: 3, keywords: ['Taunt'],
    text: 'Taunt. While this has Evade, it has +1 Attack.',
    aura: { if: { subject: 'self', keyword: 'Evade' }, target: 'self', attack: 1 },
  },
  {
    ...G, id: 'whispering_skull', name: 'Whispering Skull', art: '💀', cost: 2, attack: 2, health: 2,
    text: "Arrival: Discover a minion that died this game from either player's Graveyard. Add a copy to your hand.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'chooseDead', then: 'toHand', prompt: 'Discover a minion from the Graveyard' }] }],
  },
  {
    ...G, id: 'phantom_duelist', name: 'Phantom Duelist', art: '🤺', cost: 3, attack: 3, health: 2, keywords: ['Evade', 'Reborn'],
    text: 'Evade. Reborn.',
  },
  {
    ...G, id: 'grave_robber', name: 'Grave Robber', art: '⚰️', cost: 3, attack: 2, health: 4,
    text: "Arrival: Haunt a random minion that costs 2 or less from either player's Graveyard. It enters with -1/-1.",
    triggers: [{ on: 'battlecry', effects: [haunt({ maxCost: 2, attack: -1, health: -1 })] }],
  },
  {
    ...G, id: 'phantom_raven', name: 'Phantom Raven', art: '🐦‍⬛', cost: 3, attack: 2, health: 3, keywords: ['Elusive'],
    text: 'Elusive. Arrival: Look at the top 3 cards of your deck. Draw a Ghost among them, if any; shuffle the rest back.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'drawFromTop', count: 3, filter: { tribe: 'Ghost' } }] }],
  },
  {
    ...G, id: 'soul_binder', name: 'Soul Binder', art: '⛓️', cost: 4, attack: 3, health: 4,
    text: "Arrival: Haunt a random minion that costs 3 or less from either player's Graveyard. It enters with -1/-1.",
    triggers: [{ on: 'battlecry', effects: [haunt({ maxCost: 3, attack: -1, health: -1 })] }],
  },
  {
    ...G, id: 'wraith_of_the_unforgotten', name: 'Wraith of the Unforgotten', art: '🌫️', cost: 5, attack: 4, health: 5, keywords: ['Elusive'],
    text: 'Elusive. Whenever another friendly minion is Haunted, gain +1/+1.',
    triggers: [{ on: 'minionHaunted', filter: { player: 'friendly', source: 'notSelf' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] }],
  },
  {
    ...G, id: 'knight_of_the_second_death', name: 'Knight of the Second Death', art: '⚔️', cost: 5, attack: 4, health: 4, keywords: ['Reborn'],
    text: 'Reborn. When this loses Reborn, gain Taunt.',
    // Ruling: it "loses Reborn" when it comes back through Reborn (or a card removes it).
    triggers: [
      { on: 'minionReborn', filter: { source: 'self' }, effects: [{ op: 'buff', target: 'self', keywords: ['Taunt'] }] },
      { on: 'keywordLost', filter: { target: 'self', keyword: 'Reborn' }, effects: [{ op: 'buff', target: 'self', keywords: ['Taunt'] }] },
    ],
  },
  {
    ...G, id: 'mirror_haunt', name: 'Mirror Haunt', art: '🪞', cost: 4, attack: 3, health: 3,
    text: 'Arrival: Copy the printed text of a minion in either Graveyard. This minion gains that text until it leaves play.',
    // Ruling: choose from up to 3 dead minions; their keywords and triggered text are copied (not Arrivals).
    triggers: [{ on: 'battlecry', effects: [{ op: 'chooseDead', then: 'copyText', prompt: 'Copy the text of…' }] }],
  },
  {
    ...G, id: 'veilkeeper', name: 'Veilkeeper', art: '🕯️', cost: 4, attack: 2, health: 5,
    text: 'Arrival: Give your other friendly Ghosts Elusive until your next turn.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: OTHER_GHOSTS, lingerKeywords: ['Elusive'], untilYourNextTurn: true }] }],
  },
  {
    ...G, id: 'graveyard_colossus', name: 'Graveyard Colossus', art: '🗿', cost: 6, attack: 5, health: 6, keywords: ['Taunt'],
    costPerDeaths: { per: 2, min: 3 },
    text: 'Taunt. Costs 1 less for every 2 minions that died this game, to a minimum of 3.',
  },
  {
    ...G, id: 'banshee_matriarch', name: 'Banshee Matriarch', art: '😱', cost: 6, attack: 4, health: 6,
    text: "Arrival: Haunt a random minion that costs 4 or less from either player's Graveyard. It enters with Reborn.",
    triggers: [{ on: 'battlecry', effects: [haunt({ maxCost: 4, keywords: ['Reborn'] })] }],
  },
  {
    ...G, id: 'soul_reaper', name: 'Soul Reaper', art: '☠️', cost: 7, attack: 6, health: 5,
    text: 'Arrival: Destroy a damaged enemy minion. If it dies, Haunt it with -2/-2.',
    target: { type: 'minion', side: 'enemy', damaged: true },
    triggers: [{ on: 'battlecry', effects: [
      { op: 'markHaunt', target: 'chosen', attack: -2, health: -2 },
      { op: 'destroy', target: 'chosen' },
    ] }],
  },
  {
    ...G, id: 'the_unburied_king', name: 'The Unburied King', art: '👑', cost: 9, attack: 7, health: 8, keywords: ['Elusive'],
    text: "Elusive. Arrival: Haunt up to two different minions that cost 5 or less from either player's Graveyard. They enter with -1/-1.",
    triggers: [{ on: 'battlecry', effects: [haunt({ count: 2, distinct: true, maxCost: 5, attack: -1, health: -1 })] }],
  },

  // ---- Spells (8) ----
  {
    ...S, id: 'call_of_the_departed', name: 'Call of the Departed', art: '🕊️', cost: 1,
    text: "Haunt a random minion that costs 2 or less from either player's Graveyard.",
    playIf: dead({ maxCost: 2 }), needsBoardSpace: true,
    effects: [haunt({ maxCost: 2 })],
  },
  {
    ...S, id: 'slip_between_worlds', name: 'Slip Between Worlds', art: '🌀', cost: 2,
    text: 'Give a friendly minion Evade and Elusive until your next turn.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'buff', target: 'chosen', lingerKeywords: ['Evade', 'Elusive'], untilYourNextTurn: true }],
  },
  {
    ...S, id: 'unquiet_memories', name: 'Unquiet Memories', art: '💭', cost: 2,
    text: "Discover a minion that died this game from either player's Graveyard. It costs (1) less.",
    playIf: dead(),
    effects: [{ op: 'chooseDead', then: 'toHand', costMod: -1, prompt: 'Discover a minion from the Graveyard' }],
  },
  {
    ...S, id: 'silence_the_living', name: 'Silence the Living', art: '🤫', cost: 3,
    text: 'Give a friendly Ghost Spell Ward until your next turn. The next enemy spell that would affect it has no effect on it.',
    target: FRIENDLY_GHOST,
    effects: [{ op: 'buff', target: 'chosen', lingerKeywords: ['Spell Ward'], untilYourNextTurn: true }],
  },
  {
    ...S, id: 'open_the_tomb', name: 'Open the Tomb', art: '🪦', cost: 4,
    text: "Haunt a random minion that costs 4 or less from either player's Graveyard. It enters with 1 Health.",
    playIf: dead({ maxCost: 4 }), needsBoardSpace: true,
    effects: [haunt({ maxCost: 4, setHealth: 1 })],
  },
  {
    ...S, id: 'stolen_afterlife', name: 'Stolen Afterlife', art: '🫥', cost: 4,
    text: "Choose a minion that died this game from your opponent's Graveyard. Haunt it with -2/-2.",
    // Ruling: choose from up to 3 different minions, like Discover.
    playIf: dead({ from: 'enemy' }), needsBoardSpace: true,
    effects: [{ op: 'chooseDead', from: 'enemy', then: 'haunt', attack: -2, health: -2, prompt: 'Haunt a minion from their Graveyard' }],
  },
  {
    ...S, id: 'the_dead_march', name: 'The Dead March', art: '🥁', cost: 6,
    text: "Haunt up to two different minions that cost 4 or less from either player's Graveyard. They enter with Reborn.",
    playIf: dead({ maxCost: 4 }), needsBoardSpace: true,
    effects: [haunt({ count: 2, distinct: true, maxCost: 4, keywords: ['Reborn'] })],
  },
  {
    ...S, id: 'beyond_the_veil', name: 'Beyond the Veil', art: '🌌', cost: 8,
    text: "Haunt up to three different minions from either player's Graveyard. They enter with -2/-2. At least one comes from your opponent's Graveyard if one is available.",
    playIf: dead(), needsBoardSpace: true,
    effects: [haunt({ count: 3, distinct: true, requireEnemy: true, attack: -2, health: -2 })],
  },

  // ---- Traps (3) ----
  {
    ...T, id: 'mirror_of_the_departed', name: 'Mirror of the Departed', art: '🪞', cost: 2,
    text: "When an enemy spell targets a friendly minion: it has no effect on that minion, which gains Elusive this turn.",
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'spell', target: 'friendlyMinion' }, effects: [{ op: 'counterTarget', elusive: true }] },
  },
  {
    ...T, id: 'grave_grasp', name: 'Grave Grasp', art: '🖐️', cost: 3,
    text: 'When an enemy minion attacks: it has -3 Attack this turn. If it dies this turn, Haunt it with -1/-1.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' }, effects: [
      { op: 'buff', target: 'eventSource', attack: -3, temporary: true },
      { op: 'markHaunt', target: 'eventSource', attack: -1, health: -1 },
    ] },
  },
  {
    ...T, id: 'tomb_without_a_door', name: 'Tomb Without a Door', art: '🚪', cost: 4,
    text: 'When your opponent plays a minion: summon a 2/2 Restless Spirit with Taunt. If a minion died last turn, it also gains Reborn.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      { op: 'summon', cardId: 'restless_spirit', if: { deathsLastTurn: false } },
      { op: 'summon', cardId: 'restless_spirit', keywords: ['Reborn'], if: { deathsLastTurn: true } },
    ] },
  },

  // ---- Quick Plays (3) ----
  {
    ...S, id: 'not_of_this_world', name: 'Not of This World', art: '✨', cost: 1,
    text: "Quick Play: When an enemy spell targets a friendly character, it has no effect on that character.",
    quickPlay: { windows: ['cardPlayed'], filter: { player: 'enemy', cardType: 'spell', target: 'friendlyCharacter' } },
    effects: [{ op: 'counterTarget' }],
  },
  {
    ...S, id: 'refuse_the_grave', name: 'Refuse the Grave', art: '🕸️', cost: 2,
    text: 'Quick Play: When a friendly minion dies, it returns with 1 Health (as if it had Reborn).',
    // Ruling: it answers the death; if the minion already had Reborn it was coming back anyway.
    quickPlay: { windows: ['minionDied'], filter: { source: 'friendlyMinion' } },
    effects: [{ op: 'rebornNow' }],
  },
  {
    ...S, id: 'deaths_claim', name: "Death's Claim", art: '🦴', cost: 3,
    text: 'Quick Play: When an enemy minion dies, Haunt it with -2/-2.',
    quickPlay: { windows: ['minionDied'], filter: { source: 'enemyMinion' } },
    needsBoardSpace: true,
    effects: [{ op: 'hauntDead', eventDead: true, attack: -2, health: -2 }],
  },

  // ---- Tokens ----
  {
    ...G, id: 'restless_spirit', name: 'Restless Spirit', art: '👻', token: true, cost: 2, attack: 2, health: 2, keywords: ['Taunt'],
    text: 'Taunt.',
  },
  {
    faction: 'Ghosts', type: 'minion', tribes: ['Ghost', 'Insect'], id: 'spectral_insect', name: 'Spectral Insect', art: '🪲', token: true,
    cost: 1, attack: 1, health: 1, text: '',
  },
];
