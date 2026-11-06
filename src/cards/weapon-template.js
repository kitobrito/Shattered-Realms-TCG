// Shared presentation data for cards that equip a Hero Weapon.
function statPair(source) {
  if (!source || !Number.isFinite(source.attack) || !Number.isFinite(source.durability)) return null;
  return { attack: source.attack, durability: source.durability };
}

function equippedWeaponIn(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = equippedWeaponIn(item);
      if (found) return found;
    }
    return null;
  }
  if (value.op === 'equipHeroWeapon') return statPair(value);
  for (const item of Object.values(value)) {
    const found = equippedWeaponIn(item);
    if (found) return found;
  }
  return null;
}

export function weaponStatsForCard(card) {
  const stats = statPair(typeof card.heroWeapon === 'object' ? card.heroWeapon : null)
    ?? (card.heroWeapon === true ? statPair(card) : null)
    ?? statPair(card.relic);
  if (stats) return stats;
  if (card.type !== 'spell' || (card.heroSpell && !card.fusion)) return null;
  return equippedWeaponIn(card.effects);
}

export function applyWeaponCardTemplate(cards) {
  for (const card of cards) {
    const stats = weaponStatsForCard(card);
    if (!stats) continue;
    card.weaponStats = stats;
    const line = `Weapon: ${stats.attack} Attack, ${stats.durability} Durability.`;
    if (!new RegExp(`^Weapon: ${stats.attack} Attack, ${stats.durability} Durability\\.`, 'i').test(card.text ?? '')) {
      card.text = `${line}${card.text ? ` ${card.text}` : ''}`;
    }
  }
  return cards;
}
