// A guide for every two-realm deck (the menu's Realm guide): how the pair plays together, two
// combos across the realms (card ids from the pair's standard deck), how to use the pair's
// Fusion Hero Spell, and what to watch out for. The opening hand and Mana curve are worked out
// from the deck itself (ui/main.js). Keys are the two realms sorted and joined with '+'.

const G = (plan, combos, fusion, watch) => ({ plan, combos, fusion, watch });

export const PAIR_GUIDES = {
  // ---- Acidic ----
  'Acidic+Aliens': G(
    "Acidic shrinks the enemy's Attack while Aliens bend the rules with keywords, bounces and Traps. Corrode the threats that matter, hand your own minions extra keywords, and let a wide spread of Traps punish every attack.",
    [["fleet_commander", "false_floor", "Fleet Commander makes your Traps cost 1 less and draws a card whenever one goes off; False Floor drops to 1 Mana and corrodes every attacker by 2."],
      ["gene_mutation", "caustic_crab", "Two random keywords turn the Taunt crab into a real wall (Evade, Lifesteal, Poisonous), and it gains Attack each turn your Corrosion lands."]],
    "Xenoacid Sample corrodes every enemy minion by 1 and gives a random friendly minion a keyword. Best on a wide board of small attackers, or the turn Caustic Crab is out to collect its bonus.",
    "Bouncing an enemy minion back to hand wipes off its Corrosion. Save Abduction Ray and the bounce Traps for minions you haven't corroded yet."),
  'Acidic+Bees': G(
    "A fortress. The Hive and its Taunt bees soak up attacks, and every attacker that touches them comes away corroded. Once their minions are down to 0 or 1 Attack, your Venomous bees and the Queen clean up for free.",
    [["hive_enforcer", "false_floor", "Enemies must hit Hive Enforcer before your Hive; False Floor takes 2 Attack off each attacker before the hit lands, so Enforcer barely gets scratched."],
      ["tri_maw_hydra", "royal_executioner", "Hydra corrodes up to three enemies by 2, so the Venomous Executioner trades into them, survives, and heals your Hive each time it kills."]],
    "Formic Swarm gives you two 1/1 Acid Wasps that corrode a minion before attacking it: cheap trades into anything, and two more bodies to guard the Hive.",
    "Neither realm hits the enemy Hero hard, so plan to win the long game. Keep the Queen alive: if she dies, your Hero takes 10 damage."),
  'Acidic+Demons': G(
    "Demons pay Health for big Arrivals; Acidic's cheap Taunts and Corrosion protect that Health. Shrink the enemy board early so they can't punish your payments, then drop Pit Lord or Archfiend of Ruin to wipe what's left.",
    [["splash_of_acid", "succubus_queen", "Corrode a big minion down to 3 Attack or less, and Succubus Queen can take control of it for the turn and attack with it."],
      ["infernal_ambush", "false_floor", "Two cheap Traps that blunt attacks: a 3/3 Taunt Demon and a 2-point Corrosion keep your Health high for the next Demon payment."]],
    "Brimstone Bile costs 3 Health but corrodes 3 and deals 3: it kills most mid-sized minions outright, and anything that survives is left nearly harmless.",
    "Your Health is a resource, not a bank. Corrosion buys time, but paying for Demons while the enemy chips at you can end the game fast."),
  'Acidic+Dinosaurs': G(
    "Dinosaurs get double Mana and hit hard; Acidic makes the enemy's blockers useless so your Dinos trade up or go face. Spend the extra Mana on big finishers and let cheap Corrosion do the defending.",
    [["caustic_bath", "tyrannosaurus_rex", "Caustic Bath shrinks every blocker by 1 (and draws on any that hit 0); the T. Rex then charges in with nothing able to hit back hard."],
      ["acid_rain", "spinosaurus", "Acid Rain deals 2 to the whole enemy board and corrodes the survivors; Spinosaurus's 2-damage Arrival finishes the biggest one."]],
    "Tar Pit corrodes an enemy minion by 2; if that takes it to 0 Attack you also gain a Primal Mana. Aim it at 2-Attack minions for the extra Mana.",
    "The Extinction Cycle wipes your own board every 7 turns. Spend your removal after the wipe, not on minions it was about to clear anyway."),
  'Acidic+Divine': G(
    "A long, safe game. Acidic takes the teeth out of enemy minions and Divine heals and stacks Health on yours, so every trade goes your way. Outlast them, then finish with The First Light or The Great Dissolution.",
    [["caustic_jelly", "halo_sentinel", "Two Taunts side by side: Jelly corrodes each attacker, and Halo Sentinel gives your other minions +1 Health, so the wall barely dents."],
      ["caustic_bath", "judgment_of_dawn", "Corroded minions hit back weakly; Judgment of Dawn then deals 4 to every enemy minion (7 to Dark ones) to clear them."]],
    "Purifying Solvent is pricey at 6 Mana, but it Cleanses your characters and Dissolves an enemy minion outright: your answer to their single biggest threat.",
    "Both realms are slow to deal damage. Make sure you keep enough minions on the board to actually attack, or the game drags on until they find an answer."),
  'Acidic+Dragons': G(
    "Burn and Corrosion stack: enemy minions take damage every turn and hit back weaker each time. Wear the board down with spreads, then turn the Burn on the enemy Hero.",
    [["scorching_breath", "acid_rain", "Two board-wide spreads: Burn 1 on every enemy minion, then 2 damage and Corrosion 1 on the survivors."],
      ["shell_melter", "inferno_stalker", "Shell Melter corrodes whatever it attacks; Inferno Stalker gets +2 Attack into anything Burning. Weak, burning minions fall to either."]],
    "Acid Breath applies Burn 1 and Corrosion 1 to every enemy minion for 3 Mana: a strong opener against a wide board.",
    "Much of your damage is slow Burn. Keep a Taunt (Caustic Jelly, Scorchscale Guardian) up while it ticks, or fast decks will race you."),
  'Acidic+Fungus': G(
    "A slow poison deck. Corrosion and Poisonous handle the board while Mushrooms pile up in the enemy deck. Hold the line, and let every card they draw hurt.",
    [["caustic_jelly", "cordyceps_fungus", "Jelly corrodes attackers; Cordyceps places 2 Mushrooms every time an enemy minion attacks. Attacking you becomes a losing move."],
      ["total_dissolution", "fungus_giant", "Clear a corroded board, then play a cheap Fungus Giant, which costs 1 less for every 2 Mushrooms in their deck."]],
    "Rot Spores places 2 Mushrooms and corrodes every enemy minion by 1: good value any turn the enemy has two or more minions.",
    "Very little direct damage. If the enemy starts fast, you need Taunts and Corrosion early or you'll fall behind before the Mushrooms matter."),
  'Acidic+Ghosts': G(
    "Ghosts bring minions back from either Graveyard; Acidic shrinks what the enemy has left. Trade freely, since your dead minions return, and let Corrosion win every trade.",
    [["shell_melter", "soul_binder", "Trade Shell Melter away, then Soul Binder can Haunt it (or any 3-cost-or-less minion) back."],
      ["caustic_bath", "soul_reaper", "Corroded minions trade badly and end up damaged; Soul Reaper destroys a damaged enemy and brings it back on your side."]],
    "Ectoplasmic Ooze Haunts a 4-cost-or-less Acidic minion from either Graveyard and corrodes every enemy minion by 1: a body plus a board-wide shrink.",
    "Haunted minions come back weaker (-1/-1 or 1 Health). They are for value and trades, not your main threats."),
  'Acidic+Ice Age': G(
    "Freeze and Corrosion lock the enemy down: Frozen minions can't attack, and corroded ones barely hurt when they do. Thick Fur beasts then grind them out.",
    [["avalanche", "caustic_bath", "Avalanche deals 2 and Freezes the survivors; Caustic Bath corrodes them, so by the time they thaw they have little Attack left."],
      ["sabertooth_cat", "splash_of_acid", "Sabertooth deals double damage to Frozen minions; corrode the blocker first so it barely hits back."]],
    "Brittle Ice Freezes an enemy minion and corrodes it by 2 for just 2 Mana: shuts down an attacker for a turn and weakens it for good.",
    "The Great Freeze also freezes your own minions without Thick Fur, including every Acidic one. Plan your attacks around it."),
  'Acidic+Lycanthropes': G(
    "Lycanthropes Transform for bursts of power; Acidic keeps enemy minions too weak to punish them. Transform into Beast Form and attack into corroded blockers you'll always beat.",
    [["dreadjaw_alpha", "caustic_bath", "Corrode the board, then attack with Lycanthropes that have +1 Attack from the Alpha: they win every trade."],
      ["ironhide_werehippo", "caustic_jelly", "Two big Taunts: the Hippo heals another minion when it transforms, and the Jelly corrodes attackers."]],
    "Corrosive Bite corrodes an enemy minion by 2 and Transforms a random friendly Lycanthrope: removal and a free Transform in one.",
    "Transforms cost 1 Mana each. Don't spend all your Mana on Transforms and leave none for Corrosion when a big threat lands."),
  'Acidic+Plants': G(
    "Plants grow every turn while Acidic shrinks the enemy every turn. It's a slow, steady board war you win over time: your minions keep getting bigger as theirs get weaker.",
    [["garden_guardian", "caustic_jelly", "A double Taunt line: Garden Guardian gains Attack whenever it's healed, and Caustic Jelly corrodes attackers."],
      ["world_tree", "caustic_bath", "World Tree buffs your Plants every turn; Caustic Bath makes sure theirs can no longer fight back."]],
    "Pitcher Bloom summons a 1/3 Taunt that corrodes anything attacking it: a cheap early wall that protects your Seedlings.",
    "Seedlings start tiny. Protect them for a turn or two or they get picked off before they grow."),
  'Acidic+Radioactive': G(
    "A grinding pair. Radiation is an aura: every other character without Radiation has less Health while an irradiated character lives, so small enemy minions shrink away. Corrosion takes the Attack off whatever is left, and Reactor Meltdown or Ground Zero finishes the board.",
    [["rad_tortoise", "caustic_jelly", "Two Taunts that punish attacks: the Tortoise gives attackers Radiation (making them drain everyone else), the Jelly corrodes their Attack."],
      ["caustic_bath", "reactor_meltdown", "Corroded minions are harmless; Meltdown then deals 3 to every minion and Obliterates the dead, so their Exits never happen."]],
    "Toxic Sludge corrodes an enemy minion by 1 and gives it Radiation 1 for 2 turns: its Attack drops for good, and for two turns every character without Radiation has 1 less Health.",
    "Radiation drains your own minions without Radiation too, and it blocks healing on them. Keep your board small or irradiated, and time Meltdown for when their board is bigger."),
  'Acidic+Robots': G(
    "Robots stack Upgrades on a few big machines; Acidic weakens the enemy so those machines win every trade. Build one or two Upgraded Robots and keep them alive.",
    [["shell_melter", "targeting_matrix", "Twin Strike on an attacker that corrodes first: two hits a turn, each against a weakened minion."],
      ["caustic_bath", "overclocked_destroyer", "Corrode the board; the Destroyer then pings every enemy minion for 1 each time you Upgrade it."]],
    "Etching Drill upgrades any minion with +1 Attack and corrode-before-attacking: best on Twin Strike or Rush minions.",
    "Putting every Upgrade on one Robot loses to a single removal spell. Spread them across two minions when you can."),
  'Acidic+Sharks': G(
    "Sharks hunt minions at 3 Health or less (Marked Prey); Acidic keeps the enemy too weak to fight back while the Sharks bite. Mark, corrode and feed.",
    [["thresher_shark", "caustic_bath", "Thresher deals 1 to every enemy minion and marks the weak as Prey; Caustic Bath makes sure none of them hit back."],
      ["great_white", "splash_of_acid", "Corrode a Prey first, and Great White kills it with almost no damage back, then attacks again."]],
    "Bloodbile corrodes an enemy minion by 2 and marks it as Prey, even a healthy one: it lines up a Shark kill.",
    "Sharks need Prey. Against high-Health minions, use Corrosion to stay safe until damage brings them down to 3 Health."),
  'Acidic+Ultraterrestrials': G(
    "Displace enemy minions out of the fight for a turn, and corrode the ones that stay. The enemy spends whole turns waiting while you take control of the board.",
    [["rift_hunter", "corrosive_beetle", "Displace one small enemy and corrode another: two minions out of action for little Mana."],
      ["dimensional_sentinel", "caustic_jelly", "Two sturdy Taunts: the Sentinel gains Attack when you Displace your own minions, and the Jelly corrodes every attacker."]],
    "Dimensional Solvent Displaces an enemy minion, and it comes back with Corrosion 2 and Acid-coated: out for a turn and weaker after.",
    "Displaced enemies come back. Use the turn they are gone to push damage or set up, not just to wait."),
  'Acidic+Vampires': G(
    "Vampires trade Health for power and win it back with Lifesteal; Acidic makes sure the enemy can't punish that. An aggressive deck that keeps itself healthy.",
    [["vampire_doom_hound", "caustic_bath", "A 3/1 Stealth Lifesteal minion: corrode the board and it trades for free Health."],
      ["the_crimson_king", "world_eater_slug", "World-Eater Slug corrodes every enemy with 4 or more Attack by 3, so the Crimson King can attack without dying."]],
    "Hemolytic Draught corrodes an enemy minion by 2 and heals your Hero for the Attack it lost: removal and healing in one.",
    "Vampires lose Health on purpose. Don't let the enemy's Burn or direct damage pile on top of your own payments."),
  'Acidic+Void': G(
    "Void dumps its hand fast and hits hard; Acidic's cheap Corrosion keeps blockers from stopping it. Empty your hand, go Hollow and swing every turn.",
    [["splash_of_acid", "starless_prowler", "A 1-Mana Corrosion clears the way, and Starless Prowler has Charge once your hand is empty."],
      ["caustic_bath", "riftmaw_devourer", "Weaken every blocker, then Riftmaw comes in with Charge while you're Hollow."]],
    "Dissolving Dark corrodes an enemy minion by 2 for just 2 Mana, or by 4 while you're Hollow: a huge shrink for a near-empty hand.",
    "Void runs out of cards. Count your damage before you empty your hand, or you'll be left with nothing."),
  'Acidic+Zombies': G(
    "Zombies keep coming back and leave Corpses; Acidic shrinks anything that tries to fight them. You win the war of attrition one corroded trade at a time.",
    [["bloater", "caustic_bath", "Corrode the board, and Bloater's Exit (1 damage to every minion) finishes off the weakened minions."],
      ["walker", "caustic_jelly", "A Reborn Walker and a corroding Taunt: a cheap early wall that is hard to break."]],
    "Bile Zombie gives you a Corpse and a 2/2 that corrodes every enemy minion by 2 when it dies: let it die on purpose.",
    "Zombie Exits deal damage to your own minions too. Watch your board before Bloater dies."),

  // ---- Aliens ----
  'Aliens+Bees': G(
    "Bees build a wall around the Hive; Aliens hand out keywords and use Traps and bounces to blunt the enemy. Your Worker Bees end up far better than their stats.",
    [["gene_mutation", "venom_guard", "Two extra keywords (Evade, Lifesteal, Elusive) turn a Venomous Taunt into a nightmare to attack."],
      ["replication_protocol", "hive_matron", "Copy Hive Matron for two cheaper Matrons: three Worker Bee factories."]],
    "Xeno Brood summons a Worker Bee with 2 random positive keywords: a tiny minion that trades far above its size.",
    "Bouncing an enemy minion lets them replay it. Use bounces to protect the Hive and the Queen, not just for tempo."),
  'Aliens+Demons': G(
    "Demons pay Health for strong Arrivals; Aliens add keywords and steal minions. Take the enemy's best minion and use it against them. Gene Corruption also strips their Taunt or Evade so your Demons can attack freely.",
    [["succubus_queen", "mass_abduction", "Take control of a minion for the turn, then Mass Abduction sends their keyword minions back to hand."],
      ["gene_corruption", "abyssal_brute", "Take an enemy minion's keywords and put them on a 6/6 Abyssal Brute."]],
    "Abduction Rite costs Health equal to your Summoning Tier and takes a random enemy minion of that cost or less until your turn ends: trade it into their own board.",
    "Demon payments plus enemy pressure add up. Keep track of your Health before each Arrival."),
  'Aliens+Dinosaurs': G(
    "Dinosaurs bring double Mana and big bodies; Aliens give those bodies keywords. A T. Rex with Lifesteal or Evade is very hard to deal with, and Aliens' Traps buy time for the eggs to hatch.",
    [["gene_mutation", "tyrannosaurus_rex", "Two random keywords on an 8/8 Charge minion: Lifesteal, Evade or Poisonous all make it brutal."],
      ["replication_protocol", "nest_of_dinosaur_eggs", "Two cheaper extra Nests: nine Baby Dinosaurs waiting to hatch."]],
    "Gene Raptor Discovers a Dinosaur from your deck and makes it cost 1 less: card draw that also smooths your curve.",
    "The Extinction Cycle wipes your own board. Keywords on a minion about to be wiped are wasted."),
  'Aliens+Divine': G(
    "Divine heals and grows Health; Aliens add keywords. Your minions become sturdy, hard to remove and hard to attack through, and you slowly take over the board.",
    [["gene_mutation", "halo_sentinel", "Add keywords to a Taunt that already gives your other minions +1 Health."],
      ["subjugator_drone", "judgment_of_dawn", "Strip every enemy keyword (no Taunt, no Evade, no Reborn), then clear the board with Judgment of Dawn."]],
    "Holy Sequencing gives a minion Evade and lets you Discover a keyword for it: protect your best minion from the next removal.",
    "Neither realm deals much damage quickly. Make sure you're building toward a win, not just surviving."),
  'Aliens+Dragons': G(
    "Dragons Burn the enemy every turn; Aliens slow them down with Traps and bounces. The enemy keeps losing tempo while the Burn ticks away. Fleet Commander makes every Trap cheaper and draws you cards.",
    [["ufo_interception", "ignition_trap", "Two Traps for enemy minions: 3 damage plus a bounce, and Burn 2."],
      ["fleet_commander", "ashen_ambush", "Fleet Commander makes Ashen Ambush cheaper and draws a card every time a Trap goes off."]],
    "Plasma Burn strips an enemy minion's keywords and applies Burn 2: takes away Taunt or Evade, then lets it burn.",
    "Bouncing a Burning minion takes off its Burn. Pick bounce targets that aren't Burning yet."),
  'Aliens+Fungus': G(
    "A slow control deck. Traps and bounces stall the enemy while Mushrooms pile into their deck, so every card they draw costs them Health. Fungus Giant gets cheaper as the Mushrooms pile up.",
    [["mass_abduction", "hidden_spores", "Bounce their keyword minions; each card they draw while Hidden Spores is up gets more Mushrooms."],
      ["fleet_commander", "spore_ambush", "Fleet Commander makes Spore Ambush cheaper and draws a card when it triggers; Spore Ambush adds a Poisonous Sporeling and 2 Mushrooms."]],
    "Spore Probe places 2 Mushrooms and draws a card: simple value any turn you have 3 spare Mana.",
    "Very little direct damage. Make sure enough Mushrooms land before you run out of stalling tools."),
  'Aliens+Ghosts': G(
    "Ghosts reuse minions from both Graveyards; Aliens add keywords and steal. Your dead minions come back, and the enemy's can come back on your side too.",
    [["whispering_skull", "replication_protocol", "Whispering Skull finds a copy of a strong dead minion; Replication Protocol turns it into two cheaper copies."],
      ["gene_mutation", "phantom_duelist", "An Evade Reborn minion with two more keywords is almost impossible to get rid of."]],
    "Spectral Gene-Splicing combines an enemy minion's text and keywords with a dead minion's stats: pick a big dead minion and a strong enemy ability.",
    "Haunted minions often come back weaker. Use them to trade, not as your main threat."),
  'Aliens+Ice Age': G(
    "Ice Age Freezes and walls up with Thick Fur Taunts; Aliens bounce and trap. The enemy spends turns Frozen or replaying minions while your herd grows.",
    [["gene_mutation", "woolly_mammoth", "Two more keywords on a 5/8 Taunt with Thick Fur and Hardy: Lifesteal or Poisonous make it a fortress."],
      ["thin_ice", "ufo_interception", "Two Traps for enemy minions: Freeze one, then hit another for 3 and bounce it."]],
    "Thawed Specimen gives a minion Thick Fur and a random keyword: it keeps your Aliens free during the Great Freeze.",
    "The Great Freeze also freezes your minions without Thick Fur, including every Alien. Plan your attacks around it."),
  'Aliens+Lycanthropes': G(
    "Lycanthropes Transform for power; Aliens add keywords. Keywords stay through a Transform, so your beasts keep getting tougher every turn. Subjugator Drone clears the enemy's Taunt so your beasts can reach the Hero.",
    [["gene_mutation", "dreadjaw_alpha", "Keywords on the Alpha, which gives every other Lycanthrope +1 Attack: protect it with Evade or Taunt."],
      ["subjugator_drone", "unleash_the_pack", "Strip the enemy's keywords (no Taunt in your way), then Transform the pack and attack."]],
    "Xeno Mutation Transforms a Lycanthrope with +2/+2 and a random keyword: a free Transform with a big bonus.",
    "Transforms cost Mana. Keep enough for removal and Traps, or the enemy gets free turns."),
  'Aliens+Plants': G(
    "Plants grow every turn; Aliens add keywords. A Seedling with Lifesteal or Evade that grows each turn is a big problem, and Aliens' Traps protect it while it grows.",
    [["gene_mutation", "sporeflower", "Keywords on a minion that makes a Seedling every turn: Taunt or Evade keep the factory alive."],
      ["replication_protocol", "world_tree", "Two cheaper World Trees: your board gains a Seedling or +1/+1 every turn from each."]],
    "Xeno Bloom summons a Seedling with 2 random positive keywords: it grows like any Seedling, with extra tricks.",
    "Seedlings start at 0/1. They need a turn or two before they're a threat, so don't rely on them early."),
  'Aliens+Radioactive': G(
    "A grinding control deck. Radiation auras drain the Health of every character without Radiation, so wide enemy boards of small minions melt away, while Aliens' Traps and bounces stall the big threats. Finish with board clears and big late minions.",
    [["rad_mine", "fleet_commander", "Rad Mine costs 0 with Fleet Commander, gives an attacker Radiation and draws you a card."],
      ["genetic_scourge", "reactor_meltdown", "Two board-wide clears for when the enemy goes wide: 3 damage to every minion, twice."]],
    "Mutagen Splice gives your own minion Radiation 1 for 2 turns and lets you Discover a keyword for it: it becomes an aura that drains everything without Radiation, and it's immune itself.",
    "Radiation also drains your own minions without Radiation. Aliens minions have none, so keep your board small while the auras are up."),
  'Aliens+Robots': G(
    "Robots stack Upgrades; Aliens add keywords. Build a few huge machines that do everything, and keep them safe with Traps. Probe Drone grows with every keyword you hand out, so it gets big fast.",
    [["gene_mutation", "titan_guard", "Two keywords on a 5/9 Taunt that heals 2 every turn once it has 2 Upgrades: very hard to remove."],
      ["subjugator_drone", "colossus_prime", "Subjugator strips enemy Taunt and Evade; Colossus Prime then hits every enemy for 3 or more."]],
    "Gene-Forged Upgrade upgrades a Robot +1/+1 and lets you Discover a keyword for it.",
    "Big minions with lots of Upgrades are prime removal targets. Keep a Trap up to protect them."),
  'Aliens+Sharks': G(
    "Sharks hunt Marked Prey; Aliens add keywords and bounce blockers. Keep the board clear so your Sharks can bite every turn. Subjugator Drone strips Stealth and Evade, which also helps your Sharks reach their Prey.",
    [["gene_mutation", "great_white", "Keywords on a Rush Shark that attacks again after killing Prey."],
      ["abduction_ray", "frenzy_of_the_pack", "Bounce a blocker, then your Sharks get +2 Attack for the turn."]],
    "Abyssal Probe marks any enemy minion as Prey (even in Stealth) and gives a random friendly Shark a keyword.",
    "Sharks need Prey. Against big minions, use bounces until damage brings them down to 3 Health."),
  'Aliens+Ultraterrestrials': G(
    "Both realms move enemy minions off the board: Aliens bounce them to hand, Ultraterrestrials Displace them for a turn. The enemy never keeps a board for long.",
    [["rift_hunter", "abduction_ray", "Displace one small minion and bounce another: two blockers gone for 5 Mana."],
      ["wrong_reality", "ufo_interception", "Two Traps that send played minions back to hand: the enemy loses whole turns."]],
    "Abducted Beyond Displaces an enemy minion with 4 or less Attack, and it comes back under your control.",
    "Bounces and Displacements are temporary. Use the time they buy to deal damage, or the enemy just replays everything."),
  'Aliens+Vampires': G(
    "Vampires attack and heal with Lifesteal; Aliens add keywords and control the board. There's little overlap, so play each half to its strength: Vampires attack, Aliens clear the way.",
    [["gene_mutation", "vampire_bloodlord", "Keywords on a Lifesteal minion that gives you a Mana Crystal whenever it hits the Hero."],
      ["abduction_ray", "werepyre_abomination", "Bounce a blocker, then Werepyre charges in for 8 with Lifesteal."]],
    "Blood Splice costs 2 Health: Discover a minion from your deck that costs 2 less.",
    "Vampires lose Health; Aliens are slow to pay it back. Keep a healthy Hero against aggressive decks."),
  'Aliens+Void': G(
    "Void empties its hand fast and hits hard; Aliens add keywords and stall. An odd pair: play Aliens early for control, then dump your hand to go Hollow and finish.",
    [["abduction_ray", "starless_prowler", "Bounce a blocker; Starless Prowler has Charge while your hand is empty."],
      ["gene_mutation", "nebula_gnawer", "Two keywords on a 4/2 that gains Attack every time you discard: Lifesteal or Evade let it survive long enough to grow."]],
    "Dark Matter Splice discards a card to Gene-Splice an enemy minion with 3 or less Health into a Hybrid for your deck.",
    "Void runs out of cards, and Aliens cards are slow. Play the Aliens cards early so you can go Hollow later."),
  'Aliens+Zombies': G(
    "Zombies keep coming back and leave Corpses; Aliens add keywords. Reborn minions with extra keywords make a long game you win. Corpses and Reborn mean you can trade aggressively and still keep a board.",
    [["gene_mutation", "tarman", "Keywords on a Reborn Lifesteal minion that drags an enemy down every time it dies."],
      ["replication_protocol", "zombie_horde", "Replication Protocol gives you two cheaper Zombie Hordes: each leaves three Walkers when it dies, so the board never empties."]],
    "Reanimated Hybrid brings back a random friendly minion that died, with Reborn and a positive keyword.",
    "Bloater's Exit and the Undead Abomination hit your own minions too. Watch the board before they die."),

  // ---- Bees ----
  'Bees+Demons': G(
    "Bees wall up around the Hive; Demons pay Health for big Arrivals. The Hive's Taunts keep your Hero safe so you can afford the Demon payments.",
    [["hive_sentinel", "pit_lord", "Pit Lord deals 3 to all other characters: Sentinel's extra Health with the Hive up lets it survive the blast."],
      ["royal_command", "abyssal_brute", "Royal Command makes a bee huge while Abyssal Brute grows itself: two big threats for the enemy to deal with."]],
    "Infernal Brood costs Health equal to your Summoning Tier and summons a Demon of that cost with Venomous, then the Tier rises.",
    "If the Queen dies your Hero takes 10 damage. Never let Demon payments put you within reach of that."),
  'Bees+Dinosaurs': G(
    "Dinosaurs bring double Mana and big hitters; Bees hold the line around the Hive. Defend early with bees, then crash in with Dinosaurs once the Mana comes.",
    [["hive_enforcer", "tyrannosaurus_rex", "Enforcer soaks the attacks so your Hive lives; the Rex charges straight at the enemy Hero."],
      ["royal_nurse", "nest_of_dinosaur_eggs", "Keep the Hive healthy while the Nest waits to hatch three Baby Dinosaurs."]],
    "Amber Fossil gives 2 Primal Mana this turn and +0/+3 to your Hive: ramp and defence in one.",
    "The Extinction Cycle wipes your own board, but not the Hive. Rebuild around it after each wipe."),
  'Bees+Divine': G(
    "A very defensive pair: Divine heals and boosts Health, Bees wall up the Hive. Outlast everything, then win with big late minions like The First Light or Hive Champion.",
    [["halo_sentinel", "hive_sentinel", "Two Taunts: Halo Sentinel gives your other minions +1 Health, and Hive Sentinel has +1 more while your Hive stands."],
      ["saint_of_mercy", "hive_matron", "Saint heals your minions every turn while Matron keeps adding Worker Bees."]],
    "Royal Halo restores 4 Health (Overheal); on the Queen it also gives her Evade until your next turn.",
    "Low damage. Make sure you have a way to finish the game, or the enemy draws into answers."),
  'Bees+Dragons': G(
    "Dragons Burn; Bees defend. The Burn wears the enemy down while your Hive and Taunts hold the line. Dragons' Burn spreads (Scorching Breath, Sunfire Dragon) deal damage every turn while the enemy is stuck attacking your Taunts.",
    [["venom_guard", "scorching_breath", "Scorching Breath spreads Burn; Venom Guard's Venomous Taunt kills anything that attacks into it."],
      ["hive_champion", "furnace_dragon", "Two big late minions: one walls, the other makes every Burn tick bigger."]],
    "Ember Wasps applies Burn 2 to one minion, and Burn 1 to all other enemy minions if your Hive is up.",
    "Burn is slow. Keep the Hive and the Queen safe while it works, or fast decks race you."),
  'Bees+Fungus': G(
    "A slow poison deck: Venomous bees and Poisonous fungi kill anything they touch, and Mushrooms pile up in the enemy deck. Hold the Hive, and let every draw hurt them.",
    [["venom_guard", "cordyceps_fungus", "Attacking your Venomous Taunt kills the attacker, and Cordyceps places 2 Mushrooms every time they try."],
      ["defensive_swarm", "spore_ambush", "Two Traps for attacks: two Worker Bees to soak the hit, and a Poisonous Sporeling plus 2 Mushrooms."]],
    "Cordyceps Bloom places 2 Mushrooms and summons a 1/1 Worker Bee with Venomous.",
    "Little direct damage. Let the Mushrooms do the work, and keep the Queen safe while they do."),
  'Bees+Ghosts': G(
    "Ghosts bring minions back from either Graveyard; Bees keep making Worker Bees. You never run out of bodies, so every trade is fine for you. Graveyard Colossus gets cheap fast with so many minions dying.",
    [["grave_robber", "royal_executioner", "Trade the Executioner away; Ghost Haunts keep bringing back cheap minions to trade again."],
      ["graveyard_colossus", "swarm_muster", "Lots of Worker Bees die, so Graveyard Colossus gets down to 3 Mana fast."]],
    "The Eternal Swarm Haunts a 2-cost-or-less minion with Reborn; when it loses Reborn, you also get a 1/1 Spectral Insect.",
    "Your Hero takes 10 damage if the Queen dies: protect her even when you have lots of bodies."),
  'Bees+Ice Age': G(
    "Ice Age Taunts with Thick Fur plus the Hive's wall make a deck that is very hard to attack. Freeze the enemy and wear them down. Old Tusker gives your other minions +0/+2 and Thick Fur, so your bees stay free during the Great Freeze too.",
    [["avalanche", "hive_champion", "Freeze the enemy board, then your big Taunts and bees take the trades."],
      ["thin_ice", "decoy_nest", "Two Traps when the enemy plays a minion: Freeze it, and a 0/3 Decoy to soak a hit."]],
    "Winter Hive summons two Worker Bees with Thick Fur and gives your Hive +0/+3.",
    "The Great Freeze freezes your bees too (they have no Thick Fur). Use Winter Hive to keep some free."),
  'Bees+Lycanthropes': G(
    "Lycanthropes Transform for bursts of power; Bees hold the Hive. Defend with bees, attack with beasts, and keep the Queen safe while you do. Royal Jelly Keeper and Royal Command buff your Insects; Lycanthrope buffs come from Transforms.",
    [["ironhide_werehippo", "hive_sentinel", "Two Taunts: the Hippo heals another minion whenever it transforms."],
      ["dreadjaw_alpha", "royal_jelly_keeper", "The Alpha boosts every other Lycanthrope, and Royal Jelly Keeper buffs an Insect (or the Queen +3/+3) at the same time."]],
    "Honeyfang gives a Lycanthrope +1/+2 and Venomous: it kills anything it fights.",
    "Transforms cost Mana every time. Keep enough to repair the Hive."),
  'Bees+Plants': G(
    "Two growing armies: Seedlings grow and bees multiply. Go wide, get bigger every turn, and let the enemy run out of answers. Both realms have Taunts, so your growing minions stay safe while they get bigger.",
    [["world_tree", "swarm_muster", "Swarm Muster makes three Worker Bees; World Tree keeps your Plants growing every turn."],
      ["garden_guardian", "hive_sentinel", "Two Taunts to protect your growing board: the Guardian gains Attack whenever it's healed."]],
    "Pollination summons a Seedling and a Worker Bee (+1 Health each with the Hive up).",
    "Lots of small minions lose to board-wide damage. Don't overcommit into a board clear."),
  'Bees+Radioactive': G(
    "Bees wall up the Hive while Radiation auras drain every character without Radiation. Enemy Worker-sized minions melt, and your Taunts hold the big ones. Be careful: your Worker Bees have no Radiation and shrink too.",
    [["rad_tortoise", "hive_enforcer", "Enemies must hit Enforcer first; the Tortoise irradiates anything attacking it, turning their attackers into drains on their own board."],
      ["reactor_meltdown", "hive_champion", "Meltdown deals 3 to every minion and Obliterates the dead; the 5/6 Hive Champion survives it and takes over the board."]],
    "Glow Wasps summons a 2/2 Soldier Wasp and gives a random enemy minion Radiation 1 for 2 turns: a short aura that shrinks everything without Radiation.",
    "Radiation drains your own Worker Bees and the Hive's minions too. Use Radiation when the enemy has more small minions than you do."),
  'Bees+Robots': G(
    "Robots stack Upgrades on a few big machines; Bees defend the Hive. Build your machines behind a wall of bees and let them grind the enemy down.",
    [["titan_guard", "hive_sentinel", "Two Taunts that last: Titan Guard heals 2 every turn with 2 Upgrades, Hive Sentinel has +1 Health while the Hive stands."],
      ["defensive_swarm", "laser_retaliation", "Two answers to attacks: Worker Bees take the hit on your Hive, and Laser Retaliation deals 3 (5 with a Weapon) to the attacker."]],
    "Stinger Module upgrades a Robot +1/+1 and Venomous: a Venomous Robot with Twin Strike kills two minions a turn.",
    "Putting every Upgrade on one Robot loses to removal. Spread them out, and keep the Queen safe."),
  'Bees+Sharks': G(
    "Sharks hunt Marked Prey; Bees defend the Hive. Hold the line with bees while the Sharks bite anything weakened. Thresher Shark and Feeding Frenzy also mark the weak as Prey while your Hive holds.",
    [["thresher_shark", "venom_guard", "Thresher marks the weak as Prey; Venom Guard kills whatever attacks it."],
      ["swarm_muster", "frenzy_of_the_pack", "Three Worker Bees hold the board while Frenzy gives your Sharks +2 Attack to hunt."]],
    "Swarm Bait summons two Worker Bees and deals 1 to every enemy minion with 3 or less Health.",
    "Sharks need Prey. Against big minions, rely on Venomous bees to trade."),
  'Bees+Ultraterrestrials': G(
    "Displace enemy attackers while bees wall up. The enemy can't reach your Hive, and their minions spend turns out of the fight. Phase Jelly heals your Hero every time it comes back from a Displacement.",
    [["invisible_threshold", "hive_enforcer", "A Trap that Displaces anything attacking your Hero, and Enforcer to take the rest."],
      ["dimensional_sentinel", "hive_sentinel", "Two sturdy Taunts: the Sentinel gains Attack whenever you Displace a friendly minion, the Hive Sentinel has +1 Health while the Hive stands."]],
    "Hive Outside Time summons two Worker Bees beyond reality; they arrive at the start of your next turn with +1/+1.",
    "Displaced enemies come back. Use the time well, and don't leave the Queen exposed when they return."),
  'Bees+Vampires': G(
    "Vampires attack with Lifesteal; Bees defend the Hive. Heal back what you pay, and let the Hive keep your Hero safe. The Hive's Taunts let your Vampires attack the Hero instead of defending.",
    [["vampire_doom_hound", "hive_enforcer", "Enforcer protects your Hive while Doom Hound sneaks in Stealth Lifesteal hits."],
      ["blood_pool", "hive_sentinel", "A Taunt in front of Blood Pool, which grows your Vampires every turn."]],
    "Blood Nectar costs 1 Health: +2 Attack and Lifesteal this turn on an Insect (+2 Health too on the Queen).",
    "Your Hero takes 10 damage if the Queen dies. Don't drop too low on Health while you pay for Vampires."),
  'Bees+Void': G(
    "Void empties its hand fast and hits hard; Bees defend the Hive. Hold the Hive while Void deals damage, and don't stall for too long. Void's Rush minions clear the board while the Hive soaks up attacks.",
    [["hive_sentinel", "riftmaw_devourer", "Taunt holds the line; Riftmaw charges once your hand is empty."],
      ["shadow_brood_mother", "swarm_muster", "Lots of bodies: two Void Spawn with Rush and three Worker Bees."]],
    "Starless Swarm summons two Worker Bees with Rush: they trade the turn you play them.",
    "Void runs out of cards; Bees are slow. Don't stall too long before you go for damage."),
  'Bees+Zombies': G(
    "Zombies come back and bees keep spawning: endless bodies. Trade constantly and let the enemy run out of cards before you run out of minions.",
    [["zombie_horde", "hive_matron", "Lots of bodies every turn: Matron makes Worker Bees, Horde leaves three Walkers."],
      ["bloater", "hive_sentinel", "Two Taunts in front of your Hive; when Bloater dies its Exit deals 1 to every minion, finishing off weakened attackers."]],
    "Undying Swarm summons two Worker Bees with Reborn: four bodies over time.",
    "Bloater's Exit hurts your own Worker Bees too. Make sure you won't lose more than the enemy."),

  // ---- Demons ----
  'Demons+Dinosaurs': G(
    "Two hard-hitting realms. Dinosaurs ramp with double Mana and drop huge bodies; Demons trade Health for strong Arrivals and board clears. Push damage early and end the game before your own Health runs out.",
    [["blood_pact", "tyrannosaurus_rex", "Blood Pact gives a Demon +2/+2; pair it with a Charge T. Rex the same turn and the enemy faces two big threats at once."],
      ["pit_lord", "large_dinosaur_egg", "Pit Lord's 3 damage to everything breaks your own Egg, which hatches a 3/3 Charge Baby T. Rex."]],
    "Primal Pact costs 3 Health and summons a random 3-cost-or-less Dinosaur and Demon: two bodies for one card.",
    "You lose Health from Demons and your board from the Extinction Cycle. Don't let both happen in the same stretch, or you'll have nothing left."),
  'Demons+Divine': G(
    "Pay Health for Demon power, then heal it straight back with Divine. Overheal lets your Hero go above 30, so the Demon payments hurt far less.",
    [["holy_radiance", "abyssal_brute", "Pay 3 for a 6/6 Brute, then heal 3 back to all friendly characters."],
      ["saint_of_mercy", "pit_lord", "Pit Lord damages your own minions too; Saint of Mercy heals them back every turn."]],
    "Fallen Grace costs Health equal to your Summoning Tier, summons a Demon of that cost with Taunt and heals that much back (Overheal): a free Demon.",
    "Divine's anti-Dark cards only matter against Dark enemies; your own Demons are safe from them, so don't count on them in every match."),
  'Demons+Dragons': G(
    "Aggressive and explosive: Burn ticks on the enemy every turn while Demons hit hard with Health-paid Arrivals. Race them down before they can stabilise.",
    [["infernal_ravager", "fireball", "Ravager deals 3 to the Hero and Fireball 3 (4 if Burning): 7 damage of reach to finish a game."],
      ["blazewing", "pit_lord", "Two board clears: 1 to all enemies (more on Burning ones), then 3 to everything."]],
    "Hellfire Pact costs 2 Health and applies Burn 2 to all enemy characters: Burn on everything at once.",
    "Both realms are aggressive. If the enemy stabilises, you may run out of Health and cards together."),
  'Demons+Fungus': G(
    "Fungus fills the enemy deck with Mushrooms; Demons pay Health for strong Arrivals and board clears. Clear their board, and let every card they draw hurt.",
    [["pit_lord", "deathspore", "Pit Lord kills small enemies; Deathspore places a Mushroom for each enemy minion that dies."],
      ["archfiend_of_ruin", "fungus_giant", "Archfiend clears the board and heals you; Fungus Giant costs 1 less for every 2 Mushrooms."]],
    "Infestation Pact costs 2 Health and places 4 Mushrooms: a big burst of Mushrooms at once.",
    "Fungus is slow and Demons cost Health. Make sure you can survive long enough for the Mushrooms to count."),
  'Demons+Ghosts': G(
    "Ghosts bring dead minions back; Demons give you plenty worth bringing back. Trade freely and let your dead Demons return. Big Demons like Abyssal Brute and Soulflayer are the best minions to Haunt back.",
    [["banshee_matriarch", "abyssal_brute", "Brute dies in trades; Banshee Matriarch can Haunt it (or any 4-cost-or-less minion) back with Reborn."],
      ["graveyard_colossus", "pit_lord", "Pit Lord kills lots of minions, so Graveyard Colossus gets much cheaper."]],
    "Infernal Séance Haunts a 3-cost-or-less minion with Reborn, and you lose Health equal to its cost.",
    "Haunts are random. Don't count on getting the exact minion you want back."),
  'Demons+Ice Age': G(
    "Ice Age's Thick Fur Taunts protect your Health while Demons pay for big Arrivals. Freeze their attackers, then wipe the board. Ice Age's Campfire heals back some of what the Demons cost.",
    [["avalanche", "archfiend_of_ruin", "Freeze the enemy, then Archfiend deals 4 to every enemy minion and heals you for each one destroyed."],
      ["giant_ground_sloth", "doom_herald", "The 2/9 Sloth holds the wall; Doom Herald grows your Demons every turn."]],
    "Hellfrost Pact costs 3 Health and gives all your minions +0/+3: your whole board survives their next attack.",
    "The Great Freeze freezes your Demons too (no Thick Fur). Plan your attacks around it."),
  'Demons+Lycanthropes': G(
    "Lycanthropes Transform for bursts of power; Demons pay Health for strong Arrivals. Push hard on a few big turns and finish fast. Unholy Empowerment on a Beast Form is often enough damage to win.",
    [["unholy_empowerment", "dreadjaw_alpha", "+3/+3 and Lifesteal on the Alpha, which gives every other Lycanthrope +1 Attack."],
      ["pit_lord", "ironhide_werehippo", "Pit Lord damages everything, but the 2/6 Hippo survives and heals another minion when it transforms."]],
    "Hellhound Pact costs 2 Health and Transforms a Lycanthrope with +3/+3.",
    "Transforms cost Mana and Demons cost Health. Keep an eye on both."),
  'Demons+Plants': G(
    "Plants grow every turn and heal; Demons pay Health for power. The Plants buy time and Health back while the Demons hit hard. Elder Treant and World Tree keep your board alive through the long game while the Demons close it out.",
    [["elder_treant", "abyssal_brute", "The Treant heals your Plants every turn behind its Taunt; the 6/6 Brute is a big threat for the enemy to answer."],
      ["infernal_ascension", "world_tree", "Infernal Ascension buffs your Demons +3/+3 while World Tree keeps growing your Plants."]],
    "Thorned Pact costs 2 Health and summons a Seedling that grows 3 times right away: a ready-made minion.",
    "Pit Lord and Archfiend can kill your own Seedlings. Time your board clears for before you rebuild."),
  'Demons+Radioactive': G(
    "Radiation auras drain the Health of every character without Radiation, and Demons hit hard and clear the board. Shrink their board with Radiation, then Pit Lord and Archfiend's damage kills far more than it normally would.",
    [["critical_mass_horror", "pit_lord", "Radiation 2 on one enemy shrinks every other minion without Radiation by 2, so Pit Lord's 3 damage now kills anything up to 5 Health."],
      ["rad_tortoise", "doom_herald", "The Tortoise holds the line and irradiates attackers; Doom Herald grows your Demons +1/+1 each turn to outgrow the drain."]],
    "Hellish Fallout costs Health equal to your Summoning Tier and summons a Demon of that cost with Radiation 1 permanently: a Demon that's immune to Radiation and drains everything else.",
    "Radiation drains your own Demons too, and Demon payments cost Health. Watch both your Hero and your board."),
  'Demons+Robots': G(
    "Robots stack Upgrades; Demons pay Health for big Arrivals. A strong midgame of big threats the enemy can't answer all at once. Upgraded Robots survive Pit Lord's blast, so you can clear the board without losing your own machines.",
    [["reinforced_plating", "pit_lord", "Give a Robot +0/+3 so it survives Pit Lord's 3 damage to everything."],
      ["laser_cannon", "infernal_ravager", "Laser Cannon pings the Hero whenever its Robot attacks; Ravager deals 3 straight to the face."]],
    "Infernal Engine costs Health equal to your Summoning Tier, summons a Demon and gives it a Modular Upgrade of your choice.",
    "Upgrades on one Robot lose to removal. Spread your threats so a single answer doesn't undo everything."),
  'Demons+Sharks': G(
    "Aggressive: Sharks hunt Marked Prey while Demons hit hard and clear. Damage everything, mark the survivors and feed. Every minion your board clears leave at 3 Health or less becomes Prey for your Sharks.",
    [["pit_lord", "thresher_shark", "Pit Lord damages everything; Thresher then marks the survivors as Prey for your Sharks."],
      ["hellhound", "great_white", "Two Rush minions to clear the board the turn you play them; Great White attacks again after killing Prey."]],
    "Hellmaw Hunt costs 3 Health and summons a 4/3 Rush Shark with +2 Attack against Marked Prey.",
    "Both realms push hard. Don't drop your Health too low before you win."),
  'Demons+Ultraterrestrials': G(
    "Displace enemy minions for a turn while Demons hit hard. Clear the way, then swing at the Hero while their board is gone. Ultraterrestrial Taunts and Traps also protect your Health between Demon payments.",
    [["rift_hunter", "infernal_ravager", "Rift Hunter Displaces a small blocker for a turn; Infernal Ravager then hits the Hero for 3 while your minions attack freely."],
      ["the_unplaceable", "archfiend_of_ruin", "Two huge Arrivals that reset the board: Displace everything, or deal 4 to every enemy."]],
    "Infernal Detour costs 3 Health and Displaces every enemy minion with 3 or less Attack until your next turn.",
    "Displaced enemies come back. Use the turn they're gone to push damage, not to wait."),
  'Demons+Vampires': G(
    "Both realms pay Health on purpose and get stronger for it, and Vampires heal it back with Lifesteal. A high-risk, high-reward aggro deck. Blood Imp, Bloodhound and Blood Servant all grow when you lose Health.",
    [["blood_imp", "bloodhound", "Both grow whenever your Hero loses Health: every Demon payment makes them hit harder."],
      ["unholy_empowerment", "werepyre_abomination", "+3/+3 and Lifesteal on an 8/6 Charge: 11 damage and 11 Health back."]],
    "Blood Covenant costs 2 Health and summons a Demon of your current Summoning Tier with Lifesteal (the Tier doesn't rise).",
    "You will be low on Health often. Make sure your Lifesteal minions survive to heal you back."),
  'Demons+Void': G(
    "Very aggressive: Void dumps its hand and hits hard, Demons pay Health for more damage. Race the enemy down before either resource runs out. Eclipse Maw and Infernal Ravager both hit the Hero directly.",
    [["infernal_ravager", "star_swallower", "Ravager hits for 3; Star Swallower discards your hand for 2 damage per card."],
      ["blood_pact", "riftmaw_devourer", "Blood Pact gives a Demon +2/+2 and empties a card from your hand; once you're Hollow, Riftmaw Devourer comes in with Charge."]],
    "Abyss Gate costs 3 Health and summons two 2/2 Void Spawn with Rush.",
    "You run out of cards and Health together. Count your damage before going all in."),
  'Demons+Zombies': G(
    "Zombies keep coming back and leave Corpses; Demons hit hard and clear the board. Your board survives your own board clears, so you can use Pit Lord and Archfiend freely.",
    [["pit_lord", "walker", "Pit Lord deals 3 to every other character, but Reborn Walkers come straight back and Zombie Exits trigger, so you lose far less than the enemy."],
      ["infernal_ascension", "zombie_horde", "Zombie Horde leaves three Walkers when it dies; Infernal Ascension gives your Demons +3/+3 to fight alongside them."]],
    "Unholy Reanimation costs 3 Health and brings back a random friendly Zombie or Demon that died this game: best once a big one (Tarman, Pit Lord, Abyssal Brute) is in the Graveyard.",
    "Bloater's Exit and Pit Lord hurt your own minions too, and every Demon payment costs Health. Keep your Hero above 15 or so when the enemy has reach."),

  // ---- Dinosaurs ----
  'Dinosaurs+Divine': G(
    "Divine's healing and bonus Health keep your Dinosaurs alive through trades, and Dinosaurs' double Mana lets you play big Divine minions early. Build a sturdy board of big, healthy beasts, and rebuild fast after each Extinction.",
    [["halo_sentinel", "velociraptor_packleader", "Halo Sentinel gives your other minions +1 Health; Packleader gives each attacking Dinosaur +1 Attack. Your Dinos trade up and survive."],
      ["beacon_angel", "triceratops", "Beacon Angel adds Health every turn to a random friendly minion; on a 4/5 Taunt Triceratops that makes a wall the enemy can't break."]],
    "Ancient Blessing gives all your Dinosaurs +2 Health and heals your Hero 3 (Overheal): best right after you flood the board with Babies.",
    "The Extinction Cycle wipes your own board, healing and all. Don't spend your best Divine buffs on minions that are about to be wiped."),
  'Dinosaurs+Dragons': G(
    "Dinosaurs bring double Mana and big bodies; Dragons Burn the enemy every turn. Use the extra Mana to land Dragon spreads early, then trample the weakened board with Dinosaurs.",
    [["scorching_breath", "spinosaurus", "Scorching Breath Burns every enemy minion; Spinosaurus's 2 damage finishes the biggest one off."],
      ["fireball", "tyrannosaurus_rex", "Late game, a Charging T. Rex plus a Fireball to the face is 11 or 12 damage out of nowhere."]],
    "Meteor Breath applies Burn 2 to every enemy minion and pushes your next Extinction back by a turn: board damage and more time.",
    "Dragon damage is slow Burn; the Extinction Cycle is a deadline. Plan to win before your board gets wiped, or have Not Yet ready."),
  'Dinosaurs+Fungus': G(
    "Fungus fills the enemy deck with Mushrooms while Dinosaurs ramp and hit. Use the double Mana for big Fungus spells like Mushroom City, and let your Dinosaurs pressure the board while every draw hurts them.",
    [["mushroom_city", "nest_of_dinosaur_eggs", "Mushroom City places 10 Mushrooms in one go; the Nest guards your board and hatches three Babies when it breaks."],
      ["cordyceps_mind_control", "tyrannosaurus_rex", "With double Mana, take control of their best minion for good and charge the T. Rex in on the same turn."]],
    "Fossil Spores places 3 Mushrooms and gives you a Primal Mana this turn: Mushrooms that pay for themselves.",
    "Fungus damage is slow. Make sure you have enough board to survive until the Mushrooms kick in, especially around each Extinction."),
  'Dinosaurs+Ghosts': G(
    "Dinosaurs die often (Extinction, trades); Ghosts bring them back. After every wipe, your Ghosts Haunt your best Dinosaurs back onto the board, so the Extinction hurts the enemy more than you.",
    [["the_dead_march", "triceratops", "After the Extinction, The Dead March Haunts two 4-cost-or-less minions back with Reborn: Triceratops and Velociraptor Packleader are perfect targets."],
      ["graveyard_colossus", "nest_of_dinosaur_eggs", "Eggs and Babies die constantly, so Graveyard Colossus gets cheap fast."]],
    "Fossils Beyond the Veil Haunts a 4-cost-or-less Dinosaur with Reborn, with +2 Health if your next Extinction is within 2 turns.",
    "Haunts are random, so you might bring back a 1-cost Egg instead of a Triceratops. Make sure your Graveyard has good targets first."),
  'Dinosaurs+Ice Age': G(
    "Two prehistoric realms: Dinosaurs bring double Mana and Charge, Ice Age brings Thick Fur Taunts and Freezes. Freeze the enemy, then Charge past them; hide behind Mammoths while you rebuild after each Extinction.",
    [["avalanche", "tyrannosaurus_rex", "Avalanche Freezes the enemy board, so your T. Rex charges past with nothing able to hit back next turn."],
      ["sabertooth_cat", "spinosaurus", "Spinosaurus deals 2 to a Frozen minion; Sabertooth deals double damage to Frozen minions. Freeze, then clean up."]],
    "Last of the Giants gives you 2 Primal Mana this turn and +2/+2 and Thick Fur to a minion: a big turn, and that minion ignores the Great Freeze.",
    "The Great Freeze also freezes your Dinosaurs (no Thick Fur), and the Extinction wipes your board. Count both timers before committing."),
  'Dinosaurs+Lycanthropes': G(
    "Dinosaurs give you double Mana; Lycanthropes turn Mana into Transforms. With the extra Mana you can Transform several beasts and still play cards each turn.",
    [["unleash_the_pack", "velociraptor_packleader", "Transform every Lycanthrope at once, and every attacking Dinosaur gets +1 Attack from Packleader: a huge attack turn."],
      ["apex_ascension", "tyrannosaurus_rex", "Late game, Apex Ascension Transforms your pack with +2/+2 while T. Rex charges in."]],
    "Primeval Instinct gives you 2 Primal Mana this turn and +3 Attack to a Beast Form: enough Mana to Transform two more Lycanthropes.",
    "The Extinction Cycle wipes your board, Beast Forms and all. Time your big Transform turns before it hits."),
  'Dinosaurs+Plants': G(
    "Plants grow every turn; Dinosaurs ramp and hit hard. Eggs and Seedlings both start small and grow, so the board gets bigger every turn until the Extinction resets it.",
    [["world_tree", "nest_of_dinosaur_eggs", "World Tree adds Seedlings or +1/+1 every turn while the Nest waits to hatch three Babies."],
      ["entangler", "tyrannosaurus_rex", "Entangler gives their biggest blocker -2 Attack, so your T. Rex can attack it and survive, or ignore it and charge the Hero."]],
    "Primal Seed summons a 0/3 Primal Egg that hatches into a random 3-cost Dinosaur two turns later.",
    "The Extinction Cycle wipes your Seedlings too. Don't invest in growing them right before it hits."),
  'Dinosaurs+Radioactive': G(
    "Dinosaurs hit hard with double Mana; Radiation auras drain every character without Radiation. Irradiate your biggest Dinosaur so it's immune while the enemy's small minions melt, then trample what's left.",
    [["critical_mass_horror", "tyrannosaurus_rex", "Radiation 2 on an enemy shrinks every other minion without Radiation by 2, so the T. Rex kills blockers and survives."],
      ["reactor_meltdown", "triceratops", "Meltdown deals 3 to every minion and Obliterates the dead; the 4/5 Triceratops survives it."]],
    "Kaiju Awakening gives a Dinosaur +3/+3 and Radiation 1 permanently: it's immune to Radiation and drains 1 Health from every character without it, yours included.",
    "Obliterate skips death effects, so Reactor Meltdown won't hatch your Eggs. And your own board clears plus the Extinction can leave you empty: don't clear twice in a row."),
  'Dinosaurs+Robots': G(
    "Robots stack Upgrades on a few machines; Dinosaurs give the Mana to Upgrade twice a turn. Build a huge Upgraded threat early, then back it up with Dinosaurs.",
    [["annihilation_beam", "tyrannosaurus_rex", "With double Mana you can Annihilation Beam their biggest blocker (6 damage) and charge the T. Rex in on the same turn."],
      ["triceratops", "titan_guard", "Two big Taunts, a 4/5 and a 5/9: the enemy has to chew through both while your Upgraded Robots grow."]],
    "Mecha Rex upgrades any minion with +3/+3 and Taunt, and it becomes a Robot and a Mech: cast it on a Dinosaur and your Robot Upgrades (Targeting Matrix, Laser Cannon) can target it too.",
    "Robot Upgrades only target Robots, and the Extinction Cycle wipes your Upgraded Robots too. Upgrade right after the wipe, not just before."),
  'Dinosaurs+Sharks': G(
    "Aggressive: Dinosaurs bring double Mana and Charge, Sharks hunt Marked Prey. Clear the weak with Sharks and push big Dinosaur damage at the Hero.",
    [["thresher_shark", "velociraptor_packleader", "Thresher marks the weak as Prey; Packleader gives each attacking Dinosaur +1 Attack."],
      ["great_white", "spinosaurus", "Spinosaurus deals 2 to a minion (often marking it as Prey); Great White kills it and attacks again."]],
    "Prehistoric Jaws gives a Shark or Dinosaur +3/+3 and Rush; if it kills a Marked Prey this turn you also gain a Primal Mana.",
    "Both realms are aggressive. If the enemy stabilises, the Extinction can leave you with nothing."),
  'Dinosaurs+Ultraterrestrials': G(
    "Displacing your own minions keeps them safe from the Extinction: they come back after the wipe with +1/+1. Use that to keep your best Dinosaurs through every Extinction.",
    [["pocket_dimension", "tyrannosaurus_rex", "Displace your T. Rex the turn the Extinction hits; it is off the board during the wipe and comes back at the start of your next turn."],
      ["null_behemoth", "triceratops", "Null Behemoth Displaces a friendly minion and gets +2/+2 when it returns."]],
    "Fossil Rift Displaces a friendly minion until your next turn; it returns with +2/+2 (+4/+4 if it's a Dinosaur). Perfect right before an Extinction.",
    "Displaced minions are gone for a turn. Don't leave yourself with an empty board while the enemy attacks."),
  'Dinosaurs+Vampires': G(
    "Vampires attack and heal with Lifesteal; Dinosaurs ramp and hit hard. A Lifesteal T. Rex heals a lot, and the double Mana lets you play Vampire tricks alongside big Dinosaurs.",
    [["vampire_bite", "baby_t_rex", "Vampire Bite deals 3 to a blocker with Lifesteal (and gives you a Thrall if it dies); Baby T. Rex then charges straight in."],
      ["the_crimson_king", "tyrannosaurus_rex", "Two huge late threats: with double Mana you can land both in one turn, the King healing you with Lifesteal while the Rex charges."]],
    "Primal Thirst costs 2 Health: 2 Primal Mana, and a random Dinosaur gets +2 Attack and Lifesteal this turn.",
    "The Extinction Cycle wipes your Lifesteal minions too. Heal up before it hits."),
  'Dinosaurs+Void': G(
    "Void dumps its hand fast; Dinosaurs give you the Mana to do it. Play out your hand quickly with the double Mana, go Hollow, and finish with Charge minions.",
    [["star_swallower", "tyrannosaurus_rex", "Star Swallower discards your hand for 2 damage per card; T. Rex charges for 8 more."],
      ["riftmaw_devourer", "baby_t_rex", "Riftmaw has Charge while your hand is empty and Baby T. Rex always has it: 8 damage straight to the Hero the turn they land."]],
    "Extinction Event discards your hand and deals 1 damage to every enemy minion for each card discarded (up to 4).",
    "Void runs out of cards fast, and the Extinction wipes your board. Make sure you can finish before both run out."),
  'Dinosaurs+Zombies': G(
    "Zombies come back and leave Corpses; Dinosaurs die to the Extinction. Zombie Exits and Corpses turn every wipe into value, so the Extinction hurts the enemy more than you.",
    [["zombie_horde", "extremely_large_meteor", "Extremely Large Meteor makes the next Extinction wipe both boards; Zombie Horde leaves three Walkers when it dies."],
      ["tarman", "tyrannosaurus_rex", "Two huge late threats: with double Mana you can land both in one turn, and Tarman's Reborn means even the Extinction can't keep him down."]],
    "Fossil Revival brings back a random friendly Dinosaur that died, with 1 Health and Reborn.",
    "Zombie Exits hurt your own minions too. Make sure you won't wipe yourself."),

  // ---- Divine ----
  'Divine+Dragons': G(
    "Dragons Burn the enemy every turn; Divine keeps you and your minions healthy while it works. Play defensively behind Taunts and heals, let the Burn tick, and finish with The First Light or The Worldflame.",
    [["halo_sentinel", "scorchscale_guardian", "Two Taunts: Halo Sentinel gives Scorchscale +1 Health, and Scorchscale gains Attack whenever a Burning enemy hits it."],
      ["scorching_breath", "judgment_of_dawn", "Scorching Breath Burns the board; Judgment of Dawn then deals 4 to every enemy minion to finish them off."]],
    "Sacred Flame applies Burn 2 to an enemy character and restores 2 Health to your Hero (Overheal): use it on the enemy Hero for a slow, steady clock.",
    "Burn is slow and Divine doesn't hit hard. Against fast decks, play Taunts early or you'll be out-raced."),
  'Divine+Fungus': G(
    "A slow, safe deck: Divine heals and builds Health while Fungus fills the enemy deck with Mushrooms. Survive every attack, and let every card they draw hurt them.",
    [["halo_sentinel", "cordyceps_fungus", "Halo Sentinel's Taunt draws attacks; Cordyceps places 2 Mushrooms every time an enemy minion attacks."],
      ["holy_radiance", "fungus_giant", "Holy Radiance keeps your board healthy while the Mushrooms pile up, and Fungus Giant gets cheaper as they do."]],
    "Purifying Spores places 2 Mushrooms and restores 2 Health to your Hero (Overheal): a small heal plus a small clock.",
    "Very little direct damage. Make sure enough Mushrooms land before you run out of defence."),
  'Divine+Ghosts': G(
    "Divine heals and Cleanses; Ghosts bring minions back. Your minions survive longer, and when they do die they come back. A slow, grinding deck that never runs out of board.",
    [["divine_phoenix", "banshee_matriarch", "Phoenix comes back once by itself (healing your board); Banshee Matriarch can Haunt it back again with Reborn."],
      ["saint_of_mercy", "phantom_duelist", "Saint heals your board every turn; Phantom Duelist has Evade and Reborn. Together they keep your board alive."]],
    "Sanctuary of the Departed Cleanses a friendly character; if it was a minion, it also Haunts a 3-cost-or-less minion with Reborn.",
    "Ghosts are Dark, so Divine's anti-Dark cards don't help them; they only matter against Dark enemies."),
  'Divine+Ice Age': G(
    "A huge, healthy wall. Ice Age brings Thick Fur Taunts and Freezes, Divine heals and grows Health. Freeze their attackers, outlast them, and finish with The First Light or big beasts.",
    [["halo_sentinel", "giant_ground_sloth", "A 2/9 Taunt that heals itself, plus +1 Health from Halo Sentinel: nearly impossible to break."],
      ["avalanche", "judgment_of_dawn", "Avalanche deals 2 and Freezes; Judgment of Dawn deals 4 more to every enemy minion."]],
    "Hearth Blessing restores 4 Health to all your characters (your Hero can be Overhealed): a big heal after a fight.",
    "The Great Freeze freezes your Divine minions (no Thick Fur). Plan around it when you need to attack."),
  'Divine+Lycanthropes': G(
    "Lycanthropes Transform for bursts of power; Divine keeps them healthy. Damage carries over through a Transform, so your heals keep your beasts in the fight.",
    [["ironhide_werehippo", "halo_sentinel", "Two big Taunts: the Hippo heals another minion when it transforms, and the Sentinel gives +1 Health."],
      ["pride_matriarch", "beacon_angel", "Pride Matriarch gives your minions +1 Health; Beacon Angel adds Health every turn."]],
    "Moonblessed restores 4 Health to a Lycanthrope and gives it Evade.",
    "Transforms cost Mana every time. Divine is slow, so keep enough Mana to defend."),
  'Divine+Plants': G(
    "Plants grow every turn; Divine heals and boosts Health. A board of tough, growing minions that's very hard to break. Garden Guardian gains Attack every time it's healed.",
    [["garden_guardian", "holy_radiance", "Holy Radiance heals every friendly character, and Garden Guardian gains Attack each time it's healed."],
      ["elder_treant", "saint_of_mercy", "Elder Treant heals your Plants 2 at the start of your turn and Saint of Mercy heals all your minions 2 at the end: your board never stays damaged."]],
    "Sacred Grove restores 2 Health to all your characters (Overheal) and summons a Seedling.",
    "Neither realm deals damage fast. Make sure you're building toward a win, not just a big board."),
  'Divine+Radioactive': G(
    "A tricky pair. Radiation drains every character without Radiation and stops them being healed, while Divine is all about healing. Make it work by keeping Radiation short (2-turn effects) and on the enemy side, keeping your own board small and tough, and healing before the auras go up.",
    [["purge_the_unholy", "rad_mine", "Two cheap Traps: Purge destroys a small Dark minion as it's played, and Rad Mine gives an attacker Radiation."],
      ["reactor_meltdown", "archangel_of_the_covenant", "Clear the board with Meltdown (3 to every minion, the dead are Obliterated), then rebuild with the Archangel, which gives your other minions +2 Health and Evade."]],
    "Purification removes all Radiation from a character and restores 3 Health to your Hero (Overheal): use it on an enemy Radiation source that's draining your board.",
    "Characters losing Health to Radiation can't be healed, including yours. Divine's heals won't fix Radiation damage, so keep your Radiation pointed at the enemy."),
  'Divine+Robots': G(
    "Robots stack Upgrades on a few big machines; Divine keeps those machines healthy and adds bonus Health. Build one or two huge, Taunting Robots and keep healing them while they grind the enemy down.",
    [["reinforced_plating", "halo_sentinel", "Reinforced Plating gives a Robot +0/+3 (and Taunt if it's already Upgraded); Halo Sentinel adds +1 Health to all your other minions."],
      ["titan_guard", "saint_of_mercy", "Titan Guard heals itself 2 a turn once it has 2 Upgrades; Saint of Mercy heals your whole board 2 more."]],
    "Sanctified Frame upgrades a Robot with +1/+3, Evade and Taunt: it soaks the next attack or spell for free.",
    "Putting every Upgrade on one Robot loses to a single removal or Silence. Spread your Upgrades across two minions."),
  'Divine+Sharks': G(
    "Sharks hunt Marked Prey; Divine keeps your Sharks and Hero healthy so they can keep attacking. Bite, heal, and bite again: your Sharks survive trades that would kill them in any other deck.",
    [["thresher_shark", "judgment_of_dawn", "Thresher deals 1 to every enemy and marks the weak as Prey; Judgment of Dawn deals 4 to every enemy minion to clear the rest."],
      ["great_white", "blessing_of_vitality", "Blessing of Vitality gives Great White +2 maximum Health, so it survives its trades and keeps attacking Prey."]],
    "Holy Undertow restores 4 Health to your Hero and deals 2 damage to a Marked Prey; if that kills it, it also Cleanses your characters.",
    "Sharks need Prey (3 Health or less). Against decks of big minions, lean on Divine's spells and Taunts instead."),
  'Divine+Ultraterrestrials': G(
    "Ultraterrestrials Displace minions out of the fight; Divine heals and boosts Health. Displace threats for a turn, heal up while they're gone, and repeat until you take over the board.",
    [["phase_jelly", "holy_radiance", "Phase Jelly heals your Hero 2 every time it comes back from Displacement; Holy Radiance heals 3 more to everything, and Overheal lets your Hero go above 30."],
      ["dimensional_sentinel", "halo_sentinel", "Two Taunts: Dimensional Sentinel gains Attack when you Displace your own minions, Halo Sentinel gives your others +1 Health."]],
    "Sanctum Between Worlds Cleanses a friendly minion and Displaces it; it returns with +2 Health and Evade.",
    "Displaced minions are gone for a turn. Don't Displace your own Taunts when the enemy has a big board."),
  'Divine+Vampires': G(
    "Vampires pay Health for power and heal it back with Lifesteal; Divine heals even more, with Overheal letting you go above 30. You can afford to pay a lot of Health, and your Blood minions grow every time you do.",
    [["blood_servant", "holy_radiance", "Pay Health to grow Blood Servant's Attack, then heal it all back with Holy Radiance."],
      ["the_crimson_king", "saint_of_mercy", "The Crimson King gets bigger for every 5 Health your Hero is missing: heal your minions with Saint of Mercy, not your Hero."]],
    "Blood Sacrament costs 1 Health: a friendly character gets +2 Attack this turn and then 2 Health restored (Overheal).",
    "Vampires are Dark, but Divine's anti-Dark cards only hit enemies, so they're no help in a mirror match."),
  'Divine+Void': G(
    "An odd pair: Void dumps its hand and hits hard, Divine heals and protects. Let Void do the attacking while Divine keeps your Hero alive, then empty your hand for a big Hollow finish.",
    [["riftmaw_devourer", "halo_sentinel", "Halo Sentinel's Taunt holds the line while Riftmaw charges in once your hand is empty."],
      ["star_swallower", "holy_radiance", "Heal up first, then Star Swallower discards your hand for 2 damage per card to the enemy Hero."]],
    "Eclipse of Grace restores 3 Health (Overheal), then discards a card; if it did, it restores 3 more.",
    "Void runs out of cards and Divine is slow. Decide early whether you're racing or defending."),
  'Divine+Zombies': G(
    "Zombies keep coming back and leave Corpses; Divine heals and boosts Health. A long, grinding game: your minions survive longer, and when they die they come back.",
    [["walker", "halo_sentinel", "Reborn Walkers with +1 Health from Halo Sentinel: they take two hits each to get rid of."],
      ["zombie_horde", "saint_of_mercy", "Zombie Horde leaves three Walkers when it dies; Saint of Mercy heals your whole board every turn."]],
    "Second Dawn gives a friendly minion Reborn and +2 Health until your next turn: protect your best minion through a big enemy turn.",
    "Zombies are Dark, but Divine's anti-Dark cards only hit enemies. And Bloater's Exit damages your own minions too."),

  // ---- Dragons ----
  'Dragons+Fungus': G(
    "A pure attrition deck. Burn damages them every turn, and Mushrooms damage them every time they draw. Hold the board with Taunts and spreads, and let both clocks run.",
    [["scorching_breath", "deathspore", "Scorching Breath Burns the whole enemy board; Deathspore places a Mushroom every time one of them dies."],
      ["inferno_tyrant", "mushroom_city", "Inferno Tyrant Burns the top 3 cards of their deck; Mushroom City puts 10 Mushrooms on the rest."]],
    "Smoldering Spores places 2 Mushrooms, and for the rest of the game every Mushroom that bursts on the enemy also applies Burn 1 to their Hero.",
    "Both clocks are slow. Against fast aggro decks you need Taunts and board clears early, or you'll lose before the damage piles up."),
  'Dragons+Ghosts': G(
    "Dragons Burn; Ghosts bring minions back. Trade your Dragons freely, Haunt the best ones back, and keep the Burn ticking until the enemy runs out.",
    [["blazewing", "banshee_matriarch", "Blazewing's Arrival clears small Burning minions; when it dies, Banshee Matriarch can Haunt it (or another 4-cost-or-less minion) back with Reborn."],
      ["graveyard_colossus", "dragonfire_storm", "Dragonfire Storm kills lots of minions, so Graveyard Colossus gets cheap."]],
    "Wyrm of the Afterlife Haunts a 5-cost-or-less Dragon with Elusive; while it lives, it Burns the enemy Hero 1 at the end of each of your turns.",
    "Haunts are random. Make sure your Graveyard has good Dragons before relying on them."),
  'Dragons+Ice Age': G(
    "Fire and ice. Ice Age Freezes and walls up with Thick Fur Taunts; Dragons Burn whatever's stuck. A Frozen, Burning minion can't attack and takes damage every turn.",
    [["avalanche", "blazewing", "Avalanche deals 2 and Freezes; Blazewing deals 1 more to everything, 2 to Burning minions."],
      ["scorching_breath", "sabertooth_cat", "Burn the board, then Sabertooth deals double damage to anything Frozen."]],
    "Frostfire applies Burn 2 to an enemy character and Freezes it: stops an attacker and starts it burning.",
    "The Great Freeze freezes your Dragons too (no Thick Fur). Burn still ticks while they're frozen, but plan your attacks around it."),
  'Dragons+Lycanthropes': G(
    "Lycanthropes Transform for big attacks; Dragons Burn the enemy so those attacks land on weakened minions. Burn the board, then Transform and attack.",
    [["scorching_breath", "unleash_the_pack", "Burn every enemy minion, then Transform your whole pack and attack into the weakened board."],
      ["inferno_stalker", "dreadjaw_alpha", "Stalker gets +2 Attack into Burning targets; the Alpha gives every other Lycanthrope +1 Attack."]],
    "Wyrmfang Fury applies Burn 2 to an enemy character and Transforms a random friendly Lycanthrope.",
    "Transforms cost 1 Mana each. Don't skip your Dragon spells to pay for them."),
  'Dragons+Plants': G(
    "Plants grow every turn and hold the board with Taunts; Dragons Burn the enemy every turn. Both are slow, steady clocks: your board gets bigger while theirs keeps burning, until they can't keep up.",
    [["garden_guardian", "scorching_breath", "Garden Guardian holds the line with Taunt while Scorching Breath Burns the whole enemy board."],
      ["world_tree", "dragonfire_storm", "World Tree grows your board every turn; Dragonfire Storm deals 3 to every enemy character and Burns the survivors."]],
    "Wildfire applies Burn 1 to every enemy minion and gives your Seedlings +1 Attack: the enemy burns while your Seedlings hit harder.",
    "Seedlings start tiny and Burn is slow. Against fast decks, play Taunts early and protect your Seedlings while they grow."),
  'Dragons+Radioactive': G(
    "Two damage-over-time realms. Radiation auras drain Health from every character without Radiation, and Burn deals damage every turn. Enemy minions melt from both sides.",
    [["scorching_breath", "reactor_meltdown", "Burn the board, then Meltdown deals 3 to every minion and Obliterates the dead."],
      ["critical_mass_horror", "blazewing", "Radiation 2 shrinks every minion without Radiation; Blazewing's 1 to 2 damage then kills the weakened ones."]],
    "Nuclear Fire applies Burn 2 and Radiation 1 for 2 turns to an enemy minion: it burns, and drains everything around it.",
    "Radiation drains your own Dragons too. Keep your board small while auras are up."),
  'Dragons+Robots': G(
    "Robots stack Upgrades on a few big machines; Dragons Burn. A Robot with a Weapon Upgrade that Burns whatever it hits turns on every Dragon bonus against Burning targets, and your machines hit Burning minions harder and harder.",
    [["laser_cannon", "inferno_stalker", "Laser Cannon makes a Robot ping the enemy Hero every time it attacks; Inferno Stalker gets +2 Attack against Burning targets. Both push damage every turn."],
      ["scorching_breath", "targeting_matrix", "Scorching Breath Burns the whole enemy board; Targeting Matrix gives a Robot Twin Strike to clean up two Burning minions a turn."]],
    "Flame Cannon is a Weapon Upgrade: a Robot gets +2 Attack and applies Burn 1 to whatever it attacks, turning on Inferno Stalker and Fireball bonuses.",
    "Putting every Upgrade on one Robot loses to a single removal spell. Spread them across two Robots so the Burn keeps going."),
  'Dragons+Sharks': G(
    "Burn damages every enemy minion each turn; once they're at 3 Health or less they become Marked Prey, and your Sharks get +2 Attack against them. Burn, mark and bite: the two realms feed each other perfectly.",
    [["scorching_breath", "great_white", "Scorching Breath brings small minions down to Prey range; Great White kills one, and if it kills Prey it attacks again."],
      ["blazewing", "thresher_shark", "Two board-wide pings: Blazewing deals 1 (2 to Burning minions), then Thresher deals 1 more and marks everything weak as Prey."]],
    "Boiling Tide applies Burn 1 to every enemy minion and marks those with 3 or less Health as Prey: set up a whole turn of Shark kills.",
    "Both realms are aggressive. If the enemy stabilises with big, high-Health minions, you can run out of steam: save Dragon's Breath for those."),
  'Dragons+Ultraterrestrials': G(
    "Displace enemy minions out of the fight for a turn while the Burn ticks on the rest. The enemy loses tempo and Health together, and you choose which threats they get back.",
    [["rift_hunter", "fireball", "Rift Hunter Displaces a small blocker for a turn; Fireball deals 3 to another (4 if it's Burning): two minions handled in one turn."],
      ["the_unplaceable", "dragonfire_storm", "The Unplaceable Displaces every other minion for a turn; when they come back, Dragonfire Storm deals 3 to every enemy and Burns the survivors."]],
    "Rift Flame Displaces an enemy minion until your next turn; when it returns it gets Burn 2, so it comes back already burning.",
    "Displaced enemies come back. Use the turn they're gone to push damage to the Hero, not just to stall."),
  'Dragons+Vampires': G(
    "Vampires attack and heal with Lifesteal; Dragons Burn the enemy every turn. Burn and spells keep the enemy board small while your Vampires hit the Hero and heal you back.",
    [["vampire_bite", "fireball", "Two cheap removal spells: Vampire Bite deals 3 with Lifesteal (and leaves a Thrall if it kills), Fireball deals 3 or 4."],
      ["dragonfire_storm", "the_crimson_king", "Dragonfire Storm deals 3 to every enemy character; the Crimson King then attacks into an empty board with Lifesteal."]],
    "Boiling Blood costs 2 Health and applies Burn 3 to an enemy; for the rest of the game, every point of Burn damage to enemies heals your Hero.",
    "Both realms are aggressive and Vampires cost Health. If the enemy stabilises, make sure your Lifesteal minions survive to heal you."),
  'Dragons+Void': G(
    "Very aggressive: Void dumps its hand and hits hard, Dragons Burn and have reach. Race the enemy down with Charge minions and direct damage before they can stabilise.",
    [["star_swallower", "fireball", "Star Swallower discards your hand for 2 damage per card to the Hero; Fireball adds 3 or 4 more."],
      ["scorching_breath", "riftmaw_devourer", "Scorching Breath weakens every blocker; Riftmaw then charges in for 5 once your hand is empty."]],
    "Black Flame applies Burn 3 to an enemy character, then discards a card; if it did, it applies Burn 2 more.",
    "Void runs out of cards fast and Burn is slow. Count your damage before you dump your hand."),
  'Dragons+Zombies': G(
    "Zombies keep coming back and leave Corpses; Dragons Burn the enemy every turn. A grinding deck: your minions keep returning while the enemy keeps burning.",
    [["scorching_breath", "bloater", "Scorching Breath Burns the enemy board; when Bloater dies its Exit deals 1 to every minion, finishing off the Burning ones."],
      ["dragonfire_storm", "zombie_horde", "Dragonfire Storm deals 3 to every enemy character; your Zombie Horde leaves three Walkers when it dies, so you always have a board after."]],
    "Ashen Revenant gives a friendly minion Reborn until your next turn and an Exit that Burns a random enemy for 2.",
    "Zombie Exits (Bloater, Undead Abomination) damage your own minions too. Watch your board before they die."),

  // ---- Fungus ----
  'Fungus+Ghosts': G(
    "A grinding deck: Ghosts bring minions back from either Graveyard while Fungus fills the enemy deck with Mushrooms. Trade constantly, Haunt your Poisonous minions back, and let every enemy draw hurt.",
    [["death_cap", "soul_binder", "Death Cap is Poisonous and leaves 2 Mushrooms when it dies; Soul Binder can Haunt it (3 cost) back to do it again."],
      ["deathspore", "graveyard_colossus", "Deathspore places a Mushroom every time an enemy minion dies; all those deaths also make Graveyard Colossus cheap."]],
    "Mycelium Séance places 2 Mushrooms and Haunts a random 2-cost-or-less minion from either Graveyard: a body and a clock for 3 Mana.",
    "Very little direct damage, and Haunts are random. Make sure you have enough board to survive until the Mushrooms win it."),
  'Fungus+Ice Age': G(
    "Ice Age Freezes and walls up with Thick Fur Taunts while Fungus fills the enemy deck with Mushrooms. A very slow, very safe deck: the enemy can't attack through your wall, and every card they draw hurts.",
    [["glyptodon", "cordyceps_fungus", "Glyptodon is a 1/6 Hardy Taunt; every time an enemy attacks into it, Cordyceps places 2 more Mushrooms."],
      ["ice_storm", "mushroom_city", "Ice Storm Freezes every enemy character and draws a card; next turn, Mushroom City places 10 Mushrooms while they can't punish you."]],
    "Frozen Spores places 2 Mushrooms and Freezes a random enemy minion: a small clock that also stops an attacker.",
    "The Great Freeze freezes your Fungus minions too (no Thick Fur). And neither realm hits hard, so don't fall too far behind on board."),
  'Fungus+Lycanthropes': G(
    "Lycanthropes Transform into big Beast Forms; Fungus adds Poisonous and fills the enemy deck with Mushrooms. Poisonous beasts kill anything they touch, and every death or attack spreads more Mushrooms.",
    [["spore_crawler", "unleash_the_pack", "Spore Crawler places a Mushroom every time it attacks; Unleash the Pack Transforms your pack for a big attack turn."],
      ["blight_shroom", "dreadjaw_alpha", "Blight Shroom gives an enemy -3/-1; the Alpha gives every other Lycanthrope +1 Attack to trade into it."]],
    "Spore Rabies places 2 Mushrooms and gives your Beast Forms Poisonous this turn: every Beast kills whatever it attacks.",
    "Transforms cost Mana and Fungus is slow. Don't fall behind on board while you set up."),
  'Fungus+Plants': G(
    "A slow, growing deck. Plants get bigger every turn and heal; Fungus fills the enemy deck with Mushrooms. Hold the board with Taunts and growing minions, and let every enemy draw hurt.",
    [["garden_guardian", "cordyceps_fungus", "Garden Guardian's Taunt draws attacks; Cordyceps places 2 Mushrooms every time an enemy minion attacks."],
      ["world_tree", "fungus_giant", "World Tree grows your board every turn; Fungus Giant gets cheap as the Mushrooms pile up."]],
    "Rot Garden summons a Poisonous Seedling and places 1 Mushroom: a Seedling that kills anything it fights.",
    "Neither realm deals damage quickly. Make sure your board stays big enough to win once the Mushrooms land."),
  'Fungus+Radioactive': G(
    "Two attrition realms. Radiation auras drain Health from every character without Radiation, and Mushrooms damage the enemy every time they draw. Slow, grinding, and very hard to beat in a long game.",
    [["rapid_decay", "radiation_leak", "Rapid Decay gives -4 Health this turn (placing 3 Mushrooms if it kills); Radiation Leak makes a minion an aura that drains every other character without Radiation."],
      ["spore_burst", "reactor_meltdown", "Two board clears: Spore Burst deals 3 to every enemy minion (2 Mushrooms per kill), Meltdown deals 3 to every minion and Obliterates the dead."]],
    "Fallout Spores places 2 Mushrooms and gives a random enemy minion Radiation 1 for 2 turns.",
    "Radiation drains your own Fungus minions too. Keep your board small while the auras are up."),
  'Fungus+Robots': G(
    "Robots stack Upgrades on a few big machines; Fungus fills the enemy deck with Mushrooms and punishes attacks. Your Upgraded Robots hold the board while the Mushrooms pile up, and Nano Spores turns those Mushrooms into Robot damage.",
    [["laser_retaliation", "cordyceps_fungus", "Both punish attacks: Laser Retaliation deals 3 (5 with a Weapon) to an attacking minion, and Cordyceps places 2 Mushrooms every time an enemy attacks."],
      ["titan_guard", "fungal_bloom", "Titan Guard's 5/9 Taunt holds the line; Fungal Bloom places 5 Mushrooms and gives every enemy minion -1 Attack."]],
    "Nano Spores places 2 Mushrooms and gives a Robot +1 Attack this turn for each Mushroom in the enemy deck (up to +3): late game, a free +3.",
    "Putting every Upgrade on one Robot loses to a single removal. Spread them out, and don't fall behind while the Mushrooms build."),
  'Fungus+Sharks': G(
    "Sharks hunt Marked Prey; Fungus fills the enemy deck with Mushrooms and kills with Poisonous. Clear the small minions with Sharks, kill the big ones with Poisonous, and let every enemy draw hurt.",
    [["thresher_shark", "deathspore", "Thresher marks the weak as Prey; Deathspore places a Mushroom every time one of them dies."],
      ["sporeling", "great_white", "Sporeling's Poisonous kills any big minion; Great White kills the Prey and attacks again."]],
    "Spore Chum places 2 Mushrooms and deals 1 to every enemy minion: often brings them down into Prey range.",
    "Sharks want small enemies; Fungus wants time. Against big, fast decks, rely on Poisonous minions."),
  'Fungus+Ultraterrestrials': G(
    "Ultraterrestrials Displace minions out of the fight; Fungus fills the enemy deck with Mushrooms. Keep their board small by Displacing it, and let the Mushrooms win the long game.",
    [["rift_hunter", "toxic_shroom", "Rift Hunter Displaces a small enemy; Toxic Shroom places 2 Mushrooms. Cheap tempo and value."],
      ["collapse_the_coordinates", "mushroom_city", "Displace every enemy minion and draw cards, then place 10 Mushrooms."]],
    "Spores from Elsewhere places 2 Mushrooms and Displaces a random enemy minion with 2 or less Attack.",
    "Displaced enemies come back. Use the time to set up Mushrooms, not just wait."),
  'Fungus+Vampires': G(
    "Vampires attack and heal with Lifesteal; Fungus fills the enemy deck with Mushrooms. Vampires pressure the board and keep your Health high while the Mushrooms deal damage every time the enemy draws.",
    [["vampire_doom_hound", "deathspore", "Doom Hound (Stealth, Lifesteal) trades and heals you; Deathspore places a Mushroom every time an enemy minion dies."],
      ["blood_drain", "rapid_decay", "Two cheap removal spells: Blood Drain deals 2 and heals you 2, Rapid Decay gives -4 Health this turn and places 3 Mushrooms if it kills."]],
    "Blood Spores costs 2 Health and places 3 Mushrooms; for the rest of the game, every Mushroom that bursts on the enemy heals your Hero 1.",
    "Vampires cost Health and Fungus is slow. Make sure your Lifesteal minions survive to keep you healthy."),
  'Fungus+Void': G(
    "Void empties its hand fast and hits hard; Fungus fills the enemy deck with Mushrooms. Discard to power up your Void minions, push early damage, and let the Mushrooms finish the job once you run out of cards.",
    [["lightless_behemoth", "plague_mushroom", "Lightless Behemoth grows +1/+1 every time you discard; Plague Mushroom places 4 Mushrooms. Both are 4-5 Mana threats the enemy must answer."],
      ["star_swallower", "fungal_contamination", "Star Swallower deals 2 damage per card you discard; Fungal Contamination adds 2 damage every time they draw a Mushroom card."]],
    "Spores of the Void places 2 Mushrooms, then discards a card; if it did, it places 2 more: 4 Mushrooms for 2 Mana.",
    "Void runs out of cards fast, and Fungus is slow. Decide early whether you're racing with Void or grinding with Mushrooms."),
  'Fungus+Zombies': G(
    "Zombies keep coming back and leave Corpses; Fungus fills the enemy deck with Mushrooms. A grinding deck that never runs out of bodies and hurts the enemy every time they draw.",
    [["walker", "cordyceps_fungus", "Reborn Walkers block attacks twice each; every enemy attack plants 2 Mushrooms from Cordyceps."],
      ["zombie_horde", "spore_burst", "Spore Burst deals 3 to every enemy minion (2 Mushrooms per kill); your Zombie Horde leaves three Walkers when it dies, so you keep a board."]],
    "Plague Bloom places 2 Mushrooms and gives you a Corpse: fuel for Corpse Eater and Raise the Dead.",
    "Bloater's and Undead Abomination's Exits hurt your own minions too. And Fungus is slow: don't fall behind on board early."),

  // ---- Ghosts ----
  'Ghosts+Ice Age': G(
    "Ice Age walls up with Thick Fur Taunts and Freezes; Ghosts bring minions back from either Graveyard. Your big beasts die slowly and come back, while the enemy spends turns Frozen.",
    [["woolly_mammoth", "banshee_matriarch", "When your Mammoth finally falls, Banshee Matriarch's Haunt pool (4-cost or less) brings back cheaper beasts with Reborn; The Unburied King can bring back up to two 5-cost-or-less minions."],
      ["avalanche", "soul_reaper", "Avalanche deals 2 and Freezes; Soul Reaper destroys a damaged enemy minion and Haunts it on your side."]],
    "Spirits of the Frozen Dead Haunts a random minion that died this game with +0/+3 and Thick Fur: a sturdy body that ignores the Great Freeze.",
    "The Great Freeze freezes your Ghosts too (no Thick Fur). And Haunts are random, so make sure the Graveyard holds good targets."),
  'Ghosts+Lycanthropes': G(
    "Lycanthropes Transform for bursts of power; Ghosts bring minions back. Trade your Lycanthropes aggressively, then Haunt them back to Transform again.",
    [["sewerborn_wererat", "soul_binder", "Wererat brings a Rat; when it dies, Soul Binder can Haunt it (or any 3-cost-or-less minion) back."],
      ["wraith_of_the_unforgotten", "dreadjaw_alpha", "The Wraith grows whenever you Haunt a minion; the Alpha gives every other Lycanthrope +1 Attack."]],
    "Spirit Pack summons a 2/2 Spectral Wolf with Stealth: a cheap, safe body.",
    "Haunted Lycanthropes come back in Humanoid Form, weaker. Transform them again before relying on them."),
  'Ghosts+Plants': G(
    "Plants grow every turn; Ghosts bring minions back from either Graveyard. A grinding board deck: your minions keep growing, and when they die, they come back. Gravebloom gets stronger the more of your minions have died.",
    [["sporeflower", "grave_robber", "Sporeflower makes a Seedling every turn; when it dies, Grave Robber or Soul Binder can Haunt it (or another cheap Plant) back."],
      ["world_tree", "the_dead_march", "World Tree grows your board every turn; The Dead March brings back two 4-cost-or-less minions with Reborn after a board clear."]],
    "Gravebloom Haunts a 3-cost-or-less minion with +1/+1 for every friendly minion that died this game (up to +3/+3): late game, a 3-cost minion comes back huge.",
    "Haunted Seedlings come back small and have to grow again. Haunt your bigger Plants when you can, and watch for board clears."),
  'Ghosts+Radioactive': G(
    "Radiation auras drain every character without Radiation; Ghosts bring minions back. Your irradiated mutants die, come back, and keep draining.",
    [["meltdown_mutant", "banshee_matriarch", "Meltdown Mutant irradiates an enemy when it dies; Banshee Matriarch Haunts a 4-cost-or-less minion back with Reborn."],
      ["reactor_meltdown", "graveyard_colossus", "Meltdown kills lots of minions, making Graveyard Colossus cheap. Obliterated minions don't count for Haunts, though."]],
    "Irradiated Afterlife gives a friendly Ghost Radiation 1 for 2 turns; if it dies in that time, it's Haunted back with 1 Health.",
    "Obliterate removes minions from the game: they won't show up for your Haunts. Don't Meltdown your own best minions."),
  'Ghosts+Robots': G(
    "Robots stack Upgrades; Ghosts bring minions back. Your Robots trade aggressively and come back, while Ghost Taunts and Evade keep the board safe.",
    [["drone_fabricator", "grave_robber", "Drone Fabricator makes a Drone every turn; Grave Robber Haunts cheap minions back."],
      ["final_assembly", "soul_binder", "Final Assembly summons a 4/4 Taunt Mech when one of yours dies; Soul Binder Haunts more back."]],
    "Soulbound Upgrade Haunts a 3-cost-or-less minion; if it's a Robot it gets +2/+2, otherwise Elusive.",
    "Haunted Robots come back without their Upgrades. Use Haunts for value, not as your main threat."),
  'Ghosts+Sharks': G(
    "Sharks hunt Marked Prey; Ghosts bring minions back from either Graveyard. Trade your Sharks aggressively into Prey, then Haunt them back with Rush to hunt again. Soul Reaper turns their damaged minions into yours.",
    [["thresher_shark", "soul_reaper", "Thresher deals 1 to every enemy minion and marks the weak as Prey; Soul Reaper destroys a damaged enemy and Haunts it on your side."],
      ["great_white", "banshee_matriarch", "Great White trades into Prey and attacks again; when it dies, Banshee Matriarch can Haunt it (4 cost) back with Reborn."]],
    "Ghost Fin Haunts a random 4-cost-or-less Shark from either Graveyard with Rush: it attacks the turn it comes back.",
    "Sharks need Prey (3 Health or less). Against decks of big minions, rely on Soul Reaper and Ghost tricks instead."),
  'Ghosts+Ultraterrestrials': G(
    "Two realms that move minions in and out of play. Ultraterrestrials Displace threats for a turn; Ghosts bring the dead back. Your board is always slipping out of reach, and theirs never stays put.",
    [["phantom_duelist", "pocket_dimension", "Phantom Duelist has Evade and Reborn; Pocket Dimension Displaces it out of danger for 1 Mana. It's almost impossible to get rid of."],
      ["the_unplaceable", "the_unburied_king", "The Unplaceable Displaces every other minion for a turn; The Unburied King then Haunts two 5-cost-or-less minions back to fill your empty side."]],
    "Haunting Elsewhere Haunts a random 4-cost-or-less minion, Displaced until your next turn: it can't be touched, then returns with Reborn.",
    "Displaced enemies come back on their own. Use the turn they're gone to attack, not to stall."),
  'Ghosts+Vampires': G(
    "Vampires attack and heal with Lifesteal; Ghosts bring minions back from either Graveyard. Trade your Vampires aggressively for Health, then Haunt them back with Lifesteal to do it again.",
    [["vampire_doom_hound", "soul_binder", "Doom Hound (Stealth, Lifesteal) trades away for Health; Soul Binder Haunts it (or any 3-cost-or-less minion) back."],
      ["bloodhound", "grave_robber", "Bloodhound grows every time your Hero loses Health; Grave Robber Haunts cheap minions back to keep your board full."]],
    "Bloodless Hunger costs 1 Health and Haunts a 3-cost-or-less minion with Lifesteal and Elusive: a cheap body that heals you and can't be targeted by spells.",
    "Vampires cost Health and Ghosts are slow. Don't let the enemy race you while you rebuild your board."),
  'Ghosts+Void': G(
    "Void empties its hand fast and hits hard; Ghosts bring minions back. Dump your hand early, go Hollow, and use Ghost Haunts to refill your board without refilling your hand.",
    [["starless_prowler", "call_of_the_departed", "Starless Prowler has Charge while Hollow; Call of the Departed Haunts a cheap minion back for 1 Mana, keeping your board full while your hand stays empty."],
      ["star_swallower", "unquiet_memories", "Star Swallower discards your hand for damage; Unquiet Memories then Discovers a dead minion so you have something to play next turn."]],
    "Shadows of the Dead Haunts a random minion that died this game (3 cost or less); while you're Hollow, it gets Charge.",
    "Void runs out of cards. Ghosts give you bodies, not cards: count your damage before emptying your hand."),
  'Ghosts+Zombies': G(
    "The undead army. Zombies have Reborn and leave Corpses; Ghosts Haunt minions back from either Graveyard. Your board keeps coming back no matter how many times the enemy clears it.",
    [["walker", "graveyard_colossus", "Walkers die and come back; so many deaths make Graveyard Colossus cheap fast."],
      ["zombie_horde", "the_dead_march", "Zombie Horde leaves three Walkers when it dies; The Dead March Haunts two 4-cost-or-less minions back with Reborn."]],
    "Undying Possession gives a friendly minion Reborn until your next turn; if it already has Reborn, it Haunts a 2-cost-or-less minion instead.",
    "Haunted minions come back weaker, and Zombie Exits hurt your own minions. Your board is wide but small, so watch out for board clears."),

  // ---- Ice Age ----
  'Ice Age+Lycanthropes': G(
    "Two beast realms. Ice Age walls up with Thick Fur Taunts and Freezes; Lycanthropes Transform for bursts of power. Freeze their attackers, then Transform and hit the Frozen board while it can't fight back.",
    [["avalanche", "unleash_the_pack", "Avalanche deals 2 and Freezes the survivors; Unleash the Pack Transforms everything and attacks into a board that can't hit back next turn."],
      ["dire_wolf", "dreadjaw_alpha", "Dire Wolf has +2 Attack while an enemy is Frozen; the Alpha gives every other Lycanthrope +1 Attack. Freeze one enemy and your whole board hits harder."]],
    "Winter Pelt Transforms a Lycanthrope with +0/+3 and Thick Fur: it ignores the Great Freeze, so it can still attack on Freeze turns.",
    "The Great Freeze freezes your Lycanthropes too (no Thick Fur). Time your big Transform turns away from it, or give Winter Pelt to your best beast."),
  'Ice Age+Plants': G(
    "A big, slow wall. Ice Age brings Thick Fur Taunts and Freezes; Plants grow every turn and heal. The enemy can't break through, and your board keeps getting bigger until it overwhelms them.",
    [["giant_ground_sloth", "elder_treant", "Two huge Taunts that heal: the Sloth heals itself, the Treant heals your Plants every turn."],
      ["campfire", "garden_guardian", "Campfire restores 3 Health to all your characters, and Garden Guardian gains Attack every time it's healed."]],
    "Permafrost Bloom summons a Seedling with Taunt and Thick Fur for 2 Mana: a cheap blocker that keeps growing and ignores the Great Freeze.",
    "The Great Freeze freezes your Plants too (no Thick Fur). And both realms are slow, so make sure you're building toward a win."),
  'Ice Age+Radioactive': G(
    "Radiation auras drain every character without Radiation; Ice Age Freezes and walls up with Hardy Taunts that take less damage. Freeze them, drain them, and clear what's left.",
    [["ice_storm", "reactor_meltdown", "Ice Storm Freezes every enemy and draws; Reactor Meltdown then deals 3 to every minion and Obliterates the dead. Your Hardy Taunts take less."],
      ["rad_tortoise", "glyptodon", "Two cheap, tough Taunts: the Tortoise irradiates attackers, the Glyptodon (1/6, Hardy) shrugs off hits."]],
    "Nuclear Winter gives every enemy minion Radiation 1 and Freezes them: they can't attack, and every character without Radiation drains.",
    "Radiation drains your own beasts too (they have no Radiation). Ice Age has lots of Health to spare, but watch your small minions."),
  'Ice Age+Robots': G(
    "Robots stack Upgrades on a few big machines; Ice Age Freezes and walls up with Thick Fur Taunts. Freeze the enemy board, then let your Upgraded Robots attack freely.",
    [["avalanche", "targeting_matrix", "Avalanche Freezes their board; Twin Strike on a Robot then cleans up two Frozen minions a turn."],
      ["woolly_mammoth", "titan_guard", "Two huge Taunts: a 5/8 Mammoth and a 5/9 Titan Guard. The enemy can't get past."]],
    "Insulated Plating upgrades a friendly minion with +1/+3 and Hardy (takes 1 less damage from each hit).",
    "The Great Freeze freezes your Robots too (no Thick Fur). Upgrade your beasts or time your Robot attacks around it."),
  'Ice Age+Sharks': G(
    "Ice Age Freezes; Sharks hunt Marked Prey. A Frozen minion can't fight back, so Freeze their board and let your Sharks pick off the weak ones.",
    [["avalanche", "great_white", "Avalanche deals 2 and Freezes; the weakened survivors are Prey for Great White, which kills one and attacks again."],
      ["sabertooth_cat", "wound_tracker", "Wound Tracker marks a weakened minion as Prey; Sabertooth deals double damage to it if it's Frozen."]],
    "Under the Ice marks an enemy minion as Prey and Freezes it: it can't attack, and your Sharks can hit it hard.",
    "The Great Freeze freezes your Sharks too (no Thick Fur). Hunt before it, then let your Thick Fur beasts hold the board."),
  'Ice Age+Ultraterrestrials': G(
    "Ice Age Freezes; Ultraterrestrials Displace. The enemy spends turn after turn unable to use their minions, while your Thick Fur Taunts hold the board.",
    [["rift_hunter", "avalanche", "Rift Hunter Displaces a small enemy; Avalanche deals 2 to the rest and Freezes them."],
      ["pocket_dimension", "woolly_mammoth", "Displace your own minion during the Great Freeze so it comes back ready to attack; the Mammoth holds the line meanwhile."]],
    "Frozen in Time Displaces an enemy minion until your next turn, and it comes back Frozen: out of the fight for two turns.",
    "Displaced and Frozen enemies come back eventually. Use the time to attack, not just stall."),
  'Ice Age+Vampires': G(
    "Vampires attack and heal with Lifesteal; Ice Age Freezes and walls up. Freeze their attackers while your Vampires drain them, and hide behind Thick Fur Taunts when you're low.",
    [["irish_elk", "vampire_bloodlord", "Irish Elk Freezes an attacker; Bloodlord (Lifesteal) hits the Hero and gains Mana."],
      ["campfire", "bloodhound", "Pay Health to grow Bloodhound, then Campfire heals 3 back to all your characters."]],
    "Frostbitten Feast costs 2 Health and gives a friendly minion Lifesteal and +0/+3: the Health comes straight back.",
    "The Great Freeze freezes your Vampires too (no Thick Fur). Time your attacks around it."),
  'Ice Age+Void': G(
    "Void dumps its hand fast and hits hard; Ice Age Freezes the board so the enemy can't punish you. Freeze their blockers, then go Hollow and Charge.",
    [["ice_storm", "riftmaw_devourer", "Ice Storm Freezes every enemy character and draws a card; next turn, Riftmaw charges in once you're Hollow."],
      ["thin_ice", "starless_prowler", "Thin Ice Freezes the next minion they play; Starless Prowler (Charge while Hollow) attacks past it."]],
    "Endless Winter discards a card; if it did, it Freezes every enemy minion: a huge tempo turn for a near-empty hand.",
    "The Great Freeze freezes your Void minions too (no Thick Fur), and Void runs out of cards. Plan your Hollow turn around both."),
  'Ice Age+Zombies': G(
    "Zombies keep coming back and leave Corpses; Ice Age walls up with Thick Fur Taunts and Freezes. A grinding deck: your minions return after every trade, while the enemy's spend whole turns Frozen and can't press their advantage.",
    [["walker", "glyptodon", "Reborn Walkers and a 1/6 Hardy Taunt: a cheap, sturdy early wall that takes several turns to break."],
      ["avalanche", "zombie_horde", "Avalanche deals 2 and Freezes their board; Zombie Horde leaves three Walkers when it dies, so you keep a board through any trade."]],
    "Thawed Remains summons a random friendly minion that died this game, with Thick Fur so it ignores the Great Freeze.",
    "The Great Freeze freezes your Zombies too (no Thick Fur), and Bloater's Exit hurts your own minions. Plan your attacks around both."),

  // ---- Lycanthropes ----
  'Lycanthropes+Plants': G(
    "Lycanthropes Transform for bursts of power; Plants grow every turn and heal. A board that gets bigger every turn, with beasts that can spike into huge attackers whenever you need them.",
    [["ironhide_werehippo", "elder_treant", "Two big Taunts that heal: the Hippo heals another minion when it transforms, the Treant heals your Plants every turn."],
      ["sunmane_werelion", "carnivorous_tree", "Sunmane Werelion gives another minion +1 Attack; Carnivorous Tree grows whenever it attacks a smaller minion."]],
    "Thornhide gives a Lycanthrope +3 Health and summons a Seedling: a tougher beast and a growing minion.",
    "Transforms cost Mana and Plants are slow. Don't try to do everything every turn; pick a growth turn or a Transform turn."),
  'Lycanthropes+Radioactive': G(
    "Radiation auras drain every character without Radiation; Lycanthropes Transform into big Beast Forms with plenty of Health to spare. Your beasts outlast the drain while smaller enemies melt.",
    [["worldback_werebuffalo", "critical_mass_horror", "Critical Mass Horror gives an enemy Radiation 2, draining every other minion; the 4/8 Werebuffalo shrugs it off."],
      ["reactor_meltdown", "apex_ascension", "Clear the board with Meltdown, then Apex Ascension Transforms your survivors with +2/+2."]],
    "Gamma Moon Transforms a Lycanthrope with +3 Attack, and it takes 1 damage (a Transform never kills, but this damage can).",
    "Radiation drains your own Lycanthropes too, and blocks healing. Keep your Radiation on the enemy side."),
  'Lycanthropes+Robots': G(
    "Robots stack Upgrades; Lycanthropes Transform. Cyber Lycan turns a Lycanthrope into an Upgraded minion, and Upgrades stay through Transforms. Build one huge beast and keep Transforming it.",
    [["dreadjaw_alpha", "swarm_commander", "Two auras: the Alpha gives other Lycanthropes +1 Attack, Swarm Commander gives other Robots +1."],
      ["ironhide_werehippo", "titan_guard", "Two big Taunts: the Hippo heals another minion on Transform, Titan Guard heals itself with 2 Upgrades."]],
    "Cyber Lycan upgrades a Lycanthrope +2/+2 and Transforms it: stats and a free Transform in one.",
    "Upgrades on one minion lose to removal. Spread your threats."),
  'Lycanthropes+Sharks': G(
    "Aggressive: Sharks hunt Marked Prey, Lycanthropes Transform into big Beast Forms. Mark the weak, Transform, and attack everything in one big turn.",
    [["thresher_shark", "unleash_the_pack", "Thresher marks every weak enemy as Prey; Unleash the Pack Transforms everything for the kill."],
      ["dreadjaw_alpha", "frenzy_of_the_pack", "The Alpha gives Lycanthropes +1 Attack; Frenzy gives Sharks +2 Attack this turn."]],
    "Bloodtide Frenzy gives your Beast Forms +2 Attack and Rush this turn.",
    "Both realms are aggressive. If the enemy stabilises with big minions, you can run out of steam."),
  'Lycanthropes+Ultraterrestrials': G(
    "Lycanthropes Transform; Ultraterrestrials Displace. Displace your own minions to dodge removal and bring them back stronger (Null Behemoth, Between Worlds), and Displace enemy blockers so your Beast Forms can attack freely. Cosmic Howl Transforms the whole pack at once.",
    [["null_behemoth", "pride_matriarch", "Null Behemoth Displaces a friendly minion and gains +2/+2 when it returns; Pride Matriarch gives your other minions +1 Health."],
      ["rift_hunter", "unleash_the_pack", "Rift Hunter Displaces a small blocker for a turn; Unleash the Pack then Transforms everything and attacks into the gap."]],
    "Cosmic Howl Transforms all your Lycanthropes for 4 Mana: Humanoids become Beasts for a big attack (or back, if you need their Humanoid abilities).",
    "Displaced minions are gone for a turn, yours included. Don't Displace your own Taunts when the enemy has a big board."),
  'Lycanthropes+Vampires': G(
    "Vampires attack and heal with Lifesteal; Lycanthropes Transform for bursts of power. Big Beast Forms with Lifesteal heal a lot, and Blood Moon plus Blood Moon Rising turn the enemy's own minion plays into your big attack turn.",
    [["vampire_doom_hound", "dreadjaw_alpha", "Doom Hound trades with Stealth and Lifesteal; the Alpha gives every other Lycanthrope +1 Attack."],
      ["blood_moon", "blood_moon_rising", "Two Traps for when the enemy plays a minion: Blood Moon gives your Vampires +1/+1 and Lifesteal, Blood Moon Rising Transforms all your Lycanthropes with +1 Attack."]],
    "Nightblood Hunt Transforms a friendly Lycanthrope, and it gains Lifesteal this turn: a big Beast Form hit that heals you.",
    "Vampires cost Health and Transforms cost Mana. Pace yourself so you don't run out of both at once."),
  'Lycanthropes+Void': G(
    "Void empties its hand fast and hits hard; Lycanthropes Transform. Transforms cost Mana, not cards, so once you're Hollow your Lycanthropes give you something to spend your Mana on every turn.",
    [["starless_prowler", "unleash_the_pack", "Starless Prowler has Charge while you're Hollow; Unleash the Pack Transforms everything for a big attack turn."],
      ["nebula_gnawer", "dreadjaw_alpha", "Nebula Gnawer gains Attack every time you discard; the Alpha gives every other Lycanthrope +1 Attack. Two threats that grow."]],
    "Moonless Night Transforms a Lycanthrope with +2 Attack and Rush this turn for just 2 Mana.",
    "Void runs out of cards. Transforms help you use your Mana once it does, but they can't draw you new cards."),
  'Lycanthropes+Zombies': G(
    "Zombies keep coming back and leave Corpses; Lycanthropes Transform for bursts of power. A long, aggressive game: your Zombies soak the enemy's attacks and removal while your Lycanthropes Transform into Beast Forms and do the damage.",
    [["walker", "pride_matriarch", "Reborn Walkers block twice each; Pride Matriarch gives your other minions +1 Health, so they block even better."],
      ["graveyard_overseer", "dreadjaw_alpha", "Two Attack auras: Graveyard Overseer gives your other Zombies +1 Attack, Dreadjaw Alpha gives your other Lycanthropes +1. Your whole board hits harder."]],
    "Undead Pack gives a friendly Lycanthrope Reborn; if it's in Beast Form, it also gets +2 Attack.",
    "A Reborn Lycanthrope comes back as a fresh copy in Humanoid Form, weaker. Transform it again before relying on it."),

  // ---- Plants ----
  'Plants+Radioactive': G(
    "Radiation auras drain every character without Radiation, so wide boards of small minions melt. Plants answer with big Health pools that keep growing, and Taunts that hold while the drain works on the enemy.",
    [["garden_guardian", "rad_tortoise", "Two sturdy Taunts: the Guardian gains Attack whenever it's healed, the Tortoise irradiates anything that attacks it."],
      ["the_overgrowth", "reactor_meltdown", "Clear the board with Meltdown, then The Overgrowth arrives with two Seedlings and grows +1/+1 for each."]],
    "Mutant Bloom summons a 1/3 Seedling with Taunt and Radiation 1 for 2 turns: it's immune to the drain and drains everything else.",
    "Radiation drains your own Seedlings and blocks healing on them, so Plants' heals won't help. Keep Radiation pointed at the enemy."),
  'Plants+Robots': G(
    "Robots stack Upgrades on a few big machines; Plants grow every turn. A board where everything gets bigger: Seedlings by growing, Robots by Upgrades. Bio-Mech Sprout makes a Seedling that's also a Robot, so it can take both.",
    [["garden_guardian", "titan_guard", "Two big Taunts: the Guardian gains Attack when healed, Titan Guard heals itself once it has 2 Upgrades."],
      ["world_tree", "swarm_commander", "World Tree grows your Plants every turn; Swarm Commander gives your other Robots +1 Attack. Two auras for a wide board."]],
    "Bio-Mech Sprout summons a Seedling that is also a Robot and gives it a Modular Upgrade of your choice: it grows every turn and takes Robot Upgrades.",
    "Robot Upgrades only target Robots, so most of your Plants can't use them. Spread your Upgrades across Robots and Bio-Mech Sprouts."),
  'Plants+Sharks': G(
    "Sharks hunt Marked Prey; Plants grow and hold the board with Taunts. The Plants soak up attacks while the Sharks pick off everything that drops to 3 Health or less.",
    [["entangler", "great_white", "Entangler gives an enemy -2 Attack; Great White kills it with little damage back, and attacks again if it was Prey."],
      ["thresher_shark", "vine_lash", "Thresher marks the weak as Prey; Vine Lash deals 3 (4 with a Seedling) to finish a bigger one."]],
    "Kelp Snare summons a 1/2 Seedling with Taunt and marks the enemy minion with the least Health as Prey.",
    "Sharks need Prey. Against big minions, lean on Plants' Taunts and growth to stall."),
  'Plants+Ultraterrestrials': G(
    "Ultraterrestrials Displace minions out of the fight; Plants grow every turn. Displace enemy threats to buy the turns your Plants need to grow, and Displace your own best Plant to dodge removal.",
    [["sporeflower", "pocket_dimension", "Sporeflower makes a Seedling every turn; Pocket Dimension Displaces it out of danger for 1 Mana when removal is coming."],
      ["rift_hunter", "world_tree", "Rift Hunter Displaces a small enemy for a turn; World Tree grows your board while they wait."]],
    "Seeds Out of Time summons a Seedling beyond reality; it arrives at the start of your next turn with +2/+2, safe from anything the enemy does this turn.",
    "Displaced minions are gone for a turn, yours included. Don't Displace your own Taunts when the enemy has a big board."),
  'Plants+Vampires': G(
    "Vampires attack and heal with Lifesteal; Plants grow and heal. Bloodrose has Lifesteal and grows Health every time it gains Attack: Plant buffs make it a huge healer.",
    [["bloodrose", "bloodhound", "Bloodrose (Lifesteal) heals you; Bloodhound grows every time your Hero loses Health, so the Health you pay for Vampire cards keeps coming back and keeps making it bigger."],
      ["blood_pool", "garden_guardian", "Blood Pool grows your Vampires every turn behind Garden Guardian's Taunt."]],
    "Bloodroot costs 1 Health and summons a 1/2 Seedling with Lifesteal: it grows and heals you every hit.",
    "Vampires cost Health and Plants are slow. Make sure your Lifesteal minions survive."),
  'Plants+Void': G(
    "An odd pair: Void empties its hand fast and hits hard, Plants grow every turn. Play your Plants early so they grow while you dump your hand, then go Hollow: the Plants stay on the board and keep growing without needing more cards.",
    [["sporeflower", "starless_prowler", "Sporeflower keeps making Seedlings without needing cards; Starless Prowler charges in once your hand is empty."],
      ["vine_lash", "riftmaw_devourer", "Vine Lash deals 3 (4 with a Seedling out) to clear a blocker; Riftmaw then charges in for 5 while you're Hollow."]],
    "Nightshade Bloom summons a Seedling for 2 Mana; while you're Hollow, it gets +2/+2 on arrival.",
    "Void runs out of cards and Plants are slow. Get your Plants down early, before you empty your hand."),
  'Plants+Zombies': G(
    "Zombies keep coming back and leave Corpses; Plants grow every turn and leave Seedlings when they die. A grinding board that never empties: every trade leaves something behind.",
    [["natural_regrowth", "zombie_horde", "Natural Regrowth gives you a Seedling whenever a Plant dies; Zombie Horde leaves three Walkers. Board clears barely dent you."],
      ["garden_guardian", "walker", "Garden Guardian's 2/5 Taunt and Reborn Walkers make a cheap wall that takes many turns to break."]],
    "Grave Bloom summons two Seedlings with Reborn: four growing bodies over time.",
    "Bloater's Exit deals 1 to every minion, including your 0/1 Seedlings. Grow them first, or keep Bloater away from a board of tiny Plants."),

  // ---- Radioactive ----
  'Radioactive+Robots': G(
    "Radiation auras drain the Health of every character without Radiation; Robots stack Health and Upgrades on a few big machines that can ride out the drain. Irradiate the board, keep your Robots tough, and let the enemy's small minions melt.",
    [["reinforced_plating", "critical_mass_horror", "Critical Mass Horror gives an enemy Radiation 2, draining every other minion by 2; Reinforced Plating gives your Robot +0/+3 so it doesn't mind."],
      ["titan_guard", "reactor_meltdown", "Reactor Meltdown deals 3 to every minion and Obliterates the dead; the 5/9 Titan Guard survives it and keeps holding the line."]],
    "Reactor Core upgrades a Robot +2/+2 and gives it Radiation 1 permanently: it's immune to the drain and drains everything else.",
    "Radiation drains your own Robots without Radiation too, and blocks healing on them, so Titan Guard's self-heal stops working. Give your key Robot Reactor Core first."),
  'Radioactive+Sharks': G(
    "Radiation auras drain every character without Radiation, pushing enemy minions down to 3 Health or less, where they become Marked Prey for your Sharks. Drain them, then bite.",
    [["radiation_leak", "great_white", "Radiation Leak turns an enemy into a drain that shrinks everything else; the weakened minions become Prey for Great White, which kills one and attacks again."],
      ["thresher_shark", "reactor_meltdown", "Thresher marks the weak as Prey for your Sharks to eat; Reactor Meltdown clears whatever's left and Obliterates it."]],
    "Glowing Wake gives an enemy minion Radiation 1 for 2 turns and marks it as Prey: it drains its own allies while your Sharks hunt it.",
    "Radiation drains your own Sharks too (they have no Radiation). Hunt fast while the auras are up, and keep your board small."),
  'Radioactive+Ultraterrestrials': G(
    "Ultraterrestrials Displace minions out of the fight; Radiation auras drain the rest. Displace your own minions during the drain so they come back fresh, and Displace enemy threats while your Radiation shrinks their board.",
    [["pocket_dimension", "the_irradiated_genius", "The Irradiated Genius gives every enemy Radiation 1 for 2 turns; Displace your own key minion with Pocket Dimension so the drain doesn't touch it."],
      ["rift_hunter", "reactor_meltdown", "Rift Hunter Displaces a small enemy; Reactor Meltdown clears the rest. When the Displaced minion returns, it's alone."]],
    "Half-Life Shift Displaces an enemy minion until your next turn; it returns with Radiation 1 for 2 turns, draining everything around it.",
    "Displaced minions come back, and Radiation drains your own board too. Time the drain for turns your minions are safely Displaced."),
  'Radioactive+Vampires': G(
    "A tricky pair: Vampires heal with Lifesteal, but Radiation drains every character without Radiation (Heroes included) and stops that lost Health being healed. Use Radiation in short bursts on the enemy side, irradiate your own attackers so they're immune, and win with Lifesteal damage while the drain is down.",
    [["wasteland_ghoul", "vampire_bloodlord", "Wasteland Ghoul irradiates itself, so it's immune to the drain and has +2 Attack; Bloodlord's Lifesteal hits push damage and heal you when no aura is up."],
      ["vampire_bite", "dna_destabilization", "Two cheap removal spells: Vampire Bite deals 3 with Lifesteal, DNA Destabilization reduces a minion's Health by 2 (4 if it has Radiation)."]],
    "Irradiated Blood costs 1 Health and gives a friendly minion +2 Attack, Lifesteal this turn, and Radiation 1 for 2 turns: it's immune to the drain while it hits.",
    "Radiation drains your Hero and minions too, and Health lost to Radiation can't be healed, so Lifesteal can't undo it. Keep the auras short and pointed at the enemy."),
  'Radioactive+Void': G(
    "Void dumps its hand fast and hits hard; Radiation auras drain the Health of every character without Radiation. Shrink their blockers with Radiation, then go Hollow and Charge past them.",
    [["radiation_leak", "riftmaw_devourer", "Radiation Leak shrinks every minion without Radiation; Riftmaw charges in for 5 once your hand is empty."],
      ["critical_mass_horror", "star_swallower", "Critical Mass Horror drains every other minion by 2; Star Swallower discards your hand for 2 damage per card."]],
    "Gamma Void gives an enemy minion Radiation 2 and a random friendly Void minion +2 Attack.",
    "Radiation drains your own Void minions too, and Void runs out of cards fast. Keep your board small while the auras are up."),
  'Radioactive+Zombies': G(
    "Zombies keep coming back; Radiation auras drain every character without Radiation. Your Reborn Zombies come back fresh after the drain kills them, while the enemy's board melts for good.",
    [["walker", "radiation_leak", "Radiation Leak drains everything; Walkers die to it and come straight back with Reborn."],
      ["zombie_horde", "critical_mass_horror", "Critical Mass Horror drains every other minion by 2; when your Horde dies, its three Walkers replace it."]],
    "Ghoulification summons a random friendly minion that died this game, with Radiation 1 permanently: immune to the drain, and it drains everything else.",
    "Reactor Meltdown and Ground Zero Obliterate the dead: no Reborn, no Exits, no Corpses. Don't Meltdown a board full of your own Zombies."),

  // ---- Robots ----
  'Robots+Sharks': G(
    "Robots stack Upgrades; Sharks hunt Marked Prey. Torpedo Fin works on both, and a Rush Robot with Twin Strike clears Prey as well as any Shark. Clear the small minions every turn while your machines grow.",
    [["thruster_system", "thresher_shark", "Thresher deals 1 to every enemy and marks the weak as Prey; a Robot with Thruster System's Rush and +1 Attack picks one off the same turn."],
      ["heavy_gunner", "great_white", "Heavy Gunner pings a random enemy for 1 or 2 every time it attacks, pushing minions into Prey range; Great White eats them and attacks again."]],
    "Torpedo Fin upgrades a friendly Shark or Robot with +2 Attack and Rush: a fresh minion that attacks straight away.",
    "Robot Upgrades only target Robots (Torpedo Fin aside). Don't hold Upgrades with no Robot on the board."),
  'Robots+Ultraterrestrials': G(
    "Robots stack Upgrades on a few big machines; Ultraterrestrials Displace. Displace your Upgraded Robot when removal is coming, and it comes back safe; Displace enemy blockers so your Robots attack freely.",
    [["pocket_dimension", "titan_guard", "Titan Guard collects Upgrades; Pocket Dimension Displaces it out of danger for 1 Mana when the enemy lines up removal."],
      ["rift_hunter", "overclocked_destroyer", "Rift Hunter Displaces a small blocker; the Destroyer (Rush) attacks and pings every enemy each time you Upgrade it."]],
    "Phase Upgrade Displaces a friendly Robot until your next turn; it returns Upgraded with +2/+2.",
    "Displaced minions are gone for a turn, so your Robot can't block while it's away. Don't Displace your only Taunt."),
  'Robots+Vampires': G(
    "Robots stack Upgrades on a few big machines; Vampires attack and heal with Lifesteal. A big Upgraded Robot with Lifesteal (Blood Engine) heals you every hit, and Laser Cannon turns every attack into extra Hero damage.",
    [["laser_cannon", "vampire_bloodlord", "Two minions that punish the Hero: a Laser Cannon Robot pings it for 1 every attack, and Bloodlord (Lifesteal) gives you a Mana Crystal whenever it hits."],
      ["laser_retaliation", "blood_ambush", "Two cheap answers to attacks: Laser Retaliation deals 3 (5 with a Weapon) to an attacking minion, Blood Ambush summons a 2/2 Taunt Thrall when they go for your Hero."]],
    "Blood Engine costs 2 Health and upgrades a Robot +3/+1 and Lifesteal: the Health comes straight back on its first hit.",
    "Putting every Upgrade on one Robot loses to removal, and Vampires cost Health. Spread your threats so one answer doesn't end you."),
  'Robots+Void': G(
    "Void empties its hand fast and hits hard; Robots stack Upgrades. Dark Matter Core turns your discards into Upgrades, and once you're Hollow, Robot Upgrades give you something big to attack with.",
    [["thruster_system", "starless_prowler", "Thruster System gives a Robot Rush and +1 Attack; Starless Prowler has Charge while Hollow. Both hit the turn they land."],
      ["swarm_commander", "shadow_brood_mother", "Shadow Brood Mother brings two Rush Void Spawn; Swarm Commander gives your other Robots +1 Attack. Lots of attackers."]],
    "Dark Matter Core discards a card; if it did, it upgrades a friendly minion +2/+2: any minion, not just Robots.",
    "Void runs out of cards, and Upgrades are cards too. Don't discard your Upgrades."),
  'Robots+Zombies': G(
    "Robots stack Upgrades; Zombies keep coming back. Salvage Protocol gives a Robot Reborn, and Final Assembly replaces a dead Mech with a 4/4 Taunt. Your board never empties.",
    [["final_assembly", "bloater", "Final Assembly summons a 4/4 Taunt Mech when one of yours dies; Bloater's Exit pings every minion when it dies."],
      ["drone_fabricator", "graveyard_overseer", "Drone Fabricator makes a Drone every turn; Graveyard Overseer gives your other Zombies +1 Attack."]],
    "Salvage Protocol gives a friendly Robot Reborn until your next turn and +2 Health.",
    "A Reborn Robot comes back without its Upgrades. Use Reborn on Robots without many Upgrades."),

  // ---- Sharks ----
  'Sharks+Ultraterrestrials': G(
    "Ultraterrestrials Displace enemy minions; Sharks hunt Marked Prey. Displace the big threats for a turn while your Sharks eat the small ones, and Riptide Rift sends an enemy away and brings it back weakened and marked as Prey.",
    [["rift_hunter", "great_white", "Rift Hunter Displaces a small blocker for a turn; Great White then kills Prey and attacks again into the gap."],
      ["thresher_shark", "collapse_the_coordinates", "Thresher marks the weak as Prey; late game, Collapse the Coordinates Displaces every enemy minion and draws you a card for every 2."]],
    "Riptide Rift Displaces an enemy minion until your next turn; it returns with 1 less Health and Marked as Prey, ready for your Sharks.",
    "Displaced enemies come back. Make sure your Sharks are on the board and ready when they do."),
  'Sharks+Vampires': G(
    "Aggressive: Sharks hunt Marked Prey, Vampires attack and heal with Lifesteal. Mark the weak, bite them, and drain Health back with every hit. A race deck that heals itself.",
    [["thresher_shark", "vampire_doom_hound", "Thresher deals 1 to every enemy and marks the weak as Prey; Doom Hound (Stealth, Lifesteal) eats one and heals you."],
      ["frenzy_of_the_pack", "vampire_bloodlord", "Frenzy gives your Sharks +2 Attack this turn to clear blockers; Bloodlord then hits the Hero with Lifesteal and gains a Mana Crystal."]],
    "Blood Frenzy Feast costs 1 Health: deal 2 damage to an enemy minion, mark it as Prey, and heal your Hero 2.",
    "Both realms are aggressive and Vampires cost Health. If the enemy stabilises with big minions, you can run out of steam."),
  'Sharks+Void': G(
    "Very aggressive: Sharks clear the board by hunting Marked Prey, and Void dumps its hand and charges the Hero. Clear the small blockers with Sharks, then go Hollow and finish with Charge minions.",
    [["thresher_shark", "riftmaw_devourer", "Thresher marks every weak enemy as Prey for your Sharks to clear; Riftmaw then charges in for 5 while you're Hollow."],
      ["great_white", "starless_prowler", "Great White eats a Prey and attacks again; Starless Prowler has Charge while your hand is empty. Board clear and face damage in one turn."]],
    "Abyssal Feeding marks an enemy minion as Prey and gives your Sharks and Void minions +2 Attack this turn: a huge attack turn.",
    "Void runs out of cards fast. Count your damage before you dump your hand."),
  'Sharks+Zombies': G(
    "Sharks hunt Marked Prey; Zombies keep coming back and leave Corpses. A grinding, aggressive deck: Zombies soak attacks and keep the board full, while Sharks eat everything that drops to 3 Health or less.",
    [["thresher_shark", "bloater", "Thresher marks the weak as Prey; when Bloater dies, its Exit deals 1 to every minion, finishing off the weakest."],
      ["great_white", "zombie_horde", "Great White eats Prey and attacks again; Zombie Horde leaves three Walkers when it dies, so you never lose the board."]],
    "Drowned Dead gives a friendly Shark Reborn until your next turn and gives you a Corpse.",
    "Bloater's Exit hurts your own Sharks too. And Sharks need Prey: against big minions, lean on your Zombies to stall."),

  // ---- Ultraterrestrials ----
  'Ultraterrestrials+Vampires': G(
    "Vampires attack and heal with Lifesteal; Ultraterrestrials Displace blockers out of the fight. Clear the way for your Vampires to hit the Hero, and Displace your own minions to dodge removal.",
    [["rift_hunter", "vampire_bloodlord", "Rift Hunter Displaces a small blocker; Bloodlord hits the Hero with Lifesteal and gains a Mana Crystal for next turn."],
      ["phase_jelly", "blood_pool", "Phase Jelly heals your Hero 2 every time it returns from Displacement; Blood Pool grows your Vampires every turn. Steady healing and growth."]],
    "Blood Elsewhere costs 1 Health and Displaces an enemy minion; when it returns, it takes 2 damage and you heal 2.",
    "Displaced enemies come back. Use the turn they're gone to push Lifesteal damage, not to wait."),
  'Ultraterrestrials+Void': G(
    "Void dumps its hand fast and hits hard; Ultraterrestrials Displace blockers. Displace their board for a turn, then go Hollow and charge the Hero while nothing stands in the way.",
    [["collapse_the_coordinates", "riftmaw_devourer", "Collapse the Coordinates Displaces every enemy minion and draws you cards; next turn, dump your hand and Riftmaw charges in."],
      ["banish_from_this_world", "starless_prowler", "Banish a small blocker for 1 Mana; Starless Prowler has Charge while Hollow."]],
    "Into the Void Displaces an enemy minion, then discards a card; if it did, it Displaces another random enemy minion too.",
    "Displaced enemies come back, and Void runs out of cards. Strike hard on the turn their board is gone."),
  'Ultraterrestrials+Zombies': G(
    "Zombies keep coming back; Ultraterrestrials Displace. Return Twice Displaces a minion so it comes back with Reborn, and your board keeps returning however often it's cleared.",
    [["null_behemoth", "zombie_horde", "Null Behemoth Displaces a friendly minion and gains +2/+2 when it returns; Zombie Horde leaves three Walkers when it dies."],
      ["invisible_threshold", "hidden_corpse", "Two Traps for attacks on your Hero: Displace the attacker, or summon a 1/2 Taunt Walker."]],
    "Return Twice Displaces a friendly minion until your next turn; it returns with Reborn.",
    "Displaced minions can't block while they're gone. Don't Displace your Taunts against a big board."),

  // ---- Vampires ----
  'Vampires+Void': G(
    "Very aggressive: Vampires attack and heal with Lifesteal, Void dumps its hand and hits hard. Race the enemy down, and let Lifesteal keep you ahead in the race.",
    [["vampire_doom_hound", "starless_prowler", "Doom Hound (Stealth, Lifesteal) heals you while Starless Prowler charges once you're Hollow."],
      ["werepyre_abomination", "star_swallower", "Late game: Star Swallower discards your hand for 2 damage per card, and Werepyre charges for 8 with Lifesteal."]],
    "Bloodless Craving discards a card; if it did, it gives a friendly minion +2 Attack and Lifesteal this turn.",
    "Both realms run out of steam if the game goes long. Push damage early and count your reach."),
  'Vampires+Zombies': G(
    "The undead army: Vampires heal with Lifesteal, Zombies keep coming back. Trade aggressively, heal back the damage, and never run out of minions.",
    [["tarman", "the_crimson_king", "Two big Lifesteal threats: Tarman comes back with Reborn and drags an enemy down; the Crimson King grows the more Health you're missing."],
      ["walker", "blood_pool", "Reborn Walkers protect Blood Pool, which gives your Vampires +1/+1 every turn."]],
    "Undying Hunger gives a friendly minion +2 Attack and Lifesteal this turn, and Reborn until your next turn.",
    "Bloater's Exit hurts your own minions too. And Vampires cost Health: don't let the enemy race you."),

  // ---- Void ----
  'Void+Zombies': G(
    "Void dumps its hand fast and hits hard; Zombies keep coming back. Your board stays full after you've emptied your hand, because the Zombies keep returning without needing new cards.",
    [["eclipse_maw", "walker", "Eclipse Maw discards a card for Hero damage; Reborn Walkers hold the board."],
      ["riftmaw_devourer", "zombie_horde", "Riftmaw charges once Hollow; Zombie Horde leaves three Walkers when it dies."]],
    "Hollow Rising gives a minion Reborn until your next turn; while you're Hollow it also gets +2 Attack.",
    "Void runs out of cards; Zombies are your backup plan. Don't dump your Zombies early."),
};
