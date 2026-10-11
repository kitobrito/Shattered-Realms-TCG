// FUSION HERO SPELLS — one per faction pair (two-faction mode only).
// A Fusion charges by 1 each time you use either of your Hero Spells (and at
// the start of every other turn for Dinosaur pairs); at 3 charges it can be cast,
// which spends the charge. See docs/FUSION_HERO_SPELLS.md for the design list;
// simplifications made while building are marked "Ruling:".

const F = (a, b) => ({ faction: 'Fusion', type: 'spell', heroSpell: true, fusion: [a, b] });

const pay = (amount) => ({ op: 'loseHealth', target: 'friendlyHero', amount });
const healHero = (amount) => ({ op: 'heal', target: 'friendlyHero', amount, overheal: true });
const mushrooms = (count) => ({ op: 'placeMushrooms', count });
const burn = (target, amount) => ({ op: 'applyBurn', target, amount });
const rebornTillNext = (target) => ({ op: 'buff', target, lingerKeywords: ['Reborn'], untilYourNextTurn: true });
const upgraded = (target = 'chosen') => ({ op: 'markUpgrade', target });
const seedling = (extra = {}) => ({ op: 'summon', cardId: 'seedling', ...extra });
const modular = (target) => ({ op: 'chooseOne', prompt: 'Modular Upgrade', options: [
  { label: 'Reinforced Frame: +1 Attack, +2 Health', effects: [{ op: 'buff', target, attack: 1, health: 2 }, upgraded(target)] },
  { label: 'Offensive Calibration: +2 Attack, +1 Health', effects: [{ op: 'buff', target, attack: 2, health: 1 }, upgraded(target)] },
] });

const FRIENDLY_CHARACTER = { type: 'character', side: 'friendly' };
const FRIENDLY_MINION = { type: 'minion', side: 'friendly' };
const FRIENDLY_ROBOT = { type: 'minion', side: 'friendly', tribe: 'Robot' };
const ENEMY_CHARACTER = { type: 'character', side: 'enemy' };
const ENEMY_MINION = { type: 'minion', side: 'enemy' };
const ENEMY_MINIONS = { minions: { side: 'enemy' } };
const ENEMY_CHARACTERS = { characters: { side: 'enemy' } };
const onMushroomBurst = (effects) => ({ op: 'heroTrigger', trigger: { on: 'mushroomTriggered', filter: { player: 'enemy' }, effects } });

export const FUSION_CARDS = [
  // ---- Vampires ----
  { ...F('Vampires', 'Aliens'), id: 'blood_splice', name: 'Blood Splice', art: '🧬', cost: 3,
    text: 'Lose 2 Health. Discover a minion from your deck. It costs (2) less.',
    // Ruling: the Lifesteal from the draft is left out (cards in hand can't carry keywords yet).
    effects: [pay(2), { op: 'discover', from: 'deck', filter: { type: 'minion' }, costMod: -2 }] },
  { ...F('Vampires', 'Dinosaurs'), id: 'primal_thirst', name: 'Primal Thirst', art: '🩸', cost: 4,
    text: 'Lose 2 Health. Gain 2 Primal Mana this turn. A random friendly Dinosaur gets +2 Attack and Lifesteal this turn.',
    effects: [pay(2), { op: 'gainPrimal', amount: 2 },
      { op: 'buff', target: { randomOf: { minions: { side: 'friendly', tribe: 'Dinosaur' } } }, attack: 2, temporary: true, temporaryKeywords: ['Lifesteal'] }] },
  { ...F('Vampires', 'Plants'), id: 'bloodroot', name: 'Bloodroot', art: '🌱', cost: 3,
    text: 'Lose 1 Health. Summon a 1/2 Seedling with Lifesteal.',
    effects: [pay(1), seedling({ attack: 1, health: 2, keywords: ['Lifesteal'] })] },
  { ...F('Vampires', 'Fungus'), id: 'blood_spores', name: 'Blood Spores', art: '🍄', cost: 3,
    text: 'Lose 2 Health. Place 3 Mushrooms in the enemy deck. This game, whenever Mushrooms burst on the enemy, restore 1 Health to your Hero.',
    effects: [pay(2), mushrooms(3), onMushroomBurst([healHero(1)])] },
  { ...F('Vampires', 'Zombies'), id: 'undying_hunger', name: 'Undying Hunger', art: '🧛', cost: 3,
    text: 'Give a friendly minion +2 Attack and Lifesteal this turn, and Reborn until your next turn.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'buff', target: 'chosen', attack: 2, temporary: true, temporaryKeywords: ['Lifesteal'] }, rebornTillNext('chosen')] },
  { ...F('Vampires', 'Dragons'), id: 'boiling_blood', name: 'Boiling Blood', art: '🔥', cost: 4,
    text: 'Lose 2 Health. Apply Burn 3 to an enemy character. This game, Burn damage to enemies restores that much Health to your Hero.',
    target: ENEMY_CHARACTER,
    effects: [pay(2), burn('chosen', 3),
      { op: 'heroTrigger', trigger: { on: 'burnDamage', filter: { target: 'enemyCharacter' }, effects: [{ op: 'heal', target: 'friendlyHero', amountFromEvent: true }] } }] },
  { ...F('Vampires', 'Demons'), id: 'blood_covenant', name: 'Blood Covenant', art: '🤝', cost: 5, needsBoardSpace: true,
    text: 'Lose 2 Health. Summon a random Demon of your current Summoning Tier with Lifesteal. (The Tier doesn\'t rise.)',
    effects: [pay(2), { op: 'infernalSummon', pay: false, rise: false, keywords: ['Lifesteal'] }] },
  { ...F('Vampires', 'Divine'), id: 'blood_sacrament', name: 'Blood Sacrament', art: '🍷', cost: 3,
    text: 'Lose 1 Health. Give a friendly character +2 Attack this turn, then restore 2 Health to it (Overheal).',
    target: FRIENDLY_CHARACTER,
    effects: [pay(1), { op: 'buff', target: 'chosen', attack: 2, temporary: true }, { op: 'heal', target: 'chosen', amount: 2, overheal: true }] },
  { ...F('Vampires', 'Robots'), id: 'blood_engine', name: 'Blood Engine', art: '⚙️', cost: 4,
    text: 'Lose 2 Health. Upgrade a friendly Robot: +3/+1 and Lifesteal.',
    target: FRIENDLY_ROBOT,
    effects: [pay(2), { op: 'buff', target: 'chosen', attack: 3, health: 1, keywords: ['Lifesteal'] }, upgraded()] },

  // ---- Aliens ----
  { ...F('Aliens', 'Dinosaurs'), id: 'gene_raptor', name: 'Gene-Raptor', art: '🦖', cost: 3,
    text: 'Discover a Dinosaur from your deck. It costs (1) less.',
    // Ruling: the random keyword from the draft is left out (cards in hand can't carry keywords yet).
    effects: [{ op: 'discover', from: 'deck', filter: { tribe: 'Dinosaur' }, costMod: -1 }] },
  { ...F('Aliens', 'Plants'), id: 'xeno_bloom', name: 'Xeno-Bloom', art: '🌸', cost: 3, needsBoardSpace: true,
    text: 'Summon a Seedling with 2 random positive keywords.',
    effects: [seedling({ randomKeywords: 2 })] },
  { ...F('Aliens', 'Fungus'), id: 'spore_probe', name: 'Spore Probe', art: '🛸', cost: 3,
    text: 'Place 2 Mushrooms in the enemy deck. Draw a card.',
    // Ruling: "look at the top 3 cards" became "draw a card" (there's no peek screen).
    effects: [mushrooms(2), { op: 'draw' }] },
  { ...F('Aliens', 'Zombies'), id: 'reanimated_hybrid', name: 'Reanimated Hybrid', art: '🧟', cost: 4, needsBoardSpace: true,
    text: 'Summon a random friendly minion that died this game. It gains Reborn and a random positive keyword.',
    effects: [{ op: 'summon', fromGraveyard: {}, keywords: ['Reborn'], randomKeywords: 1 }] },
  { ...F('Aliens', 'Dragons'), id: 'plasma_burn', name: 'Plasma Burn', art: '☄️', cost: 3,
    text: 'Remove all keywords from an enemy minion and apply Burn 2 to it.',
    target: ENEMY_MINION,
    effects: [{ op: 'stripKeywords', target: 'chosen' }, burn('chosen', 2)] },
  { ...F('Aliens', 'Demons'), id: 'abduction_rite', name: 'Abduction Rite', art: '🛸', cost: 5,
    text: 'Lose Health equal to your Summoning Tier. Take control of a random enemy minion that costs that much or less until the end of your turn.',
    effects: [{ op: 'abductionRite' }] },
  { ...F('Aliens', 'Divine'), id: 'holy_sequencing', name: 'Holy Sequencing', art: '🧬', cost: 3,
    text: 'Give a friendly minion Evade, then Discover a keyword for it.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'buff', target: 'chosen', keywords: ['Evade'] }, { op: 'discoverKeyword', target: 'chosen' }] },
  { ...F('Aliens', 'Robots'), id: 'gene_forged_upgrade', name: 'Gene-Forged Upgrade', art: '🔧', cost: 3,
    text: 'Upgrade a friendly Robot: +1/+1, then Discover a keyword for it.',
    target: FRIENDLY_ROBOT,
    effects: [{ op: 'buff', target: 'chosen', attack: 1, health: 1 }, upgraded(), { op: 'discoverKeyword', target: 'chosen' }] },

  // ---- Dinosaurs ----
  { ...F('Dinosaurs', 'Plants'), id: 'primal_seed', name: 'Primal Seed', art: '🥚', cost: 3, needsBoardSpace: true,
    text: 'Summon a 0/3 Primal Egg. At the start of your turn after next, it hatches into a random 3-cost Dinosaur.',
    effects: [{ op: 'summon', cardId: 'primal_seedling' }] },
  { ...F('Dinosaurs', 'Fungus'), id: 'fossil_spores', name: 'Fossil Spores', art: '🦴', cost: 3,
    text: 'Place 3 Mushrooms in the enemy deck. Gain 1 Primal Mana this turn.',
    effects: [mushrooms(3), { op: 'gainPrimal', amount: 1 }] },
  { ...F('Dinosaurs', 'Zombies'), id: 'fossil_revival', name: 'Fossil Revival', art: '💀', cost: 4, needsBoardSpace: true,
    text: 'Summon a random friendly Dinosaur that died this game, with 1 Health and Reborn.',
    effects: [{ op: 'summon', fromGraveyard: { tribes: ['Dinosaur'] }, health: 1, keywords: ['Reborn'] }] },
  { ...F('Dinosaurs', 'Dragons'), id: 'meteor_breath', name: 'Meteor Breath', art: '☄️', cost: 4,
    text: 'Apply Burn 2 to all enemy minions. Your next Extinction comes 1 turn later.',
    effects: [burn(ENEMY_MINIONS, 2), { op: 'delayExtinction', turns: 1 }] },
  { ...F('Dinosaurs', 'Demons'), id: 'primal_pact', name: 'Primal Pact', art: '🔥', cost: 4, needsBoardSpace: true,
    text: 'Lose 3 Health. Summon a random Dinosaur and a random Demon, each costing 3 or less.',
    effects: [pay(3),
      { op: 'summon', randomMinion: { tribe: 'Dinosaur', maxCost: 3 } },
      { op: 'summon', randomMinion: { tribe: 'Demon', maxCost: 3 } }] },
  { ...F('Dinosaurs', 'Divine'), id: 'ancient_blessing', name: 'Ancient Blessing', art: '🦕', cost: 4,
    text: 'Give all friendly Dinosaurs +2 Health. Restore 3 Health to your Hero (Overheal).',
    effects: [{ op: 'buff', target: { minions: { side: 'friendly', tribe: 'Dinosaur' } }, health: 2 }, healHero(3)] },
  { ...F('Dinosaurs', 'Robots'), id: 'mecha_rex', name: 'Mecha-Rex', art: '🤖', cost: 4,
    text: 'Upgrade a friendly minion: +3/+3 and Taunt. It becomes a Robot and a Mech.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'buff', target: 'chosen', attack: 3, health: 3, keywords: ['Taunt'] },
      { op: 'addTribe', target: 'chosen', tribe: 'Robot' }, { op: 'addTribe', target: 'chosen', tribe: 'Mech' }, upgraded()] },

  // ---- Plants ----
  { ...F('Plants', 'Fungus'), id: 'rot_garden', name: 'Rot Garden', art: '🍄', cost: 3, needsBoardSpace: true,
    text: 'Summon a Seedling with Poisonous. Place 1 Mushroom in the enemy deck.',
    effects: [seedling({ keywords: ['Poisonous'] }), mushrooms(1)] },
  { ...F('Plants', 'Zombies'), id: 'grave_bloom', name: 'Grave Bloom', art: '🌱', cost: 3, needsBoardSpace: true,
    text: 'Summon two Seedlings with Reborn.',
    effects: [seedling({ count: 2, keywords: ['Reborn'] })] },
  { ...F('Plants', 'Dragons'), id: 'wildfire', name: 'Wildfire', art: '🔥', cost: 4,
    text: 'Apply Burn 1 to all enemy minions. Give your Seedlings +1 Attack.',
    effects: [burn(ENEMY_MINIONS, 1), { op: 'buff', target: { minions: { side: 'friendly', cardId: 'seedling' } }, attack: 1 }] },
  { ...F('Plants', 'Demons'), id: 'thorned_pact', name: 'Thorned Pact', art: '🌹', cost: 3, needsBoardSpace: true,
    text: 'Lose 2 Health. Summon a Seedling that grows 3 times right away.',
    effects: [pay(2), seedling(),
      ...[1, 2, 3].map(() => ({ op: 'randomBuff', target: 'summoned', options: [{ attack: 1 }, { health: 1 }] }))] },
  { ...F('Plants', 'Divine'), id: 'sacred_grove', name: 'Sacred Grove', art: '🌳', cost: 3,
    text: 'Restore 2 Health to all friendly characters (Overheal). Summon a Seedling.',
    effects: [{ op: 'heal', target: { characters: { side: 'friendly' } }, amount: 2, overheal: true }, seedling()] },
  { ...F('Plants', 'Robots'), id: 'bio_mech_sprout', name: 'Bio-Mech Sprout', art: '🌿', cost: 3, needsBoardSpace: true,
    text: 'Summon a Seedling that is also a Robot, and give it a Modular Upgrade of your choice.',
    effects: [seedling(), { op: 'addTribe', target: 'summoned', tribe: 'Robot' }, modular('summoned')] },

  // ---- Fungus ----
  { ...F('Fungus', 'Zombies'), id: 'plague_bloom', name: 'Plague Bloom', art: '☣️', cost: 3,
    text: 'Place 2 Mushrooms in the enemy deck. Gain 1 Corpse.',
    effects: [mushrooms(2), { op: 'addCorpses', count: 1 }] },
  { ...F('Fungus', 'Dragons'), id: 'smoldering_spores', name: 'Smoldering Spores', art: '🔥', cost: 3,
    text: 'Place 2 Mushrooms in the enemy deck. This game, whenever Mushrooms burst on the enemy, apply Burn 1 to the enemy Hero.',
    effects: [mushrooms(2), onMushroomBurst([burn('enemyHero', 1)])] },
  { ...F('Fungus', 'Demons'), id: 'infestation_pact', name: 'Infestation Pact', art: '🕳️', cost: 4,
    text: 'Lose 2 Health. Place 4 Mushrooms in the enemy deck.',
    effects: [pay(2), mushrooms(4)] },
  { ...F('Fungus', 'Divine'), id: 'purifying_spores', name: 'Purifying Spores', art: '✨', cost: 3,
    text: 'Place 2 Mushrooms in the enemy deck. Restore 2 Health to your Hero (Overheal).',
    effects: [mushrooms(2), healHero(2)] },
  { ...F('Fungus', 'Robots'), id: 'nano_spores', name: 'Nano-Spores', art: '🔬', cost: 3,
    text: 'Place 2 Mushrooms in the enemy deck. A friendly Robot gets +1 Attack this turn for each Mushroom in the enemy deck (up to +3).',
    target: FRIENDLY_ROBOT,
    effects: [mushrooms(2), { op: 'buff', target: 'chosen', temporary: true, attackFromEnemyMushrooms: { max: 3 } }] },

  // ---- Zombies ----
  { ...F('Zombies', 'Dragons'), id: 'ashen_revenant', name: 'Ashen Revenant', art: '🔥', cost: 3,
    text: 'Give a friendly minion Reborn until your next turn and "Exit: Apply Burn 2 to a random enemy."',
    // Ruling: "when it is Reborn" became an Exit (it fires as the minion dies and comes back).
    target: FRIENDLY_MINION,
    effects: [rebornTillNext('chosen'),
      { op: 'grantTrigger', target: 'chosen', trigger: { on: 'deathrattle', effects: [burn({ randomOf: ENEMY_CHARACTERS }, 2)] } }] },
  { ...F('Zombies', 'Demons'), id: 'unholy_reanimation', name: 'Unholy Reanimation', art: '💀', cost: 4, needsBoardSpace: true,
    text: 'Lose 3 Health. Summon a random friendly Zombie or Demon that died this game.',
    effects: [pay(3), { op: 'summon', fromGraveyard: { tribes: ['Zombie', 'Demon'] } }] },
  { ...F('Zombies', 'Divine'), id: 'second_dawn', name: 'Second Dawn', art: '🌅', cost: 3,
    text: 'Give a friendly minion Reborn and +2 Health until your next turn.',
    target: FRIENDLY_MINION,
    effects: [rebornTillNext('chosen'), { op: 'buff', target: 'chosen', health: 2, temporaryHealth: true, untilYourNextTurn: true }] },
  { ...F('Zombies', 'Robots'), id: 'salvage_protocol', name: 'Salvage Protocol', art: '🔩', cost: 3,
    text: 'Give a friendly Robot Reborn until your next turn and +2 Health.',
    // Ruling: "keeps its Upgrades when it returns" became +2 Health (a Reborn minion returns fresh).
    target: FRIENDLY_ROBOT,
    effects: [rebornTillNext('chosen'), { op: 'buff', target: 'chosen', health: 2 }] },

  // ---- Dragons ----
  { ...F('Dragons', 'Demons'), id: 'hellfire_pact', name: 'Hellfire Pact', art: '😈', cost: 4,
    text: 'Lose 2 Health. Apply Burn 2 to all enemy characters.',
    effects: [pay(2), burn(ENEMY_CHARACTERS, 2)] },
  { ...F('Dragons', 'Divine'), id: 'sacred_flame', name: 'Sacred Flame', art: '🕯️', cost: 3,
    text: 'Apply Burn 2 to an enemy character. Restore 2 Health to your Hero (Overheal).',
    target: ENEMY_CHARACTER,
    effects: [burn('chosen', 2), healHero(2)] },
  { ...F('Dragons', 'Robots'), id: 'flame_cannon', name: 'Flame Cannon', art: '🔫', cost: 4,
    text: 'Weapon Upgrade. Give a friendly Robot +2 Attack and: "Whenever it attacks, apply Burn 1 to its target."',
    target: FRIENDLY_ROBOT,
    effects: [{ op: 'equipWeapon', target: 'chosen', name: 'Flame Cannon', attack: 2,
      trigger: { on: 'attackDeclared', filter: { source: 'self' }, effects: [burn('eventTarget', 1)] } }] },

  // ---- Demons ----
  { ...F('Demons', 'Divine'), id: 'fallen_grace', name: 'Fallen Grace', art: '😇', cost: 5, needsBoardSpace: true,
    text: 'Lose Health equal to your Summoning Tier. Summon a Demon of that cost with Taunt, then restore that much Health to your Hero (Overheal). The Tier rises by 1.',
    effects: [{ op: 'infernalSummon', keywords: ['Taunt'], healBack: true }] },
  { ...F('Demons', 'Robots'), id: 'infernal_engine', name: 'Infernal Engine', art: '🏭', cost: 5, needsBoardSpace: true,
    text: 'Lose Health equal to your Summoning Tier. Summon a Demon of that cost and give it a Modular Upgrade of your choice. The Tier rises by 1.',
    effects: [{ op: 'infernalSummon' }, modular('summoned')] },

  // ---- Divine ----
  { ...F('Divine', 'Robots'), id: 'sanctified_frame', name: 'Sanctified Frame', art: '🛡️', cost: 4,
    text: 'Upgrade a friendly Robot: +1/+3, Evade and Taunt.',
    target: FRIENDLY_ROBOT,
    effects: [{ op: 'buff', target: 'chosen', attack: 1, health: 3, keywords: ['Evade', 'Taunt'] }, upgraded()] },

  // ---- Radioactive ----
  { ...F('Radioactive', 'Vampires'), id: 'irradiated_blood', name: 'Irradiated Blood', art: '🩸', cost: 3,
    text: 'Lose 1 Health. Give a friendly minion +2 Attack this turn, Lifesteal this turn, and Radiation 1 for 2 turns.',
    target: FRIENDLY_MINION,
    effects: [pay(1), { op: 'buff', target: 'chosen', attack: 2, temporary: true, temporaryKeywords: ['Lifesteal'] }, { op: 'radiate', target: 'chosen', amount: 1, turns: 2 }] },
  { ...F('Radioactive', 'Aliens'), id: 'mutagen_splice', name: 'Mutagen Splice', art: '🧬', cost: 3,
    text: 'Give a friendly minion Radiation 1 for 2 turns, then Discover a keyword for it.',
    target: FRIENDLY_MINION,
    effects: [{ op: 'radiate', target: 'chosen', amount: 1, turns: 2 }, { op: 'discoverKeyword', target: 'chosen' }] },
  { ...F('Radioactive', 'Dinosaurs'), id: 'kaiju_awakening', name: 'Kaiju Awakening', art: '🦖', cost: 4,
    text: 'Give a friendly Dinosaur +3/+3 and Radiation 1 permanently.',
    target: { type: 'minion', side: 'friendly', tribe: 'Dinosaur' },
    effects: [{ op: 'buff', target: 'chosen', attack: 3, health: 3 }, { op: 'radiate', target: 'chosen', amount: 1 }] },
  { ...F('Radioactive', 'Plants'), id: 'mutant_bloom', name: 'Mutant Bloom', art: '🌱', cost: 3, needsBoardSpace: true,
    text: 'Summon a 1/3 Seedling with Taunt and Radiation 1 for 2 turns.',
    effects: [seedling({ attack: 1, health: 3, keywords: ['Taunt'] }), { op: 'radiate', target: 'summoned', amount: 1, turns: 2 }] },
  { ...F('Radioactive', 'Fungus'), id: 'fallout_spores', name: 'Fallout Spores', art: '🍄', cost: 3,
    text: 'Place 2 Mushrooms in the enemy deck. Give a random enemy minion Radiation 1 for 2 turns.',
    effects: [mushrooms(2), { op: 'radiate', target: { randomOf: ENEMY_MINIONS }, amount: 1, turns: 2 }] },
  { ...F('Radioactive', 'Zombies'), id: 'ghoulification', name: 'Ghoulification', art: '🧟', cost: 4, needsBoardSpace: true,
    text: 'Summon a random friendly minion that died this game. It has Radiation 1 permanently.',
    effects: [{ op: 'summon', fromGraveyard: {} }, { op: 'radiate', target: 'summoned', amount: 1 }] },
  { ...F('Radioactive', 'Dragons'), id: 'nuclear_fire', name: 'Nuclear Fire', art: '☢️', cost: 4,
    text: 'Apply Burn 2 and Radiation 1 (for 2 turns) to an enemy minion.',
    target: ENEMY_MINION,
    effects: [burn('chosen', 2), { op: 'radiate', target: 'chosen', amount: 1, turns: 2 }] },
  { ...F('Radioactive', 'Demons'), id: 'hellish_fallout', name: 'Hellish Fallout', art: '😈', cost: 5, needsBoardSpace: true,
    text: 'Lose Health equal to your Summoning Tier. Summon a Demon of that cost with Radiation 1 permanently. The Tier rises by 1.',
    effects: [{ op: 'infernalSummon' }, { op: 'radiate', target: 'summoned', amount: 1 }] },
  { ...F('Radioactive', 'Divine'), id: 'purification', name: 'Purification', art: '✨', cost: 3,
    text: 'Remove all Radiation from a character. Restore 3 Health to your Hero (Overheal).',
    target: { type: 'character', side: 'any' },
    effects: [{ op: 'clearRadiation', target: 'chosen' }, healHero(3)] },
  { ...F('Radioactive', 'Robots'), id: 'reactor_core', name: 'Reactor Core', art: '⚛️', cost: 4,
    text: 'Upgrade a friendly Robot: +2/+2 and Radiation 1 permanently.',
    target: FRIENDLY_ROBOT,
    effects: [{ op: 'buff', target: 'chosen', attack: 2, health: 2 }, { op: 'radiate', target: 'chosen', amount: 1 }, upgraded()] },

  // ---- Token ----
  { faction: 'Fusion', type: 'minion', tribes: ['Plant'], id: 'primal_seedling', name: 'Primal Egg', art: '🥚', token: true,
    cost: 1, attack: 0, health: 3, text: 'At the start of your turn after next, hatch into a random 3-cost Dinosaur.',
    triggers: [{ on: 'startOfTurn', filter: { player: 'friendly' }, effects: [{ op: 'hatchCountdown', turns: 2, pool: { tribe: 'Dinosaur', cost: 3 } }] }] },
];
