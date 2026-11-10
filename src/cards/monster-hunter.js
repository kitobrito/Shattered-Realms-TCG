const M={faction:'Monster Hunter',type:'minion',tribes:['Human']}, S={faction:'Monster Hunter',type:'spell'}, T={faction:'Monster Hunter',type:'trap'};
const eq=(id,name,attack,durability,extra={})=>({op:'equipHeroWeapon',cardId:id,name,attack,durability,...extra});
const W=(id,name,cost,attack,durability,text,prey=null,extra={})=>({...S,id,name,cost,attack,durability,heroWeapon:true,text,...extra,effects:[eq(id,name,attack,durability,{...(prey?{prey,preyBonus:extra.preyBonus??(prey==='Dragons'?3:2)}:{}),...(extra.heroOnly?{heroOnly:true}:{}),...(extra.ranged?{ranged:true}:{}),...(extra.cooldown?{cooldown:extra.cooldown}:{}),...(extra.executeFaction?{executeFaction:extra.executeFaction}:{})})]});
export const MONSTER_HUNTER_CARDS=[
{...S,id:'dual_wield',name:'Dual-Wield',heroSpell:true,passive:true,cost:0,text:'Your Hero may equip two different weapons. With both equipped, gain Twin Strike and attack first with Weapon 1, then Weapon 2. Whenever your Hero kills a minion while wielding both, your lowest-Attack weapon gains +1 Attack.',effects:[]},
{...M,id:'nightwatch_recruit',name:'Nightwatch Recruit',cost:1,attack:1,health:3,text:'Arrival: Gain 3 Armor.',triggers:[{on:'battlecry',effects:[{op:'gainArmor',amount:3}]}]},
{...M,id:'field_quartermaster',name:'Field Quartermaster',cost:2,attack:3,health:3,text:'Arrival: Give your Hero +1 Attack this turn.',triggers:[{on:'battlecry',effects:[{op:'buff',target:'friendlyHero',attack:1,temporary:true}]}]},
{...M,id:'silver_sight_scout',name:'Silver-Sight Scout',cost:2,attack:2,health:3,text:'Arrival: Give your Hero +1 Attack this turn.',triggers:[{on:'battlecry',effects:[{op:'buff',target:'friendlyHero',attack:1,temporary:true}]}]},
{...M,id:'torchbearer',name:'Torchbearer',cost:2,attack:2,health:4,keywords:['Taunt'],text:'Taunt.'},
{...M,id:'field_medic',name:'Field Medic',cost:3,attack:2,health:4,text:'Arrival: Restore 3 Health to your Hero.',triggers:[{on:'battlecry',effects:[{op:'heal',target:'friendlyHero',amount:3}]}]},
{...M,id:'relic_appraiser',name:'Relic Appraiser',cost:3,attack:3,health:4,text:'Whenever you equip a weapon, gain 2 Armor.',triggers:[{on:'weaponEquipped',effects:[{op:'gainArmor',amount:2}]}]},
{...M,id:'veteran_duelist',name:'Veteran Duelist',cost:4,attack:4,health:4,text:'Twin Strike.',keywords:['Twin Strike']},
{...M,id:'the_night_captain',name:'The Night Captain',legendary:true,cost:6,attack:4,health:5,text:'Arrival: Give your Hero +2 Attack this turn and 3 Armor.',triggers:[{on:'battlecry',effects:[{op:'buff',target:'friendlyHero',attack:2,temporary:true},{op:'gainArmor',amount:3}]}]},
{...M,id:'the_last_exorcist',name:'The Last Exorcist',legendary:true,extra:true,cost:9,attack:7,health:6,text:'Arrival: Destroy all enemy Dark minions on the field and in your opponent’s hand.',triggers:[{on:'battlecry',effects:[{op:'destroyDarkMinions'}]}]},
W('rowan_stake','Rowan Stake',1,2,1,'Your Hero instantly kills enemy Vampire minions it attacks.',null,{executeFaction:'Vampires'}),
W('silver_bolt_crossbow','Silver-Bolt Crossbow',2,3,3,'Ranged. Your Hero has +2 Attack against Werewolves.','Lycanthropes',{ranged:true}),
W('flintlock_pistol','Flintlock Pistol',2,4,2,'Ranged. Has a 1-turn cooldown after use.',null,{ranged:true,cooldown:1}),
W('cross_hilt_longsword','Cross-Hilt Longsword',3,4,3,'Your Hero has +3 Attack against Vampires.','Vampires',{legendary:true,preyBonus:3}),
W('wolfsbane_dagger','Wolfsbane Dagger',2,2,5,'Your Hero has +2 Attack against Werewolves.','Lycanthropes'),
W('dragon_slayer_harpoon','Dragon-Slayer Harpoon',4,3,3,'Your Hero has +3 Attack against Dragons.','Dragons'),
W('dragonfall_chain_net','Dragonfall Chain Net',3,4,2,'Your Hero has +2 Attack against Dragons.','Dragons'),
W('holy_water_sprayer','Holy-Water Sprayer',3,2,6,'Your Hero has +2 Attack against Ghosts.','Ghosts'),
W('reliquary_cross','Reliquary Cross',3,3,3,'Your Hero has +2 Attack against Vampires.','Vampires'),
W('hidden_hand_cannon','Hidden Hand Cannon',4,7,1,'One devastating shot: your Hero can fire it at an enemy minion or the enemy Hero.',null,{legendary:true}),
W('exorcists_chain','Exorcist’s Chain',4,3,3,'Your Hero has +2 Attack against Demons.','Demons'),
{...S,id:'garlic_and_salt',name:'Garlic and Salt',cost:1,text:'Gain 3 Armor.',effects:[{op:'gainArmor',amount:3}]},
{...S,id:'powder_and_ball',name:'Powder and Ball',cost:1,text:'Give your Hero +2 Attack this turn.',effects:[{op:'buff',target:'friendlyHero',attack:2,temporary:true}]},
{...S,id:'holy_water_flask',name:'Holy Water Flask',cost:2,text:'Deal 3 damage to an enemy Ghost.',target:{type:'minion',side:'enemy',tribe:'Ghost'},effects:[{op:'damage',target:'chosen',amount:3}]},
{...S,id:'wolfsbane_fumes',name:'Wolfsbane Fumes',cost:2,text:'Deal 2 damage to all enemy Lycanthropes.',effects:[{op:'damage',target:{minions:{side:'enemy',tribe:'Lycan'}},amount:2}]},
{...T,id:'dragon_bait',name:'Dragon Bait',cost:2,text:'When an enemy minion attacks your Hero, Freeze it.',trap:{on:'attackDeclared',filter:{source:'enemyMinion',target:'friendlyHero'},effects:[{op:'buff',target:'eventSource',keywords:['Frozen']}] }},
{...T,id:'daybreak_mirror',name:'Daybreak Mirror',cost:2,text:'When an enemy minion attacks your Hero, gain 3 Armor.',trap:{on:'attackDeclared',filter:{source:'enemyMinion',target:'friendlyHero'},effects:[{op:'gainArmor',amount:3}]}},
{...S,id:'silvered_cartridges',name:'Silvered Cartridges',cost:2,text:'Give your Hero +3 Attack this turn.',effects:[{op:'buff',target:'friendlyHero',attack:3,temporary:true}]},
{...S,id:'consecrated_oil',name:'Consecrated Oil',cost:3,text:'Give your equipped weapon +1 durability and your Hero +2 Attack this turn.',effects:[{op:'buffHeroWeapon',durability:1},{op:'buff',target:'friendlyHero',attack:2,temporary:true}]},
{...T,id:'belladonna_snare',name:'Belladonna Snare',cost:3,text:'When an enemy minion attacks your Hero, Freeze it.',trap:{on:'attackDeclared',filter:{source:'enemyMinion',target:'friendlyHero'},effects:[{op:'buff',target:'eventSource',keywords:['Frozen']}] }},
{...S,id:'the_night_roads',name:'The Night Roads',cost:3,text:'Discover a Monster Hunter card. It costs 1 less. Draw a card.',effects:[{op:'discoverFaction',faction:'Monster Hunter',costMod:-1},{op:'draw',count:1}]},
{...S,id:'the_prey_dossier',name:'The Prey Dossier',cost:4,text:'Give your Hero +2 Attack this turn and 3 Armor.',effects:[{op:'buff',target:'friendlyHero',attack:2,temporary:true},{op:'gainArmor',amount:3}]},
];

// ---- Expansion: Sun & Moon (15 unlockable cards) ----
// New weapon rules: twoHanded (fills both weapon slots), attacksPerTurn (Quad Strike), preyTribe / preyTag
// (bonus against a tribe or a tag instead of a realm), and the Sun and Moon revolvers' Eclipse.
const SET='Sun & Moon';
const XW=(id,name,cost,attack,durability,text,weapon={},extra={})=>({...S,id,name,cost,attack,durability,heroWeapon:true,extra:true,set:SET,text,...extra,effects:[eq(id,name,attack,durability,weapon)]});
export const MONSTER_HUNTER_EXPANSION=[
{...M,id:'gunsmiths_apprentice',name:'Gunsmith\'s Apprentice',extra:true,set:SET,cost:1,attack:1,health:2,text:'Arrival: Give your weapon +1 Attack.',triggers:[{on:'battlecry',effects:[{op:'buffHeroWeapon',attack:1}]}]},
{...M,id:'hunting_dog_handler',name:'Hunting Dog Handler',extra:true,set:SET,cost:2,attack:2,health:2,text:'Arrival: Summon a 1/1 Hunting Dog with Rush.',triggers:[{on:'battlecry',effects:[{op:'summon',cardId:'hunting_dog'}]}]},
{...M,tribes:['Beast'],id:'hunting_dog',name:'Hunting Dog',token:true,cost:1,attack:1,health:1,keywords:['Rush'],text:'Rush.'},
{...S,id:'bounty_board',name:'Bounty Board',extra:true,set:SET,cost:2,text:'Discover a Monster Hunter weapon. It costs 1 less.',effects:[{op:'discoverWeapon',faction:'Monster Hunter',costMod:-1}]},
{...S,id:'blessed_bandolier',name:'Blessed Bandolier',extra:true,set:SET,cost:2,text:'Give both your weapons +1 Attack and +1 Durability.',effects:[{op:'buffHeroWeapon',attack:1,durability:1,both:true}]},
{...T,id:'silvered_net',name:'Silvered Net',extra:true,set:SET,cost:2,text:'When an enemy minion attacks, its Attack becomes 1 this turn.',trap:{on:'attackDeclared',filter:{source:'enemyMinion'},effects:[{op:'attackBecomes',target:'eventSource',amount:1}]}},
{...M,id:'silver_smelter',name:'Silver Smelter',extra:true,set:SET,cost:3,attack:2,health:4,text:'Whenever you equip a weapon, it gains +1 Durability.',triggers:[{on:'weaponEquipped',effects:[{op:'buffHeroWeapon',durability:1,justEquipped:true}]}]},
{...T,id:'trophy_snare',name:'Trophy Snare',extra:true,set:SET,cost:2,text:'When your Hero kills a minion, draw a card and gain 2 Armor.',trap:{on:'minionDied',filter:{killer:'friendlyHero',player:'enemy'},effects:[{op:'draw',count:1},{op:'gainArmor',amount:2}]}},
{...S,id:'veterans_scar',name:'Veteran\'s Scar',extra:true,set:SET,cost:1,text:'Your Hero gains Armor equal to its Attack.',effects:[{op:'gainArmor',amountFromAttackOf:'friendlyHero'}]},
{...S,id:'the_monster_codex',name:'The Monster Codex',extra:true,set:SET,cost:2,text:'This turn, your weapons get their bonus damage against every realm.',effects:[{op:'monsterCodex'}]},
{...S,id:'crossfire_execution',name:'Crossfire Execution',extra:true,set:SET,cost:4,text:'Deal damage equal to the total Attack of both your weapons to an enemy minion.',target:{type:'minion',side:'enemy'},effects:[{op:'damage',target:'chosen',amountFromWeapons:true}]},
{...M,id:'the_hunt_master',name:'The Hunt Master',legendary:true,extra:true,set:SET,cost:7,attack:5,health:6,heroExtraAttacks:2,text:'Your Hero can attack two extra times each turn.'},
XW('cryptid_cleaver','Cryptid Cleaver',3,3,3,'Your Hero has +2 Attack against Cryptids.',{preyTribe:'Cryptid',preyBonus:2}),
XW('graveshredder','Graveshredder',6,2,8,'Takes up both weapon slots. Quad Strike. Your Hero has +2 Attack against Zombies.',{prey:'Zombies',preyBonus:2,twoHanded:true,attacksPerTurn:4},{legendary:true}),
XW('moon_revolver','Moon',4,3,3,'Ranged. Your Hero has +3 Attack against Dark minions. Eclipse with Sun: +3 Attack, Lifesteal, no Durability lost.',{ranged:true,preyTag:'Dark',preyBonus:3},{legendary:true,frameArt:'art/frames/legendary-moon-revolver.png'}),
XW('sun_revolver','Sun',4,4,2,'Ranged. After your Hero attacks with Sun, deal 2 damage to the enemy Hero. Eclipse with Moon: +3 Attack, Lifesteal, no Durability lost.',{ranged:true,sunShot:2},{legendary:true,frameArt:'art/frames/legendary-sun-revolver.png'}),
];
