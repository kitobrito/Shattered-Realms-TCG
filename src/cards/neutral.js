// Cards that belong to no faction.

export const NEUTRAL_CARDS = [
  {
    // Was "The Coin" (renamed away from Hearthstone's card).
    id: 'mana_potion', name: 'Mana Potion', faction: 'Neutral', type: 'spell', art: '🧪', token: true,
    cost: 0,
    text: 'Gain 1 extra Mana this turn. (Given to the player who goes second.)',
    effects: [{ op: 'gainMana', amount: 1 }],
  },
  {
    id: 'health_potion', name: 'Health Potion', faction: 'Neutral', type: 'spell', art: '🧪', token: true,
    cost: 0,
    text: 'Restore 3 Health to a friendly character. Overheal. (Offered to the player who goes second.)',
    target: { type: 'character', side: 'friendly' },
    effects: [{ op: 'heal', target: 'chosen', amount: 3, overheal: true }],
  },
];
