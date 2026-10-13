// Global rules, rosters, and vocabularies. Designer rulings live here so they
// can be changed in one place.

export const FACTIONS = [
  'Vampires', 'Demons', 'Divine', 'Dinosaurs', 'Robots', 'Aliens', 'Void', 'Bees',
  'Plants', 'Ghosts', 'Undead', 'Zombies', 'Supers', 'Ninjas', 'Pirates', 'Mages', 'Knights', 'Fungus',
  'Mythical', 'Dragons', 'Werewolves', 'Aquatic', 'Radioactive', 'Old Gods',
  'Other Ones', 'Ultraterrestrial',
];

// Cards that belong to no faction (e.g. the Mana Potion).
export const NEUTRAL = 'Neutral';

export const LAUNCH_FACTIONS = ['Vampires', 'Aliens', 'Dinosaurs'];

export const CARD_TYPES = ['minion', 'spell', 'trap'];

// Keywords stored on a character. Arrival / Exit / Summon are trigger
// types (see TRIGGER_EVENTS), not stored keywords. Designer definitions:
//   Evade      the first damage it would take does nothing (formerly "Divine Shield")
//   Elusive    cannot be targeted by enemy spells
//   Poisonous  when it dies, the enemy that killed it dies too
//   Venomous   kills the enemy minion it attacks
//   Twin Strike can attack twice each turn (was Windfury)
//   Stealth    can't be attacked or targeted by enemies; removed only by a card that says so
export const POSITIVE_KEYWORDS = [
  'Taunt', 'Poisonous', 'Venomous', 'Lifesteal', 'Evade', 'Elusive', 'Charge', 'Rush',
  'Stealth', 'Twin Strike',
];

// Negative keywords (statuses):
//   Silenced  all its other keywords are removed
//   Frozen    cannot attack; thaws after missing its controller's next turn,
//             unless the card says otherwise ("Root" was renamed Freeze)
//   Blind     attacks hit a random character, friend or foe
//   Recoil    takes half (rounded down) of the damage it deals
//   Burned    loses 1 Health at the end of its controller's turn
export const NEGATIVE_KEYWORDS = ['Silenced', 'Frozen', 'Blind', 'Recoil', 'Burned'];

export const KEYWORDS = [...POSITIVE_KEYWORDS, 'Reborn', 'Immune', 'Spell Ward', ...NEGATIVE_KEYWORDS];

// Player-facing rules text for keywords and card terms (collection glossary, tooltips).
export const KEYWORD_TEXT = {
  Taunt: 'A blocker: enemies must attack this minion before your other minions or your Hero.',
  Radiation: "While a character with Radiation X is alive, every other character without Radiation has X less Health (sources stack). Characters losing Health to Radiation can't be healed. Health reduction isn't damage.",
  Obliterate: 'Removed from the game entirely: no Exit, no Reborn, nothing that needs it to die.',
  Upgrade: 'A Robot card that improves a friendly Robot. Robots count how many Upgrades they have.',
  Weapon: 'An Upgrade with an Attack bonus and its own effect. A Robot holds one Weapon; a new one replaces the old.',
  Overheal: 'Healing a character already at full Health raises its maximum Health by the amount instead.',
  'Temporary Health': 'Extra Health that absorbs damage first and goes away when its time is up.',
  'Bonus Health': 'A permanent increase to maximum (and current) Health.',
  Dark: 'A tag on Vampires, Demons and other creatures of darkness. Divine cards punish it.',
  Undead: 'A tag on Zombies, Vampires and other undead. Divine cards punish it.',
  'Primal Mana': 'Gold Mana Crystals from Extinction Cycle. They can only pay for Dinosaur cards.',
  Burn: "At the end of its controller's turn, takes damage equal to its Burn value, then the value rises by 1. Lasts 2 turns. Applying Burn X sets the value to X, or adds X if it is already X or more (adding doesn't extend the 2 turns).",
  Burning: 'Has a Burn value (see Burn).',
  Cleanse: 'Removes Burn, Radiation and harmful effects (Frozen, Burned, Blind) from a character.',
  Stealth: "Can't be attacked or targeted by enemies. Only removed by a card that says so.",
  Lifesteal: 'Damage this deals also restores that much Health to your Hero.',
  Evade: 'The first damage this would take does nothing.',
  Elusive: "Can't be targeted by enemy spells.",
  'Spell Ward': 'The next enemy spell that would affect this minion has no effect on it; then Spell Ward is removed.',
  Haunt: "Summon a minion that died this game from either player's Graveyard onto your side. It still belongs to its owner, so if it dies again it goes back to their Graveyard.",
  Graveyard: 'Where minions go when they die. Minions that were Obliterated never get there.',
  Poisonous: 'When this dies, the enemy that killed it dies too.',
  Venomous: 'Kills any enemy minion it attacks.',
  Charge: 'Can attack the turn it is played.',
  Rush: 'Can attack minions the turn it is played.',
  'Twin Strike': 'Can attack twice each turn.',
  Reborn: 'The first time this dies, it returns with 1 Health.',
  Overheal: 'Healing at full Health raises maximum Health instead.',
  Silenced: 'All its other keywords are removed.',
  Frozen: "Can't attack. Thaws after missing its controller's next turn.",
  Freeze: "The target can't attack until it has missed its controller's next turn.",
  Blind: 'Its attacks hit a random character, friend or foe.',
  Recoil: 'Takes half (rounded down) of the damage it deals.',
  Burned: "Loses 1 Health at the end of its controller's turn.",
  Arrival: 'Happens when you play this from your hand.',
  Summon: 'Happens whenever this enters the battlefield, including when played.',
  'Exit': 'Happens when this dies.',
  Discover: 'Choose 1 of up to 3 options.',
  'Quick Play': "Can be played during your opponent's turn, in the window after they act (8 seconds).",
  Trap: 'Set face-down beside your Hero (a purple ? token). Your opponent can\'t see which Trap it is. It goes off automatically when its condition happens.',
  'Hero Spell': 'Always available outside your deck. Once per turn.',
  Extinction: 'Every 7 turns: destroy all your Mana Crystals and friendly minions.',
  Corpse: 'Left behind when a friendly Zombie dies. Corpses stay until a card consumes them. A Corpse is not a minion.',
  Mushroom: 'Attached to a card in the enemy deck. When that card is drawn, the enemy Hero takes 1 damage for each Mushroom on it, then they are removed.',
};

// "A random Keyword" draws from this pool (designer list).
export const RANDOM_KEYWORD_POOL = POSITIVE_KEYWORDS;

// Keywords used on designer cards but not yet defined. Cards using them are
// "incomplete" until the definition arrives.
export const UNDEFINED_KEYWORDS = [];

// Self triggers fire only for the card that owns them.
// Internal ids. Players see 'Arrival' for 'battlecry' and 'Exit' for 'deathrattle'
// (renamed from Hearthstone's terms).
export const SELF_TRIGGERS = ['battlecry', 'summon', 'deathrattle'];

// Board events any minion/trap can listen to.
export const BOARD_EVENTS = [
  'startOfTurn', 'endOfTurn', 'cardPlayed', 'minionSummoned', 'minionDied',
  'attackDeclared', 'afterAttack', 'damageDealt', 'heroLostHealth', 'characterHealed',
  'attackGained', 'healthGained', 'keywordGained', 'keywordLost', 'trapTriggered',
  'minionWouldDie', // Traps only: checked before a minion dies (Experimental Containment)
  'cardDrawn',        // a card was drawn (before any Mushrooms on it burst)
  'mushroomTriggered', // Mushrooms on a drawn card burst: { player: drawer, amount }
  'minionLostStats',  // a minion lost Attack or Health (damage, -X debuffs)
  'minionReborn',     // a minion came back through Reborn
  'minionHaunted',    // Ghosts: a minion was Haunted from a Graveyard
  'burnApplied',      // a character's Burn value was set or raised
  'burnDamage',       // a character took Burn damage (end of its controller's turn)
  'cardBurned',       // a card was burned from a hand or deck
  'overhealed',       // healing at full Health raised maximum Health (Divine)
  'bonusHealth',      // a character's maximum Health rose permanently (Divine)
  'upgradeInstalled', // an Upgrade was played on a Robot (Robots)
  'radiationApplied', // a character gained Radiation (Radioactive)
  'heroLethal',       // Traps only: the Hero would take lethal damage (Last Resort Protocol)
];

export const TRIGGER_EVENTS = [...SELF_TRIGGERS, ...BOARD_EVENTS];

// Points where the non-active player gets a Quick Play window.
// wouldTakeDamage opens only for Quick Plays that name it (Blood Shield, Protective Mother).
// damageDealt / burnDamage open only for Quick Plays that name them (Dragons).
// friendlyAttack / heroLostHealth go to the attacking / Health-losing player, even on their own turn (Demons).
// enemyIrradiated goes to the opponent of whoever gained Radiation, on either turn (Gamma Reversal).
export const REACTION_WINDOWS = ['cardPlayed', 'attackDeclared', 'minionDied', 'endOfTurn', 'wouldTakeDamage', 'damageDealt', 'burnDamage', 'friendlyAttack', 'heroLostHealth', 'enemyIrradiated'];
export const DEFAULT_QUICK_PLAY_WINDOWS = ['cardPlayed', 'attackDeclared', 'minionDied', 'endOfTurn'];

// Dark / Undead (Divine's "holy" targets): a shared tag, not a faction name.
// A card can set its own `tags`; otherwise it gets its faction's default tags.
export const FACTION_TAGS = {
  Vampires: ['Dark', 'Undead'],
  Zombies: ['Undead'],
  Ghosts: ['Undead'],
  Demons: ['Dark'],
  Werewolves: ['Dark'],
  Void: ['Dark'],
};

export const DEFAULT_RULES = {
  burnTurns: 2,              // Dragons: a Burn ticks at most this many times, then goes out
  startingHealth: 30,
  maxMana: 10,
  manaPerTurn: 1,            // Dinosaurs: 2 (1 on their first turn), see factions.js
  startingHandFirst: 3,
  startingHandSecond: 4,     // going second: an extra card plus the Mana Potion
  mulligan: true,            // before turn 1 each player may swap any opening cards once
  openingHandHelp: 2,        // a starting hand always has a minion costing this or less (false = off)
  coinCardId: 'mana_potion', // the going-second card (Mana Potion; was The Coin)
  // Going second picks one: Mana Potion or Health Potion. false = always the Mana Potion.
  secondPlayerPotions: ['mana_potion', 'health_potion'],
  maxHandSize: 10,
  maxBoardSize: 7,
  maxTraps: 5,               // hard limit
  factionDeckSize: 30,       // every faction has one fixed 30-card deck
  factionsPerDeck: 2,        // players combine 2 factions into a 60-card deck…
  cardsCut: 20,              // …then cut 20 (any split between the factions) → 40-card deck
  standardCutPerFaction: 10, // the default cut, used unless the player makes their own
  singleFactionDuplicates: 10, // One-faction format: the 30 cards + 10 duplicates → 40
  maxCopies: 2,              // …with no more than 2 copies of any card
  heroSpellUsesPerTurn: 1,
  extinctionEvery: 7,        // Dinosaur Extinction Cycle period (the Dinosaur player's own turns)
  quickPlaySeconds: 8,       // UI countdown before a Quick Play window auto-passes
  fatigue: true,
  summonTriggersOnPlay: true,  // playing a minion from hand counts as summoning it
  rebornHealth: 1,
};
