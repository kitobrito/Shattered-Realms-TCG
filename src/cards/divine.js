// DIVINE FACTION — protectors, healers and the bane of darkness. The designer's
// complete 30-card list + Hero Spell. Text is the designer's wording ("Battlecry"
// shown as Arrival, "Divine Shield" as Evade). Interpretation choices are marked
// "Ruling:" and listed in docs/OPEN_QUESTIONS.md (Q16).
//
// Overheal: Divine healing at full Health raises maximum Health instead
// (core heal, overheal: true). Bonus Health: permanent maximum-Health raises.
// Temporary Health: absorbs damage first, gone when its time is up.
// Dark / Undead: shared tags (rules FACTION_TAGS) — Vampires, Zombies, Demons, …
//
// Every Divine-faction minion carries the 'Divine' tribe.

const DV = { faction: 'Divine', type: 'minion', tribes: ['Divine'] };
const S = { faction: 'Divine', type: 'spell' };
const T = { faction: 'Divine', type: 'trap' };

const heal = (target, amount) => ({ op: 'heal', target, amount, overheal: true });
const FRIENDLY_CHARACTER = { type: 'character', side: 'friendly' };
const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const FRIENDLY_CHARACTERS = { characters: { side: 'friendly' } };
const FRIENDLY_MINIONS = { minions: { side: 'friendly' } };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const ENEMY_DARK = { side: 'enemy', darkOrUndead: true };

export const DIVINE_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'summoners_grace', name: "Summoner's Grace", art: '✨', heroSpell: true, cost: 2,
    text: 'Restore 1 Health to a friendly character and Cleanse it (remove Burn, Radiation, Frozen and other harmful effects). Overheal: if it is at full Health, its maximum Health increases by 1 instead.',
    target: FRIENDLY_CHARACTER,
    effects: [{ op: 'cleanse', target: 'chosen' }, heal('chosen', 1)],
  },

  // ---- Minions (16) ----
  {
    ...DV, id: 'lightbound_acolyte', name: 'Lightbound Acolyte', art: '🕯️', cost: 1, attack: 1, health: 2,
    text: 'Arrival: Restore 2 Health to a friendly character.',
    target: FRIENDLY_CHARACTER,
    triggers: [{ on: 'battlecry', effects: [heal('chosen', 2)] }],
  },
  {
    ...DV, id: 'cherub_guardian', name: 'Cherub Guardian', art: '👼', cost: 1, attack: 1, health: 3, keywords: ['Taunt'],
    text: 'Taunt. Whenever this minion is healed, gain +1 Attack this turn.',
    triggers: [{ on: 'characterHealed', filter: { target: 'self' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true }] }],
  },
  {
    ...DV, id: 'dawnwing_medic', name: 'Dawnwing Medic', art: '🕊️', cost: 2, attack: 2, health: 3,
    text: 'Whenever you Overheal a character, gain +1 Attack this turn. Triggers at most once per turn.',
    triggers: [{ on: 'overhealed', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true, perTurnLimit: 1 }] }],
  },
  {
    ...DV, id: 'sanctified_squire', name: 'Sanctified Squire', art: '🛡️', cost: 2, attack: 2, health: 2,
    text: 'Arrival: Give a friendly minion +1/+2.',
    target: { ...FRIENDLY_MINION },
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', attack: 1, health: 2 }] }],
  },
  {
    ...DV, id: 'gravebane_initiate', name: 'Gravebane Initiate', art: '⚔️', cost: 2, attack: 2, health: 3,
    text: 'Arrival: Deal 2 damage to an enemy Dark or Undead minion.',
    target: { type: 'minion', ...ENEMY_DARK },
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: 'chosen', amount: 2 }] }],
  },
  {
    ...DV, id: 'halo_sentinel', name: 'Halo Sentinel', art: '😇', cost: 3, attack: 2, health: 5, keywords: ['Taunt'],
    text: 'Taunt. Other friendly minions have +1 Health.',
    aura: { target: { minions: { side: 'friendly', excludeSelf: true } }, health: 1 },
  },
  {
    ...DV, id: 'seraphic_mender', name: 'Seraphic Mender', art: '💫', cost: 3, attack: 3, health: 3,
    text: 'Arrival: Restore 1 Health to all friendly characters.',
    triggers: [{ on: 'battlecry', effects: [heal(FRIENDLY_CHARACTERS, 1)] }],
  },
  {
    ...DV, id: 'reliquary_keeper', name: 'Reliquary Keeper', art: '⚱️', cost: 3, attack: 2, health: 4,
    text: 'Whenever a friendly character gains Bonus Health, gain +1/+1.',
    // Ruling (Q16): its own +1/+1 doesn't count (no loop with a second Keeper).
    triggers: [{ on: 'bonusHealth', filter: { player: 'friendly', target: 'notSelf' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1, silentBonus: true }] }],
  },
  {
    ...DV, id: 'consecrated_knight', name: 'Consecrated Knight', art: '🗡️', cost: 4, attack: 4, health: 4,
    text: 'Whenever this attacks a Dark or Undead minion, gain +2 Attack for that attack.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: { side: 'enemy', darkOrUndead: true } }, effects: [{ op: 'buff', target: 'self', attack: 2, temporary: true }] }],
  },
  {
    ...DV, id: 'beacon_angel', name: 'Beacon Angel', art: '🗼', cost: 4, attack: 3, health: 5,
    text: 'At the end of your turn, give a random friendly minion +1 maximum Health and restore 1 Health to it.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'vitality', target: { randomOf: FRIENDLY_MINIONS }, amount: 1 }] }],
  },
  {
    ...DV, id: 'aegis_bearer', name: 'Aegis Bearer', art: '🛡️', cost: 4, attack: 3, health: 4, keywords: ['Evade'],
    text: 'Evade. Whenever this loses Evade, restore 2 Health to your Hero.',
    triggers: [{ on: 'keywordLost', filter: { target: 'self', keyword: 'Evade' }, effects: [heal('friendlyHero', 2)] }],
  },
  {
    ...DV, id: 'dawns_avenger', name: "Dawn's Avenger", art: '🌅', cost: 5, attack: 4, health: 5,
    text: 'Arrival: Deal 3 damage to all enemy Dark or Undead minions.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: { minions: ENEMY_DARK }, amount: 3 }] }],
  },
  {
    ...DV, id: 'divine_phoenix', name: 'Divine Phoenix', art: '🔥', cost: 5, attack: 4, health: 4, keywords: ['Reborn'],
    text: 'Reborn. When this returns through Reborn, restore 2 Health to all friendly characters.',
    triggers: [{ on: 'minionReborn', filter: { source: 'self' }, effects: [heal(FRIENDLY_CHARACTERS, 2)] }],
  },
  {
    ...DV, id: 'saint_of_mercy', name: 'Saint of Mercy', art: '🙏', cost: 6, attack: 4, health: 7,
    text: 'At the end of your turn, restore 2 Health to all friendly minions. Overheal applies normally.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [heal(FRIENDLY_MINIONS, 2)] }],
  },
  {
    ...DV, id: 'archangel_of_the_covenant', name: 'Archangel of the Covenant', art: '👼', cost: 7, attack: 6, health: 8,
    text: 'Arrival: Give your other friendly minions +2 maximum Health and restore 2 Health to them. Give them Evade until your next turn.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'vitality', target: { minions: { side: 'friendly', excludeSelf: true } }, amount: 2 },
      { op: 'buff', target: { minions: { side: 'friendly', excludeSelf: true } }, lingerKeywords: ['Evade'], untilYourNextTurn: true },
    ] }],
  },
  {
    ...DV, id: 'the_first_light', name: 'The First Light', art: '☀️', cost: 10, attack: 8, health: 10,
    text: 'Arrival: Deal 5 damage to all enemy minions and 5 damage to the enemy Hero. Dark or Undead enemies take 3 additional damage.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: ENEMY_MINIONS, amount: 5, darkBonus: 3 },
      { op: 'damage', target: 'enemyHero', amount: 5 },
    ] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'sanctuary', name: 'Sanctuary', art: '⛪', cost: 1,
    text: 'Give a friendly character 3 Temporary Health until the start of your next turn.',
    target: FRIENDLY_CHARACTER,
    effects: [{ op: 'buff', target: 'chosen', health: 3, temporaryHealth: true, untilYourNextTurn: true }],
  },
  {
    ...S, id: 'holy_radiance', name: 'Holy Radiance', art: '🌟', cost: 2,
    text: 'Restore 3 Health to all friendly characters. Overheal applies normally.',
    effects: [heal(FRIENDLY_CHARACTERS, 3)],
  },
  {
    ...S, id: 'blessing_of_vitality', name: 'Blessing of Vitality', art: '💖', cost: 2,
    text: 'Give a friendly character +2 maximum Health and restore 2 Health to it.',
    target: FRIENDLY_CHARACTER,
    effects: [{ op: 'vitality', target: 'chosen', amount: 2 }],
  },
  {
    ...S, id: 'cleanse_corruption', name: 'Cleanse Corruption', art: '💧', cost: 3,
    text: 'Remove all Keywords from an enemy minion and deal 2 damage to it. If it is Dark or Undead, deal 2 additional damage.',
    target: { type: 'minion', side: 'enemy' },
    effects: [{ op: 'stripKeywords', target: 'chosen' }, { op: 'damage', target: 'chosen', amount: 2, darkBonus: 2 }],
  },
  {
    ...S, id: 'divine_intervention', name: 'Divine Intervention', art: '🤲', cost: 4,
    text: 'Give a friendly minion Reborn and Evade. It can gain Reborn this way only if it does not already have Reborn.',
    target: FRIENDLY_MINION,
    effects: [
      { op: 'buff', target: 'chosen', keywords: ['Reborn'], if: { subject: 'chosen', canGainReborn: true } },
      { op: 'buff', target: 'chosen', keywords: ['Evade'] },
    ],
  },
  {
    ...S, id: 'judgment_of_dawn', name: 'Judgment of Dawn', art: '⚖️', cost: 6,
    text: 'Deal 4 damage to all enemy minions. Dark or Undead minions take 3 additional damage.',
    effects: [{ op: 'damage', target: ENEMY_MINIONS, amount: 4, darkBonus: 3 }],
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'guardians_reflexes', name: "Guardian's Reflexes", art: '🛡️', cost: 1,
    text: 'When a friendly minion is attacked: Give it +2 Temporary Health and +1 Attack until the end of the turn.',
    quickPlay: { windows: ['attackDeclared'], filter: { target: 'friendlyMinion' } },
    effects: [{ op: 'buff', target: 'eventTarget', health: 2, temporaryHealth: true, attack: 1, temporary: true }],
  },
  {
    ...S, id: 'last_light', name: 'Last Light', art: '🕯️', cost: 2,
    text: 'When a friendly character would take lethal damage: Prevent that damage and give it 3 Temporary Health. Triggers once per character per turn.',
    // Ruling (Q16): the 3 Temporary Health lasts until the end of the turn.
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: 'friendlyCharacter', lethal: true } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 'all' },
      { op: 'buff', target: 'eventTarget', health: 3, temporaryHealth: true },
    ],
  },
  {
    ...S, id: 'sanctified_counter', name: 'Sanctified Counter', art: '✝️', cost: 2,
    text: 'When your opponent plays a Dark or Undead minion: Deal 2 damage to it and give it -2 Attack this turn.',
    quickPlay: { windows: ['cardPlayed'], filter: { player: 'enemy', cardType: 'minion', source: ENEMY_DARK } },
    effects: [{ op: 'damage', target: 'eventSource', amount: 2 }, { op: 'buff', target: 'eventSource', attack: -2, temporary: true }],
  },
  {
    ...S, id: 'graceful_return', name: 'Graceful Return', art: '🕊️', cost: 3, needsBoardSpace: true,
    text: 'When a friendly minion is destroyed: Summon a 1/1 Spirit with Taunt. If the destroyed minion was Divine, give the Spirit Reborn.',
    quickPlay: { windows: ['minionDied'], filter: { source: { side: 'friendly' } } },
    effects: [{ op: 'summon', cardId: 'spirit', keywords: ['Reborn'], if: { eventDeadFaction: 'Divine' }, else: [{ op: 'summon', cardId: 'spirit' }] }],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'consecration_trap', name: 'Consecration Trap', art: '🔆', cost: 2,
    text: 'When your opponent summons a Dark or Undead minion: Deal 3 damage to it.',
    // Ruling (Q16): "summons" = plays a minion from hand.
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion', source: ENEMY_DARK }, effects: [{ op: 'damage', target: 'eventSource', amount: 3 }] },
  },
  {
    ...T, id: 'protective_ward', name: 'Protective Ward', art: '🔰', cost: 2,
    text: 'When an enemy attacks your Hero: Give all friendly minions +2 Temporary Health until the end of the turn.',
    trap: { on: 'attackDeclared', filter: { target: 'friendlyHero' }, effects: [{ op: 'buff', target: FRIENDLY_MINIONS, health: 2, temporaryHealth: true }] },
  },
  {
    ...T, id: 'rebirth_sigil', name: 'Rebirth Sigil', art: '🔯', cost: 3, needsBoardSpace: true,
    text: 'When a friendly minion dies: Give it Reborn before it leaves the battlefield. Triggers once per turn.',
    // Ruling (Q16): it returns with 1 Health, exactly as Reborn would.
    trap: { on: 'minionDied', filter: { source: { side: 'friendly' } }, effects: [{ op: 'summon', eventCard: true, health: 1, loseKeywords: ['Reborn'] }] },
  },
  {
    ...T, id: 'purge_the_unholy', name: 'Purge the Unholy', art: '🔥', cost: 4,
    text: 'When your opponent plays a Dark or Undead minion with 3 or less Attack: Destroy it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion', source: { ...ENEMY_DARK, maxAttack: 3 } }, effects: [{ op: 'destroy', target: 'eventSource' }] },
  },

  // ---- Tokens ----
  { ...DV, id: 'spirit', name: 'Spirit', art: '👻', token: true, cost: 1, attack: 1, health: 1, keywords: ['Taunt'], text: 'Taunt.' },
];
