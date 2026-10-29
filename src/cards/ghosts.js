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

// ---- The Cursed Armory: Relics (equip to your Hero or a friendly Ghost) ----
const RELIC_TARGET = { type: 'character', side: 'friendly', heroOrTribe: 'Ghost' };
const relic = (r) => ({ target: RELIC_TARGET, relic: r, effects: [{ op: 'equipRelic', target: 'chosen' }, { op: 'countRelic' }] });
const LANTERN = { on: 'endOfTurn', filter: { player: 'friendly' }, effects: [haunt({ maxCost: 1 })] };
const CHAINS = { on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [{ op: 'buff', target: 'eventTarget', keywords: ['Frozen'] }] };
const SCYTHE = { on: 'afterAttack', filter: { source: 'self' }, effects: [{ op: 'hauntDead', eventTargetDead: true, if: { eventTargetGone: true } }] };
const SOULFORGE = { on: 'attackDeclared', filter: { source: 'self' }, effects: [haunt({ from: 'friendly', maxCost: 3 })] };

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
  // ---- The Cursed Armory expansion (unlockable): Relics ----
  // A Relic is a haunted item equipped to your Hero (as a Hero Weapon: Attack, and Durability used
  // up by attacks) or to a friendly Ghost (its stats, keywords and effects; it doesn't wear out).
  // When a Ghost holding a Relic dies, the Relic lingers: it drifts to your Hero if the Hero is
  // unarmed (effects.js equipRelic; engine deaths).
  {
    ...G, id: 'grave_squire', name: 'Grave Squire', art: '🛡️', extra: true, cost: 1, attack: 1, health: 1,
    text: 'Arrival: Give a random Relic you hold +1 Attack.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buffRelics', pick: 'random', attack: 1 }] }],
  },
  {
    ...S, ...relic({ attack: 1, durability: 2,
      hero: { triggers: [{ on: 'afterAttack', filter: { source: 'self' }, effects: [{ op: 'buff', target: { randomOf: { minions: { side: 'friendly', tribe: 'Ghost' } } }, attack: 1 }] }] },
      ghost: { attack: 1, keywords: ['Evade'] } }),
    id: 'rusted_spectral_dagger', name: 'Rusted Spectral Dagger', art: '🗡️', extra: true, cost: 2,
    text: 'Relic. Hero: a 1/2 Weapon; after your Hero attacks, give a random friendly Ghost +1 Attack. Ghost: +1 Attack and Evade.',
  },
  {
    ...S, ...relic({ attack: 0, durability: 3,
      hero: { triggers: [LANTERN] },
      ghost: { health: 2, triggers: [LANTERN] } }),
    id: 'lantern_of_lost_souls', name: 'Lantern of Lost Souls', art: '🏮', extra: true, cost: 3,
    text: 'Relic. Hero or Ghost: at the end of your turn, Haunt a minion that costs 1. Ghost also gets +0/+2.',
  },
  {
    ...G, id: 'poltergeist_porter', name: 'Poltergeist Porter', art: '👻', extra: true, cost: 2, attack: 2, health: 1,
    text: "Arrival: Move your Hero's Relic to this minion.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'moveHeroRelic', target: 'self' }] }],
  },
  {
    ...S, ...relic({ attack: 2, durability: 2,
      hero: { triggers: [CHAINS] },
      ghost: { attack: 2, triggers: [CHAINS] } }),
    id: 'wailing_chains', name: 'Wailing Chains', art: '⛓️', extra: true, cost: 3,
    text: 'Relic. Hero: a 2/2 Weapon. Ghost: +2 Attack. Whenever it attacks an enemy minion, Freeze that minion.',
  },
  {
    ...G, id: 'haunted_armor', name: 'Haunted Armor', art: '🪖', extra: true, cost: 3, attack: 2, health: 4, keywords: ['Taunt'],
    text: 'Taunt. Arrival: If your Hero holds a Weapon, gain +1/+1.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'self', attack: 1, health: 1, if: { heroHasWeapon: true } }] }],
  },
  {
    ...T, id: 'cursed_heirloom', name: 'Cursed Heirloom', art: '📿', extra: true, cost: 2,
    text: 'Trap: When a friendly Ghost dies, Haunt it.',
    trap: { on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Ghost' } }, effects: [{ op: 'hauntDead', eventDead: true }] },
  },
  {
    ...G, id: 'phantom_blacksmith', name: 'Phantom Blacksmith', art: '⚒️', extra: true, cost: 3, attack: 2, health: 3,
    text: 'Arrival: Every Relic you hold gets +1 Attack, and +1 Health on a Ghost or +1 Durability on your Hero.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buffRelics', attack: 1, health: 1, durability: 1 }] }],
  },
  {
    ...S, ...relic({ attack: 3, durability: 2,
      hero: { triggers: [SCYTHE] },
      ghost: { attack: 3, triggers: [SCYTHE] } }),
    id: 'reapers_scythe', name: "Reaper's Scythe", art: '⚰️', extra: true, cost: 5,
    text: 'Relic. Hero: a 3/2 Weapon. Ghost: +3 Attack. After it attacks and kills a minion, Haunt that minion.',
  },
  {
    ...S, id: 'spirit_bond', name: 'Spirit Bond', art: '🔗', extra: true, cost: 3,
    text: 'Quick Play: When a friendly minion holding a Relic would take lethal damage, prevent it and give it Evade.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly', hasRelic: true }, lethal: true } },
    effects: [{ op: 'preventDamage', target: 'eventTarget', amount: 'all' }, { op: 'buff', target: 'eventTarget', keywords: ['Evade'] }],
  },
  {
    ...S, ...relic({ attack: 0, durability: 4,
      hero: { onEquip: [{ op: 'gainArmor', amount: 4 }], triggers: [{ on: 'attackDeclared', filter: { target: 'self' }, effects: [{ op: 'gainArmor', amount: 2 }] }] },
      ghost: { health: 4, keywords: ['Taunt'] } }),
    id: 'possessed_shield', name: 'Possessed Shield', art: '🛡️', extra: true, cost: 5,
    text: 'Relic. Hero: gain 4 Armor, and 2 Armor whenever your Hero is attacked. Ghost: +0/+4 and Taunt.',
  },
  {
    ...G, id: 'banshee_blade_bearer', name: 'Banshee Blade-Bearer', art: '🗡️', extra: true, cost: 5, attack: 4, health: 4, keywords: ['Elusive'],
    text: 'Elusive. Arrival: Take up a Phantom Blade (+2 Attack).',
    triggers: [{ on: 'battlecry', effects: [{ op: 'equipRelic', target: 'self', cardId: 'phantom_blade' }] }],
  },
  {
    ...S, id: 'requiem_of_arms', name: 'Requiem of Arms', art: '🎻', extra: true, cost: 5,
    text: "Give every friendly minion holding a Relic +1/+1. Your Hero's Weapon gets +2 Durability.",
    effects: [{ op: 'buff', target: { minions: { side: 'friendly', hasRelic: true } }, attack: 1, health: 1 }, { op: 'buffHeroWeapon', durability: 2 }],
  },
  {
    ...G, id: 'the_hollow_knight', name: 'The Hollow Knight', art: '🦴', extra: true, cost: 8, attack: 4, health: 6, keywords: ['Taunt'],
    text: "Taunt. Arrival: Move your Hero's Relic to this. Gain +1/+1 for each Relic you've played this game (up to 3).",
    triggers: [{ on: 'battlecry', effects: [{ op: 'moveHeroRelic', target: 'self' }, { op: 'buff', target: 'self', perRelicsPlayed: { max: 3 } }] }],
  },
  {
    ...S, ...relic({ attack: 4, durability: 3,
      hero: { triggers: [SOULFORGE], onBreak: [{ op: 'haunt', from: 'friendly', count: 2 }] },
      ghost: { attack: 4, triggers: [SOULFORGE] } }),
    id: 'soulforge_relic', name: 'Soulforge Relic', art: '⚔️', extra: true, cost: 8,
    text: 'Relic. Hero: a 4/3 Weapon. Ghost: +4 Attack. Whenever it attacks, Haunt a friendly minion that died and costs 3 or less. When it breaks on your Hero, Haunt 2.',
  },
  {
    ...S, ...relic({ attack: 2, durability: 2, ghost: { attack: 2 } }),
    id: 'phantom_blade', name: 'Phantom Blade', art: '🗡️', token: true, cost: 2,
    text: 'Relic. Hero: a 2/2 Weapon. Ghost: +2 Attack. (Taken up by Banshee Blade-Bearer.)',
  },

  // ---- New legendary ----
  {
    ...G, id: 'the_lantern_ferryman', name: 'The Lantern Ferryman', art: '🏮', extra: true, cost: 6, attack: 5, health: 5, keywords: ['Elusive'],
    text: 'Elusive. At the end of your turn, Haunt a minion that died this game. Exit: Haunt two more.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [haunt()] }, { on: 'deathrattle', effects: [haunt({ count: 2 })] }],
  },
];
