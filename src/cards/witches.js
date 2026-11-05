// WITCHES FACTION — The Coven. A dark academy of wand-duelling witches: the game's anti-spell
// faction. Few minions; their power is in the Wands they arm their Hero with, in Silence, and in
// Traps that Counter the enemy's spells. Their Legendaries are Weapons, not minions.
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
const HUSH_TEXT = '"Whenever your Hero attacks a minion, Silence it first."';
const MY_TURN_END = { on: 'endOfTurn', filter: { player: 'friendly' } };

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
    ...FAMILIAR, id: 'black_cat_familiar', name: 'Black Cat Familiar', art: '🐈‍⬛', cost: 1, attack: 1, health: 1, keywords: ['Stealth'],
    text: 'Stealth. Whenever your Hero attacks with a Wand, this gains +1 Attack.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'friendlyHero' }, effects: [{ op: 'buff', target: 'self', attack: 1, if: { heroHasWand: true } }] }],
  },
  {
    ...FAMILIAR, id: 'raven_familiar', name: 'Raven Familiar', art: '🐦‍⬛', cost: 2, attack: 2, health: 1,
    text: 'Arrival: Silence an enemy minion that costs (3) or less.',
    target: { ...ENEMY_MINION, maxCost: 3 },
    triggers: [{ on: 'battlecry', effects: [SILENCE('chosen')] }],
  },
  {
    ...WITCH, id: 'coven_sister', name: 'Coven Sister', art: '🕯️', cost: 2, attack: 2, health: 2, heroWeaponAura: true,
    text: "Your Hero's Weapon has +1 Attack.",
  },
  {
    ...WITCH, id: 'hexbound_prefect', name: 'Hexbound Prefect', art: '📛', cost: 3, attack: 3, health: 3,
    text: 'Whenever your opponent casts a spell card, deal 2 damage to the enemy Hero.',
    triggers: [{ on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'damage', target: 'enemyHero', amount: 2 }] }],
  },
  {
    ...WITCH, id: 'grimoire_thief', name: 'Grimoire Thief', art: '📕', cost: 3, attack: 2, health: 3,
    text: 'Once per turn, when your opponent casts a spell card, add a copy of it to your hand.',
    triggers: [{ on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'copyEventCard', perTurnLimit: 1 }] }],
  },
  {
    ...WITCH, id: 'wandwright', name: 'Wandwright', art: '🪵', cost: 3, attack: 2, health: 3,
    text: `Arrival: If your Hero has no Weapon, equip a 2/2 Willow Wand: ${HUSH_TEXT}`,
    triggers: [{ on: 'battlecry', effects: [{ ...wand('willow_wand', 'Willow Wand', 2, 2, HUSH_ON_HIT), ifNoWeapon: true }] }],
  },
  {
    ...WITCH, id: 'bayou_bone_reader', name: 'Bayou Bone-Reader', art: '🦴', cost: 4, attack: 3, health: 4,
    text: 'Arrival: Silence an enemy minion. If it was already Silenced, destroy it instead.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'destroy', target: 'chosen', if: { subject: 'chosen', keyword: 'Silenced' }, else: [SILENCE('chosen')] }] }],
  },
  {
    ...WITCH, id: 'coven_gatekeeper', name: 'Coven Gatekeeper', art: '🚪', cost: 4, attack: 3, health: 5, keywords: ['Taunt'], enemySpellTax: 1,
    text: "Taunt. Your opponent's spell cards cost (1) more.",
  },
  {
    ...WITCH, id: 'crossroads_witch', name: 'Crossroads Witch', art: '🔀', cost: 5, attack: 4, health: 5,
    text: "At the end of your turn, Silence a random enemy minion that isn't Silenced.",
    triggers: [{ ...MY_TURN_END, effects: [SILENCE({ randomOf: { minions: { side: 'enemy', notKeyword: 'Silenced', alive: true } } })] }],
  },
  {
    ...WITCH, id: 'coven_matriarch', name: 'Coven Matriarch', art: '👁️', cost: 7, attack: 5, health: 6, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Silence all enemy minions and Silence the enemy Hero.',
    triggers: [{ on: 'battlecry', effects: [SILENCE({ minions: { side: 'enemy' } }), { op: 'silenceHero' }] }],
  },

  // ---- Wands (4) ----
  {
    ...S, id: 'wand_of_hushing', name: 'Wand of Hushing', art: '🤫', cost: 1, wand: true, heroWeapon: { attack: 1, durability: 2 },
    text: `Equip a 1/2 Wand: ${HUSH_TEXT}`,
    effects: [wand('wand_of_hushing', 'Wand of Hushing', 1, 2, HUSH_ON_HIT)],
  },
  {
    ...S, id: 'wand_of_binding', name: 'Wand of Binding', art: '⛓️', cost: 2, wand: true, heroWeapon: { attack: 1, durability: 3 },
    text: 'Equip a 1/3 Wand: "After your Hero attacks a minion, Freeze it."',
    effects: [wand('wand_of_binding', 'Wand of Binding', 1, 3, [{ ...AFTER_ATTACK_MINION, effects: [FREEZE('eventTarget')] }])],
  },
  {
    ...S, id: 'cinderthorn_wand', name: 'Cinderthorn Wand', art: '🔥', cost: 3, wand: true, heroWeapon: { attack: 2, durability: 2 },
    text: 'Equip a 2/2 Wand: "After your Hero attacks, deal 2 damage to every Silenced enemy minion."',
    effects: [wand('cinderthorn_wand', 'Cinderthorn Wand', 2, 2, [{ ...AFTER_ATTACK, effects: [{ op: 'damage', target: { minions: { side: 'enemy', keyword: 'Silenced' } }, amount: 2 }] }])],
  },
  {
    ...S, id: 'wand_of_unmaking', name: 'Wand of Unmaking', art: '💀', cost: 4, wand: true, heroWeapon: { attack: 2, durability: 2 },
    text: 'Equip a 2/2 Wand: "Whenever your Hero attacks a Silenced minion, destroy it."',
    effects: [wand('wand_of_unmaking', 'Wand of Unmaking', 2, 2, [{ ...ON_ATTACK_MINION, effects: [{ op: 'destroy', target: 'eventTarget', if: { subject: 'eventTarget', keyword: 'Silenced' } }] }])],
  },

  // ---- Legendary Weapons (2) ----
  {
    ...S, id: 'vesper_the_coven_mothers_wand', name: "Vesper, the Coven Mother's Wand", art: '🌙', cost: 6, wand: true, heroWeapon: { attack: 3, durability: 3 },
    text: 'Equip a 3/3 Wand: "Whenever your Hero attacks a minion, Silence it first. If it was already Silenced, destroy it. Whenever your opponent casts a spell card, this gains +1 Durability."',
    effects: [wand('vesper_the_coven_mothers_wand', "Vesper, the Coven Mother's Wand", 3, 3, [
      { ...ON_ATTACK_MINION, effects: [{ op: 'destroy', target: 'eventTarget', if: { subject: 'eventTarget', keyword: 'Silenced' }, else: [SILENCE('eventTarget')] }] },
      { on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'buffHeroWeapon', durability: 1 }] },
    ])],
  },
  {
    ...S, id: 'the_witching_hour_broom', name: 'The Witching Hour Broom', art: '🧹', cost: 8, heroWeapon: { attack: 4, durability: 4 },
    text: 'Silence all enemy minions. Equip a 4/4 Weapon: "Your Hero has Twin Strike." (It is no Wand: your Hero flies in close and takes damage back.)',
    effects: [SILENCE({ minions: { side: 'enemy' } }), { op: 'equipHeroWeapon', cardId: 'the_witching_hour_broom', name: 'The Witching Hour Broom', attack: 4, durability: 4, keywords: ['Twin Strike'] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'silencing_charm', name: 'Silencing Charm', art: '🔇', cost: 1,
    text: 'Silence a minion. Draw a card.',
    target: { type: 'minion', side: 'any' },
    effects: [SILENCE('chosen'), { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'hex_of_withering', name: 'Hex of Withering', art: '🥀', cost: 2,
    text: "Deal 2 damage to a minion. If it's Silenced, deal 4 instead.",
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 4, if: { subject: 'chosen', keyword: 'Silenced' }, else: [{ op: 'damage', target: 'chosen', amount: 2 }] }],
  },
  {
    ...S, id: 'grim_toll', name: 'Grim Toll', art: '🔔', cost: 2,
    text: "Your opponent's spell cards cost (2) more on their next turn. Draw a card.",
    effects: [{ op: 'spellTax', amount: 2 }, { op: 'draw', count: 1 }],
  },
  {
    ...S, id: 'pin_the_poppet', name: 'Pin the Poppet', art: '🪡', cost: 3,
    text: 'Silence an enemy minion, then deal 3 damage to it.',
    target: ENEMY_MINION,
    effects: [SILENCE('chosen'), { op: 'damage', target: 'chosen', amount: 3 }],
  },
  {
    ...S, id: 'forbidden_grimoire', name: 'Forbidden Grimoire', art: '📖', cost: 3,
    text: 'Draw a Wand and a Trap from your deck.',
    effects: [{ op: 'draw', count: 1, filter: { wand: true } }, { op: 'draw', count: 1, filter: { type: 'trap' } }],
  },
  {
    ...S, id: 'the_great_hush', name: 'The Great Hush', art: '🌑', cost: 5,
    text: 'Silence all enemy minions and Silence the enemy Hero. Draw a card.',
    effects: [SILENCE({ minions: { side: 'enemy' } }), { op: 'silenceHero' }, { op: 'draw', count: 1 }],
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
    text: 'When your opponent casts a spell card that costs (2) or less, Counter it.',
    trap: { on: 'cardPlayed', filter: { ...ENEMY_SPELL, maxCost: 2 }, counters: true, effects: [{ op: 'counterSpell' }] },
  },
  {
    ...T, id: 'tongue_binding_curse', name: 'Tongue-Binding Curse', art: '👅', cost: 1,
    text: 'When your opponent uses their Hero Spell, Silence their Hero and draw a card.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', heroSpell: true }, effects: [{ op: 'silenceHero' }, { op: 'draw', count: 1 }] },
  },
  {
    ...T, id: 'backfire_curse', name: 'Backfire Curse', art: '💥', cost: 2,
    text: 'When your opponent casts a spell card, deal 3 damage to their Hero and Silence their Hero.',
    trap: { on: 'cardPlayed', filter: ENEMY_SPELL, effects: [{ op: 'damage', target: 'enemyHero', amount: 3 }, { op: 'silenceHero' }] },
  },
  {
    ...T, id: 'curse_of_the_withered_hand', name: 'Curse of the Withered Hand', art: '🖐️', cost: 2,
    text: 'When an enemy minion attacks, Silence it and give it -2 Attack.',
    trap: { on: 'attackDeclared', filter: { source: { side: 'enemy' } }, effects: [SILENCE('eventSource'), { op: 'buff', target: 'eventSource', attack: -2 }] },
  },
  {
    ...T, id: 'counter_hex', name: 'Counter-Hex', art: '🔮', cost: 3,
    text: 'When your opponent casts a spell card, Counter it.',
    trap: { on: 'cardPlayed', filter: ENEMY_SPELL, counters: true, effects: [{ op: 'counterSpell' }] },
  },
  {
    ...T, id: 'mirror_hex', name: 'Mirror Hex', art: '🪞', cost: 4,
    text: 'When your opponent casts a spell card, Counter it and add a copy of it to your hand.',
    trap: { on: 'cardPlayed', filter: ENEMY_SPELL, counters: true, effects: [{ op: 'counterSpell', copy: true }] },
  },

  // ---- Tokens ----
  { ...S, id: 'apprentice_wand', name: 'Apprentice Wand', art: '🪄', token: true, cost: 2, wand: true, heroWeapon: { attack: 1, durability: 2 }, text: 'A 1/2 Wand from Wandcraft.', effects: [wand('apprentice_wand', 'Apprentice Wand', 1, 2)] },
  { ...S, id: 'willow_wand', name: 'Willow Wand', art: '🌿', token: true, cost: 2, wand: true, heroWeapon: { attack: 2, durability: 2 }, text: `A 2/2 Wand from Wandwright: ${HUSH_TEXT}`, effects: [wand('willow_wand', 'Willow Wand', 2, 2, HUSH_ON_HIT)] },
];
