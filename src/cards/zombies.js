// ZOMBIE FACTION — the designer's complete 30-card list + Hero Spell.
// Text is the designer's wording ("Battlecry" shown as Arrival). Interpretation
// choices are marked "Ruling:" and listed in docs/OPEN_QUESTIONS.md (Q13).
//
// Corpse (Zombie rule): whenever a friendly Zombie dies, it leaves a Corpse
// (a per-player count; see engine deaths step). Corpses stay until a card
// consumes them; they are not minions.
//
// Zombie-faction minions carry the 'Zombie' tribe, except the Rage Outbreak's living Infected
// (tribes Infected + Human or Infected + Beast). All of them are Dark (rules FACTION_TAGS).

const Z = { faction: 'Zombies', type: 'minion', tribes: ['Zombie'] };
const S = { faction: 'Zombies', type: 'spell' };
const T = { faction: 'Zombies', type: 'trap' };

const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ANY_MINION = { type: 'minion', side: 'any' };
const FRIENDLY_ZOMBIES = { minions: { side: 'friendly', tribe: 'Zombie' } };
const FRIENDLY_ZOMBIE = { side: 'friendly', tribe: 'Zombie' };
// Ruling: "1/2 Walker" / "2/1 Runner" summons are the Walker and Runner cards (Walkers keep Reborn).
const walkers = (count, extra = {}) => ({ op: 'summon', cardId: 'walker', count, ...extra });
const walkerOrRunner = { op: 'summon', pool: ['walker', 'runner'] };
const infect = (target) => ({ op: 'infect', target });
const RANDOM_ENEMY = { randomOf: { minions: { side: 'enemy', alive: true } } };

export const ZOMBIE_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'resurrection', name: 'Resurrection', art: '✝️', heroSpell: true,
    cost: 2,
    text: 'Grant a minion Reborn until the start of your next turn. This may only affect a minion once.',
    target: { type: 'minion', side: 'any', unresurrected: true },
    effects: [{ op: 'resurrect', target: 'chosen' }],
  },

  // ---- Minions (16) ----
  { ...Z, id: 'walker', name: 'Walker', art: '🧟', cost: 1, attack: 1, health: 2, keywords: ['Reborn'], text: 'Reborn.' },
  { ...Z, id: 'runner', name: 'Runner', art: '🏃', cost: 2, attack: 2, health: 1, keywords: ['Rush'], text: 'Rush.' },
  { ...Z, tribes: ['Infected', 'Human'], id: 'rage_sprinter', name: 'Rage Sprinter', art: '😡', cost: 3, attack: 3, health: 1, keywords: ['Charge'], text: 'Charge.' },
  {
    ...Z, id: 'bloater', name: 'Bloater', art: '🎈', cost: 4, attack: 4, health: 4, keywords: ['Taunt'],
    text: 'Taunt. Exit: Deal 1 damage to all minions.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'damageAll', amount: 1 }] }],
  },
  {
    ...Z, id: 'zombie_horde', name: 'Zombie Horde', art: '👥', cost: 5, attack: 5, health: 5,
    text: 'Exit: Summon three 1/2 Walkers.',
    triggers: [{ on: 'deathrattle', effects: [walkers(3)] }],
  },
  {
    ...Z, id: 'tarman', name: 'Tarman', art: '🛢️', cost: 7, attack: 6, health: 3, keywords: ['Reborn', 'Lifesteal'],
    text: 'Reborn. Lifesteal. Exit: Drag a random enemy minion down into the tar with him (destroy it).',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'tarPit', target: RANDOM_ENEMY }] }],
  },
  {
    ...Z, id: 'crawling_corpse', name: 'Crawling Corpse', art: '🦴', cost: 1, attack: 1, health: 1,
    text: 'Exit: Summon a 1/1 Zombie.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', cardId: 'zombie' }] }],
  },
  {
    ...Z, id: 'zombie_brute', name: 'Zombie Brute', art: '💪', cost: 3, attack: 3, health: 4,
    text: 'Whenever this survives damage, gain +1 Attack.',
    triggers: [{ on: 'damageDealt', filter: { target: 'self' },
      effects: [{ op: 'buff', target: 'self', attack: 1, if: { subject: 'self', alive: true } }] }],
  },
  {
    ...Z, id: 'rotting_walker', name: 'Rotting Walker', art: '🤢', cost: 2, attack: 1, health: 3,
    text: 'Exit: Give an enemy minion -1 Attack permanently.',
    // Ruling: a random enemy minion.
    triggers: [{ on: 'deathrattle', effects: [{ op: 'buff', target: { randomOf: { minions: { side: 'enemy', alive: true } } }, attack: -1 }] }],
  },
  {
    ...Z, id: 'grave_runner', name: 'Grave Runner', art: '⚰️', cost: 3, attack: 3, health: 2,
    text: 'Whenever another friendly Zombie dies, gain +1 Attack this turn.',
    triggers: [{ on: 'minionDied', filter: { source: { side: 'friendly', tribe: 'Zombie', notSelf: true } },
      effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true }] }],
  },
  {
    ...Z, id: 'corpse_eater', name: 'Corpse Eater', art: '🍖', cost: 4, attack: 4, health: 4,
    text: 'Arrival: Consume a friendly Corpse. If you do, gain +2/+2.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'consumeCorpses', count: 1, effects: [{ op: 'buff', target: 'self', attack: 2, health: 2 }] }] }],
  },
  {
    ...Z, id: 'zombie_shambler', name: 'Zombie Shambler', art: '🚶', cost: 4, attack: 3, health: 5,
    text: 'Whenever a friendly Zombie is Reborn, restore 2 Health to this minion.',
    triggers: [{ on: 'minionReborn', filter: { source: FRIENDLY_ZOMBIE }, effects: [{ op: 'heal', target: 'self', amount: 2 }] }],
  },
  {
    ...Z, id: 'plague_walker', name: 'Plague Walker', art: '☣️', cost: 5, attack: 4, health: 5,
    text: 'Arrival: Give an enemy minion -2/-2.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [{ op: 'buff', target: 'chosen', attack: -2, health: -2 }] }],
  },
  {
    ...Z, id: 'graveyard_overseer', name: 'Graveyard Overseer', art: '🪦', cost: 5, attack: 4, health: 6,
    text: 'Your other Zombies have +1 Attack. Exit: Summon a 1/2 Walker.',
    aura: { target: { minions: { side: 'friendly', tribe: 'Zombie', excludeSelf: true } }, attack: 1 },
    triggers: [{ on: 'deathrattle', effects: [walkers(1)] }],
  },
  {
    ...Z, id: 'undead_abomination', name: 'Undead Abomination', art: '👹', cost: 7, attack: 7, health: 7, keywords: ['Taunt'],
    text: 'Taunt. Exit: Deal 3 damage to all enemy minions.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'damageAll', side: 'enemy', amount: 3 }] }],
  },
  {
    ...Z, id: 'zombie_apocalypse', name: 'Zombie Apocalypse', art: '🌋', cost: 9, attack: 8, health: 8,
    text: 'Arrival: For each 2 Corpses you control, summon a 1/2 Walker, up to 5. Exit: Summon three 1/2 Walkers.',
    // Ruling: counting doesn't consume the Corpses.
    triggers: [
      { on: 'battlecry', effects: [walkers(0, { countFromCorpses: { per: 2, max: 5 } })] },
      { on: 'deathrattle', effects: [walkers(3)] },
    ],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'zombification', name: 'Zombification', art: '🧬', cost: 4,
    text: 'Give all minions: "Exit: Summon a 1/2 Walker or a 2/1 Runner."',
    // Ruling: the Walker / Runner is summoned for the player who cast Zombification.
    effects: [{ op: 'grantTrigger', target: { minions: { side: 'any' } }, log: 'Every minion carries the plague.',
      trigger: { on: 'deathrattle', effects: [walkerOrRunner] } }],
  },
  {
    ...S, id: 'zombie_bite', name: 'Zombie Bite', art: '🦷', cost: 2,
    text: "Deal 2 damage to a minion and restore 2 Health to your Hero. It gains \"Exit: Leave a Corpse on the enemy side and summon a 1/2 Walker or 2/1 Runner.\"",
    target: ANY_MINION,
    // Ruling: "the enemy side" is the caster's opponent; the Walker/Runner is the caster's.
    effects: [
      { op: 'grantTrigger', target: 'chosen', trigger: { on: 'deathrattle', effects: [{ op: 'addCorpses', side: 'enemy' }, walkerOrRunner] } },
      { op: 'damage', target: 'chosen', amount: 2 },
      { op: 'heal', target: 'friendlyHero', amount: 2 },
    ],
  },
  {
    ...S, id: 'raise_the_dead', name: 'Raise the Dead', art: '🙌', cost: 3, requiresCorpses: 2,
    text: 'Consume 2 friendly Corpses. Summon a random friendly Zombie that died this game.',
    // Ruling: playable only with 2+ Corpses.
    effects: [{ op: 'consumeCorpses', count: 2, effects: [{ op: 'summon', fromDeadZombies: true }] }],
  },
  {
    ...S, id: 'zombie_feeding_frenzy', name: 'Feeding Frenzy', art: '🍽️', cost: 4, requiresCorpses: 1,
    text: 'Consume a friendly Corpse. Give all friendly Zombies +2 Attack this turn.',
    effects: [{ op: 'consumeCorpses', count: 1, effects: [{ op: 'buff', target: FRIENDLY_ZOMBIES, attack: 2, temporary: true }] }],
  },
  {
    ...S, id: 'graveyard_awakening', name: 'Graveyard Awakening', art: '🌙', cost: 5, requiresCorpses: 3,
    text: 'Consume 3 friendly Corpses. Summon two random Zombies that died this game. They have Reborn.',
    effects: [{ op: 'consumeCorpses', count: 3, effects: [{ op: 'summon', fromDeadZombies: true, count: 2, keywords: ['Reborn'] }] }],
  },
  {
    ...S, id: 'outbreak', name: 'Outbreak', art: '🦠', cost: 6,
    text: 'Summon three 1/2 Walkers. Give all friendly Zombies +1/+1.',
    effects: [walkers(3), { op: 'buff', target: FRIENDLY_ZOMBIES, attack: 1, health: 1 }],
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'sudden_hunger', name: 'Sudden Hunger', art: '🤤', cost: 1, quickPlay: {},
    text: 'Give a friendly Zombie +3 Attack this turn. If it destroys an enemy minion, restore 3 Health to your Hero.',
    target: { type: 'minion', ...FRIENDLY_ZOMBIE },
    // Ruling: "If it destroys" = any enemy minion it kills this turn (each one heals 3).
    effects: [
      { op: 'buff', target: 'chosen', attack: 3, temporary: true },
      { op: 'grantTrigger', target: 'chosen', temporary: true,
        trigger: { on: 'minionDied', filter: { source: 'enemyMinion', killer: 'self' }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 3 }] } },
    ],
  },
  {
    ...S, id: 'death_is_temporary', name: 'Death Is Temporary', art: '⏳', cost: 2,
    text: 'When a friendly Zombie dies, return it to the battlefield with 1 Health. It loses Reborn. The Zombie leaves a Corpse when it dies again.',
    quickPlay: { windows: ['minionDied'], filter: { source: FRIENDLY_ZOMBIE } },
    effects: [{ op: 'summon', eventCard: true, health: 1, loseKeywords: ['Reborn'] }],
  },
  {
    ...S, id: 'zombie_surge', name: 'Zombie Surge', art: '🌊', cost: 3, quickPlay: {},
    text: 'Give your Zombies Rush and +2 Attack this turn. Zombies that already have Rush instead gain +4 Attack.',
    effects: [{ op: 'surge', target: FRIENDLY_ZOMBIES, keyword: 'Rush', attack: 2, attackIfHas: 4 }],
  },
  {
    ...S, id: 'corpse_shield', name: 'Corpse Shield', art: '🛡️', cost: 2,
    text: "When a friendly minion would take lethal damage: prevent it and give it Reborn. A Zombie leaves an extra Corpse if it dies later this turn.",
    // Designer ruling: a Zombie always leaves a Corpse; this one leaves a second one if it dies this turn.
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: { side: 'friendly' }, lethal: true } },
    effects: [
      { op: 'preventDamage', target: 'eventTarget', amount: 'all' },
      { op: 'buff', target: 'eventTarget', keywords: ['Reborn'] },
      { op: 'grantTrigger', target: 'eventTarget', temporary: true, if: { subject: 'eventTarget', tribe: 'Zombie' },
        trigger: { on: 'deathrattle', effects: [{ op: 'addCorpses', count: 1 }] } },
    ],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'hidden_corpse', name: 'Hidden Corpse', art: '🫥', cost: 2,
    text: 'When an enemy minion attacks your Hero, summon a 1/2 Walker with Taunt.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [walkers(1, { keywords: ['Taunt'] })] },
  },
  {
    ...T, id: 'dead_mans_trap', name: 'Dead Man’s Trap', art: '💀', cost: 3,
    text: 'When an enemy minion destroys a friendly minion, summon a 2/1 Runner with Rush and create a Corpse.',
    trap: { on: 'minionDied', filter: { source: { side: 'friendly' }, killerPlayer: 'enemy', killerMinion: true },
      effects: [{ op: 'summon', cardId: 'runner' }, { op: 'addCorpses' }] },
  },
  {
    ...T, id: 'zombie_ambush', name: 'Zombie Ambush', art: '🌫️', cost: 3,
    text: 'When your opponent plays a minion, summon a random Zombie that costs 3 or less Mana.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [{ op: 'summon', randomMinion: { tribe: 'Zombie', maxCost: 3 } }] },
  },
  {
    ...T, id: 'endless_horde', name: 'Endless Horde', art: '♾️', cost: 5,
    text: 'When three or more friendly Zombies have died this turn, consume 3 Corpses and summon three 1/2 Walkers.',
    // Ruling: it also needs 3 Corpses to spend (it stays hidden until it can).
    trap: { on: 'minionDied', filter: { source: FRIENDLY_ZOMBIE, minZombieDeaths: 3, minCorpses: 3 },
      effects: [{ op: 'consumeCorpses', count: 3, effects: [walkers(3)] }] },
  },

  // ---- The Rage Outbreak (unlockable) ----
  // Infect: mark an enemy minion; when it dies, the infector summons a 2/1 Rage Runner with Rush.
  // Rage: whenever it takes damage and survives, it gains +1 Attack.
  {
    ...Z, tribes: ['Infected', 'Human'], id: 'patient_zero', name: 'Patient Zero', art: '🧪', extra: true, cost: 1, attack: 1, health: 2,
    text: 'Arrival: Infect an enemy minion.',
    target: ENEMY_MINION,
    triggers: [{ on: 'battlecry', effects: [infect('chosen')] }],
  },
  {
    ...Z, tribes: ['Infected', 'Beast'], id: 'rage_chimpanzee', name: 'Rage Chimpanzee', art: '🐒', extra: true, cost: 2, attack: 2, health: 1, keywords: ['Rush', 'Rage'],
    text: 'Rush. Rage. Whenever this attacks a minion, Infect it.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [infect('eventTarget')] }],
  },
  {
    ...Z, tribes: ['Infected', 'Human'], id: 'lab_escapee', name: 'Lab Escapee', art: '🥼', extra: true, cost: 2, attack: 2, health: 1, keywords: ['Rush'],
    text: 'Rush. Exit: Infect a random enemy minion.',
    triggers: [{ on: 'deathrattle', effects: [infect(RANDOM_ENEMY)] }],
  },
  {
    ...Z, tribes: ['Infected', 'Human'], id: 'sprinting_infected', name: 'Sprinting Infected', art: '🏃', extra: true, cost: 4, attack: 3, health: 2, keywords: ['Charge', 'Rage'],
    text: 'Charge. Rage.',
  },
  {
    ...Z, tribes: ['Infected', 'Human'], id: 'blood_vomiter', name: 'Blood Vomiter', art: '🤮', extra: true, cost: 3, attack: 2, health: 4,
    text: 'Whenever this attacks a minion, Infect it.',
    triggers: [{ on: 'attackDeclared', filter: { source: 'self', target: 'enemyMinion' }, effects: [infect('eventTarget')] }],
  },
  {
    ...Z, tribes: ['Infected', 'Beast'], id: 'infected_rat_swarm', name: 'Infected Rat Swarm', art: '🐀', extra: true, cost: 2, attack: 1, health: 1,
    text: 'Exit: Summon two 1/1 Plague Rats with Rush.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'summon', cardId: 'plague_rat', count: 2 }] }],
  },
  {
    ...Z, tribes: ['Infected', 'Beast'], id: 'rage_hound', name: 'Rage Hound', art: '🐕', extra: true, cost: 5, attack: 4, health: 3, keywords: ['Rush', 'Rage'],
    text: 'Rush. Rage. Whenever this destroys an enemy minion, gain +1/+1.',
    triggers: [{ on: 'minionDied', filter: { source: 'enemyMinion', killer: 'self' }, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1, if: { subject: 'self', alive: true } }] }],
  },
  {
    ...S, id: 'quarantine_breach', name: 'Quarantine Breach', art: '🚧', extra: true, cost: 3,
    text: 'Infect all enemy minions with 3 or less Health.',
    effects: [infect({ minions: { side: 'enemy', maxHealth: 3 } })],
  },
  {
    ...S, id: 'contaminated_blood', name: 'Contaminated Blood', art: '🩸', extra: true, cost: 1,
    text: "Infect an enemy minion. If it's already Infected, destroy it instead.",
    target: ENEMY_MINION,
    effects: [
      { op: 'destroy', target: 'chosen', if: { subject: 'chosen', infected: true } },
      infect('chosen'),
    ],
  },
  {
    ...S, id: 'rage_virus', name: 'Rage Virus', art: '🦠', extra: true, cost: 4,
    text: 'Give your Zombies and Infected Rage. Infect a random enemy minion.',
    effects: [{ op: 'buff', target: { minions: { side: 'friendly', tribes: ['Zombie', 'Infected'] } }, keywords: ['Rage'] }, infect(RANDOM_ENEMY)],
  },
  {
    ...Z, tribes: ['Infected', 'Beast'], id: 'infected_crows', name: 'Infected Crows', art: '🐦‍⬛', extra: true, cost: 5, attack: 2, health: 2,
    text: 'Arrival: Deal 1 damage to all enemy minions, then Infect them.',
    triggers: [{ on: 'battlecry', effects: [{ op: 'damageAll', side: 'enemy', amount: 1 }, infect({ minions: { side: 'enemy', alive: true } })] }],
  },
  {
    ...Z, tribes: ['Infected', 'Human'], id: 'hazmat_husk', name: 'Hazmat Husk', art: '☢️', extra: true, cost: 5, attack: 3, health: 7, keywords: ['Taunt', 'Rage'],
    text: 'Taunt. Rage. Exit: Create 2 Corpses.',
    triggers: [{ on: 'deathrattle', effects: [{ op: 'addCorpses', count: 2 }] }],
  },
  {
    ...T, id: 'sealed_ward', name: 'Sealed Ward', art: '🚪', extra: true, cost: 2,
    text: 'When an enemy minion attacks, Infect it and give it -2 Attack this turn.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion' },
      effects: [infect('eventSource'), { op: 'buff', target: 'eventSource', attack: -2, temporary: true }] },
  },
  {
    ...Z, tribes: ['Infected', 'Beast'], id: 'silverback_abomination', name: 'Silverback Abomination', art: '🦍', extra: true, cost: 7, attack: 6, health: 5, keywords: ['Rush', 'Rage'],
    text: 'Rush. Rage. Arrival: Consume up to 3 friendly Corpses. Gain +1/+1 for each.',
    triggers: [{ on: 'battlecry', effects: [1, 2, 3].map(() => ({ op: 'consumeCorpses', count: 1, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1 }] })) }],
  },
  {
    ...Z, tribes: ['Infected', 'Human'], id: 'the_outbreak', name: 'The Outbreak', art: '☣️', extra: true, cost: 9, attack: 6, health: 6,
    text: 'Arrival: Infect all enemy minions. While you control this, your Rage Runners from Infections have +2/+2.',
    triggers: [{ on: 'battlecry', effects: [infect({ minions: { side: 'enemy', alive: true } })] }],
  },
  {
    ...Z, tribes: ['Zombie', 'Beast'], id: 'la_brea_the_tar_pit_mammoth', name: 'La Brea, the Tar Pit Mammoth', art: '🦣', extra: true, cost: 8, attack: 6, health: 8,
    keywords: ['Taunt', 'Thick Fur', 'Reborn'], text: 'Taunt. Thick Fur. Reborn.',
  },

  // ---- Tokens ----
  { ...Z, id: 'zombie', name: 'Zombie', art: '🧟', token: true, cost: 1, attack: 1, health: 1, text: '' },
  { ...Z, tribes: ['Infected', 'Human'], id: 'rage_runner', name: 'Rage Runner', art: '😡', token: true, cost: 2, attack: 2, health: 1, keywords: ['Rush'], text: 'Rush. Risen from an Infected minion.' },
  { ...Z, id: 'plague_rat', name: 'Plague Rat', art: '🐀', token: true, tribes: ['Zombie', 'Beast'], cost: 1, attack: 1, health: 1, keywords: ['Rush'], text: 'Rush.' },
];
