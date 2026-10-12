// DEMON FACTION — The Infernal Pact. The designer's complete 30-card list + Hero Spell.
// Text is the designer's wording ("Battlecry" shown as Arrival). Interpretation
// choices are marked "Ruling:" and listed in docs/OPEN_QUESTIONS.md (Q15).
//
// Paying Health (Demon rule): "Lose N Health" on a Demon card is a cost paid
// with Health. It is not damage (Armor, Evade and damage prevention don't stop
// it) and it raises a heroLostHealth event marked paid (Pact Fiend, Blood
// Ritualist). Health paid to summon a Demon is also marked forSummon (Soul Collector).
//
// Infernal Summoning (Hero Spell): each player has a Summoning Tier (1..10).
//
// Every Demon-faction minion carries the 'Demon' tribe.

const DM = { faction: 'Demons', type: 'minion', tribes: ['Demon'] };
const S = { faction: 'Demons', type: 'spell' };
const T = { faction: 'Demons', type: 'trap' };

const pay = (amount, extra = {}) => ({ op: 'loseHealth', target: 'friendlyHero', amount, ...extra });
const paySummon = (amount) => pay(amount, { forSummon: true });
const randomDemon = (maxCost, extra = {}) => ({ op: 'summon', randomMinion: { tribe: 'Demon', faction: 'Demons', maxCost }, ...extra });
const FRIENDLY_DEMON = { type: 'minion', side: 'friendly', tribe: 'Demon' };
const FRIENDLY_DEMONS = { minions: { side: 'friendly', tribe: 'Demon' } };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const PAID = { player: 'friendly', paid: true };

export const DEMON_CARDS = [
  // ---- Hero Spell ----
  {
    ...S, id: 'infernal_summoning', name: 'Infernal Summoning', art: '🕳️', heroSpell: true, cost: 2, needsBoardSpace: true,
    text: 'Lose Health equal to your Summoning Tier. Summon a random Demon of that Mana Cost. Starts at Tier 1; each use raises the Tier by 1, up to 10.',
    effects: [{ op: 'infernalSummon' }],
  },

  // ---- Minions (16) ----
  {
    ...DM, id: 'blood_imp', name: 'Blood Imp', art: '🩸', cost: 1, attack: 1, health: 2,
    text: 'Whenever your Hero loses Health, gain +1 Attack this turn. Triggers at most once per turn.',
    triggers: [{ on: 'heroLostHealth', filter: { player: 'friendly' }, effects: [{ op: 'buff', target: 'self', attack: 1, temporary: true, perTurnLimit: 1 }] }],
  },
  {
    ...DM, id: 'soul_imp', name: 'Soul Imp', art: '👻', cost: 1, attack: 2, health: 1,
    text: 'Arrival: Lose 1 Health. Draw a card.',
    triggers: [{ on: 'battlecry', effects: [pay(1), { op: 'draw' }] }],
  },
  {
    ...DM, id: 'pact_fiend', name: 'Pact Fiend', art: '📜', cost: 2, attack: 2, health: 3,
    text: 'The first time you pay Health each turn, gain +1/+1.',
    triggers: [{ on: 'heroLostHealth', filter: PAID, effects: [{ op: 'buff', target: 'self', attack: 1, health: 1, perTurnLimit: 1 }] }],
  },
  {
    ...DM, id: 'soul_collector', name: 'Soul Collector', art: '⚱️', cost: 2, attack: 2, health: 2,
    text: 'Whenever you pay Health to summon a Demon, restore 1 Health to your Hero.',
    triggers: [{ on: 'heroLostHealth', filter: { player: 'friendly', forSummon: true }, effects: [{ op: 'heal', target: 'friendlyHero', amount: 1 }] }],
  },
  {
    ...DM, id: 'hellhound', name: 'Hellhound', art: '🐕', cost: 3, attack: 3, health: 3, keywords: ['Rush'],
    text: 'Rush. Arrival: Lose 2 Health. Gain +2 Attack this turn.',
    triggers: [{ on: 'battlecry', effects: [pay(2), { op: 'buff', target: 'self', attack: 2, temporary: true }] }],
  },
  {
    ...DM, id: 'blood_ritualist', name: 'Blood Ritualist', art: '🕯️', cost: 3, attack: 2, health: 4,
    text: 'Whenever you lose Health from your own card effects, give a random friendly Demon +1 Attack.',
    triggers: [{ on: 'heroLostHealth', filter: PAID, effects: [{ op: 'buff', target: { randomOf: { minions: { side: 'friendly', tribe: 'Demon' } } }, attack: 1 }] }],
  },
  {
    ...DM, id: 'abyssal_brute', name: 'Abyssal Brute', art: '👹', cost: 4, attack: 4, health: 4,
    text: 'Arrival: Lose 3 Health. Gain +2/+2.',
    triggers: [{ on: 'battlecry', effects: [pay(3), { op: 'buff', target: 'self', attack: 2, health: 2 }] }],
  },
  {
    ...DM, id: 'soulflayer', name: 'Soulflayer', art: '🦑', cost: 4, attack: 3, health: 5,
    text: 'Arrival: Lose 2 Health. Deal 2 damage to an enemy minion and restore 2 Health to this minion.',
    target: { type: 'minion', side: 'enemy' },
    triggers: [{ on: 'battlecry', effects: [pay(2), { op: 'damage', target: 'chosen', amount: 2 }, { op: 'heal', target: 'self', amount: 2 }] }],
  },
  {
    ...DM, id: 'dread_summoner', name: 'Dread Summoner', art: '🔮', cost: 5, attack: 4, health: 5,
    text: 'Whenever you use your Hero Spell, summon a 1/1 Imp. This can trigger only once per turn.',
    triggers: [{ on: 'cardPlayed', filter: { player: 'friendly', heroSpell: true }, effects: [{ op: 'summon', cardId: 'imp', perTurnLimit: 1 }] }],
  },
  {
    ...DM, id: 'infernal_ravager', name: 'Infernal Ravager', art: '🔥', cost: 5, attack: 5, health: 4,
    text: 'Arrival: Lose 3 Health. Deal 3 damage to the enemy Hero.',
    triggers: [{ on: 'battlecry', effects: [pay(3), { op: 'damage', target: 'enemyHero', amount: 3 }] }],
  },
  {
    ...DM, id: 'succubus_queen', name: 'Succubus Queen', art: '💋', cost: 6, attack: 5, health: 6,
    text: 'Arrival: Lose 3 Health. Take control of an enemy minion with 3 or less Attack until the end of your turn.',
    target: { type: 'minion', side: 'enemy', maxAttack: 3 },
    // Ruling (Q15): the stolen minion can attack this turn.
    triggers: [{ on: 'battlecry', effects: [pay(3), { op: 'takeControlTemporarily', target: 'chosen', until: 'endOfTurn' }] }],
  },
  {
    ...DM, id: 'pit_lord', name: 'Pit Lord', art: '🌋', cost: 6, attack: 6, health: 7,
    text: 'Arrival: Lose 3 Health. Deal 3 damage to all other characters.',
    // Ruling (Q15): "all other characters" includes both Heroes and your own minions.
    triggers: [{ on: 'battlecry', effects: [pay(3), { op: 'damage', target: { characters: { side: 'any', excludeSelf: true } }, amount: 3 }] }],
  },
  {
    ...DM, id: 'doom_herald', name: 'Doom Herald', art: '📯', cost: 7, attack: 6, health: 6,
    text: 'At the end of your turn, lose 2 Health. Give your other Demons +1/+1.',
    triggers: [{ on: 'endOfTurn', filter: { player: 'friendly' }, effects: [
      pay(2), { op: 'buff', target: { minions: { side: 'friendly', tribe: 'Demon', excludeSelf: true } }, attack: 1, health: 1 },
    ] }],
  },
  {
    ...DM, id: 'demon_prince', name: 'Demon Prince', art: '👑', cost: 8, attack: 7, health: 8,
    text: 'Arrival: Lose 5 Health. Summon a random Demon that costs 5 Mana or less.',
    triggers: [{ on: 'battlecry', effects: [paySummon(5), randomDemon(5)] }],
  },
  {
    ...DM, id: 'archfiend_of_ruin', name: 'Archfiend of Ruin', art: '💀', cost: 9, attack: 8, health: 8,
    text: 'Arrival: Lose 4 Health. Deal 4 damage to all enemy minions. For each enemy minion destroyed, restore 2 Health to your Hero.',
    triggers: [{ on: 'battlecry', effects: [pay(4), { op: 'damageAll', side: 'enemy', amount: 4, perEnemyKilled: [{ op: 'heal', target: 'friendlyHero', amount: 2 }] }] }],
  },
  {
    ...DM, id: 'the_world_eater', name: 'The World Eater', art: '🌑', cost: 10, attack: 10, health: 10,
    text: 'Arrival: Lose 5 Health. Deal 5 damage to all enemy characters. If your Hero survives this Health loss, gain Lifesteal this turn.',
    // Ruling (Q15): The World Eater itself gains Lifesteal.
    triggers: [{ on: 'battlecry', effects: [
      pay(5),
      { op: 'damage', target: { characters: { side: 'enemy' } }, amount: 5 },
      { op: 'buff', target: 'self', temporaryKeywords: ['Lifesteal'], if: { subject: 'friendlyHero', alive: true } },
    ] }],
  },

  // ---- Spells (6) ----
  {
    ...S, id: 'blood_pact', name: 'Blood Pact', art: '🤝', cost: 2,
    text: 'Lose 2 Health. Give a friendly Demon +2/+2.',
    target: FRIENDLY_DEMON,
    effects: [pay(2), { op: 'buff', target: 'chosen', attack: 2, health: 2 }],
  },
  {
    ...S, id: 'infernal_bargain', name: 'Infernal Bargain', art: '⚖️', cost: 2,
    text: 'Lose 3 Health. Discover a Demon that costs 3 Mana or less.',
    // Ruling (Q15): Discover picks from your deck, like every Discover in the game.
    effects: [pay(3), { op: 'discover', from: 'deck', filter: { tribe: 'Demon', maxCost: 3 } }],
  },
  {
    ...S, id: 'soul_sacrifice', name: 'Soul Sacrifice', art: '🗡️', cost: 3,
    text: 'Destroy a friendly Demon. Restore Health to your Hero equal to its Mana Cost.',
    target: FRIENDLY_DEMON,
    effects: [{ op: 'sacrifice', target: 'chosen' }],
  },
  {
    ...S, id: 'unholy_empowerment', name: 'Unholy Empowerment', art: '⚡', cost: 3,
    text: 'Lose 3 Health. Give a friendly minion +3/+3 and Lifesteal this turn.',
    target: { type: 'minion', side: 'friendly' },
    // Ruling (Q15): +3/+3 is permanent; only Lifesteal is for this turn.
    effects: [pay(3), { op: 'buff', target: 'chosen', attack: 3, health: 3, temporaryKeywords: ['Lifesteal'] }],
  },
  {
    ...S, id: 'open_the_abyss', name: 'Open the Abyss', art: '🌀', cost: 5, needsBoardSpace: true,
    text: 'Lose 5 Health. Summon a random Demon that costs 5 Mana or less.',
    effects: [paySummon(5), randomDemon(5)],
  },
  {
    ...S, id: 'infernal_ascension', name: 'Infernal Ascension', art: '⬆️', cost: 7,
    text: 'Lose 4 Health. Give all friendly Demons +3/+3. If your Hero has 10 Health or less afterward, give them Taunt as well.',
    effects: [
      pay(4),
      { op: 'buff', target: FRIENDLY_DEMONS, attack: 3, health: 3 },
      { op: 'buff', target: FRIENDLY_DEMONS, keywords: ['Taunt'], if: { subject: 'friendlyHero', healthAtMost: 10 } },
    ],
  },

  // ---- Quick Plays (4) ----
  {
    ...S, id: 'desperate_pact', name: 'Desperate Pact', art: '🙏', cost: 1,
    text: 'When a friendly character would take damage, lose 2 Health to prevent 3 of that damage.',
    quickPlay: { windows: ['wouldTakeDamage'], filter: { target: 'friendlyCharacter' } },
    effects: [pay(2), { op: 'preventDamage', target: 'eventTarget', amount: 3 }],
  },
  {
    ...S, id: 'soul_surge', name: 'Soul Surge', art: '💥', cost: 2,
    text: 'When a friendly Demon attacks, lose 2 Health to give it +3 Attack for that attack and Lifesteal.',
    // Ruling (Q15): offered on your own turn, when your Demon attacks; the bonus lasts until the end of the turn.
    quickPlay: { windows: ['friendlyAttack'], filter: { source: { side: 'friendly', tribe: 'Demon' } } },
    effects: [pay(2), { op: 'buff', target: 'eventSource', attack: 3, temporary: true, temporaryKeywords: ['Lifesteal'] }],
  },
  {
    ...S, id: 'unleash_the_beast', name: 'Unleash the Beast', art: '🐺', cost: 3, needsBoardSpace: true,
    text: 'When an enemy minion attacks, lose 3 Health to summon a random Demon that costs 3 Mana or less with Taunt. It can protect your Hero from that attack.',
    // Ruling (Q15): if the attack was aimed at your Hero, the new Demon takes it instead.
    quickPlay: { windows: ['attackDeclared'], filter: { source: 'enemyMinion' } },
    effects: [
      paySummon(3), randomDemon(3, { keywords: ['Taunt'] }),
      { op: 'redirectAttack', to: 'summoned', onlyFromHero: true },
    ],
  },
  {
    ...S, id: 'pain_into_power', name: 'Pain into Power', art: '💢', cost: 2,
    text: 'When your Hero loses Health, give a friendly Demon +2 Health and +2 Attack this turn.',
    // Ruling (Q15): offered on either turn; the +2 Health is permanent, the +2 Attack is this turn.
    quickPlay: { windows: ['heroLostHealth'], filter: { player: 'friendly' } },
    target: FRIENDLY_DEMON,
    effects: [{ op: 'buff', target: 'chosen', attack: 2, temporary: true, health: 2 }],
  },

  // ---- Traps (4) ----
  {
    ...T, id: 'infernal_ambush', name: 'Infernal Ambush', art: '🪤', cost: 2,
    text: 'When an enemy minion attacks your Hero, lose 2 Health to summon a 3/3 Demon with Taunt.',
    trap: { on: 'attackDeclared', filter: { source: 'enemyMinion', target: 'friendlyHero' }, effects: [paySummon(2), { op: 'summon', cardId: 'lesser_demon' }] },
  },
  {
    ...T, id: 'soul_snare', name: 'Soul Snare', art: '🕸️', cost: 3,
    text: 'When your opponent plays a minion, lose 2 Health to give it -3 Attack this turn. If its Attack reaches 0, destroy it.',
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      pay(2),
      { op: 'buff', target: 'eventSource', attack: -3, temporary: true },
      { op: 'destroy', target: 'eventSource', if: { subject: 'eventSource', attackAtMost: 0 } },
    ] },
  },
  {
    ...T, id: 'blood_price', name: 'Blood Price', art: '🩸', cost: 3,
    text: 'When your Hero takes damage, summon a random Demon that costs 3 Mana or less. This Trap can trigger only once per turn.',
    trap: { on: 'damageDealt', filter: { target: 'friendlyHero' }, effects: [randomDemon(3)] },
  },
  {
    ...T, id: 'gateway_collapse', name: 'Gateway Collapse', art: '🚪', cost: 5,
    text: 'When your opponent summons a minion, lose 4 Health to summon a random Demon that costs 4 Mana or less with Taunt. It attacks the triggering minion if able.',
    // Ruling (Q15): "summons" = plays a minion; the new Demon fights it right away.
    trap: { on: 'cardPlayed', filter: { player: 'enemy', cardType: 'minion' }, effects: [
      paySummon(4), randomDemon(4, { keywords: ['Taunt'] }), { op: 'fight', attacker: 'summoned', defender: 'eventSource' },
    ] },
  },

  // ---- Tokens ----
  { ...DM, id: 'imp', name: 'Imp', art: '😈', token: true, cost: 1, attack: 1, health: 1, text: '' },
  { ...DM, id: 'lesser_demon', name: 'Lesser Demon', art: '👿', token: true, cost: 3, attack: 3, health: 3, keywords: ['Taunt'], text: 'Taunt.' },
];
