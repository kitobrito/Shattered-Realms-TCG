// Faction-level rule hooks. Factions that bend core rules override hooks here
// instead of patching the engine.

function growMana(state, player, crystals) {
  const mana = player.mana;
  mana.max = Math.min(state.rules.maxMana, mana.max + crystals);
  mana.current = mana.max + mana.bonusNextTurn;
  mana.temp = mana.bonusNextTurn; // temporary Mana for this turn (shown as gold crystals)
  mana.bonusNextTurn = 0;
}

const DEFAULT_HOOKS = {
  // Called at the start of a player's turn to grow and refill mana.
  turnStartMana(state, player) {
    growMana(state, player, state.rules.manaPerTurn);
  },
};

export const FACTION_HOOKS = {
  // Extinction Cycle (passive Hero Spell): 2 Mana Crystals per turn instead of
  // 1, except the very first turn of the game (1). After an Extinction the
  // rebuild starts at 2 (designer ruling).
  // The Extinction itself is resolved in engine.js at the end of the player's turn.
  // Primal Mana: of the 2 crystals, 1 is normal and 1 is Primal (Dinosaur cards only).
  // The total grows exactly as before; only who can spend it changed.
  Dinosaurs: {
    turnStartMana(state, player) {
      const m = player.mana;
      m.base = Math.min(state.rules.maxMana, (m.base ?? 0) + 1);
      if (player.extinction?.shower) {
        // Meteor Shower: only the normal crystal grows; no Primal Mana until it ends.
        growMana(state, player, Math.max(0, m.base - m.max));
        m.primal = 0;
        return;
      }
      growMana(state, player, player.turnsTaken === 1 ? 1 : 2);
      m.base = Math.min(m.base, m.max);
      m.primal = m.max - m.base;
    },
  },
};

// A player runs two factions. The first faction (in pick order) that overrides
// a hook wins.
export function factionHook(player, name) {
  for (const f of player.factions) {
    const hook = FACTION_HOOKS[f]?.[name];
    if (hook) return hook;
  }
  return DEFAULT_HOOKS[name];
}
