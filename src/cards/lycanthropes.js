// LYCANTHROPE FACTION — Two Forms. The designer's 30-card list, the Hero Spell Primal
// Unleashing, and the Wild Pack expansion (`extra: true`).
//
// Transform (effects.js shiftMinion): every Lycanthrope minion is two cards, its Humanoid
// Form (the one in your deck) and a hidden Beast Form twin. You can Transform each of your
// Lycanthropes once per turn for 1 Mana (engine.js transformAction); cards Transform them too.
// Damage and buffs carry over; a Transform never takes a minion below 1 Health.
// "Whenever this transforms" sits on the form it turns INTO, so it happens on arrival in that form.
// Rulings made while building are marked "Ruling:".

const K = { faction: 'Lycanthropes', type: 'minion', tribes: ['Lycan'] };
const S = { faction: 'Lycanthropes', type: 'spell' };
const T = { faction: 'Lycanthropes', type: 'trap' };

const LYC = { type: 'minion', side: 'friendly', tribe: 'Lycan' };
const LYC_HUMAN = { ...LYC, form: 'human' };
const LYC_BEAST = { ...LYC, form: 'beast' };
const FRIENDLY_LYCS = { minions: { side: 'friendly', tribe: 'Lycan' } };
const OTHER_LYCS = { minions: { side: 'friendly', tribe: 'Lycan', excludeSelf: true } };
const FRIENDLY_BEASTS = { minions: { side: 'friendly', tribe: 'Lycan', form: 'beast' } };
const OTHER_FRIENDLY = { randomOf: { minions: { side: 'friendly', excludeSelf: true } } };
const OTHER_MINIONS = { minions: { side: 'friendly', excludeSelf: true } };
const RANDOM_ENEMY = { randomOf: { minions: { side: 'enemy' } } };

const shift = (target, extra = {}) => ({ op: 'shift', target, ...extra });
const buff = (target, attack, health, extra = {}) => ({ op: 'buff', target, ...(attack ? { attack } : {}), ...(health ? { health } : {}), ...extra });
const tempAtk = (target, n) => ({ op: 'buff', target, attack: n, temporary: true });
const untilNext = (target, keyword) => ({ op: 'buff', target, lingerKeywords: [keyword], untilYourNextTurn: true });
const once = (key, effects) => ({ op: 'oncePerTurn', key, effects });
// "Whenever this transforms" (into the form that carries it).
const onShift = (effects) => ({ on: 'minionTransformed', filter: { source: 'self' }, effects });
// "Whenever another friendly Lycanthrope transforms".
const onOtherShift = (effects) => ({ on: 'minionTransformed', filter: { source: { side: 'friendly', tribe: 'Lycan', notSelf: true } }, effects });
const onAnyShift = (effects) => ({ on: 'minionTransformed', filter: { source: { side: 'friendly', tribe: 'Lycan' } }, effects });
const arrival = (effects) => ({ on: 'battlecry', effects });

// One Lycanthrope = its Humanoid card + a hidden Beast twin. The Humanoid card's text also
// shows the Beast Form so players can read both sides.
function lycan(h, b) {
  const beastId = `${h.id}_beast`;
  const beastLine = `Beast ${b.attack}/${b.health}${b.text ? `: ${b.text}` : '.'}`;
  return [
    { ...K, ...h, form: 'human', beastForm: beastId, text: `${h.text ? `${h.text} ` : ''}▸ ${beastLine}` },
    { ...K, art: '🐺', ...b, id: beastId, name: h.name, cost: h.cost, extra: h.extra, form: 'beast', humanForm: h.id, token: true, text: b.text ?? '' },
  ];
}

export const LYCANTHROPE_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'primal_unleashing', name: 'Primal Unleashing', art: '🌕', heroSpell: true, cost: 2,
    text: 'Transform all friendly Lycanthropes. Draw a card for every 3 that transform.',
    effects: [shift(FRIENDLY_LYCS, { drawPer: 3 })],
  },

  // ---- Minions (16) ----
  ...lycan(
    { id: 'moonbound_initiate', name: 'Moonbound Initiate', art: '🌙', cost: 1, attack: 1, health: 3,
      text: 'Whenever this transforms, gain +1 Attack this turn.', triggers: [onShift([tempAtk('self', 1)])] },
    { attack: 2, health: 2, text: 'Whenever this transforms, gain +1 Attack this turn.', triggers: [onShift([tempAtk('self', 1)])] },
  ),
  ...lycan(
    { id: 'silverclaw_stalker', name: 'Silverclaw Stalker', art: '🗡️', cost: 2, attack: 2, health: 3,
      text: 'Whenever this transforms, gain Elusive until your next turn.', triggers: [onShift([untilNext('self', 'Elusive')])] },
    { attack: 3, health: 2, text: 'Whenever this transforms, gain Elusive until your next turn.', triggers: [onShift([untilNext('self', 'Elusive')])] },
  ),
  ...lycan(
    { id: 'mireborn_weregator', name: 'Mireborn Weregator', art: '🐊', cost: 2, attack: 2, health: 4,
      text: 'Whenever this survives damage, gain +1 Health.',
      triggers: [{ on: 'damageDealt', filter: { target: 'self', selfAlive: true }, effects: [buff('self', 0, 1)] }] },
    { attack: 3, health: 5, text: 'Whenever this survives damage, gain +1 Attack this turn.',
      triggers: [{ on: 'damageDealt', filter: { target: 'self', selfAlive: true }, effects: [tempAtk('self', 1)] }] },
  ),
  ...lycan(
    { id: 'sewerborn_wererat', name: 'Sewerborn Wererat', art: '🐀', cost: 2, attack: 2, health: 2,
      text: 'Arrival: Summon a 1/1 Rat.', triggers: [arrival([{ op: 'summon', cardId: 'pack_rat' }])] },
    { attack: 3, health: 2, text: 'Whenever another friendly Lycanthrope transforms, summon a 1/1 Rat. (Once per turn.)',
      triggers: [onOtherShift([once('rats', [{ op: 'summon', cardId: 'pack_rat' }])])] },
  ),
  ...lycan(
    { id: 'sunmane_werelion', name: 'Sunmane Werelion', art: '🦁', cost: 3, attack: 3, health: 4,
      text: 'Arrival: Give another friendly minion +1 Attack.', triggers: [arrival([buff(OTHER_FRIENDLY, 1, 0)])] },
    { attack: 4, health: 4, text: 'Whenever this transforms, give another friendly Lycanthrope +1 Attack this turn.',
      triggers: [onShift([tempAtk({ randomOf: OTHER_LYCS }, 1)])] },
  ),
  ...lycan(
    // Ruling: "Stealth until this attacks" — the Humanoid's Stealth drops when it attacks.
    { id: 'nightveil_werepanther', name: 'Nightveil Werepanther', art: '🐆', cost: 3, attack: 3, health: 3, keywords: ['Stealth'], stealthUntilAttack: true,
      text: 'Stealth until this attacks.' },
    { attack: 4, health: 3, keywords: ['Elusive'], text: 'Elusive. Whenever this transforms, gain Stealth until your next turn.',
      triggers: [onShift([untilNext('self', 'Stealth')])] },
  ),
  ...lycan(
    { id: 'ironhide_werehippo', name: 'Ironhide Werehippo', art: '🦛', cost: 3, attack: 2, health: 6, keywords: ['Taunt'], text: 'Taunt.' },
    { attack: 3, health: 7, keywords: ['Taunt'], text: 'Taunt. Whenever this transforms, restore 2 Health to another friendly minion.',
      triggers: [onShift([{ op: 'heal', target: OTHER_FRIENDLY, amount: 2 }])] },
  ),
  ...lycan(
    { id: 'bogskip_werefrog', name: 'Bogskip Werefrog', art: '🐸', cost: 3, attack: 2, health: 3,
      text: 'Arrival: Give a friendly minion +1 Health.', target: { type: 'minion', side: 'friendly' },
      triggers: [arrival([buff('chosen', 0, 1)])] },
    { attack: 3, health: 3, text: 'Whenever this transforms, give another friendly minion Evade.',
      triggers: [onShift([buff(OTHER_FRIENDLY, 0, 0, { keywords: ['Evade'] })])] },
  ),
  ...lycan(
    { id: 'scaleweaver_werelizard', name: 'Scaleweaver Werelizard', art: '🦎', cost: 4, attack: 3, health: 4,
      text: 'Arrival: Give a friendly minion +2 Health.', target: { type: 'minion', side: 'friendly' },
      triggers: [arrival([buff('chosen', 0, 2)])] },
    { attack: 4, health: 5, text: 'Whenever this transforms, gain +1 Health for each other friendly Lycanthrope (up to +3).',
      triggers: [onShift([{ op: 'gainStatsPerCount', count: OTHER_LYCS, health: 1, max: 3 }])] },
  ),
  ...lycan(
    { id: 'redmoon_veteran', name: 'Redmoon Veteran', art: '🦖', cost: 4, attack: 4, health: 4,
      text: 'Whenever another friendly Lycanthrope transforms, gain +1 Health.', triggers: [onOtherShift([buff('self', 0, 1)])] },
    { attack: 5, health: 4, text: 'Whenever another friendly Lycanthrope transforms, gain +1 Attack this turn.', triggers: [onOtherShift([tempAtk('self', 1)])] },
  ),
  ...lycan(
    { id: 'dreadjaw_alpha', name: 'Dreadjaw Alpha', art: '🐅', cost: 5, attack: 4, health: 5,
      text: 'Your other Lycanthropes have +1 Attack.', aura: { target: OTHER_LYCS, attack: 1 } },
    { attack: 5, health: 6, text: 'Your other Lycanthropes have +1 Attack. Whenever this transforms, deal 1 damage to all enemy minions.',
      aura: { target: OTHER_LYCS, attack: 1 }, triggers: [onShift([{ op: 'damage', target: { minions: { side: 'enemy' } }, amount: 1 }])] },
  ),
  ...lycan(
    { id: 'pride_matriarch', name: 'Pride Matriarch', art: '👑', cost: 5, attack: 4, health: 5,
      text: 'Arrival: Give your other minions +1 Health.', triggers: [arrival([buff(OTHER_MINIONS, 0, 1)])] },
    { attack: 5, health: 6, text: 'Whenever this transforms, give your other Lycanthropes +1 Attack this turn.',
      triggers: [onShift([tempAtk(OTHER_LYCS, 1)])] },
  ),
  ...lycan(
    { id: 'eclipse_prowler', name: 'Eclipse Prowler', art: '🐾', cost: 5, attack: 4, health: 5,
      text: 'Arrival: Give a friendly minion Stealth until your next turn.', target: { type: 'minion', side: 'friendly' },
      triggers: [arrival([untilNext('chosen', 'Stealth')])] },
    { attack: 5, health: 5, keywords: ['Elusive'], text: 'Elusive. Whenever this transforms, gain +2 Attack this turn.',
      triggers: [onShift([tempAtk('self', 2)])] },
  ),
  ...lycan(
    { id: 'worldback_werebuffalo', name: 'Worldback Werebuffalo', art: '🐃', cost: 6, attack: 4, health: 8, keywords: ['Taunt'],
      text: 'Taunt. At the end of your turn, restore 1 Health to your Hero.',
      triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 1 }] }] },
    { attack: 5, health: 9, keywords: ['Taunt'], text: 'Taunt. At the end of your turn, restore 2 Health to your Hero.',
      triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 2 }] }] },
  ),
  ...lycan(
    { id: 'elder_of_the_first_moon', name: 'Elder of the First Moon', art: '🌕', cost: 7, attack: 5, health: 7, shiftDiscount: 1,
      text: 'Your Transforms cost 1 less Mana (so they are free).' },
    { attack: 7, health: 7, text: 'Whenever a friendly Lycanthrope transforms, give it +1/+1. (Once per turn.)',
      triggers: [onAnyShift([once('elder', [buff('eventSource', 1, 1)])])] },
  ),
  ...lycan(
    { id: 'the_first_beast', name: 'The First Beast', art: '🌑', cost: 9, attack: 7, health: 8,
      text: 'Arrival: Transform all other friendly Lycanthropes. Gain +1/+1 for each that transforms.',
      triggers: [arrival([shift(OTHER_LYCS, { selfPer: 1 })])] },
    { attack: 9, health: 10, text: 'Whenever another friendly Lycanthrope transforms, gain +1/+1. (Once per turn.)',
      triggers: [onOtherShift([once('first', [buff('self', 1, 1)])])] },
  ),

  // ---- Spells (8) ----
  {
    ...S, id: 'awakening_call', name: 'Awakening Call', art: '📯', cost: 1,
    text: 'Transform a friendly Lycanthrope. Draw a card.', target: LYC,
    effects: [shift('chosen'), { op: 'draw' }],
  },
  {
    ...S, id: 'instinct_surge', name: 'Instinct Surge', art: '⚡', cost: 2,
    text: 'Give a friendly Lycanthrope +2 Attack this turn. If it is in Beast Form, also give it Evade.', target: LYC,
    effects: [tempAtk('chosen', 2), { op: 'ifTarget', target: 'chosen', filter: { form: 'beast' }, effects: [buff('chosen', 0, 0, { keywords: ['Evade'] })] }],
  },
  {
    ...S, id: 'controlled_shift', name: 'Controlled Shift', art: '🌗', cost: 2,
    text: 'Transform a friendly Lycanthrope. Restore 2 Health to it.', target: LYC,
    effects: [shift('chosen'), { op: 'heal', target: 'chosen', amount: 2 }],
  },
  {
    ...S, id: 'pack_resonance', name: 'Pack Resonance', art: '🔗', cost: 3,
    text: 'Give all friendly Lycanthropes +1/+1. Transform one of them at random.',
    effects: [buff(FRIENDLY_LYCS, 1, 1), shift({ randomOf: FRIENDLY_LYCS })],
  },
  {
    ...S, id: 'unleash_the_pack', name: 'Unleash the Pack', art: '🐺', cost: 4,
    text: 'Transform all friendly Lycanthropes. Give your Beast Forms +1 Attack this turn.',
    effects: [shift(FRIENDLY_LYCS), tempAtk(FRIENDLY_BEASTS, 1)],
  },
  {
    ...S, id: 'primal_recovery', name: 'Primal Recovery', art: '🌿', cost: 4,
    text: 'Restore 4 Health to a friendly Lycanthrope. If it is then at full Health, transform it.', target: LYC,
    effects: [{ op: 'heal', target: 'chosen', amount: 4 }, { op: 'ifTarget', target: 'chosen', filter: { full: true }, effects: [shift('chosen')] }],
  },
  {
    // Ruling: cards in hand can't carry +1/+1, so the Discover makes the card cheaper instead.
    ...S, id: 'moonblood_evolution', name: 'Moonblood Evolution', art: '🩸', cost: 2,
    text: 'Discover a Lycanthrope minion. It costs 2 less.',
    effects: [{ op: 'discoverFaction', faction: 'Lycanthropes', costMod: -2 }],
  },
  {
    ...S, id: 'apex_ascension', name: 'Apex Ascension', art: '🌋', cost: 6,
    text: 'Transform all friendly Lycanthropes. Give your Beast Forms +2/+2.',
    effects: [shift(FRIENDLY_LYCS), buff(FRIENDLY_BEASTS, 2, 2)],
  },

  // ---- Traps (3) ----
  {
    // Ruling: "if the new form has more Health, prevent 2 damage" became a flat 2-damage shield.
    ...T, id: 'false_calm', name: 'False Calm', art: '🍃', cost: 1,
    text: 'When an enemy spell targets a friendly Lycanthrope: transform it and prevent the next 2 damage to it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'spell', target: { side: 'friendly', tribe: 'Lycan' } }, effects: [
      shift('eventTarget'), { op: 'preventDamage', target: 'eventTarget', amount: 2 },
    ] },
  },
  {
    ...T, id: 'instinctive_defense', name: 'Instinctive Defense', art: '🛡️', cost: 2,
    text: 'When an enemy minion attacks your Hero: transform a random friendly Humanoid Lycanthrope into Beast Form. It gains Taunt until your next turn.',
    trap: { on: 'attackDeclared', filter: { player: 'enemy', target: 'friendlyHero' }, effects: [
      shift({ randomOf: { minions: { side: 'friendly', tribe: 'Lycan', form: 'human' } } }, { to: 'beast', then: [untilNext('chosen', 'Taunt')] }),
    ] },
  },
  {
    ...T, id: 'blood_moon_rising', name: 'Blood Moon Rising', art: '🔴', cost: 3,
    text: 'When your opponent plays a minion: transform all friendly Lycanthropes. Give them +1 Attack this turn.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [shift(FRIENDLY_LYCS), tempAtk(FRIENDLY_LYCS, 1)] },
  },

  // ---- Quick Plays (3) ----
  {
    ...S, id: 'reflexive_shift', name: 'Reflexive Shift', art: '💥', cost: 1,
    text: 'Quick Play: when a friendly Lycanthrope takes damage, transform it and give it +1 Health.',
    quickPlay: { windows: ['damageDealt'], filter: { target: { side: 'friendly', tribe: 'Lycan', alive: true } } },
    effects: [shift('eventTarget'), buff('eventTarget', 0, 1)],
  },
  {
    ...S, id: 'break_the_leash', name: 'Break the Leash', art: '⛓️', cost: 2,
    text: 'Quick Play: when an enemy minion attacks, transform a friendly Humanoid Lycanthrope into Beast Form. It gets +2 Attack this turn.',
    quickPlay: { windows: ['attackDeclared'], filter: { player: 'enemy' } }, target: LYC_HUMAN,
    effects: [shift('chosen', { to: 'beast' }), tempAtk('chosen', 2)],
  },
  {
    // Ruling: "would be destroyed" uses the would-take-damage window for damage that would kill it.
    ...S, id: 'back_to_reason', name: 'Back to Reason', art: '🕊️', cost: 2,
    text: 'Quick Play: when a friendly Beast Form would take lethal damage, prevent it and transform it into Humanoid Form.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly', tribe: 'Lycan', form: 'beast' }, lethal: true } },
    effects: [{ op: 'preventDamage', target: 'eventTarget', amount: 'all' }, shift('eventTarget', { to: 'human' })],
  },

  // ---- Wild Pack expansion (16) ----
  ...lycan(
    { id: 'hollowmoor_weredeer', name: 'Hollowmoor Weredeer', art: '🦌', extra: true, cost: 3, attack: 2, health: 3, text: '' },
    { attack: 3, health: 3, keywords: ['Stealth'], text: 'Stealth. Whenever this transforms, give a random enemy minion -2 Attack this turn.',
      triggers: [onShift([tempAtk(RANDOM_ENEMY, -2)])] },
  ),
  ...lycan(
    { id: 'burrowgrit_werebadger', name: 'Burrowgrit Werebadger', art: '🦡', extra: true, cost: 2, attack: 2, health: 2, text: '' },
    { attack: 3, health: 2, keywords: ['Rage'], text: 'Rage.' },
  ),
  ...lycan(
    { id: 'ridgeback_weregrizzly', name: 'Ridgeback Weregrizzly', art: '🐻', extra: true, cost: 5, attack: 4, health: 5, text: '' },
    { attack: 5, health: 6, keywords: ['Taunt'], text: 'Taunt. Whenever this transforms, gain 2 Armor.',
      triggers: [onShift([{ op: 'gainArmor', amount: 2 }])] },
  ),
  ...lycan(
    { id: 'frostfang_werepolar_bear', name: 'Frostfang Werepolar Bear', art: '🐻‍❄️', extra: true, cost: 6, attack: 4, health: 6, text: '' },
    { attack: 6, health: 7, text: 'Freeze any minion this damages.',
      triggers: [{ on: 'damageDealt', filter: { source: 'self', target: 'enemyMinion' }, effects: [buff('eventTarget', 0, 0, { keywords: ['Frozen'] })] }] },
  ),
  ...lycan(
    { id: 'chainbreaker_werepitbull', name: 'Chainbreaker Werepitbull', art: '🐕', extra: true, cost: 3, attack: 3, health: 2, text: '' },
    { attack: 3, health: 3, keywords: ['Rush'], text: 'Rush. After this attacks and survives, gain +1 Attack.',
      triggers: [{ on: 'afterAttack', filter: { source: 'self', selfAlive: true }, effects: [buff('self', 1, 0)] }] },
  ),
  ...lycan(
    { id: 'gatehound_weremastiff', name: 'Gatehound Weremastiff', art: '🐶', extra: true, cost: 4, attack: 2, health: 5, keywords: ['Taunt'], text: 'Taunt.' },
    { attack: 4, health: 6, keywords: ['Taunt'], text: 'Taunt. Whenever this transforms, give adjacent minions +2 Health.',
      triggers: [onShift([buff({ adjacent: 'self' }, 0, 2)])] },
  ),
  ...lycan(
    { id: 'mudgill_werecatfish', name: 'Mudgill Werecatfish', art: '🐟', extra: true, cost: 3, attack: 1, health: 4, text: '' },
    { attack: 3, health: 5, keywords: ['Poisonous', 'Elusive'], text: 'Poisonous. Elusive.' },
  ),
  ...lycan(
    { id: 'duskwing_werebat', name: 'Duskwing Werebat', art: '🦇', extra: true, cost: 2, attack: 2, health: 1, text: '' },
    { attack: 3, health: 2, keywords: ['Lifesteal'], text: 'Lifesteal. Whenever this transforms, it can attack this turn.',
      triggers: [onShift([{ op: 'buff', target: 'self', temporaryKeywords: ['Charge'] }])] },
  ),
  ...lycan(
    { id: 'carrion_werevulture', name: 'Carrion Werevulture', art: '🦅', extra: true, cost: 4, attack: 3, health: 3,
      text: 'Whenever another minion dies, gain +1 Attack.',
      triggers: [{ on: 'minionDied', effects: [buff('self', 1, 0)] }] },
    { attack: 4, health: 4, text: 'Whenever another minion dies, gain +1/+1.',
      triggers: [{ on: 'minionDied', effects: [buff('self', 1, 1)] }] },
  ),
  ...lycan(
    { id: 'sandcoil_wererattlesnake', name: 'Sandcoil Wererattlesnake', art: '🐍', extra: true, cost: 3, attack: 2, health: 3, text: '' },
    { attack: 3, health: 3, keywords: ['Poisonous'], text: 'Poisonous. Whenever this transforms, Freeze a random enemy minion.',
      triggers: [onShift([buff(RANDOM_ENEMY, 0, 0, { keywords: ['Frozen'] })])] },
  ),
  ...lycan(
    { id: 'skyreach_weregiraffe', name: 'Skyreach Weregiraffe', art: '🦒', extra: true, cost: 4, attack: 2, health: 5, text: '' },
    { attack: 3, health: 5, text: 'Whenever this transforms, deal 2 damage to a random enemy minion.',
      triggers: [onShift([{ op: 'damage', target: RANDOM_ENEMY, amount: 2 }])] },
  ),
  {
    ...S, id: 'antler_totem', name: 'Antler Totem', art: '🦌', extra: true, cost: 2,
    text: 'Give a friendly Lycanthrope +1/+2. If it is in Beast Form, it also gains Taunt.', target: LYC,
    effects: [buff('chosen', 1, 2), { op: 'ifTarget', target: 'chosen', filter: { form: 'beast' }, effects: [buff('chosen', 0, 0, { keywords: ['Taunt'] })] }],
  },
  {
    ...S, id: 'blood_scent', name: 'Blood Scent', art: '🩸', extra: true, cost: 2,
    text: 'Transform a friendly Lycanthrope and give it +1/+1.', target: LYC,
    effects: [shift('chosen'), buff('chosen', 1, 1)],
  },
  {
    ...S, id: 'pack_howl', name: 'Pack Howl', art: '🐺', extra: true, cost: 5,
    text: 'Give your Beast Forms +2 Attack and Rush this turn.',
    effects: [{ op: 'buff', target: FRIENDLY_BEASTS, attack: 2, temporary: true, temporaryKeywords: ['Rush'] }],
  },
  {
    ...T, id: 'bear_trap_snare', name: 'Bear Trap Snare', art: '🪤', extra: true, cost: 2,
    text: 'When an enemy minion attacks: deal 3 damage to it and Freeze it.',
    trap: { on: 'attackDeclared', filter: { player: 'enemy', source: 'enemyMinion' }, effects: [{ op: 'damage', target: 'eventSource', amount: 3, freeze: true }] },
  },
  {
    ...S, id: 'feral_feast', name: 'Feral Feast', art: '🍖', extra: true, cost: 4,
    text: 'Destroy an enemy minion with 3 or less Health. Give a random friendly Beast Form +2 Attack.',
    target: { type: 'minion', side: 'enemy', maxHealth: 3 },
    effects: [{ op: 'destroy', target: 'chosen' }, buff({ randomOf: FRIENDLY_BEASTS }, 2, 0)],
  },

  // ---- Token ----
  { ...K, id: 'pack_rat', name: 'Rat', art: '🐀', token: true, tribes: [], cost: 1, attack: 1, health: 1, text: '' },
];
