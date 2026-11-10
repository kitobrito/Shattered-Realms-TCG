// Arsenal: Hero weapons for realms that never had them (Aliens, Demons, Acidic, Divine, Vampires).
// An unlockable mini-set (`set`), so it never changes a realm's starting 30 or its expansion-board unlock.
// Weapon triggers act as the Hero ('self' is the Hero); they leave with the weapon (dropHeroWeapon).
const SET = 'Arsenal';
const eq = (id, name, attack, durability, extra = {}) => ({ op: 'equipHeroWeapon', cardId: id, name, attack, durability, ...extra });
const W = (faction, id, name, art, cost, attack, durability, text, weapon = {}) =>
  ({ faction, type: 'spell', id, name, art, cost, attack, durability, heroWeapon: true, extra: true, set: SET, text, effects: [eq(id, name, attack, durability, weapon)] });
// The weapon's mark lands as the Hero swings (before the hit), on a minion or the enemy Hero.
const ON_HIT = (effects, target = 'enemyCharacter') => [{ on: 'attackDeclared', filter: { source: 'self', target }, effects }];

export const ARSENAL_CARDS = [
  W('Aliens', 'ray_gun', 'Ray Gun', '🔫', 3, 3, 3, 'Ranged. Whenever your Hero attacks with it, give the target Radiation 1 permanently and Burn 1.',
    { ranged: true, triggers: ON_HIT([{ op: 'radiate', target: 'eventTarget', amount: 1 }, { op: 'applyBurn', target: 'eventTarget', amount: 1 }]) }),
  W('Demons', 'satans_infernal_pitchfork', 'Satan\'s Infernal Pitchfork', '🔱', 6, 6, 6, 'Whenever your Hero attacks with it, give the target Burn 1.',
    { triggers: ON_HIT([{ op: 'applyBurn', target: 'eventTarget', amount: 1 }]) }),
  W('Acidic', 'liquifier', 'Liquifier', '🧪', 6, 2, 3, 'Ranged. Whenever your Hero attacks a minion with it, give that minion Corrosion 3.',
    { ranged: true, triggers: ON_HIT([{ op: 'corrode', target: 'eventTarget', amount: 3 }], 'enemyMinion') }),
  W('Divine', 'archangels_divine_shield', 'Archangel\'s Divine Shield', '🛡️', 4, 1, 4, 'Whenever your Hero would take damage, prevent it. This loses 1 Durability instead.',
    { heroShield: true }),
  W('Divine', 'holy_flail_of_righteous_fury', 'Holy Flail of Righteous Fury', '⛓️', 3, 1, 3, 'Whenever your Hero attacks with it, give the target Holy Flame 2.',
    { triggers: ON_HIT([{ op: 'holyFlame', target: 'eventTarget', amount: 2 }]) }),
  W('Vampires', 'bloodrippers_talon', 'Bloodripper\'s Talon', '🩸', 1, 1, 4, ''),
];
