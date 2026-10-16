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
    cost: 3, attack: 2, health: 2,
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
    text: 'Give a Vampire +2/+2. Or turn any other minion into a Vampire with Lifesteal.',
    target: { type: 'minion', side: 'any' },
    effects: [
      { op: 'buff', target: 'chosen', attack: 2, health: 2, if: { subject: 'chosen', tribe: 'Vampire' }, else: [
        { op: 'addTribe', target: 'chosen', tribe: 'Vampire' },
        { op: 'buff', target: 'chosen', keywords: ['Lifesteal'] },
      ] },
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
    text: 'When an enemy minion with 2 or less Health damages your Hero, destroy it and restore 2 Health to your Hero.',
    // Only a minion it can destroy sets it off (a bigger attacker no longer wastes it).
    trap: { on: 'damageDealt', filter: { source: { side: 'enemy', maxHealth: 2 }, target: 'friendlyHero' }, effects: [
      { op: 'destroy', target: 'eventSource' },
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

  // ---- Expansion: 15 extra cards (designer's second set) ----
  // `extra`: not in the standard 30; players can swap them in (deck builder, "Swap cards").
  {
    ...V, id: 'crimson_duelist', name: 'Crimson Duelist', art: '🤺', extra: true, cost: 2, attack: 3, health: 2,
    text: 'Whenever this attacks a minion, it has +2 Attack for that attack.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [{ op: 'buff', target: 'self', attack: 2, temporary: true }] }],
  },
  {
    ...V, id: 'blood_alchemist', name: 'Blood Alchemist', art: '⚗️', extra: true, cost: 2, attack: 2, health: 3,
    text: 'Whenever your Hero loses Health on your turn, give a random friendly Vampire +1 Attack.',
    triggers: [{ on: 'heroLostHealth', filter: { player: 'friendly' }, effects: [
      { op: 'buff', target: { randomOf: FRIENDLY_VAMPIRES }, attack: 1, if: { myTurn: true } },
    ] }],
  },
  {
    ...V, id: 'crypt_executioner', name: 'Crypt Executioner', art: '🪓', extra: true, cost: 3, attack: 3, health: 3,
    text: 'Arrival: Destroy a damaged enemy minion with 2 or less Attack.',
    target: { ...ENEMY_MINION, damaged: true, maxAttack: 2 },
    triggers: [{ on: 'battlecry', effects: [{ op: 'destroy', target: 'chosen' }] }],
  },
  {
    ...V, id: 'crimson_oracle', name: 'Crimson Oracle', art: '🔮', extra: true, cost: 3, attack: 2, health: 4,
    text: 'At the end of your turn, if your Hero lost Health this turn, draw a card.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'draw', if: { heroLostHealthThisTurn: true } }] }],
  },
  {
    ...V, id: 'bloodmoon_gargant', name: 'Bloodmoon Gargant', art: '🦍', extra: true, tribes: ['Vampire', 'Beast'], cost: 5, attack: 5, health: 5,
    text: 'Whenever another friendly Vampire dies, gain +1 Health.',
    triggers: [{ on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Vampire', notSelf: true } }, effects: [{ op: 'buff', target: 'self', health: 1 }] }],
  },
  {
    ...V, id: 'lord_of_the_unburied', name: 'Lord of the Unburied', art: '⚰️', extra: true, cost: 6, attack: 4, health: 7,
    text: 'The first time another friendly Vampire dies each turn, summon a 1/1 Vampire Thrall.',
    triggers: [{ on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Vampire', notSelf: true } }, effects: [
      { op: 'oncePerTurn', key: 'lord', effects: [{ op: 'summon', cardId: 'vampire_thrall', health: 1 }] },
    ] }],
  },
  {
    ...V, id: 'queen_of_the_red_veil', name: 'Queen of the Red Veil', art: '👑', extra: true, cost: 8, attack: 6, health: 7,
    text: 'Arrival: Your other Vampires with 2 or less Attack become 3/3 Blood Shades. They keep their other abilities.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'setStats', target: { minions: { side: 'friendly', tribe: 'Vampire', maxAttack: 2, excludeSelf: true } }, attack: 3, health: 3, name: 'Blood Shade', look: 'blood_shade' },
    ] }],
  },
  // The form the Queen of the Red Veil gives your small Vampires (shown on the board; they keep their abilities).
  {
    ...V, id: 'blood_shade', name: 'Blood Shade', art: '🩸', token: true, cost: 3, attack: 3, health: 3,
    text: 'A Vampire remade by the Queen of the Red Veil. It keeps its other abilities.',
  },
  {
    ...S, id: 'blood_tithe', name: 'Blood Tithe', art: '🩸', extra: true, cost: 1,
    text: 'Lose 2 Health. Draw a card.',
    effects: [{ op: 'loseHealth', target: 'friendlyHero', amount: 2 }, { op: 'draw' }],
  },
  {
    ...S, id: 'shadow_veil', name: 'Shadow Veil', art: '🌫️', extra: true, cost: 2,
    text: 'Give a friendly Vampire Stealth and Evade until your next turn.',
    target: FRIENDLY_VAMPIRE,
    effects: [{ op: 'buff', target: 'chosen', lingerKeywords: ['Stealth', 'Evade'], untilYourNextTurn: true }],
  },
  {
    ...S, id: 'turn_the_thirst', name: 'Turn the Thirst', art: '🍷', extra: true, cost: 3,
    text: 'Give a friendly minion +3/+2 and Lifesteal. At the end of your turn, destroy it.',
    target: { type: 'minion', side: 'friendly' },
    effects: [
      { op: 'buff', target: 'chosen', attack: 3, health: 2, keywords: ['Lifesteal'] },
      { op: 'grantTrigger', target: 'chosen', temporary: true, trigger: { on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'destroy', target: 'self' }] } },
    ],
  },
  {
    ...S, id: 'sanguine_recollection', name: 'Sanguine Recollection', art: '🕯️', extra: true, cost: 4,
    text: 'Summon copies of up to two different friendly Vampires that died this game, each with 1 Health.',
    effects: [{ op: 'summon', fromGraveyard: { tribes: ['Vampire'] }, count: 2, distinct: true, health: 1 }],
  },
  {
    ...T, id: 'crimson_snare', name: 'Crimson Snare', art: '🕸️', extra: true, cost: 2,
    text: 'When an enemy minion attacks your Hero: Give it -3 Attack this turn and -1 Attack permanently.',
    // Ruling: the permanent -1 lands right away and counts toward the -3 (so the attack is
    // -3 in total, and -1 remains afterwards; if the minion dies it no longer matters).
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [
      { op: 'buff', target: 'eventSource', attack: -2, temporary: true },
      { op: 'buff', target: 'eventSource', attack: -1 },
    ] },
  },
  {
    ...T, id: 'mirror_of_the_damned', name: 'Mirror of the Damned', art: '🪞', extra: true, cost: 3,
    text: 'When your opponent targets a friendly Vampire with a spell: Redirect it to a random other valid target.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'spell', target: { side: 'friendly', tribe: 'Vampire' } }, effects: [{ op: 'redirectTarget' }] },
  },
  {
    ...S, id: 'supernatural_reflexes', name: 'Supernatural Reflexes', art: '⚡', extra: true, cost: 1,
    text: 'When an enemy minion attacks: Give a friendly Vampire +2 Attack and Lifesteal this turn.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    target: FRIENDLY_VAMPIRE,
    effects: [{ op: 'buff', target: 'chosen', attack: 2, temporary: true, temporaryKeywords: ['Lifesteal'] }],
  },
  {
    ...S, id: 'bloodguard_intercession', name: 'Bloodguard Intercession', art: '🛡️', extra: true, cost: 2,
    text: 'When a friendly character would take damage: Prevent 3 of that damage. If it is a Vampire, give it +1 Attack this turn.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: 'friendlyCharacter' } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 3 },
      { op: 'buff', target: 'eventTarget', attack: 1, temporary: true, if: { subject: 'eventTarget', tribe: 'Vampire' } },
    ],
  },
];
