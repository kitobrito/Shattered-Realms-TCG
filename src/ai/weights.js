// Evaluation weights learned by self-play (tools/train-ai.mjs): 1 generations
// of mutated weights playing the reigning champion; only clear winners were kept.
export const LEARNED_WEIGHTS = {
  hp: 1,
  oppHp: 1.05,
  lowHp: 12,
  lowHpSlope: 1.055,
  atk: 1,
  health: 1.073,
  keyword: 1,
  ongoing: 1.915,
  ongoingCost: 0.25,
  egg: 5.256,
  oppBoard: 0.905,
  doomed: 0.4,
  hand: 1.3,
  oppHand: 1.1,
  trap: 2.159,
  oppTrap: 1.573,
  bonusMana: 1.304,
  mushroom: 0.594,
  corpse: 0.8,
  burnHero: 1.6,
  burnMinion: 0.742,
  lethalRisk: 60,
  threat: 0.43,
  myLethal: 25,
  myThreat: 0
};
