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

// The Holy Pyre: Holy Flame on a target.
const flame = (target, amount) => ({ op: 'holyFlame', target, amount });
const ENEMY_MINION_T = { type: 'minion', side: 'enemy' };
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
    text: "Restore 2 Health to a friendly character and Cleanse it. Overheal: at full Health, it gets +2 maximum Health instead.",
    target: FRIENDLY_CHARACTER,
    effects: [{ op: 'cleanse', target: 'chosen' }, heal('chosen', 2)],
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
    text: 'Arrival: Deal 2 damage to an enemy Dark minion.',
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
    text: 'Whenever this attacks a Dark minion, gain +2 Attack for that attack.',
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
    text: 'Arrival: Deal 3 damage to all enemy Dark minions.',
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
    text: 'Arrival: Deal 5 damage to all enemy minions and 5 damage to the enemy Hero. Dark enemies take 3 additional damage.',
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
    text: 'Remove all Keywords from an enemy minion and deal 2 damage to it. If it is Dark, deal 2 additional damage.',
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
    text: 'Deal 4 damage to all enemy minions. Dark minions take 3 additional damage.',
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
    text: "When a friendly character would take lethal damage: prevent it and give it 3 Temporary Health. Once per character per turn.",
    // Ruling (Q16): the 3 Temporary Health lasts until the end of the turn.
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: 'friendlyCharacter', lethal: true } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 'all' },
      { op: 'buff', target: 'eventTarget', health: 3, temporaryHealth: true },
    ],
  },
  {
    ...S, id: 'sanctified_counter', name: 'Sanctified Counter', art: '✝️', cost: 2,
    text: 'When your opponent plays a Dark minion: Deal 2 damage to it and give it -2 Attack this turn.',
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
    text: 'When your opponent summons a Dark minion: Deal 3 damage to it.',
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
    text: 'When your opponent plays a Dark minion with 3 or less Attack: Destroy it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion', source: { ...ENEMY_DARK, maxAttack: 3 } }, effects: [{ op: 'destroy', target: 'eventSource' }] },
  },

  // ---- Tokens ----
  { ...DV, id: 'spirit', name: 'Spirit', art: '👻', token: true, cost: 1, attack: 1, health: 1, keywords: ['Taunt'], text: 'Taunt.' },
  // ---- The Holy Pyre expansion (unlockable): Holy Flame and Reduce to Ash ----
  // Holy Flame: at the end of your turn each burning enemy takes its Holy Flame as damage (double
  // to Dark / Undead), then it burns down by 1, and a burning character can't be healed. A minion that
  // dies while burning is Reduced to Ash: removed, with no Graveyard, Exit or Reborn (engine).
  {
    ...DV, id: 'candle_acolyte', name: 'Candle Acolyte', art: '🕯️', extra: true, cost: 1, attack: 1, health: 2,
    text: 'Arrival: Give an enemy minion 1 Holy Flame.',
    target: ENEMY_MINION_T,
    triggers: [{ on: 'battlecry', effects: [flame('chosen', 1)] }],
  },
  {
    ...S, id: 'smite', name: 'Smite', art: '⚡', extra: true, cost: 1,
    text: 'Deal 2 damage to a minion. If it is Dark, also give it 2 Holy Flame.',
    target: { type: 'minion', side: 'any' },
    effects: [{ op: 'damage', target: 'chosen', amount: 2 }, { ...flame('chosen', 2), if: { subject: 'chosen', darkOrUndead: true } }],
  },
  {
    ...DV, id: 'sunlit_censer_bearer', name: 'Sunlit Censer-Bearer', art: '🪔', extra: true, cost: 2, attack: 1, health: 3,
    text: 'At the end of your turn, give a random enemy 1 Holy Flame.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [flame({ randomOf: { characters: { side: 'enemy' } } }, 1)] }],
  },
  {
    ...S, id: 'brand_of_the_righteous', name: 'Brand of the Righteous', art: '✝️', extra: true, cost: 2,
    text: 'Give an enemy minion 3 Holy Flame. If it is Dark, draw a card.',
    target: ENEMY_MINION_T,
    effects: [flame('chosen', 3), { op: 'draw', count: 1, if: { subject: 'chosen', darkOrUndead: true } }],
  },
  {
    ...DV, id: 'pyre_warden', name: 'Pyre Warden', art: '🛡️', extra: true, cost: 3, attack: 2, health: 4, keywords: ['Taunt'],
    text: 'Taunt. Whenever an enemy is Reduced to Ash, restore 2 Health to your Hero.',
    triggers: [{ on: 'minionAshed', filter: { player: 'enemy' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 2 }] }],
  },
  {
    ...S, id: 'purging_light', name: 'Purging Light', art: '🌟', extra: true, cost: 3,
    text: 'Quick Play: When an enemy minion attacks, give it 2 Holy Flame and -2 Attack this turn.',
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [flame('eventSource', 2), { op: 'buff', target: 'eventSource', attack: -2, temporary: true }],
  },
  {
    ...DV, id: 'seraph_of_embers', name: 'Seraph of Embers', art: '👼', extra: true, cost: 3, attack: 3, health: 3, keywords: ['Elusive'], holyFlameBonus: true,
    text: 'Elusive. Your Holy Flame deals 1 extra damage.',
  },
  {
    ...T, id: 'halo_shatter', name: 'Halo Shatter', art: '💫', extra: true, cost: 3,
    text: 'Trap: When your opponent Haunts a minion, Reduce it to Ash.',
    trap: { on: 'minionHaunted', filter: { player: 'enemy' }, effects: [{ op: 'reduceToAsh', target: 'eventSource' }] },
  },
  {
    ...DV, id: 'ashen_penitent', name: 'Ashen Penitent', art: '🧎', extra: true, cost: 4, attack: 4, health: 4,
    text: "Arrival: Gain +1/+1 for each enemy you've Reduced to Ash this game (up to +3/+3).",
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'self', perAshed: { max: 3 } }] }],
  },
  {
    ...S, id: 'judgment_bell', name: 'Judgment Bell', art: '🔔', extra: true, cost: 4,
    text: 'Every enemy minion with Holy Flame takes damage equal to its Holy Flame.',
    effects: [{ op: 'damage', target: { minions: { side: 'enemy' } }, perHolyFlame: true }],
  },
  {
    ...DV, id: 'inquisitor_of_the_pyre', name: 'Inquisitor of the Pyre', art: '🏮', extra: true, cost: 5, attack: 4, health: 5,
    text: 'Arrival: Give all enemy Dark minions 2 Holy Flame.',
    triggers: [{ on: 'battlecry', effects: [flame({ minions: { side: 'enemy', darkOrUndead: true } }, 2)] }],
  },
  {
    ...S, id: 'wall_of_holy_fire', name: 'Wall of Holy Fire', art: '🔥', extra: true, cost: 5,
    text: 'Give all enemy minions 1 Holy Flame. Your minions get +1 Health.',
    effects: [flame({ minions: { side: 'enemy' } }, 1), { op: 'buff', target: { minions: { side: 'friendly' } }, health: 1 }],
  },
  {
    ...S, id: 'sacred_immolation', name: 'Sacred Immolation', art: '🕊️', extra: true, cost: 6,
    text: 'Destroy an enemy minion with Holy Flame (it is Reduced to Ash). Gain Armor equal to its Attack.',
    target: { type: 'minion', side: 'enemy', holyFlame: true },
    effects: [{ op: 'gainArmor', amountFromAttackOf: 'chosen' }, { op: 'destroy', target: 'chosen' }],
  },
  {
    ...DV, id: 'archon_of_the_final_pyre', name: 'Archon of the Final Pyre', art: '⚔️', extra: true, cost: 8, attack: 5, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Deal 2 damage to all enemies and give them 1 Holy Flame.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damage', target: { characters: { side: 'enemy' } }, amount: 2 }, flame({ characters: { side: 'enemy' } }, 1)] }],
  },
  {
    ...DV, id: 'dawnbreaker_the_cleansing_sun', name: 'Dawnbreaker, the Cleansing Sun', art: '☀️', extra: true, cost: 9, attack: 6, health: 6,
    text: 'Arrival: Reduce every enemy minion with Holy Flame to Ash. Summon a 1/1 Ember Spirit for each.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'ashTheBurning' }] }],
  },
  { ...DV, id: 'ember_spirit', name: 'Ember Spirit', art: '✨', token: true, cost: 1, attack: 1, health: 1, text: '' },

  // ---- New legendary ----
  {
    ...DV, id: 'seraphael_the_redeemed', name: 'Seraphael, the Redeemed', art: '😇', extra: true, cost: 7, attack: 6, health: 7, keywords: ['Lifesteal'],
    text: 'Lifesteal. Arrival: Transform every enemy Dark or Undead minion into a 1/1 Penitent Wisp. Restore 5 Health to your Hero (Overheal).',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'transform', target: { minions: ENEMY_DARK }, into: 'penitent_wisp' },
      { op: 'heal', target: 'friendlyHero', amount: 5, overheal: true },
    ] }],
  },
  {
    faction: 'Divine', type: 'minion', tribes: ['Spirit'], token: true, id: 'penitent_wisp', name: 'Penitent Wisp', art: '🕯️', cost: 1, attack: 1, health: 1,
    text: 'Redeemed by Seraphael.',
  },
];

// ---- Expansion: The Radiant Armory (24 unlockable cards) ----
// The angels' holy forge: Hero Weapons, Armor, shields for your minions, the archangels who guard
// the forge, and The Holy Divine. Weapon marks land as the Hero swings (as in Arsenal).
const ARMORY = 'The Radiant Armory';
const AX = { extra: true, set: ARMORY };
const AXM = { ...DV, ...AX };
const weapon = (id, name, attack, durability, extra = {}) => ({ op: 'equipHeroWeapon', cardId: id, name, attack, durability, ...extra });
const XW = (id, name, art, cost, attack, durability, text, gear = {}, card = {}) =>
  ({ ...S, ...AX, id, name, art, cost, attack, durability, heroWeapon: true, text, ...card, effects: [weapon(id, name, attack, durability, gear)] });
const ON_SWING = (effects, target = 'enemyCharacter') => [{ on: 'attackDeclared', filter: { source: 'self', target }, effects }];
const OTHER_FRIENDLY_MINIONS = { minions: { side: 'friendly', excludeSelf: true } };

export const DIVINE_ARMORY = [
  // ---- Weapons (6) ----
  XW('dawnforged_blade', 'Dawnforged Blade', '🗡️', 2, 2, 2, 'Your Hero has +2 Attack against Dark minions.', { preyTag: 'Dark', preyBonus: 2 }),
  XW('hammer_of_the_dawnsmith', 'Hammer of the Dawnsmith', '🔨', 3, 3, 2, 'Whenever your Hero attacks with it, gain 2 Armor.',
    { triggers: ON_SWING([{ op: 'gainArmor', amount: 2 }]) }),
  XW('seraphs_spear', 'Seraph\'s Spear', '🔱', 3, 2, 3, 'Ranged. Whenever your Hero attacks with it, restore 2 Health to your Hero (Overheal).',
    { ranged: true, triggers: ON_SWING([heal('friendlyHero', 2)]) }),
  XW('bow_of_the_first_morning', 'Bow of the First Morning', '🏹', 2, 1, 3, 'Ranged. Whenever your Hero attacks with it, restore 1 Health to all friendly minions (Overheal).',
    { ranged: true, triggers: ON_SWING([heal(FRIENDLY_MINIONS, 1)]) }),
  XW('censer_flail_of_judgment', 'Censer Flail of Judgment', '⛓️', 4, 3, 3, 'Whenever your Hero attacks with it, give all enemy minions Holy Flame 1.',
    { triggers: ON_SWING([flame(ENEMY_MINIONS, 1)]) }),
  XW('sunsplitter', 'Sunsplitter', '⚔️', 6, 5, 3, 'Lifesteal. Your Hero has +3 Attack against Dark minions.',
    { keywords: ['Lifesteal'], preyTag: 'Dark', preyBonus: 3 }, { legendary: true, frameArt: 'art/frames/legendary-weapon-divine.png' }),

  // ---- Shields (4) ----
  {
    ...S, ...AX, id: 'aegis_of_dawn', name: 'Aegis of Dawn', art: '🛡️', cost: 1,
    text: 'Give a friendly minion Evade and 2 Temporary Health until the start of your next turn.',
    target: { ...FRIENDLY_MINION },
    effects: [{ op: 'buff', target: 'chosen', keywords: ['Evade'], health: 2, temporaryHealth: true, untilYourNextTurn: true }],
  },
  {
    ...AXM, id: 'bulwark_seraph', name: 'Bulwark Seraph', art: '🛡️', cost: 3, attack: 2, health: 5, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Gain 3 Armor.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'gainArmor', amount: 3 }] }],
  },
  {
    ...S, ...AX, id: 'wall_of_halos', name: 'Wall of Halos', art: '😇', cost: 4,
    text: 'Give all friendly minions 3 Temporary Health and Taunt until the start of your next turn.',
    effects: [{ op: 'buff', target: FRIENDLY_MINIONS, health: 3, temporaryHealth: true, lingerKeywords: ['Taunt'], untilYourNextTurn: true }],
  },
  {
    ...AXM, id: 'mirror_shield_paladin', name: 'Mirror-Shield Paladin', art: '🪞', cost: 4, attack: 3, health: 5, keywords: ['Evade'],
    text: 'Evade. Whenever this loses Evade, deal 3 damage to a random enemy minion.',
    triggers: [{ on: 'keywordLost', filter: { target: 'self', keyword: 'Evade' }, effects: [{ op: 'damage', target: { randomOf: ENEMY_MINIONS }, amount: 3 }] }],
  },

  // ---- Armour (4) ----
  { ...S, ...AX, id: 'blessed_mail', name: 'Blessed Mail', art: '🧥', cost: 2, text: 'Gain 5 Armor.', effects: [{ op: 'gainArmor', amount: 5 }] },
  {
    ...AXM, id: 'armorer_of_the_celestial_forge', name: 'Celestial Armorer', art: '⚒️', cost: 3, attack: 2, health: 4,
    text: 'Whenever you equip a weapon, gain 2 Armor and give it +1 Durability.',
    triggers: [{ on: 'weaponEquipped', effects: [{ op: 'gainArmor', amount: 2 }, { op: 'buffHeroWeapon', durability: 1, justEquipped: true }] }],
  },
  {
    ...S, ...AX, id: 'halo_helm', name: 'Halo Helm', art: '⛑️', cost: 1,
    text: 'Give a friendly minion +2 maximum Health and Taunt.',
    target: { ...FRIENDLY_MINION },
    effects: [{ op: 'vitality', target: 'chosen', amount: 2 }, { op: 'buff', target: 'chosen', keywords: ['Taunt'] }],
  },
  {
    ...AXM, id: 'radiant_juggernaut', name: 'Radiant Juggernaut', art: '🛡️', cost: 6, attack: 5, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Gain 5 Armor.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'gainArmor', amount: 5 }] }],
  },

  // ---- Archangels (5) ----
  {
    ...AXM, id: 'archangel_valoriel', name: 'Archangel Valoriel', art: '👼', cost: 6, attack: 5, health: 5, keywords: ['Rush'],
    text: 'Rush. Arrival: Equip a 3/2 Sword of Heaven.',
    triggers: [{ on: 'battlecry', effects: [weapon('dawnforged_blade', 'Sword of Heaven', 3, 2)] }],
  },
  {
    ...AXM, id: 'archangel_seraphine', name: 'Archangel Seraphine', art: '👼', cost: 5, attack: 3, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Arrival: Give your other minions 2 Temporary Health and Evade until the start of your next turn.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: OTHER_FRIENDLY_MINIONS, health: 2, temporaryHealth: true, lingerKeywords: ['Evade'], untilYourNextTurn: true }] }],
  },
  {
    ...AXM, id: 'archangel_thamuel', name: 'Archangel Thamuel', art: '📯', cost: 4, attack: 3, health: 4,
    text: 'Arrival: Summon two 1/1 Spirits with Taunt.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'summon', cardId: 'spirit' }, { op: 'summon', cardId: 'spirit' }] }],
  },
  {
    ...AXM, id: 'archangel_oriphiel', name: 'Archangel Oriphiel', art: '⚖️', cost: 7, attack: 6, health: 6,
    text: 'Arrival: Give all enemy minions Holy Flame 2. Dark enemies get 2 more.',
    triggers: [{ on: 'battlecry', effects: [flame(ENEMY_MINIONS, 2), flame({ minions: ENEMY_DARK }, 2)] }],
  },
  {
    ...AXM, id: 'archangel_lumiel', name: 'Archangel Lumiel', art: '👼', cost: 3, attack: 2, health: 3,
    text: 'Arrival: Give a friendly minion +1/+2 and Evade.',
    target: { ...FRIENDLY_MINION },
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', attack: 1, health: 2, keywords: ['Evade'] }] }],
  },

  // ---- Legendaries (5) ----
  {
    ...AXM, id: 'archangel_auriel', name: 'Archangel Auriel', art: '👼', legendary: true, cost: 8, attack: 6, health: 7,
    text: 'Arrival: Gain 5 Armor. Discover a Divine weapon. It costs 2 less.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'gainArmor', amount: 5 }, { op: 'discoverWeapon', faction: 'Divine', costMod: -2 }] }],
  },
  {
    ...AXM, id: 'archangel_michael', name: 'Archangel Michael', art: '⚔️', legendary: true, cost: 8, attack: 7, health: 7, keywords: ['Rush'],
    text: 'Rush. Arrival: Deal 4 damage to all enemy Dark minions. Equip a 4/3 Flaming Sword with Lifesteal.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'damage', target: { minions: ENEMY_DARK }, amount: 4 },
      weapon('sunsplitter', 'Flaming Sword', 4, 3, { keywords: ['Lifesteal'] }),
    ] }],
  },
  {
    ...AXM, id: 'archangel_gabriel', name: 'Archangel Gabriel', art: '📯', legendary: true, cost: 6, attack: 4, health: 6,
    text: 'Arrival: Draw 2 cards. Restore 4 Health to your Hero (Overheal).',
    triggers: [{ on: 'battlecry', effects: [{ op: 'draw', count: 2 }, heal('friendlyHero', 4)] }],
  },
  {
    ...AXM, id: 'archangel_raphael', name: 'Archangel Raphael', art: '🌿', legendary: true, cost: 6, attack: 4, health: 7,
    text: 'Arrival: Restore 5 Health to all friendly characters (Overheal) and Cleanse them.',
    triggers: [{ on: 'battlecry', effects: [heal(FRIENDLY_CHARACTERS, 5), { op: 'cleanse', target: FRIENDLY_CHARACTERS }] }],
  },
  {
    ...AXM, id: 'the_holy_divine', name: 'The Holy Divine', art: '✨', legendary: true, cost: 10, attack: 10, health: 10,
    text: 'Arrival: Destroy all enemy Dark minions. Give your other minions +2/+2, Evade and Reborn. Gain 10 Armor.',
    triggers: [{ on: 'battlecry', effects: [
      { op: 'destroy', target: { minions: ENEMY_DARK } },
      { op: 'buff', target: OTHER_FRIENDLY_MINIONS, attack: 2, health: 2, keywords: ['Evade', 'Reborn'] },
      { op: 'gainArmor', amount: 10 },
    ] }],
  },
];
