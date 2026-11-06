// WITCHES FACTION — The Coven. A dark academy of wand-duelling witches: the game's anti-spell
// faction. Few minions; their power is in the Wands they arm their Hero with, in a few well-placed
// Silences, and in Traps that Counter the enemy's spells. Their Legendaries are Weapons, not minions.
//
// Wand (card.wand): a Hero Weapon your Hero fires from afar. When your Hero attacks with a Wand it
//   takes no damage back (engine combat). Each attack still uses 1 Durability.
// Silence (rules.js Silenced): the minion loses every other keyword. Witches strip a minion first,
//   then punish it for being Silenced (Bayou Bone-Reader, Wand of Unmaking, Vesper).
// Silence the enemy Hero (effects.js silenceHero): their Hero Spell can't be used until the end of
//   their next turn.
// Counter (effects.js counterSpell): the enemy spell card is cast and spent, but none of its effects
//   happen. Only one Counter Trap fires per spell (triggers.js). Hero Spells can't be Countered.
// Spell tax: Coven Gatekeeper (aura) and Grim Toll (next turn) make the enemy's spell cards cost more.
//
// Distinct from a melee weapon class (a future Vampire Hunter's crossbows and stakes): a Witch never
// trades blows. Her Wands hit from range, and each one carries a spell of its own.

const WITCH = { faction: 'Witches', type: 'minion', tribes: ['Witch'] };
const FAMILIAR = { faction: 'Witches', type: 'minion', tribes: ['Familiar'] };
const S = { faction: 'Witches', type: 'spell' };
const T = { faction: 'Witches', type: 'trap' };

const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const SILENCE = (target) => ({ op: 'buff', target, keywords: ['Silenced'] });
const FREEZE = (target) => ({ op: 'buff', target, keywords: ['Frozen'] });
// An enemy spell card (not a Hero Spell): what the Coven's Counters and punishers listen for.
const ENEMY_SPELL = { player: 'enemy', cardType: 'spell', heroSpell: false };
// Equip a Wand on your Hero (effects.js equipHeroWeapon; the card's `wand` flag makes it fire from afar).
const wand = (cardId, name, attack, durability, triggers, extra = {}) =>
  ({ op: 'equipHeroWeapon', cardId, name, attack, durability, wand: true, ...(triggers ? { triggers } : {}), ...extra });
// Wand triggers act as the Hero ('self' is the Hero).
const ON_ATTACK_MINION = { on: 'attackDeclared', filter: { source: 'self', target: { side: 'enemy' } } };
const AFTER_ATTACK_MINION = { on: 'afterAttack', filter: { source: 'self', target: { side: 'enemy' } } };
const AFTER_ATTACK = { on: 'afterAttack', filter: { source: 'self' } };
// "Silence it first": the Wand's bolt strips the target before the hit lands (Evade, Taunt and all).
const HUSH_ON_HIT = [{ ...ON_ATTACK_MINION, effects: [SILENCE('eventTarget')] }];
const HUSH_TEXT = '"Whenever your Hero attacks a minion, permanently Silence it first."';
const MY_TURN_END = { on: 'endOfTurn', filter: { player: 'friendly' } };
const MY_TURN_START = { on: 'startOfTurn', filter: { player: 'friendly' } };
// Spellbound: the expansion's set name, a Scribe's page-writing, Frisk's freezing bite.
const SB = 'Spellbound';
const SCRIBE = (extra = {}) => ({ op: 'writePages', amount: 1, scribe: true, ...extra });
const FRISK_FREEZE = { on: 'afterAttack', filter: { source: 'self' }, effects: [{ op: 'buff', target: 'eventTarget', keywords: ['Frozen'] }] };

export const WITCH_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'wandcraft', name: 'Wandcraft', art: '🪄', heroSpell: true, cost: 2,
    text: 'Equip a 1/2 Apprentice Wand. If your Hero already has a Wand, give it +1 Durability instead.',
    effects: [{ op: 'buffHeroWeapon', durability: 1, if: { heroHasWand: true }, else: [wand('apprentice_wand', 'Apprentice Wand', 1, 2)] }],
  },

  // ---- Minions (11) ----
  {
    ...WITCH, id: 'academy_initiate', name: 'Academy Initiate', art: '📚', cost: 1, attack: 1, health: 2,
    text: "Arrival: Give your Hero's Weapon +1 Durability.",
    triggers: [{ on: 'battlecry', effects: [{ op: 'buffHeroWeapon', durability: 1 }] }],
  },
  {
    ...FAMILIAR, id: 'black_cat_familiar', name: 'Black Cat Familiar', art: '🐈‍⬛', cost: 1, attack: 2, health: 1, keywords: ['Stealth'],
    text: 'Stealth. Whenever your Hero attacks with a Wand, this gains +1 Attack.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'friendlyHero' }, effects: [{ op: 'buff', target: 'self', attack: 1, if: { heroHasWand: true } }] }],
  },
  {
    ...FAMILIAR, id: 'raven_familiar', name: 'Raven Familiar', art: '🐦‍⬛', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Permanently Silence an enemy minion that costs (3) or less.',
    target: { ...ENEMY_MINION, maxCost: 3 },
    triggers: [{ on: 'battlecry', effects: [SILENCE('chosen')] }],
  },
  {
    ...WITCH, id: 'coven_sister', name: 'Coven Sister', art: '🕯️', cost: 2, attack: 2, health: 3, heroWeaponAura: true,
    text: "Your Hero's Weapon has +1 Attack.",
  },
  {
    ...WITCH, id: 'hexbound_prefect', name: 'Hexbound Prefect', art: '📛', cost: 3, attack: 3, health: 4,
    text: 'Whenever your opponent casts a spell card, deal 2 damage to the enemy Hero.',
    triggers: [{ on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'damage', target: 'enemyHero', amount: 2 }] }],
  },
  {
    ...WITCH, id: 'grimoire_thief', name: 'Grimoire Thief', art: '📕', cost: 3, attack: 3, health: 3,
    text: 'Once per turn, when your opponent casts a spell card, add a copy of it to your hand.',
    triggers: [{ on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'copyEventCard', perTurnLimit: 1 }] }],
  },
  {
    ...WITCH, id: 'wandwright', name: 'Wandwright', art: '🪵', cost: 3, attack: 3, health: 3,
    text: 'Arrival: If your Hero has no Weapon, equip a 2/2 Willow Wand.',
    triggers: [{ on: 'battlecry', effects: [{ ...wand('willow_wand', 'Willow Wand', 2, 2), ifNoWeapon: true }] }],
  },
  {
    ...WITCH, id: 'bayou_bone_reader', name: 'Bayou Bone-Reader', art: '🦴', cost: 4, attack: 4, health: 4,
    text: 'Arrival: Permanently Silence an enemy minion. If it was already Silenced, destroy it instead.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'destroy', target: 'chosen', if: { subject: 'chosen', keyword: 'Silenced' }, else: [SILENCE('chosen')] }] }],
  },
  {
    ...WITCH, id: 'coven_gatekeeper', name: 'Coven Gatekeeper', art: '🚪', cost: 4, attack: 3, health: 6, keywords: ['Taunt'], enemySpellTax: 1,
    text: "Taunt. Your opponent's spell cards cost (1) more.",
  },
  {
    ...WITCH, id: 'crossroads_witch', name: 'Crossroads Witch', art: '🔀', cost: 5, attack: 4, health: 6,
    text: 'At the end of your turn, deal 2 damage to a random enemy minion.',
    triggers: [{ ...MY_TURN_END, effects: [{ op: 'damage', target: { randomOf: { minions: { side: 'enemy', alive: true } } }, amount: 2 }] }],
  },
  {
    ...WITCH, id: 'coven_matriarch', name: 'Coven Matriarch', art: '👁️', cost: 7, attack: 5, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Permanently Silence all enemy minions and Silence the enemy Hero until the end of their next turn.',
    triggers: [{ on: 'battlecry', effects: [SILENCE({ minions: { side: 'enemy' } }), { op: 'silenceHero' }] }],
  },

  // ---- Wands (4) ----
  {
    ...S, id: 'wand_of_hushing', name: 'Wand of Hushing', art: '🤫', cost: 1, wand: true, heroWeapon: { attack: 1, durability: 3 },
    text: `Equip a 1/3 Wand: ${HUSH_TEXT}`,
    effects: [wand('wand_of_hushing', 'Wand of Hushing', 1, 3, HUSH_ON_HIT)],
  },
  {
    ...S, id: 'wand_of_binding', name: 'Wand of Binding', art: '⛓️', cost: 2, wand: true, heroWeapon: { attack: 1, durability: 3 },
    text: 'Equip a 1/3 Wand: "After your Hero attacks a minion, Freeze it."',
    effects: [wand('wand_of_binding', 'Wand of Binding', 1, 3, [{ ...AFTER_ATTACK_MINION, effects: [FREEZE('eventTarget')] }])],
  },
  {
    ...S, id: 'cinderthorn_wand', name: 'Cinderthorn Wand', art: '🔥', cost: 3, wand: true, heroWeapon: { attack: 2, durability: 3 },
    text: 'Equip a 2/3 Wand: "After your Hero attacks, deal 1 damage to all enemy minions."',
    effects: [wand('cinderthorn_wand', 'Cinderthorn Wand', 2, 3, [{ ...AFTER_ATTACK, effects: [{ op: 'damage', target: { minions: { side: 'enemy' } }, amount: 1 }] }])],
  },
  {
    ...S, id: 'wand_of_unmaking', name: 'Wand of Unmaking', art: '💀', cost: 3, wand: true, heroWeapon: { attack: 2, durability: 2 },
    text: 'Equip a 2/2 Wand: "Whenever your Hero attacks a Silenced minion, destroy it."',
    effects: [wand('wand_of_unmaking', 'Wand of Unmaking', 2, 2, [{ ...ON_ATTACK_MINION, effects: [{ op: 'destroy', target: 'eventTarget', if: { subject: 'eventTarget', keyword: 'Silenced' } }] }])],
  },

  // ---- Legendary Weapons (2) ----
  {
    ...S, id: 'vesper_the_coven_mothers_wand', name: "Vesper, the Coven Mother's Wand", art: '🌙', cost: 6, wand: true, heroWeapon: { attack: 3, durability: 3 },
    text: 'Equip a 3/3 Wand: "Whenever your Hero attacks a minion, permanently Silence it first. If it was already Silenced, destroy it. Whenever your opponent casts a spell card, this gains +1 Durability."',
    effects: [wand('vesper_the_coven_mothers_wand', "Vesper, the Coven Mother's Wand", 3, 3, [
      { ...ON_ATTACK_MINION, effects: [{ op: 'destroy', target: 'eventTarget', if: { subject: 'eventTarget', keyword: 'Silenced' }, else: [SILENCE('eventTarget')] }] },
      { on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'buffHeroWeapon', durability: 1 }] },
    ])],
  },
  {
    ...S, id: 'the_witching_hour_broom', name: 'The Witching Hour Broom', art: '🧹', cost: 8, heroWeapon: { attack: 4, durability: 4 },
    text: 'Deal 2 damage to all enemy minions. Equip a 4/4 Weapon: "Your Hero has Twin Strike." (It is no Wand: your Hero flies in close and takes damage back.)',
    effects: [{ op: 'damage', target: { minions: { side: 'enemy' } }, amount: 2 }, { op: 'equipHeroWeapon', cardId: 'the_witching_hour_broom', name: 'The Witching Hour Broom', attack: 4, durability: 4, keywords: ['Twin Strike'] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'silencing_charm', name: 'Silencing Charm', art: '🔇', cost: 1,
    text: 'Permanently Silence a minion. Draw a card.',
    target: { type: 'minion', side: 'any' },
    effects: [SILENCE('chosen'), { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'hex_of_withering', name: 'Hex of Withering', art: '🥀', cost: 2,
    text: "Deal 3 damage to a minion. If it's Silenced, deal 5 instead.",
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 5, if: { subject: 'chosen', keyword: 'Silenced' }, else: [{ op: 'damage', target: 'chosen', amount: 3 }] }],
  },
  {
    ...S, id: 'grim_toll', name: 'Grim Toll', art: '🔔', cost: 2,
    text: "Your opponent's spell cards cost (2) more on their next turn. Draw a card.",
    effects: [{ op: 'spellTax', amount: 2 }, { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'pin_the_poppet', name: 'Pin the Poppet', art: '🪡', cost: 3,
    text: 'Deal 4 damage to an enemy minion.',
    target: ENEMY_MINION,
    effects: [{ op: 'damage', target: 'chosen', amount: 4 }],
  },
  {
    ...S, id: 'forbidden_grimoire', name: 'Forbidden Grimoire', art: '📖', cost: 3,
    text: 'Draw a Wand and a Trap from your deck.',
    effects: [{ op: 'draw', count: 1, filter: { wand: true } }, { op: 'draw', count: 1, filter: { type: 'trap' } }],
  },
  {
    ...S, id: 'the_great_hush', name: 'The Great Hush', art: '🌑', cost: 5,
    text: 'Deal 2 damage to all enemy minions. Draw a card.',
    effects: [{ op: 'damage', target: { minions: { side: 'enemy' } }, amount: 2 }, { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'nullify', name: 'Nullify', art: '🚫', cost: 3,
    text: 'Quick Play: When your opponent casts a spell card that costs (4) or more. Counter it.',
    quickPlay: { windows: ['cardPlayed'], filter: { ...ENEMY_SPELL, minCost: 4, countered: false } },
    effects: [{ op: 'counterSpell' }],
  },

  // ---- Traps (6) ----
  {
    ...T, id: 'spell_snare', name: 'Spell Snare', art: '🕸️', cost: 1,
    text: 'When your opponent casts a spell card that costs (2) or less, Counter it. Draw a card.',
    trap: { on: 'cardPlayed', filter: { ...ENEMY_SPELL, maxCost: 2 }, counters: true, effects: [{ op: 'counterSpell' }, { op: 'draw', count: 1 }] },
  },
  {
    ...T, id: 'tongue_binding_curse', name: 'Tongue-Binding Curse', art: '👅', cost: 1,
    text: 'When your opponent uses their Hero Spell, Silence their Hero until the end of their next turn and draw a card.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', heroSpell: true }, effects: [{ op: 'silenceHero' }, { op: 'draw', count: 1 }] },
  },
  {
    ...T, id: 'backfire_curse', name: 'Backfire Curse', art: '💥', cost: 2,
    text: 'When your opponent casts a spell card, deal 3 damage to their Hero and draw a card.',
    trap: { on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'damage', target: 'enemyHero', amount: 3 }, { op: 'draw', count: 1 }] },
  },
  {
    ...T, id: 'curse_of_the_withered_hand', name: 'Curse of the Withered Hand', art: '🖐️', cost: 2,
    text: 'When an enemy minion attacks, give it -3 Attack.',
    trap: { on: 'attackDeclared', filter: { source: { side: 'enemy' } }, effects: [{ op: 'buff', target: 'eventSource', attack: -3 }] },
  },
  {
    ...T, id: 'counter_hex', name: 'Counter-Hex', art: '🔮', cost: 3,
    text: 'When your opponent casts a spell card, Counter it. Draw a card.',
    trap: { on: 'cardPlayed', filter: ENEMY_SPELL, counters: true, effects: [{ op: 'counterSpell' }, { op: 'draw', count: 1 }] },
  },
  {
    // The Witches' Legendary Trap (it wears their legendary trap frame).
    ...T, id: 'mirror_hex', name: 'Mirror Hex', art: '🪞', cost: 5,
    text: 'When your opponent casts a spell card, Counter it and add a copy of it to your hand. It costs (0).',
    trap: { on: 'cardPlayed', filter: ENEMY_SPELL, counters: true, effects: [{ op: 'counterSpell', copy: true, copyCostMod: -99 }] },
  },

  // ---- Spellbound expansion (unlockable): the Spellbook, Scribes, Wandweaving and Inscribe ----
  // Scribes write a page of the Spellbook at the end of each of your turns while they live (and aren't
  // Silenced). At 10 pages Wandcraft becomes Wandweaving and you choose a Mastery (effects.js writeSpellbook).
  {
    ...FAMILIAR, tribes: ['Familiar', 'Scribe'], id: 'quill_familiar', name: 'Quill Familiar', art: '🪶', extra: true, set: SB, cost: 1, attack: 1, health: 1, keywords: ['Stealth'],
    text: 'Stealth. Scribe: at the end of your turn, write 1 page in your Spellbook.',
    triggers: [{ ...MY_TURN_END, effects: [SCRIBE()] }],
  },
  {
    ...WITCH, tribes: ['Witch', 'Scribe'], id: 'ink_stained_scribe', name: 'Ink-Stained Scribe', art: '🖋️', extra: true, set: SB, cost: 2, attack: 1, health: 4,
    text: 'Scribe: at the end of your turn, write 1 page in your Spellbook.',
    triggers: [{ ...MY_TURN_END, effects: [SCRIBE()] }],
  },
  {
    ...FAMILIAR, tribes: ['Familiar', 'Scribe'], id: 'library_owl', name: 'Library Owl', art: '🦉', extra: true, set: SB, cost: 2, attack: 2, health: 2,
    text: 'Scribe: at the end of your turn, write 1 page. Whenever you Inscribe a spell, draw a spell.',
    triggers: [{ ...MY_TURN_END, effects: [SCRIBE()] }, { on: 'spellInscribed', filter: { player: 'friendly' }, effects: [{ op: 'draw', count: 1, filter: { type: 'spell' } }] }],
  },
  {
    ...WITCH, tribes: ['Witch', 'Scribe'], id: 'chronicler_of_the_coven', name: 'Chronicler of the Coven', art: '📜', extra: true, set: SB, cost: 3, attack: 2, health: 5,
    text: 'Scribe: at the end of your turn, write 1 page, or 2 if your Hero holds a Wand.',
    triggers: [{ ...MY_TURN_END, effects: [SCRIBE({ wandAmount: 2 })] }],
  },
  {
    ...WITCH, tribes: ['Witch', 'Scribe'], id: 'keeper_of_the_archive', name: 'Keeper of the Archive', art: '🗝️', extra: true, set: SB, cost: 5, attack: 3, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Scribe: at the end of your turn, write 1 page. Your other Scribes have Elusive.',
    triggers: [{ ...MY_TURN_END, effects: [SCRIBE()] }],
    aura: { target: { minions: { side: 'friendly', tribe: 'Scribe', excludeSelf: true } }, keywords: ['Elusive'] },
  },
  {
    ...S, id: 'wandweavers_primer', name: "Wandweaver's Primer", art: '📘', extra: true, set: SB, cost: 1,
    text: 'Write 2 pages in your Spellbook. Draw a card.',
    effects: [{ op: 'writePages', amount: 2 }, { op: 'draw', count: 1 }],
  },
  {
    ...WITCH, id: 'spellwright_apprentice', name: 'Spellwright Apprentice', art: '✨', extra: true, set: SB, cost: 1, attack: 1, health: 2,
    text: 'Arrival: Wandweave.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'wandweave' }] }],
  },
  {
    ...S, id: 'inscribing_quill', name: 'Inscribing Quill', art: '🖊️', extra: true, set: SB, cost: 1,
    text: 'Inscribe a spell from your hand onto your Wand. Draw a card.',
    effects: [{ op: 'inscribe' }, { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'rabbit_hex', name: 'Rabbit Hex', art: '🐇', extra: true, set: SB, cost: 2,
    text: 'Transform an enemy minion into a 1/1 Rabbit.',
    target: ENEMY_MINION,
    effects: [{ op: 'transform', target: 'chosen', into: 'witch_rabbit' }],
  },
  {
    ...WITCH, id: 'rune_carver', name: 'Rune Carver', art: '🪓', extra: true, set: SB, cost: 2, attack: 2, health: 3,
    text: 'Arrival: Your Wand gains +1 Rune Slot.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'addRuneSlot' }] }],
  },
  {
    ...T, id: 'ward_of_binding', name: 'Ward of Binding', art: '⛓️', extra: true, set: SB, cost: 2,
    text: 'When your Wand would break, it keeps 1 Durability and everything on it.',
    // The save itself happens in effects.js wearHeroWeapon (the Wand's last Durability is kept).
    trap: { on: 'wandWouldBreak', effects: [{ op: 'writePages', amount: 0 }] },
  },
  {
    ...S, id: 'wand_of_echoes', name: 'Wand of Echoes', art: '🔔', extra: true, set: SB, cost: 3, wand: true, heroWeapon: { attack: 2, durability: 2 }, runeSlots: 2, enchant: 'arcaneEcho',
    text: 'Equip a 2/2 Wand with 2 Rune Slots, already enchanted with Arcane Echo: "After you attack, deal 2 damage to a random enemy."',
    effects: [wand('wand_of_echoes', 'Wand of Echoes', 2, 2)],
  },
  {
    ...WITCH, tribes: ['Construct'], id: 'spellbook_sentinel', name: 'Spellbook Sentinel', art: '📚', extra: true, set: SB, cost: 4, attack: 3, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Has +1 Attack for every 2 pages in your Spellbook.',
    aura: { target: 'self', attackPerPages: { per: 2, max: 5 } },
  },
  {
    ...S, id: 'the_thousand_spell_wand', name: 'The Thousand-Spell Wand', art: '🪄', extra: true, set: SB, cost: 7, wand: true, heroWeapon: { attack: 3, durability: 4 }, runeSlots: 3, freeInscribe: true, doubleInscribed: true,
    text: 'Equip a 3/4 Wand with 3 Rune Slots: "Inscribing is free. Whenever your Hero attacks, each inscribed spell is cast twice."',
    effects: [wand('the_thousand_spell_wand', 'The Thousand-Spell Wand', 3, 4)],
  },
  {
    ...S, id: 'the_headmistresss_grimoire', name: "The Headmistress's Grimoire", art: '📕', extra: true, set: SB, cost: 6,
    text: 'Write 4 pages in your Spellbook, then Wandweave twice.',
    effects: [{ op: 'writePages', amount: 4 }, { op: 'wandweave' }, { op: 'wandweave' }],
  },

  // ---- Spellbound: the new Hero Spell, the Masteries and the Beast-Tamer companions ----
  {
    ...S, id: 'wandweaving', name: 'Wandweaving', art: '🪄', heroSpell: true, altHeroSpell: true, cost: 2,
    text: 'Wandweave: choose 1 of 3 enchantments for your Wand. (Replaces Wandcraft once your Spellbook is complete.)',
    effects: [{ op: 'wandweave' }],
  },
  { ...S, id: 'mastery_dark_arts', name: 'Dark Arts', art: '🩸', token: true, cost: 0, text: 'Mastery: your Wands deal +2 damage and have Lifesteal.', effects: [{ op: 'setMastery', kind: 'darkArts' }] },
  { ...S, id: 'mastery_living_grimoire', name: 'Living Grimoire', art: '📖', token: true, cost: 0, text: 'Mastery: Inscribing is free, and inscribed spells survive when your Wand breaks.', effects: [{ op: 'setMastery', kind: 'livingGrimoire' }] },
  { ...S, id: 'mastery_beast_tamer', name: 'Beast-Tamer', art: '🐾', token: true, cost: 0, text: 'Mastery: summon a companion of your choice: Frisk, Spindex or Toby.', effects: [{ op: 'setMastery', kind: 'beastTamer' }] },
  {
    faction: 'Witches', type: 'minion', tribes: ['Dragon', 'Familiar'], id: 'frisk_baby', name: 'Frisk, the Baby Snow Dragon', art: '🐉', token: true, cost: 3, attack: 3, health: 3,
    text: 'Grows at the start of your turn (3/3, 6/6, 9/9, then a 12/12 adult). Freezes any enemy he attacks.',
    triggers: [{ ...MY_TURN_START, effects: [{ op: 'growInto', into: 'frisk_juvenile' }] }, FRISK_FREEZE],
  },
  {
    faction: 'Witches', type: 'minion', tribes: ['Dragon', 'Familiar'], id: 'frisk_juvenile', name: 'Frisk, the Juvenile Snow Dragon', art: '🐉', token: true, cost: 6, attack: 6, health: 6, formLabel: 'Juvenile',
    text: 'Grows at the start of your turn (next: 9/9 Young). Freezes any enemy he attacks.',
    triggers: [{ ...MY_TURN_START, effects: [{ op: 'growInto', into: 'frisk_young' }] }, FRISK_FREEZE],
  },
  {
    faction: 'Witches', type: 'minion', tribes: ['Dragon', 'Familiar'], id: 'frisk_young', name: 'Frisk, the Young Snow Dragon', art: '🐉', token: true, cost: 9, attack: 9, health: 9, formLabel: 'Young',
    text: 'Grows at the start of your turn (next: a 12/12 Adult). Freezes any enemy he attacks.',
    triggers: [{ ...MY_TURN_START, effects: [{ op: 'growInto', into: 'frisk_adult' }] }, FRISK_FREEZE],
  },
  {
    faction: 'Witches', type: 'minion', tribes: ['Dragon', 'Familiar'], id: 'frisk_adult', name: 'Frisk, the Snow Dragon', art: '🐉', token: true, cost: 10, attack: 12, health: 12, formLabel: 'Adult',
    text: 'Freezes any enemy he attacks.',
    triggers: [FRISK_FREEZE],
  },
  {
    faction: 'Witches', type: 'minion', tribes: ['Beast', 'Familiar'], id: 'spindex_the_giant_spider', name: 'Spindex, the Giant Spider', art: '🕷️', token: true, cost: 6, attack: 2, health: 8, keywords: ['Venomous'],
    text: 'Venomous. Whenever Spindex kills an enemy minion, restore a third of its Health to Spindex (rounded up) and summon a 1/1 Baby Spider.',
    triggers: [
      { on: 'attackDeclared', filter: { source: 'self' }, effects: [{ op: 'spindexMark' }] },
      { on: 'afterAttack', filter: { source: 'self' }, effects: [{ op: 'spindexFeast' }] },
    ],
  },
  {
    faction: 'Witches', type: 'minion', tribes: ['Beast', 'Familiar'], id: 'toby_the_black_panther', name: 'Toby, the Black Panther', art: '🐆', token: true, cost: 6, attack: 6, health: 5, keywords: ['Stealth', 'Rush'],
    text: 'Stealth. Rush. Whenever Toby attacks a minion, permanently Silence it first. If it was already Silenced, destroy it and Toby takes no damage.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: { side: 'enemy' } }, effects: [{ op: 'tobyPounce' }] }],
  },
  { faction: 'Witches', type: 'minion', tribes: ['Beast'], id: 'witch_rabbit', name: 'Rabbit', art: '🐇', token: true, cost: 1, attack: 1, health: 1, text: 'It used to be something much scarier.' },
  { faction: 'Witches', type: 'minion', tribes: ['Beast'], id: 'baby_spider', name: 'Baby Spider', art: '🕷️', token: true, cost: 1, attack: 1, health: 1, text: 'Hatched by Spindex.' },

  // ---- Tokens ----
  { ...S, id: 'apprentice_wand', name: 'Apprentice Wand', art: '🪄', token: true, cost: 2, wand: true, runeSlots: 1, heroWeapon: { attack: 1, durability: 2 }, text: 'A 1/2 Wand from Wandcraft.', effects: [wand('apprentice_wand', 'Apprentice Wand', 1, 2)] },
  { ...S, id: 'willow_wand', name: 'Willow Wand', art: '🌿', token: true, cost: 2, wand: true, heroWeapon: { attack: 2, durability: 2 }, text: 'A 2/2 Wand from Wandwright.', effects: [wand('willow_wand', 'Willow Wand', 2, 2)] },
];
