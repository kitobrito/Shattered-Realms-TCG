// Evaluation weights learned by self-play (tools/train-ai.mjs): 40 generations
// of mutated weights playing the reigning champion; only clear winners were kept.
export const LEARNED_WEIGHTS = {
  hp: 0.897,
  oppHp: 0.653,
  lowHp: 12.944,
  lowHpSlope: 0.976,
  atk: 1.505,
  health: 1.432,
  keyword: 0.794,
  ongoing: 1.754,
  ongoingCost: 0.281,
  egg: 3.992,
  oppBoard: 0.696,
  doomed: 0.545,
  hand: 1.199,
  oppHand: 1.05,
  trap: 1.893,
  oppTrap: 1.332,
  bonusMana: 1.841,
  mushroom: 0.795,
  corpse: 0.952,
  burnHero: 2.135,
  burnMinion: 0.64,
  lethalRisk: 56.685,
  threat: 0.398,
  myLethal: 27.564,
  myThreat: 0
};
