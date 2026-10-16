// The standard cut: 10 cards per faction that are left out unless the player
// makes their own cut. A deck is 2 factions (60 cards) minus 20 cuts = 40.
// Players may cut any 20 across their two factions (e.g. 12 + 8).
//
// Hand-picked to keep each faction's identity intact and cut the most
// situational cards. Designer: edit freely — validation checks these lists.

export const STANDARD_CUTS = {
  // Keeps: Lifesteal, Bats, Blood Pool, Health-loss synergy, Bloodlord / Crimson King.
  Vampires: [
    'vampire_mesmerist', 'blood_drinker',
    'mist_transformation', 'vampirism', 'daywalker',
    'crimson_escape', 'vampires_seduction', 'crimson_feast', 'blood_exchange', 'predatory_reflexes',
  ],
  // Keeps: Gene Splicing support, keyword engines, Abduction, the big Alien minions.
  Aliens: [
    'grey_scout', 'gene_thief_operative',
    'phase_shift', 'neural_disruptor', 'sub_space_jump',
    'mind_control_beam', 'planetary_quarantine', 'hive_synchronization',
    'genetic_snare', 'alien_infection',
  ],
  // Keeps: every Egg, Egg support, the Extinction spells, big Dinosaurs.
  Dinosaurs: [
    'baby_velociraptor', 'raptor_pack',
    'fossilization', 'rapid_evolution', 'primal_roar', 'meteor_shower',
    'sudden_stampede', 'protective_mother',
    'territorial_roar', 'ancient_ambush',
  ],
  // Keeps: Seedling synergy, growth engines, World Tree / The Overgrowth.
  Plants: [
    'thornling', 'vine_crawler', 'ancient_root',
    'poison_ivy', 'super_growth',
    'photosynthesis', 'rooted_defense',
    'hidden_thorns', 'predatory_garden', 'natures_revenge',
  ],
  // Keeps: Mushroom placers and payoffs (Fungus Giant, Colossus, Contamination), Poisonous core, Mind Control.
  Fungus: [
    'rotting_fungus', 'venomcap', 'parasitic_fungus', 'mycelium_lord',
    'fungal_infection', 'consume_decay',
    'toxic_spores', 'spore_cloud', 'mycelial_rebirth',
    'toxic_garden',
  ],
  // Keeps: Walkers / Reborn core, the Corpse engine (Corpse Eater, Raise the Dead, Apocalypse), big Exits.
  Zombies: [
    'rage_sprinter', 'zombie_shambler', 'rotting_walker',
    'zombification', 'zombie_feeding_frenzy',
    'sudden_hunger', 'zombie_surge', 'corpse_shield',
    'zombie_ambush', 'endless_horde',
  ],
  // Keeps: Burn appliers and payoffs (Furnace Dragon, Fireball, Blazewing), the big Dragons.
  Dragons: [
    'cinder_drake', 'charcoal_drake', 'molten_hide',
    'ashen_curse', 'scorched_earth',
    'flash_ignition', 'firebreak', 'feed_the_flames',
    'scorched_hand', 'infernos_wake',
  ],
  // Keeps: Health-payment payoffs (Pact Fiend, Blood Ritualist), the Summoning engine, the big Demons.
  Demons: [
    'soul_collector', 'dread_summoner',
    'infernal_bargain', 'soul_sacrifice',
    'desperate_pact', 'soul_surge', 'pain_into_power',
    'soul_snare', 'blood_price', 'gateway_collapse',
  ],
  // Keeps: healing + Overheal engines, Bonus Health payoffs, the anti-darkness core, the Angels.
  Divine: [
    'cherub_guardian', 'dawnwing_medic', 'consecrated_knight',
    'sanctuary', 'divine_intervention',
    'guardians_reflexes', 'sanctified_counter', 'graceful_return',
    'protective_ward', 'rebirth_sigil',
  ],
  // Keeps: the Upgrade spells and their payoffs, Drones + Swarm Commander, the Mechs.
  Robots: [
    'bulwark_unit', 'laser_trooper', 'repair_specialist',
    'overclock_protocol',
    'emergency_shielding', 'rapid_deployment', 'emergency_overclock',
    'emp_snare', 'countermeasure_swarm', 'automated_turret',
  ],
  // Keeps: the Radiation spreaders and payoffs, the big Mutants, Obliterate.
  Radioactive: [
    'gamma_brute', 'feralized_survivor', 'nuclear_bear',
    'forced_mutation', 'nuclear_erasure',
    'toxic_backlash', 'adrenal_mutation', 'chain_reaction',
    'feral_ambush', 'last_resort_protocol',
  ],
  // Keeps: the Hive builders, Worker Bee makers and Venomous Hornets.
  Bees: [
    'royal_bodyguard', 'scout_wasp', 'hive_overlord',
    'honey_reserve', 'venomous_uprising', 'royal_ascension',
    'royal_ambush', 'royal_sacrifice', 'last_line_of_the_colony', 'stinger_interception',
  ],
  // Keeps: the cheap Elusive spirits, the main Haunt minions and spells.
  Ghosts: [
    'phantom_raven', 'mirror_haunt', 'veilkeeper', 'knight_of_the_second_death',
    'silence_the_living', 'stolen_afterlife', 'beyond_the_veil',
    'mirror_of_the_departed', 'not_of_this_world', 'refuse_the_grave',
  ],
  // Keeps: the cheap Displacers, the return payoffs and the board resets.
  Ultraterrestrials: [
    'riftling', 'chrono_warp_adept', 'probability_engine', 'parallel_self',
    'temporal_reversal', 'impossible_blueprint', 'reality_overlap',
    'paradox_mine', 'borrowed_seconds', 'spatial_redirection',
  ],
  // Keeps: the Corrosion starters, the Caustic engines, the big Dissolution finishers.
  Acidic: [
    'acid_newt', 'armor_leech', 'ooze_mimic', 'living_flask',
    'strip_the_plating', 'molecular_breakdown',
    'corrosion_chamber', 'volatile_flask', 'reactive_spill', 'shield_eater',
  ],
  // Keeps: the cheap hunters, the executioners and the board-wide damage.
  Sharks: [
    'hammerhead_scout', 'goblin_shark', 'abyssal_bloodhound', 'scarred_leviathan',
    'echoes_of_blood', 'nothing_escapes_the_current',
    'beneath_the_sand', 'the_killing_current', 'scent_through_stone', 'intercept',
  ],
};

// One-faction format: the 10 cards played twice unless the player picks their
// own. A faction missing here uses the 10 cheapest cards that aren't in its
// standard cut (see standardDuplicates in index.js). Designer: edit freely.
export const STANDARD_DUPLICATES = {
  // Vampires: their aggressive core doubled, but not their best top end
  // (doubling the strongest 10 overshot to 60% solo; this set ≈ 55%).
  Vampires: [
    'vampire_thrall', 'bloodhound', 'vampire_gargoyle', 'crimson_batmaster', 'vampire_bite',
    'blood_pool', 'vampire_bat', 'nightstalker', 'blood_mite', 'blood_drain',
  ],
  // Aliens have only 11 minions in 30 cards; doubling them gives the keyword
  // spells something to work on (simulated: 31% → 49% win rate solo).
  Aliens: [
    'grey_scout', 'probe_drone', 'gene_thief_operative', 'bio_chamber_hatchery', 'fleet_commander',
    'xeno_hive_mother', 'subjugator_drone', 'devolved_scientist', 'overmind_xalat', 'qu_bio_engineer',
  ],
};
