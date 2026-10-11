// VAMPIRE FACTION — the designer's complete 30-card list + Hero Spell.
// Text is the designer's wording. `pending` marks cards that need a rule the
// designer hasn't defined yet; they stay out of decks until resolved.
// Interpretation choices are listed in docs/OPEN_QUESTIONS.md (`Q:` notes).
//
// Every Vampire-faction minion carries the 'Vampire' tribe.

const V = { faction: 'Vampires', type: 'minion', tribes: ['Vampire'] };
const S = { faction: 'Vampires', type: 'spell' };
const T = { faction: 'Vampires', type: 'trap' };

const FRIENDLY_VAMPIRE = { type: 'minion', side: 'friendly', tribe: 'Vampire' };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const FRIENDLY_VAMPIRES = { minions: { side: 'friendly', tribe: 'Vampire' } };

export const VAMPIRE_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'blood_frenzy', name: 'Blood Frenzy', art: '🔥', heroSpell: true,
    cost: 1,
    text: 'Lose 1 Health to give a friendly character +2 Attack this turn.',
    target: { type: 'character', side: 'friendly' },
    effects: [
      { op: 'loseHealth', target: 'friendlyHero', amount: 1 },
      { op: 'buff', target: 'chosen', attack: 2, temporary: true },
    ],
  },

  // ---- Minions (16) ----
  {
    ...V, id: 'vampire_bat', name: 'Vampire Bat', art: '🦇',
    cost: 1, attack: 1, health: 1,
    text: 'Whenever this attacks the enemy Hero, gain +1 Attack.',
    // Ruling: the +1 is gained after the attack, so it counts from the next hit.
    triggers: [{ on: 'afterAttack', filter: { source: 'self', target: 'enemyHero' }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },

  {
    ...V, id: 'vampire_thrall', name: 'Vampire Thrall', art: '🩸',
    cost: 1, attack: 1, health: 2, keywords: ['Lifesteal'],
    text: 'Lifesteal.',
  },
  {
    ...V, id: 'blood_mite', name: 'Blood Mite', art: '🪲',
    cost: 1, attack: 1, health: 1,
    text: 'Arrival: Lose 1 Health. Gain +1/+1.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'loseHealth', target: 'friendlyHero', amount: 1 },
      { op: 'buff', target: 'self', attack: 1, health: 1 },
    ] }],
  },
  {
    ...V, id: 'nightstalker', name: 'Nightstalker', art: '🌑',
    cost: 1, attack: 1, health: 1, keywords: ['Stealth'],
    text: 'Stealth. Whenever this attacks, gain +1 Health.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self' }, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...V, id: 'blood_servant', name: 'Blood Servant', art: '🍷',
    cost: 2, attack: 2, health: 2,
    text: 'Whenever your Hero loses Health, gain +1 Attack this turn.',
    triggers: [{ on: 'heroLostHealth', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true }] }],
  },
  {
    ...V, id: 'bloodhound', name: 'Bloodhound', art: '🐺',
    cost: 2, attack: 2, health: 3,
    text: 'Whenever your Hero loses Health, gain +1 Attack.',
    triggers: [{ on: 'heroLostHealth', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1 }] }],
  },
  {
    ...V, id: 'vampire_mesmerist', name: 'Vampire Mesmerist', art: '🌀',
    cost: 2, attack: 2, health: 2,
    text: 'Arrival: Give an enemy minion -2 Attack this turn.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', attack: -2, temporary: true }] }],
  },
  {
    ...V, id: 'blood_drinker', name: 'Blood Drinker', art: '🥀',
    cost: 2, attack: 2, health: 2,
    text: 'Whenever this deals damage to a minion, restore 1 Health to your Hero.',
    triggers: [{ on: 'damageDealt', filter: { source: 'self', target: 'anyMinion' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 1 }] }],
  },
  {
    ...V, id: 'blood_pool', name: 'Blood Pool', art: '🫧',
    cost: 3, attack: 0, health: 3,
    text: 'At the end of each turn, grant your Vampire minions +1/+1.',
    // Ruling: only at the end of your own turn. Includes Blood Pool itself.
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: FRIENDLY_VAMPIRES, attack: 1, health: 1 }] }],
  },
  {
    ...V, id: 'vampire_gargoyle', name: 'Vampire Gargoyle', art: '🗿',
    cost: 3, attack: 2, health: 4, keywords: ['Taunt'],
    text: 'Taunt.',
  },
  {
    ...V, id: 'vampire_doom_hound', name: 'Vampire Doom Hound', art: '🐕',
    cost: 3, attack: 3, health: 1, keywords: ['Stealth', 'Lifesteal'],
    text: 'Stealth, Lifesteal.',
  },
  {
    ...V, id: 'crimson_batmaster', name: 'Crimson Batmaster', art: '🦇',
    cost: 3, attack: 3, health: 3,
    text: 'Arrival: Summon two 1/1 Vampire Bats.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'vampire_bat', count: 2 }] }],
  },
  {
    ...V, id: 'vampire_bloodlord', name: 'Vampire Bloodlord', art: '👑',
    cost: 4, attack: 4, health: 4, keywords: ['Lifesteal'],
    text: 'Lifesteal. Whenever this deals damage to the enemy Hero, gain 1 temporary Mana Crystal next turn.',
    triggers: [{ on: 'damageDealt', filter: { source: 'self', target: 'enemyHero' }, effects: [{ op: 'gainManaNextTurn', amount: 1 }] }],
  },
  {
    ...V, id: 'vampire_matriarch', name: 'Vampire Matriarch', art: '👸',
    cost: 5, attack: 4, health: 6,
    text: 'Your other Vampire minions have +1 Health.',
    aura: { target: { minions: { side: 'friendly', tribe: 'Vampire', excludeSelf: true } }, health: 1 },
  },
  {
    ...V, id: 'the_crimson_king', name: 'The Crimson King', art: '🤴',
    cost: 7, attack: 7, health: 7, keywords: ['Lifesteal'],
    text: 'Lifesteal. Arrival: For every 5 Health your Hero is missing, gain +1/+1.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buffPerHealthLost', per: 5, attack: 1, health: 1 }] }],
  },
  {
    // Replaces Vampire Neophyte (designer, 2026-10-08).
    ...V, id: 'werepyre_abomination', name: 'Werepyre Abomination', art: '🐺',
    cost: 8, attack: 8, health: 6, keywords: ['Lifesteal', 'Charge'],
    text: 'Lifesteal, Charge.',
  },

  // ---- Spells (4) ----
  {
    ...S, id: 'mist_transformation', name: 'Mist Transformation', art: '🌫️',
    cost: 2,
    text: 'Give a minion Stealth and Evade.',
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'buff', target: 'chosen', keywords: ['Stealth', 'Evade'] }],
  },
  {
    ...S, id: 'vampirism', name: 'Vampirism', art: '🧛',
    cost: 3,
    text: 'One non-Vampire minion becomes a Vampire and gains Lifesteal.',
    target: { type: 'minion', side: 'any', notTribe: 'Vampire' },
    effects: [
      { op: 'addTribe', target: 'chosen', tribe: 'Vampire' },
      { op: 'buff', target: 'chosen', keywords: ['Lifesteal'] },
    ],
  },
  {
    ...S, id: 'daywalker', name: 'Daywalker', art: '☀️',
    cost: 3,
    text: 'Give a friendly Vampire Elusive and Evade.',
    target: FRIENDLY_VAMPIRE,
    effects: [{ op: 'buff', target: 'chosen', keywords: ['Elusive', 'Evade'] }],
  },
  {
    ...S, id: 'vampire_bite', name: 'Vampire Bite', art: '🦷',
    cost: 3,
    text: 'Deal 3 damage to an enemy minion. Lifesteal. If it dies, summon a Vampire Thrall on your side of the battlefield.',
    target: ENEMY_MINION,
    effects: [
      { op: 'damage', target: 'chosen', amount: 3, lifesteal: true },
      { op: 'summon', cardId: 'vampire_thrall', if: { subject: 'chosen', dead: true } },
    ],
  },

  // ---- Quick Plays (6) ----
  {
    ...S, id: 'blood_shield', name: 'Blood Shield', art: '🛡️',
    cost: 1,
    text: 'When a friendly Vampire would take damage, prevent 2 of that damage and lose 2 Health.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly', tribe: 'Vampire' } } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 2 },
      { op: 'loseHealth', target: 'friendlyHero', amount: 2 },
    ],
  },
  {
    ...S, id: 'crimson_escape', name: 'Crimson Escape', art: '🦇',
    cost: 2,
    text: 'Give a friendly Vampire Stealth and return it to your hand at the end of the turn.',
    quickPlay: {},
    target: FRIENDLY_VAMPIRE,
    effects: [
      { op: 'buff', target: 'chosen', keywords: ['Stealth'] },
      { op: 'returnAtEndOfTurn', target: 'chosen' },
    ],
  },
  {
    ...S, id: 'blood_drain', name: 'Blood Drain', art: '💉',
    cost: 2,
    text: 'Deal 2 damage to an enemy minion. Restore 2 Health to your Hero.',
    quickPlay: {},
    target: ENEMY_MINION,
    effects: [
      { op: 'damage', target: 'chosen', amount: 2 },
      { op: 'heal', target: 'friendlyHero', amount: 2 },
    ],
  },
  {
    ...S, id: 'predatory_reflexes', name: 'Predatory Reflexes', art: '🐾',
    cost: 2,
    text: 'Give a friendly Vampire +2 Attack and Lifesteal this turn. It can attack an enemy minion immediately.',
    // Ruling: "attack immediately" = ignores summoning sickness (Rush this turn).
    // Minions never attack on the opponent's turn.
    quickPlay: {},
    target: FRIENDLY_VAMPIRE,
    effects: [{ op: 'buff', target: 'chosen', attack: 2, temporary: true, temporaryKeywords: ['Lifesteal', 'Rush'] }],
  },
  {
    ...S, id: 'blood_exchange', name: 'Blood Exchange', art: '⚖️',
    cost: 3,
    text: 'Deal 3 damage to a friendly minion. Deal 5 damage to an enemy minion.',
    quickPlay: {},
    target: { type: 'minion', side: 'friendly' },
    target2: ENEMY_MINION,
    effects: [
      { op: 'damage', target: 'chosen', amount: 3 },
      { op: 'damage', target: 'chosen2', amount: 5 },
    ],
  },
  {
    ...S, id: 'vampires_curse', name: 'Vampire’s Curse', art: '🕯️',
    cost: 3,
    text: 'When an enemy minion attacks, give it -3 Attack this turn. If it has 0 Attack afterward, gain control of it until the end of the turn.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [
      { op: 'buff', target: 'eventSource', attack: -3, temporary: true },
      { op: 'takeControlTemporarily', target: 'eventSource', until: 'endOfTurn', if: { subject: 'eventSource', attackAtMost: 0 } },
    ],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'blood_ambush', name: 'Blood Ambush', art: '🩸',
    cost: 2,
    text: 'When an enemy minion attacks your Hero, summon a 2/2 Vampire Thrall and give it Taunt.',
    // Ruling: this Thrall is 2/2 (the card's base Thrall stays 1/2).
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' },
      effects: [{ op: 'summon', cardId: 'vampire_thrall', attack: 2, health: 2, keywords: ['Taunt'] }] },
  },
  {
    ...T, id: 'crimson_feast', name: 'Crimson Feast', art: '🍖',
    cost: 2,
    text: 'When an enemy minion damages your Hero, destroy that minion if it has 2 or less Health and restore 2 Health to your Hero.',
    // Q: the heal happens even if the minion has more than 2 Health.
    trap: { on: 'damageDealt', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [
      { op: 'destroy', target: 'eventSource', if: { subject: 'eventSource', healthAtMost: 2 } },
      { op: 'heal', target: 'friendlyHero', amount: 2 },
    ] },
  },
  {
    ...T, id: 'vampires_seduction', name: 'Vampire’s Seduction', art: '💋',
    cost: 3,
    text: 'When your opponent plays a minion, reduce its Attack by 3. If its Attack becomes 0, take control of it until the end of your next turn.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      { op: 'buff', target: 'eventSource', attack: -3 },
      { op: 'takeControlTemporarily', target: 'eventSource', until: 'controllersNextTurnEnd', if: { subject: 'eventSource', attackAtMost: 0 } },
    ] },
  },
  {
    ...T, id: 'blood_moon', name: 'Blood Moon', art: '🌕',
    cost: 4,
    text: 'When your opponent summons a minion, give all friendly Vampires +1/+1 and Lifesteal this turn.',
    // Q: +1/+1 is permanent; Lifesteal lasts this turn.
    trap: { on: 'minionSummoned', filter: { player: 'enemy' }, effects: [
      { op: 'buff', target: FRIENDLY_VAMPIRES, attack: 1, health: 1, temporaryKeywords: ['Lifesteal'] },
    ] },
  },
];
