// Patch notes: the "What's new" posts on the main menu, newest first, back to the Halloween update.
//
// Every block has a category (cat), shown as a banner (NEW FACTION, NEW LEGENDARY...) and used by the
// category tabs, which gather one kind of news across every post. Block contents:
//   cards:   [{ title, blurb, set | faction | ids | legendaryOf: { sets, factions } }]  a gallery of cards
//   compare: [{ id, before: {...}, note }]   the card as it was, an arrow, the card now (tap to see it big)
//   boards:  [{ name, realm, unlock }]        board paintings (tap to see one big)
//   list:    [{ cards: [ids], text }]         lines, each led by small tappable card chips
// A balance change (compare item or list line) carries `kind`: buff, nerf, tweak or rework.
// Any block, compare item or list line can carry `why`: the reason for the change, in a line under it.
// A post's `details` is the full list of every change, folded away under "Every change in this update".
// `before` is laid over today's card to rebuild how it used to read (cost, stats, text, frame...).
// Weapon text starts with its "Weapon: X Attack, Y Durability." line, as the game prints it.
// Add a new post at the top: players see a NEW mark on the menu until they open the notes.

import { allCards, getCard } from '../engine/registry.js';
import { BOARD_ART } from '../cards/board-art.js';
import { artOf, bigCardHTML, esc } from './shared.js';
import { CURRENT_POLL, POLLS } from '../polls.js';

export const PATCH_CATS = {
  faction: { label: 'New faction', tab: 'New factions' },
  expansion: { label: 'New expansion', tab: 'Expansions' },
  legendary: { label: 'New legendary', tab: 'Legendaries' },
  board: { label: 'New boards', tab: 'Boards' },
  keyword: { label: 'New keyword', tab: 'Keywords' },
  change: { label: 'Big changes', tab: 'Big changes' },
  balance: { label: 'Balance', tab: 'Balance' },
  qol: { label: 'Quality of life', tab: 'Quality of life' },
  gameplay: { label: 'Gameplay', tab: 'Gameplay & fixes' },
  fix: { label: 'Fixes', tab: 'Gameplay & fixes' },
};

// What a balance change does to a card: shown as a coloured label, and each has its own tab.
export const PATCH_KINDS = {
  buff: { label: 'Buff', tab: 'Buffs' },
  nerf: { label: 'Nerf', tab: 'Nerfs' },
  tweak: { label: 'Tweak', tab: 'Tweaks' },
  rework: { label: 'Rework', tab: 'Reworks' },
};

export const PATCH_NOTES = [
  {
    id: '2026-11-13-fruit-ninjas',
    date: 'November 13',
    title: 'Fruit Ninjas won the vote!',
    tag: 'New faction + boards',
    intro: 'The vote is in, and Fruit Ninjas won! Thank you to everyone who voted. Voting is now closed, and the winners are here: shinobi of the enchanted orchard who grow magic Fruits, slice them open, and unleash their power. Two new boards, ten Legendaries and 22 new Fusion Hero Spells come with them.',
    blocks: [
      { cat: 'faction', h: 'Fruit Ninjas', cards: [
        { title: 'Fruit Ninjas', faction: 'Fruit Ninjas', blurb: 'Grow Fruit, Slice Fruit, unleash its power. 30 cards plus the 20-card Shadow Orchard expansion (stealth, Combo and the big legends), and five Legendary Weapons.' },
      ] },
      { cat: 'keyword', h: 'Fruits and Slice', list: [
        { cards: ['harvest'], text: 'Harvest (Hero Spell, 1 Mana): Slice your leftmost Fruit, then summon a random Fruit. Fruits are 0/1 minions that can\'t attack, each with a Slice effect.' },
        { cards: ['thunder_lemon', 'titan_watermelon'], text: 'Slice: destroy one of your Fruits to unleash its power (damage, buffs, Taunts, healing, Stealth and more). Its targets are picked at random. A Fruit the enemy kills just dies, and a Silenced Fruit unleashes nothing.' },
        { cards: ['kenzaru_the_thousand_slice_master', 'blender_barrage'], text: 'Multislice (X): Slice up to X of your Fruits, leftmost first. Combo: a bonus when you played another card earlier this turn.' },
        { cards: [], text: 'Slicing has its own animation: the card turns into its fruit, a blade cuts it from a random direction, the halves fly apart, and the bonus pops up and flies as a wisp into the card that gets it.' },
      ] },
      { cat: 'legendary', h: 'New Legendaries', cards: [
        { title: 'Fruit Ninjas', legendaryOf: { factions: ['Fruit Ninjas'] } },
      ] },
      { cat: 'board', h: 'New boards', boards: [
        { name: 'Fruit Ninjas', title: 'The Orchard Dojo', realm: 'Fruit Ninjas', unlock: 'Fruit Ninjas\' board: a sunset orchard dojo with glowing lantern fruit, cherry petals on the wind, fireflies, a koi pond and a fruit press. Tap the corners.' },
        { name: 'The Moonlit Dojo', realm: 'Fruit Ninjas', unlock: 'Unlocks with the Shadow Orchard cards: a stone dojo floating above the clouds, with a turning shuriken ring, a crystal dragon and a fox-spirit lantern.' },
      ] },
      { cat: 'gameplay', h: 'Every realm', list: [
        { cards: ['genetic_fruit_splicing', 'feeding_frenzy_fruitcut'], text: 'A Fusion Hero Spell for Fruit Ninjas with each of the 22 other realms, plus a two-realm deck guide for every pairing.' },
        { cards: ['xeno_shinobi'], text: 'The Xeno Shinobi bursts out of Fruit Ninjas minions, and the Rage Runner and Clicker have Fruit Ninjas looks.' },
      ] },
    ],
    details: [
      'Balance: in simulated games against every realm, Fruit Ninjas win about half.',
      'Kagehana gives your Hero Stealth until your next turn: a Hero in Stealth can\'t be attacked or chosen by enemy cards.',
    ],
  },
  {
    id: '2026-11-13-quick-plays',
    date: 'November 13',
    title: 'Quick Plays for everyone, and a gentler AI',
    tag: 'Change',
    intro: 'Quick Plays now borrow Mana from your next turn, so you can actually answer on your opponent\'s turn. Every realm has them, they get a big new prompt, and the Easy and Medium AI calm down.',
    blocks: [
      { cat: 'change', h: 'Quick Plays', list: [
        { cards: ['flint_spear_volley'], text: 'On your opponent\'s turn, a Quick Play is paid with any Mana you have left, then borrowed from your next turn. What you borrow comes off your next refill (your Mana bar shows it, like "-2 next").',
          why: 'You usually spend all your Mana on your own turn, so Quick Plays almost never had anything to be paid with.' },
        { cards: ['glacial_fortress'], text: 'Quick Plays cast on your opponent\'s turn cost 1 less (never below 1).' },
        { cards: ['hunger_of_the_void', 'swallow_whole', 'static_spark', 'copper_coil', 'silencing_charm', 'hex_of_withering', 'garlic_and_salt', 'holy_water_flask'], text: 'Every realm now has Quick Plays. New ones: Void (Hunger of the Void, Swallow Whole), Ice Age (Flint Spear Volley, Glacial Fortress), Eels (Static Spark, Copper Coil), Witches (Silencing Charm, Hex of Withering) and Monster Hunter (Garlic and Salt, Holy Water Flask).' },
      ] },
      { cat: 'qol', h: 'The Quick Play prompt', list: [
        { cards: [], text: 'When you can answer, the Quick Play shows big on the left with a glowing arrow to a big card of the minion it would act on (the attacker, the one about to be hit, the one just played). Each option shows its cost and how much is borrowed from next turn.' },
        { cards: [], text: 'A tap on a Quick Play or Pass always counts, even while your opponent\'s move is still animating (it used to be ignored).' },
        { cards: [], text: 'You get 8 seconds to decide on a Quick Play against other players. Against the computer there is no time limit.' },
      ] },
      { cat: 'gameplay', h: 'A gentler AI', list: [
        { cards: [], text: 'Medium plans a shorter way ahead and slips now and then: still a fair fight, but beatable while you learn.' },
        { cards: [], text: 'Easy makes plenty of mistakes and its Hero starts with 25 Health (yours has 30). The tutorial\'s rival is gentler still once its scripted turns are over.' },
      ] },
    ],
  },
  {
    id: '2026-11-12-bleed-prey',
    date: 'November 12',
    title: 'Bleed marks Prey, healing stops Bleed',
    tag: 'Rules change',
    intro: 'A bleeding enemy minion is now instantly Prey for the Sharks, and any healing washes a Bleed away.',
    blocks: [
      { cat: 'change', h: 'Bleed', list: [
        { cards: ['bloodrippers_talon', 'blood_in_the_water'], text: 'An enemy minion that starts to Bleed instantly becomes Marked Prey for the Sharks (when you play Sharks or have a Shark on the board), whatever its Health. It stays Prey while it bleeds.',
          why: 'Sharks smell blood in the water. This gives Vampires + Sharks and any deck with Bleed a real way to open up targets for the Sharks.' },
        { cards: ['bloodrippers_talon'], text: 'Any healing that reaches a bleeding character stops its Bleed, even if it was already at full Health. Once the Bleed is gone, a healed minion above 3 Health is no longer Prey.' },
      ] },
    ],
    details: [
      'Heroes can\'t be Prey, so a bleeding Hero is not marked. Healing that is blocked (Radiation, Holy Flame) doesn\'t stop the Bleed.',
    ],
  },
  {
    id: '2026-11-12-dailies-play',
    date: 'November 12',
    title: 'Daily missions: just play, and a pack collection',
    tag: 'Change',
    intro: 'Daily missions now count every Quick Match or Ranked game you play, win or lose, and the packs you buy are saved for you to open whenever you like.',
    blocks: [
      { cat: 'qol', h: 'Your packs', list: [
        { cards: [], text: 'Buying a pack no longer opens it straight away. It goes into Your packs at the top of the Shop\'s Packs tab, where you can open your packs one at a time, whenever you want.' },
      ] },
      { cat: 'change', h: 'Daily missions', list: [
        { cards: [], text: 'Missions now say "Play 3 public games with..." instead of "Win 3...". Every Quick Match or Ranked game you finish with the right deck counts, whether you win or lose.',
          why: 'Missions are there to get you trying new realms and fusions. Losing while you learn a new deck shouldn\'t cost you your daily points.' },
        { cards: [], text: 'A game counts once it ends normally, or after 6 turns (3 each) if someone quits. Conceding straight away doesn\'t count.' },
        { cards: [], text: 'Today\'s missions have switched to the new wording, and your progress so far is kept.' },
      ] },
    ],
    details: [
      'Both players\' missions advance at the end of a Quick Match or Ranked game. Wins still unlock cards (up to 10 per realm) as before. Draws don\'t count.',
    ],
  },
  {
    id: '2026-11-12-dailies-menu',
    date: 'November 12',
    title: 'Daily missions on the main menu',
    tag: 'Quality of life',
    intro: 'Your daily missions are now one tap away, there are 5 of them a day, and the main menu shows your name, rank and points.',
    blocks: [
      { cat: 'qol', h: 'Daily missions', list: [
        { cards: [], text: 'A glowing Daily Missions button on the main menu shows how many missions you have left today. Open it to see all of them.' },
        { cards: [], text: 'Every mission has a Play button that sets up the game it asks for: the right fusion or realm, then Quick Match (or Ranked for the Ranked mission). Before the match starts you choose your deck: your current deck, the default deck or one of your saved decks, or edit the deck first.' },
        { cards: [], text: 'You now get 5 daily missions a day instead of 4, each still worth 80 points. If you already had today\'s 4, the fifth has been added.' },
        { cards: [], text: 'Missions are easier to read: bigger, centred, with the numbers, realms and kind of game glowing so you can see at a glance what each one asks for.' },
      ] },
      { cat: 'qol', h: 'Main menu', list: [
        { cards: [], text: 'Your name, rank and points now show at the top of the main menu.' },
        { cards: [], text: 'Bees and Monster Hunter packs now have their own pack art in the Shop.' },
      ] },
    ],
    details: [
      'The mission Play button picks the realms the mission needs (a fusion mission uses that exact pair; a realm mission uses that realm on its own) and keeps your current realms for the others. Decks with cards you have not unlocked yet are greyed out until you edit them.',
    ],
  },
  {
    id: '2026-11-12-shop',
    date: 'November 12',
    title: 'The Shop: points, packs and trading',
    tag: 'New feature',
    intro: 'A new Shop on the main menu. Complete daily missions to earn points, then spend them on card packs, single cards and boards, or trade cards with other players. Every account starts with 1000 points.',
    blocks: [
      { cat: 'change', h: 'Points and daily missions', list: [
        { cards: [], text: 'Every day you get daily missions (5 a day now), like "Win 3 public games with the Vampires + Ghosts fusion" or "Win 3 public games with Bees in your deck". Each one you complete pays 80 points.' },
        { cards: [], text: 'Only wins in Quick Match and Ranked count. Missions you don\'t finish are replaced by new ones the next day (they reset at midnight UTC).' },
        { cards: [], text: 'Points are only earned from daily missions (and recycling duplicates), never just for playing.' },
        { cards: [], text: 'Every account starts with 1000 points, including accounts made before today.' },
      ] },
      { cat: 'change', h: 'Unlocking expansion cards', list: [
        { cards: [], text: 'Winning matches still unlocks expansion cards, 2 per win, until you own 10 of a realm\'s expansion cards. The rest of that realm\'s cards come from the Shop.', why: 'Cards you already unlocked stay yours. Signed in, your cards now live on your account, so they follow you to any device.' },
      ] },
      { cat: 'change', h: 'Packs', list: [
        { cards: [], text: 'Realm packs cost 160 points: 7 random expansion cards from the realm you pick, mostly cards you don\'t have yet. Each card has a 1% chance to be a legendary.' },
        { cards: [], text: 'The Legendary Pack costs 640 points: 7 completely random cards from any realm, with at least one guaranteed legendary (one you don\'t own yet, while there are any).' },
      ] },
      { cat: 'change', h: 'Buy single cards and boards', list: [
        { cards: [], text: 'Want one card in particular? Buy it outright: 100 points for a normal card, 1600 for a legendary.' },
        { cards: [], text: 'Each realm\'s alternate board can be bought for 1600 points. Collecting all of its cards still unlocks it for free.' },
      ] },
      { cat: 'change', h: 'Duplicates', list: [
        { cards: [], text: 'Packs can give you cards you already own. Duplicates go to the Duplicates tab: recycle them for 20 points each (400 for a legendary), or trade them.' },
      ] },
      { cat: 'change', h: 'The trade board', list: [
        { cards: [], text: 'Put up to 4 cards on the public trade board and say what you\'d take for them: up to 6 options, like "this card, OR that card, OR these two cards together".' },
        { cards: [], text: 'Points can sweeten a trade ("this card + 300 points") but can\'t be the whole price. To buy a card with points, use Buy cards.' },
        { cards: [], text: 'Anyone who has one of your options can trade on the spot. Players can also make you a different offer, and you can accept it, decline it or counter with what you\'d want instead.' },
        { cards: [], text: 'Cards you put up are held until the trade ends, so they can\'t be traded twice. Trades last 7 days; take one down any time and your cards come back.' },
      ] },
      { cat: 'qol', h: 'Shop art', list: [
        { cards: [], text: 'Every realm has its own painted card pack, and the Legendary Pack is solid gold. Opening a pack now shakes it, bursts it open in a flash of light and deals your cards out. Points show as a gold coin, and the Shop has its own icon on the menu.' },
      ] },
      { cat: 'qol', h: 'Matchmaking', list: [
        { cards: [], text: 'Quick Match and Ranked find you an opponent faster. The "play a bot while you wait" button has been retired for now.' },
      ] },
    ],
    details: [
      'Daily missions: 4 per day per player, one of which is always a fusion mission. Mission types: win with a given fusion, win with a realm in your deck, win Ranked games, win with a single-realm deck, win with a two-realm deck, or win any public games.',
      'Win unlocks: 2 per win from the realms you won with, legendaries last, only while you own fewer than 10 of that realm\'s expansion cards. Wins against the computer still unlock cards (at most one claim a minute) but never earn points.',
      'Realm pack: 160 points, 7 cards, each with a 65% lean toward cards you don\'t own and a 1% legendary chance. Legendary Pack: 640 points, 7 cards from every realm, one guaranteed legendary in a random slot.',
      'Single cards: 100 points, legendaries 1600, only cards you don\'t own. Alternate boards: 1600 points, not sold once you already have them.',
      'Recycling: 20 points per duplicate, 400 for a legendary duplicate.',
      'Trade board: up to 5 trades up at once, up to 4 cards per trade, up to 6 options, up to 4 cards per option. Every option, offer and counter needs at least one card. Giving a card uses a duplicate first.',
      'Guests (not signed in) keep their browser unlocks with the same 10-card win limit; the Shop needs an account.',
    ],
  },
  {
    id: '2026-11-12-lycan',
    date: 'November 12',
    title: 'Beast Form wears off',
    tag: 'Rules change',
    intro: 'A Lycanthrope\'s Beast Form is now temporary: it lasts 2 of your turns, then the beast turns back by itself.',
    blocks: [
      { cat: 'change', h: 'Lycanthropes', list: [
        { cards: ['moonbound_initiate', 'redmoon_veteran'], text: 'Beast Form now lasts 2 of your turns, counting the turn it transformed. At the end of your second turn it turns back into its Humanoid Form by itself. A moon on the minion shows how many of your turns it has left.',
          why: 'Beast Forms used to stay out forever, so a Lycanthrope transformed once and never looked back. Now timing the transform matters, and the payoffs for going back and forth come up far more often.' },
        { cards: ['redmoon_veteran'], text: 'Turning back by itself counts as a Transform, so every "whenever this transforms" and "whenever a friendly Lycanthrope transforms" effect happens, including the heals for going back to Humanoid. It doesn\'t use up your once-per-turn Transform, and you can still Transform back early by hand.' },
      ] },
    ],
    details: [
      'Beast Form lasts 2 of its controller\'s turns (the turn it transformed counts as the first). It turns back at the end of the second one; the opponent\'s turns don\'t count.',
      'The automatic turn back is a Transform: all transform triggers happen. It doesn\'t use the once-per-turn Transform button.',
      'Transforming into Beast Form again (by hand or with a card) starts a fresh 2 turns. A Lycanthrope summoned straight into Beast Form also gets 2 turns.',
    ],
  },
  {
    id: '2026-11-12-chasm',
    date: 'November 12',
    title: 'The Great Chasm Beyond',
    tag: 'New legendary + changes',
    intro: 'Void gets a new Legendary spell, Sharks hunt Prey past Taunt and Evade, and Meteorite leaves the game to be reworked.',
    blocks: [
      { cat: 'legendary', h: 'New Legendary', cards: [
        { title: 'The Great Chasm Beyond', ids: ['the_great_chasm_beyond'], blurb: 'Void, 1 Mana. Your Hero Spell becomes The Chasm (0 Mana), an on/off switch. While the Chasm is open you no longer draw a card at the start of your turn, and a random friendly minion gains +1/+1 at the start of each of your turns. Cast it again to close it. An empty hand keeps your Hollow bonuses on.' },
      ] },
      { cat: 'change', h: 'Sharks', list: [
        { cards: ['blood_in_the_water'], text: 'Sharks can now attack Marked Prey even when it is in Stealth or behind Taunt, and a Shark\'s hit ignores the Prey\'s Evade (the Evade isn\'t used up). Other targets still wait behind Taunt as usual.',
          why: 'Prey used to be reachable "through Elusive", but Elusive only stops spells, so minions could always hit it anyway. Getting past Taunt and Evade is what a hunt should feel like.' },
        { cards: ['holy_undertow'], text: 'Prey-hunting spells still reach Prey in Stealth, but no longer reach Elusive Prey: Elusive works on them like on any other enemy spell.' },
      ] },
      { cat: 'change', h: 'Removed', list: [
        { cards: [], text: 'Meteorite has been removed from Dinosaurs for now. It will come back reworked as something new. If it was in one of your saved decks, that deck now has one empty slot to fill; Dinosaurs always keep Extinction Cycle.' },
      ] },
    ],
    details: [
      'The Great Chasm Beyond (Void Legendary spell, 1 Mana): your Hero Spell Feed the Void becomes The Chasm (0 Mana). Casting The Chasm opens it; casting it again closes it. While open: no card is drawn at the start of your turn (including The Third Circle\'s extra card), and a random friendly minion gains +1/+1 at the start of each of your turns (nothing happens with an empty board). Opening or closing it does not charge your Fusion. An OPEN tag sits on the Hero Spell while it is open.',
      'Sharks: Blood in the Water now reads "Your Sharks can attack Marked Prey through Stealth and past Taunt, and their hits ignore its Evade." Goblin Shark still sees every Stealthed minion, but non-Prey ones still wait behind Taunt.',
      'Shark cards that target Marked Prey reach it through Stealth but no longer through Elusive (Megalodon is a minion, so its Arrival still reaches Elusive Prey).',
      'Meteorite and its Meteor Strike Hero Spell are removed. Decks that held Meteorite start without it.',
    ],
  },
  {
    id: '2026-11-12',
    date: 'November 12',
    title: 'Acid Hide 2 and Corpses for everyone',
    tag: 'Balance + rules',
    intro: 'The Great Dissolution grows a thicker hide, every minion that dies now leaves a Corpse, and the Bleed rule is worded more clearly.',
    blocks: [
      { cat: 'balance', h: 'Balance', compare: [
        { id: 'the_great_dissolution', kind: 'rework', note: 'Now has Acid Hide 2 and 10 Health. It still corrodes a minion it attacks before the hit.',
          before: { health: 8, keywords: ['Taunt'], acidHide: undefined, text: 'Taunt. Whenever this fights an enemy minion, give that minion Corrosion 2 first.' },
          why: 'Acid Hide 2 melts whatever attacks it by 2 (and a Hero that hits it loses its Weapon), but only after the hit lands, so it gets 2 more Health to stand up to that first blow.' },
      ] },
      { cat: 'change', h: 'Corpses', list: [
        { cards: ['the_rot_king'], text: 'Every minion that dies now leaves a Corpse on its side, not just Zombies and Fungus. Only Zombies and Fungus cards spend Corpses, so the Corpse pile only shows for players running one of those realms.',
          why: 'Zombie and Fungus decks can now feed on every trade, including the deaths of their other realm\'s minions.' },
      ] },
      { cat: 'fix', h: 'Clearer rules', list: [
        { cards: ['bloodrippers_talon'], text: 'Bleed: a Vampire card that damages a Bleeding enemy heals half the damage it dealt (rounded up). The size of the Bleed doesn\'t matter, and the Bleed tick itself heals no one. That was always how it worked; the rule text now says so.' },
      ] },
    ],
    details: [
      'The Great Dissolution (Acidic, 10 Mana): 6/8 Taunt that corroded any minion it fought by 2 before the hit is now a 6/10 with Taunt and Acid Hide 2 (a minion that attacks it is Corroded by 2 after the hit; a Hero that attacks it loses its Weapon, or 2 Armor) that still gives a minion it attacks Corrosion 2 first.',
      'Acid Hide can now have a number. Acid Hide 2 Corrodes by 2; plain Acid Hide is still 1. The status icon shows the number when it is more than 1.',
      'Corpses: every minion that dies leaves a Corpse on its controller\'s side. Zombies and Fungus are the only realms that use them; their Corpse counter shows next to the Hero only for those players. Grave Gardener and Feed the Earth still add their own Corpses on top.',
      'Bleed rule text and tooltips reworded: the heal is half the damage the Vampire card dealt, not half the Bleed.',
    ],
  },
  {
    id: '2026-11-12-playerbase',
    date: 'November 12',
    title: 'The Playerbase',
    tag: 'Website',
    intro: 'The Shattered Realms section of comic-arena.net now has a Playerbase page and a public profile for every player.',
    blocks: [
      { cat: 'qol', h: 'Playerbase and profiles', list: [
        { cards: [], text: 'The new Playerbase page (Playerbase in the Shattered Realms menu on comic-arena.net) lists every registered player with their rank, ladder place, record, win rate, join date, and whether they are online or in a match right now. Search it, filter it to players who are online or on the ladder, and sort by newest, rank, wins or games.' },
        { cards: [], text: 'Every player has a profile page with their rank, RP, promotion series and full record. Names on the ladder link straight to them.' },
      ] },
    ],
    details: [
      'Playerbase: comic-arena.net/shattered-players. Profiles: comic-arena.net/shattered-player?name=YourName.',
      'Only public details are shown: name, rank, record, ladder place, join date and online status. Passwords and sign-in details are never shared.',
    ],
  },
  {
    id: '2026-11-11',
    date: 'November 10 - 11',
    title: 'Arsenal and two-realm balance',
    tag: 'Balance + new cards',
    intro: 'Six Legendary Weapons arrive, Aliens and Demons get a balance pass for the two-realm mode, Acidic\'s Dissolve rule is spelled out, Monster Hunter gets a new board, and the hand on phones has been rebuilt.',
    blocks: [
      { cat: 'expansion', h: 'Arsenal: six Legendary Weapons', cards: [
        { title: 'Arsenal', set: 'Arsenal', blurb: 'Hero weapons for realms that never had one (Aliens, Demons, Acidic, Divine and Vampires), each in its realm\'s own Legendary Weapon frame. Win matches to unlock them.' },
      ] },
      { cat: 'legendary', h: 'New Legendaries', cards: [
        { title: 'The Arsenal weapons, and Shield-Eater promoted', ids: ['ray_gun', 'satans_infernal_pitchfork', 'liquifier', 'archangels_divine_shield', 'holy_flail_of_righteous_fury', 'bloodrippers_talon', 'shield_eater'] },
      ] },
      { cat: 'keyword', h: 'Bleed', list: [
        { cards: ['bloodrippers_talon'], text: 'Bleed stacks. At the end of your turn, each Bleeding enemy takes damage equal to its Bleed, and it doesn\'t wear off. While an enemy Bleeds, your Vampire cards heal half the damage they deal to it (rounded up), however much it Bleeds.' },
      ] },
      { cat: 'board', h: 'Sundown Street', boards: [
        { name: 'Monster Hunter', title: 'Sundown Street', realm: 'Monster Hunter', unlock: 'Monster Hunter\'s board: a haunted frontier town split between sunset and moonlight, with a swinging noose, a twitchy coffin and tumbleweeds.' },
      ], why: 'The old Monster Hunter board didn\'t fit the realm, and The Hunter\'s Crypt was removed for the same reason. A new board for Monster Hunter is on the way.' },
      { cat: 'change', h: 'Big changes', compare: [
        { id: 'bloodrippers_talon', kind: 'rework', note: 'Now a Legendary Weapon with Twin Strike that makes its targets Bleed.',
          before: { legendary: false, frameArt: undefined, attack: 1, durability: 4, text: 'Weapon: 1 Attack, 4 Durability.' },
          why: 'It was a plain weapon with no effect. Now it feeds your Vampires: every wound it opens heals them.' },
        { id: 'the_great_dissolution', kind: 'rework', note: 'Reworked: no more Arrival. It\'s a Taunt that corrodes every enemy minion it fights, before the damage.',
          before: { keywords: [], text: 'Arrival: Apply Corrosion 2 to all enemy minions. Then deal 3 damage to each enemy minion with 0 Attack.' } },
        { id: 'shield_eater', kind: 'buff', note: 'Now Legendary. Its Essence holds the whole minion, where Strip the Plating\'s holds one random piece.',
          before: { legendary: false, frameArt: undefined, text: 'Dissolve an enemy minion.' },
          why: 'It did exactly what Strip the Plating does but cost 1 more. Now it\'s worth the extra Mana.' },
        { id: 'open_the_abyss', kind: 'buff', note: 'Cheaper, and costs less Health.',
          before: { cost: 5, text: 'Lose 5 Health. Summon a random Demon that costs 5 Mana or less.' },
          why: '5 Mana and 5 Health for one random Demon was so poor that it was almost never played.' },
        { id: 'demon_prince', kind: 'buff', note: 'Cheaper, and costs less Health.',
          before: { cost: 8, text: 'Arrival: Lose 5 Health. Summon a random Demon that costs 5 Mana or less.' } },
      ] },
      { cat: 'balance', h: 'Aliens (two-realm mode)', why: 'Two realms is the main way to play, and Aliens were among the weakest there, winning about 4 games in 10 in our test matches. Their pair deck had almost nothing cheap to play early and carried spells that were almost never cast. After these changes they win about 55%.', list: [
        { cards: ['probe_drone'], kind: 'buff', text: 'Probe Drone: 2/2 → 2/3.' },
        { cards: ['gene_mutation'], kind: 'buff', text: 'Gene Mutation: also gives the minion +1/+1.' },
        { cards: ['replication_protocol'], kind: 'buff', text: 'Replication Protocol: the copies cost (2) less (was 1).' },
        { cards: ['ufo_abductor'], kind: 'buff', text: 'UFO Abductor: 8 → 7 Mana.' },
        { cards: ['grey_scout', 'gene_thief_operative', 'experimental_containment', 'terraform'], kind: 'tweak', text: 'Recommended pair deck: Grey Scout and Gene-Thief Operative come in; Experimental Containment and Terraform go out.',
          why: 'Terraform and Experimental Containment were cast in only 4-6% of games.' },
      ] },
      { cat: 'balance', h: 'Demons (two-realm mode)', why: 'Demons were losing games to their own Health costs, and their best cards cost so much they rarely got played. These changes take them from about 43% to about 48% in our test matches.', list: [
        { cards: ['blood_ritualist'], kind: 'buff', text: 'Blood Ritualist: 2/4 → 3/4.' },
        { cards: ['soulflayer'], kind: 'buff', text: 'Soulflayer: deals 3 damage (was 2).' },
        { cards: ['infernal_ascension'], kind: 'buff', text: 'Infernal Ascension: 7 → 6 Mana.' },
        { cards: ['abyssal_brute'], kind: 'buff', text: 'Abyssal Brute: loses 2 Health (was 3).' },
        { cards: ['doom_herald'], kind: 'buff', text: 'Doom Herald: 7 → 6 Mana, and loses 1 Health each turn (was 2).' },
        { cards: ['archfiend_of_ruin'], kind: 'buff', text: 'Archfiend of Ruin: 9 → 8 Mana, loses 3 Health (was 4).' },
        { cards: ['infernal_ambush'], kind: 'buff', text: 'Infernal Ambush: loses 1 Health (was 2).' },
        { cards: ['soul_collector', 'blood_price'], kind: 'tweak', text: 'Recommended pair deck: Soul Collector and Blood Price come in; Archfiend of Ruin and Infernal Ambush go out.',
          why: 'Soul Collector gives back Health as you pay it, which is what Demons were missing.' },
      ] },
      { cat: 'balance', h: 'Acidic and Monster Hunter', list: [
        { cards: ['caustic_reservoir'], kind: 'tweak', text: 'Acidic: the rule is now on the Hero Spell and in the Corrosion keyword. A minion at 0 Attack with 6 or more Corrosion on it is Dissolved.',
          why: 'The rule existed but no card said so. It was also called "Meltdown"; it\'s now just Dissolve, so there\'s one word for it.' },
        { cards: ['graveshredder'], kind: 'buff', text: 'Graveshredder heals your Hero 2 for every Zombie it kills.' },
      ] },
      { cat: 'qol', h: 'The hand, rebuilt', why: 'The hand selected and played cards you only meant to look at. Every touch should feel deliberate: looking is looking, playing is dragging.', list: [
        { cards: [], text: 'Tap a card to lift it and read it. Tap it again to put it back. A tap never plays a card, and never says "Not enough Mana".' },
        { cards: [], text: 'Hold a card to see it big, until you let go. Nothing else happens.' },
        { cards: [], text: 'Hold and slide along your hand to read your cards one by one. The card under your finger is the one shown.' },
        { cards: [], text: 'The two-row hand on phones no longer flickers between the front and back cards. A thumb resting on the line between two cards stays on one.' },
        { cards: [], text: 'Drag a card onto the board to play it. Only then are you told if it can\'t be played (not enough Mana, not your turn, and so on).' },
        { cards: [], text: 'Tapping the hand in the corner just brings it up; no card gets picked by accident.' },
      ] },
      { cat: 'qol', h: 'Reading and seeing more', list: [
        { cards: [], text: 'Weapons now show as medallions beside your Hero, for every realm: art, an orange Attack chip and a dark Durability chip. When dual-wielding they\'re marked I and II, and the one your next swing uses glows.',
          why: 'The old sword badge didn\'t show which weapon you held, or which of two would swing next. The Attack number was also hard to read in silver.' },
        { cards: ['extinction_cycle', 'dual_wield', 'blood_in_the_water'], text: 'Hold any Hero Spell to read it, passive ones included. Sharks and Monster Hunter now have a badge for theirs.',
          why: 'Passive Hero Spells, like the Dinosaurs\' Extinction Cycle, couldn\'t be read during a match.' },
        { cards: [], text: 'The Weapon keyword explains itself by realm: Robots read about Upgrades, Hero weapons about swinging and Durability.',
          why: 'Every weapon\'s explanation used to talk about Robot Upgrades.' },
        { cards: [], text: 'Patch notes, right here on the main menu.' },
      ] },
      { cat: 'gameplay', h: 'Animations', list: [
        { cards: ['graveshredder', 'sun_revolver', 'moon_revolver'], text: 'The Monster Hunter Legendary Weapons come alive. Graveshredder revs and saws, Sun fires a beam and a hellfire bullet, Moon fires a silver streak, and holding both sets off the Eclipse.' },
        { cards: [], text: 'Their kills have their own animations. Graveshredder slowly saws a minion in half (down, across, or on either diagonal). Sun scorches it and crumbles it to ash. Moon turns it to silver light that bursts. Eclipse does both inside a golden corona.' },
      ] },
      { cat: 'fix', h: 'Fixes', list: [
        { cards: [], text: 'After a message like "Not enough Mana", an invisible box stayed over the bottom of the screen and blocked taps on your hand.' },
        { cards: [], text: 'The enemy Hero\'s portrait now fits the round frame on the Monster Hunter board.' },
        { cards: [], text: 'Monster Hunter\'s Legendary frames and the Sun & Moon card art now load on phones and on itch.io.' },
        { cards: [], text: 'Phones no longer leave a card looking picked after you tap the hand.' },
      ] },
    ],
    details: [
      'Arsenal (new unlockable set, all Legendary, one copy per deck): Ray Gun (Aliens, 3 Mana, 3/3, Ranged: each shot gives Radiation 1 permanently and Burn 1); Satan\'s Infernal Pitchfork (Demons, 6 Mana, 6/6: Burn 1); Liquifier (Acidic, 6 Mana, 2/3, Ranged: Corrosion 3 on the minion it shoots); Archangel\'s Divine Shield (Divine, 4 Mana, 1/4: prevents every hit to your Hero for 1 Durability each); Holy Flail of Righteous Fury (Divine, 3 Mana, 1/3: Holy Flame 2); Bloodripper\'s Talon (Vampires, 1 Mana, 1/6, Twin Strike: Bleed 1).',
      'Ray Gun\'s Radiation follows the normal Radiation rule: while the target is irradiated, every character without Radiation, your own Hero included, has 1 less Health.',
      'Archangel\'s Divine Shield also blocks the damage your Hero takes back when it attacks a minion, so such a swing can use 2 Durability.',
      'New keyword Bleed: stacks; deals its value at the end of the turn of the player who caused it; doesn\'t fade (Cleanse removes it); Vampire minions, and a Hero swinging a Vampire weapon, heal half the damage they deal to a Bleeding enemy.',
      'Aliens: Probe Drone 2/3; Gene Mutation +1/+1 and 2 random Keywords; Replication Protocol copies cost (2) less; UFO Abductor 7 Mana. Pair deck: Grey Scout and Gene-Thief Operative in, Experimental Containment and Terraform out.',
      'Demons: Open the Abyss 4 Mana / lose 3; Demon Prince 7 Mana / lose 3; Blood Ritualist 3/4; Soulflayer deals 3; Infernal Ascension 6 Mana; Abyssal Brute loses 2; Doom Herald 6 Mana / loses 1 a turn; Archfiend of Ruin 8 Mana / loses 3; Infernal Ambush loses 1. Pair deck: Soul Collector and Blood Price in, Archfiend of Ruin and Infernal Ambush out. Four pair-deck guides rewritten to match.',
      'Acidic: The Great Dissolution is now "Taunt. Whenever this fights an enemy minion, give that minion Corrosion 2 first." (both when it\'s attacked and when it attacks). Shield-Eater is Legendary: "Dissolve an enemy minion and gain a card that gives its Attack, Health and keywords to a friendly minion." Caustic Reservoir and the Corrosion keyword state the 6-Corrosion Dissolve rule.',
      'Monster Hunter: Graveshredder heals 2 per Zombie it kills. Legendary weapon animations are about a third faster than first shown. Sundown Street is the realm\'s board; the old armory board and The Hunter\'s Crypt are gone.',
      'Weapon medallions for every realm; the portrait\'s sword badge only shows when your Hero has no weapon.',
      'Hand: tap reads, hold reads, slide reads card by card, drag plays; the corner hand only rises; touch no longer triggers mouse hover effects.',
      'Hero Spells that can\'t be used right now still respond to a hold (they used to ignore touches entirely on phones); holding one never casts it.',
      'The fading message box no longer catches touches.',
    ],
  },
  {
    id: '2026-11-09',
    date: 'November 6 - 9',
    title: 'The Monster Hunter',
    tag: 'New faction + expansions',
    intro: 'A new realm that arms its Hero, two expansions (Sun & Moon for Monster Hunter, Stolen Hide for Lycanthropes), and the first round of Monster Hunter balance.',
    blocks: [
      { cat: 'faction', h: 'Monster Hunter', cards: [
        { title: 'Monster Hunter', faction: 'Monster Hunter', blurb: 'Hunters who arm their Hero: weapons with bonus damage against Vampires, Werewolves, Ghosts, Dragons and Demons, and Dual-Wield to carry two at once.' },
      ] },
      { cat: 'expansion', h: 'New expansions', cards: [
        { title: 'Sun & Moon (Monster Hunter)', set: 'Sun & Moon', blurb: 'The Sun and Moon revolvers (hold both for the Eclipse), Graveshredder\'s Quad Strike, The Hunt Master, and a Hunting Dog. The revolvers have their own special frames.' },
        { title: 'Stolen Hide (Lycanthropes)', set: 'Stolen Hide', blurb: 'Skinwalkers that take the shape of what they hunt.' },
      ] },
      { cat: 'legendary', h: 'New Legendaries', cards: [
        { title: 'Monster Hunter, Sun & Moon and Stolen Hide', legendaryOf: { factions: ['Monster Hunter'], sets: ['Sun & Moon', 'Stolen Hide'] } },
      ] },
      { cat: 'board', h: 'New boards', boards: [
        { name: 'The Skinwalker Cave', realm: 'Lycanthropes', unlock: 'Unlocks with the Stolen Hide cards.' },
      ] },
      { cat: 'change', h: 'Big changes', compare: [
        { id: 'cross_hilt_longsword', kind: 'buff', note: 'Hits Vampires harder.',
          before: { text: 'Weapon: 4 Attack, 3 Durability. Your Hero has +2 Attack against Vampires.' } },
        { id: 'hidden_hand_cannon', kind: 'buff', note: 'Can now shoot an enemy minion as well as the enemy Hero.',
          before: { text: 'Weapon: 7 Attack, 1 Durability. Your Hero can attack only the enemy Hero.' } },
      ] },
      { cat: 'qol', h: 'Quality of life', list: [
        { cards: [], text: 'The raised hand only goes back down on a real tap, not a brush, a swipe or a resting finger. Aiming an attack puts it away, and a slow or shaky tap on the resting hand still raises it.' },
        { cards: [], text: 'Log out is now in Settings.' },
        { cards: [], text: 'Draw previews are faster.' },
      ] },
      { cat: 'gameplay', h: 'Animations', list: [
        { cards: [], text: 'Fungus: Mushrooms fly from the card into the enemy deck, and burst in green smoke when drawn.' },
      ] },
      { cat: 'fix', h: 'Fixes from community reports', list: [
        { cards: [], text: 'The Tutorial button comes first, the tutorial shows its card preview, the defeat crack fits the portrait, and the victory screen scrolls.' },
        { cards: [], text: 'Blood Mite\'s Attack no longer shows green, and Bloodhound\'s log names the right card.' },
        { cards: [], text: 'The "Nothing fits yet" tip no longer gets in the way.' },
      ] },
    ],
    details: [
      'New realm: Monster Hunter (30 cards plus the passive Dual-Wield Hero Spell). Weapons have bonus damage against a realm (Vampires, Werewolves, Ghosts, Dragons or Demons); Rowan Stake instantly kills Vampires it hits; Flintlock Pistol has a cooldown.',
      'The Last Exorcist (Legendary, 9 Mana): destroys every enemy Dark minion on the board and in your opponent\'s hand.',
      'Sun & Moon (15 unlockable cards and a Hunting Dog): two-handed weapons, Quad Strike, bonuses against a tribe or tag, Bounty Board, Blessed Bandolier, The Monster Codex, Crossfire Execution, The Hunt Master (your Hero can attack two extra times each turn), and the Sun and Moon revolvers with Eclipse.',
      'Stolen Hide (15 unlockable Lycanthrope cards) and its board, The Skinwalker Cave.',
      'Balance: Cross-Hilt Longsword +3 Attack against Vampires (was +2); Hidden Hand Cannon can shoot minions as well as the enemy Hero.',
      'Hand: only a real tap puts the raised hand back; no double flips within half a second.',
      'Community fixes: Tutorial button first, tutorial step 6 preview, faster draw previews, defeat crack, victory scrollbar, Blood Mite\'s Attack colour, the "Nothing fits yet" tip, Bloodhound log naming.',
      'Log out in Settings.',
    ],
  },
  {
    id: '2026-11-05',
    date: 'November 4 - 5',
    title: 'The Witches',
    tag: 'New faction + boards',
    intro: 'The anti-spell coven joins the realms with its Spellbound expansion, fifteen boards become unlockable, and you can now pick who you face.',
    blocks: [
      { cat: 'faction', h: 'Witches', cards: [
        { title: 'Witches', faction: 'Witches', blurb: 'The anti-spell coven: Wands that fight for your Hero, Counters, Silence, and Legendary Weapons instead of Legendary minions.' },
      ] },
      { cat: 'expansion', h: 'New expansion', cards: [
        { title: 'Spellbound (Witches)', set: 'Spellbound', blurb: 'Write a Spellbook, weave Wands together, Inscribe spells and master them.' },
      ] },
      { cat: 'legendary', h: 'New Legendaries', cards: [
        { title: 'Witches and Spellbound', legendaryOf: { factions: ['Witches'], sets: ['Spellbound'] } },
      ] },
      { cat: 'board', h: 'New boards', boards: [
        { name: 'Witches', title: 'The Witches\' board', realm: 'Witches', unlock: 'The Witches\' own board.' },
        { name: 'The Wicked Cabin', realm: 'Witches', unlock: 'Unlocks with the 15 Spellbound cards.' },
        { name: 'Aliens', title: 'The UFO lab', realm: 'Aliens', unlock: 'Now the Aliens board.' },
        { name: 'The Xeno Hive', realm: 'Aliens', unlock: 'Unlocks with the Hive Brood cards.' },
        { name: 'The Shifting Dunes', realm: 'Sharks', unlock: 'Unlocks with the Sharks expansion.' },
        { name: 'The Sewage Works', realm: 'Acidic', unlock: 'Unlocks with the Acidic expansion.' },
        { name: 'The Bone Crater', realm: 'Dinosaurs', unlock: 'Unlocks with the Dinosaurs expansion.' },
        { name: 'The Fallout Vault', realm: 'Radioactive', unlock: 'Unlocks with the Radioactive expansion.' },
        { name: 'The Blood Bar', realm: 'Vampires', unlock: 'Unlocks with the Vampires expansion.' },
        { name: 'The Haunted Set', realm: 'Ghosts', unlock: 'Unlocks with the Ghosts expansion.' },
        { name: 'The Hornet Hollow', realm: 'Bees', unlock: 'Unlocks with the Bees expansion.' },
        { name: 'The Kaiju Cockpit', realm: 'Robots', unlock: 'Unlocks with the Robots expansion.' },
        { name: 'The Frozen Hoard', realm: 'Dragons', unlock: 'Unlocks with the Dragons expansion.' },
        { name: 'The White Hole', realm: 'Void', unlock: 'Unlocks with the Void expansion.' },
        { name: 'The Split Realm', realm: 'Ultraterrestrials', unlock: 'Unlocks with the Ultraterrestrials expansion.' },
        { name: 'The Live Wire', realm: 'Eels', unlock: 'Unlocks with the Eels expansion.' },
        { name: 'The Tar Pit', realm: 'Ice Age', unlock: 'Unlocks with the Ice Age expansion.' },
        { name: 'The Consecrated Graveyard', realm: 'Divine', unlock: 'Unlocks with the Divine expansion.' },
        { name: 'The Siege of Heaven', realm: 'Demons', unlock: 'Unlocks with the Demons expansion.' },
      ] },
      { cat: 'change', h: 'Big changes', why: 'Silence was on 20 Witch cards (it\'s now on 10).', compare: [
        { id: 'the_great_hush', kind: 'rework', note: 'Damage instead of a full Silence.',
          before: { text: 'Permanently Silence all enemy minions, then deal 1 damage to them. Silence the enemy Hero until the end of their next turn. Draw a card.' } },
        { id: 'pin_the_poppet', kind: 'rework', note: 'Damage instead of Silence.',
          before: { text: 'Permanently Silence an enemy minion, then deal 3 damage to it.' } },
      ] },
      { cat: 'balance', h: 'Witches', list: [
        { cards: ['crossroads_witch'], kind: 'rework', text: 'Crossroads Witch: deals 2 damage to a random enemy minion at the end of your turn (was: Silence one).' },
        { cards: ['cinderthorn_wand'], kind: 'rework', text: 'Cinderthorn Wand: after your Hero attacks, deals 1 damage to all enemy minions (was: 2 to Silenced ones).' },
        { cards: ['the_witching_hour_broom'], kind: 'rework', text: 'The Witching Hour Broom: deals 2 damage to all enemy minions (was: Silence them all).' },
        { cards: ['backfire_curse', 'curse_of_the_withered_hand', 'mirror_hex'], kind: 'nerf', text: 'Backfire Curse, Curse of the Withered Hand and Mirror Hex no longer Silence. Backfire Curse draws a card instead.' },
        { cards: ['wandwright', 'willow_wand'], kind: 'nerf', text: 'Wandwright\'s Willow Wand is a plain 2/2 Wand.' },
        { cards: ['mirror_hex'], kind: 'tweak', text: 'Mirror Hex is the Witches\' Legendary Trap. Their other Traps use the normal Trap frame.',
          why: 'Every Witch Trap was wearing the Legendary frame. Only the special named one should.' },
      ] },
      { cat: 'qol', h: 'Quality of life', list: [
        { cards: [], text: 'When your opponent plays a card, it shows big in the middle of the screen for a few seconds so you can read it.' },
        { cards: [], text: 'Choose your AI opponent\'s realm. In Hot Seat, both players pick their realms.' },
        { cards: [], text: 'Fusion Heroes you haven\'t met yet show as a blacked-out silhouette instead of a question mark.' },
      ] },
      { cat: 'gameplay', h: 'Boards come alive', list: [
        { cards: [], text: 'The Void board\'s galaxies turn properly, and the planet drifts instead of spinning.' },
      ] },
      { cat: 'fix', h: 'Fixes', list: [
        { cards: [], text: 'The Wicked Cabin never unlocked. It now unlocks with the 15 Spellbound cards.' },
      ] },
    ],
    details: [
      'New realm: Witches (30 cards and the Wandcraft Hero Spell). Wands fire from afar (your Hero takes nothing back); Counters cancel enemy spells; Legendary Weapons instead of Legendary minions; Mirror Hex is the Legendary Trap.',
      'Spellbound (15 unlockable Witch cards): Spellbook pages, Wandweaving, Inscribe, Masteries.',
      'Witches balance: Silence on 10 cards (was 20); synergy ratings for all 20 Witch pairings.',
      'Boards: the UFO lab is the Aliens board; The Xeno Hive (unlocked by the Hive Brood cards) and The Shifting Dunes became unlockable; The Sewage Works for Acidic; 13 more boards that unlock with each realm\'s expansion; The Consecrated Graveyard (Divine) and The Siege of Heaven (Demons).',
      'Enemy card spotlight; AI opponent picker; Hot Seat realm picks for both players; unmet Fusion Heroes as silhouettes.',
      'Void board: galaxies turn on their true slant, arms trail the right way, the planet drifts, new core, planet and moon glows.',
      'Fix: The Wicked Cabin counted no cards toward its unlock, so it never unlocked.',
    ],
  },
  {
    id: '2026-11-04',
    date: 'November 4',
    title: 'The Halloween update',
    tag: 'Expansions + legendaries',
    intro: 'Pumpkins, cordyceps and the Silent Choir: three Halloween sets, living boards you can unlock and choose, and new Legendary frames for half the realms.',
    blocks: [
      { cat: 'expansion', h: 'New expansions', cards: [
        { title: 'Harvest Moon (Plants)', set: 'Harvest Moon', blurb: 'A haunted pumpkin patch. Pumpkins grow a Shell that soaks up damage and bursts when it breaks.' },
        { title: 'Cordyceps Outbreak (Zombies)', set: 'Cordyceps Outbreak', blurb: 'Fungal Zombies that count as both Zombie and Fungus, and the Clickers they become.' },
        { title: 'Cordyceps Bloom (Fungus)', set: 'Cordyceps Bloom', blurb: 'The fungus that won: a ruined world alive with glowing mycelium.' },
        { title: 'The Silent Choir (Aliens)', set: 'The Silent Choir', blurb: 'Ten new Qu cards built on Silence and Remake.' },
      ] },
      { cat: 'legendary', h: 'New Legendaries', cards: [
        { title: 'Pumpkin, cordyceps and Qu Legendaries, in their own frames', legendaryOf: { sets: ['Harvest Moon', 'Cordyceps Outbreak', 'Cordyceps Bloom', 'The Silent Choir'] } },
      ] },
      { cat: 'board', h: 'New boards', boards: [
        { name: 'Harvest Moon', realm: 'Plants', unlock: 'Unlocks with the Harvest Moon cards.' },
        { name: 'Cordyceps Outbreak', realm: 'Zombies', unlock: 'Unlocks with the Cordyceps Outbreak cards.' },
        { name: 'Cordyceps Bloom', realm: 'Fungus', unlock: 'Unlocks with the Cordyceps Bloom cards.' },
        { name: 'The Rage Outbreak', realm: 'Zombies', unlock: 'Unlocks with the Zombies expansion.' },
      ] },
      { cat: 'qol', h: 'Quality of life', list: [
        { cards: [], text: 'The new board picker in the Collection lets you choose which unlocked board each realm plays on.' },
        { cards: [], text: 'On phones, the Collection\'s set buttons scroll sideways instead of widening the page.' },
      ] },
      { cat: 'gameplay', h: 'Gameplay and looks', list: [
        { cards: [], text: 'Unlocked boards are living boards, with moving scenery you can tap.' },
        { cards: ['the_great_pumpkin', 'the_rat_king', 'hush_the_silent_choir'], text: 'New Legendary frames for Acidic, Radioactive, Dinosaurs, Sharks, Eels, Vampires, Demons and the Qu. Halloween Legendaries get pumpkin and cordyceps frames.' },
        { cards: ['remade_blind_folk', 'remade_bone_crusher', 'remade_parasite'], text: 'Remade has three new forms (Blind Folk, Bone Crusher and Parasite) and a new Colonial, each with keywords that fit its body.' },
        { cards: [], text: 'Each realm now has its own Clicker look.' },
      ] },
      { cat: 'fix', h: 'Fixes', list: [
        { cards: [], text: 'The glossary no longer explains Rage on Rage Runner.' },
      ] },
    ],
    details: [
      'Harvest Moon (10 unlockable Plant cards) with the Shell mechanic; Legendaries The Great Pumpkin and Hallowroot in the pumpkin frame; its own board.',
      'Cordyceps Outbreak (Zombies) and Cordyceps Bloom (Fungus): cordyceps Zombies are both Zombie and Fungus; Legendaries The Rat King, Necrohydra, Mycelia and Ophio in the cordyceps frame; a board for each; Clickers in every realm\'s colours.',
      'The Rage Outbreak board unlocks with the Zombies\' Rage expansion.',
      'The Silent Choir (10 Qu cards built on Silence and Remake) with Hush, the Silent Choir; Qu Legendary frame for The Qu, Shapers of Worlds and Hush.',
      'Remade: Blind Folk, Bone Crusher and Parasite forms, a new Colonial, keywords that fit each body.',
      'New Legendary frames: Acidic, Radioactive, Dinosaurs, Sharks, Eels, Vampires, Demons.',
      'Unlockable living boards and the board picker.',
      'Collection on phones: set buttons scroll sideways. Glossary: "Rage Runner" no longer pulls in the Rage keyword.',
    ],
  },
];

// ---- Seen / unseen -------------------------------------------------------------------------
const SEEN_KEY = 'shattered-patch-seen';
export const latestPatchId = () => PATCH_NOTES[0]?.id ?? '';
export function patchUnseen() {
  try { return localStorage.getItem(SEEN_KEY) !== latestPatchId(); } catch { return false; }
}
export function markPatchSeen() {
  try { localStorage.setItem(SEEN_KEY, latestPatchId()); } catch { /* private mode */ }
}

// ---- Rendering -----------------------------------------------------------------------------
const cardsOf = (g) => {
  if (g.ids) return g.ids.map(getCard).filter(Boolean);
  const all = allCards().filter((c) => !c.custom && !c.fusion && !c.heroSpell && !(c.token && !c.legendary));
  if (g.legendaryOf) {
    const { sets = [], factions = [] } = g.legendaryOf;
    // A Lycanthrope's beast form is the same card: show the humanoid only.
    return all.filter((c) => c.legendary && !c.token && c.form !== 'beast' && (sets.includes(c.set) || (factions.includes(c.faction) && !c.set)));
  }
  if (g.set) return all.filter((c) => c.set === g.set && !c.token && c.form !== 'beast');
  // A whole new realm: its own cards (not its expansion sets), Legendaries first.
  return all.filter((c) => c.faction === g.faction && !c.set && !c.extra && !c.token)
    .sort((a, b) => (b.legendary ? 1 : 0) - (a.legendary ? 1 : 0) || a.cost - b.cost);
};
const chip = (id) => {
  const c = getCard(id);
  if (!c) return '';
  const art = artOf(c);
  return `<button class="pn-chip ${c.legendary ? 'legend' : ''}" data-zoom="${c.id}" title="See ${esc(c.name)}">${art ? `<img src="${art}" alt="" loading="lazy" draggable="false">` : `<i>${c.art ?? '✦'}</i>`}<span>${esc(c.name)}</span></button>`;
};
// The card as it used to be: today's card with the old values laid over it (its art kept).
function beforeCard(id, before) {
  const now = getCard(id);
  return { ...now, ...before, id: `${id}__before`, artFrom: now.artFrom ?? id, weaponStats: undefined };
}
// Why it changed, in the designer's own reasoning.
const kindHTML = (k) => (PATCH_KINDS[k] ? `<span class="pn-kind k-${k}">${PATCH_KINDS[k].label}</span>` : '');
const whyHTML = (why) => (why ? `<small class="pn-why"><b>Why:</b> ${esc(why)}</small>` : '');
const sized = (html) => html.replace('class="big-card', 'class="big-card pn-big');
const boardSrc = (b) => BOARD_ART[b.name];

function bodyHTML(b) {
  if (b.cards) {
    return b.cards.map((g) => {
      const cards = cardsOf(g);
      return `<div class="pn-set"><div class="pn-set-head"><b>${esc(g.title)}</b><small>${cards.length} card${cards.length === 1 ? '' : 's'}</small></div>
        ${g.blurb ? `<p>${esc(g.blurb)}</p>` : ''}
        <div class="pn-gallery">${cards.map((c) => `<button class="pn-gcard ${c.legendary ? 'legend' : ''}" data-zoom="${c.id}" title="See ${esc(c.name)}">${sized(bigCardHTML(c, { small: true }))}</button>`).join('')}</div></div>`;
    }).join('');
  }
  if (b.compare) {
    return b.compare.map((x) => {
      const now = getCard(x.id);
      if (!now) return '';
      return `<div class="pn-compare"><div class="pn-compare-name">${kindHTML(x.kind)}<b>${esc(now.name)}</b>${x.note ? `<span>${esc(x.note)}</span>` : ''}${whyHTML(x.why)}</div>
        <div class="pn-compare-row">
          <div class="pn-side was"><small>Before</small>${sized(bigCardHTML(beforeCard(x.id, x.before ?? {})))}</div>
          <i class="pn-arrow" aria-label="becomes">➜</i>
          <button class="pn-side now" data-zoom="${now.id}" title="See ${esc(now.name)}"><small>Now</small>${sized(bigCardHTML(now))}</button>
        </div></div>`;
    }).join('');
  }
  if (b.boards) {
    return `<div class="pn-boards">${b.boards.filter(boardSrc).map((x) => `<button class="pn-board" data-act="patchBoard:${encodeURIComponent(x.name)}" title="See ${esc(x.title ?? x.name)}">
      <img src="${boardSrc(x)}" alt="" loading="lazy" draggable="false"><span><b>${esc(x.title ?? x.name)}</b><small>${esc(x.realm)} · ${esc(x.unlock)}</small></span></button>`).join('')}</div>`;
  }
  return `<ul class="pn-list">${b.list.map((it) => `<li>${it.cards?.length ? `<span class="pn-chips">${it.cards.map(chip).join('')}</span>` : ''}<span class="pn-text">${kindHTML(it.kind)}${esc(it.text)}${whyHTML(it.why)}</span></li>`).join('')}</ul>`;
}

const blockHTML = (b, from = null) => `<section class="pn-block cat-${b.cat}">
  <div class="pn-banner"><span class="pn-cat">${esc(PATCH_CATS[b.cat]?.label ?? '')}</span><h4>${esc(b.h)}</h4>${from ? `<small class="pn-from">${esc(from.title)} · ${esc(from.date)}</small>` : ''}</div>
  ${b.why ? `<p class="pn-block-why">${whyHTML(b.why)}</p>` : ''}${bodyHTML(b)}</section>`;

// The tabs: each post, then each kind of news gathered across all of them.
const CAT_TABS = [...new Set(Object.values(PATCH_CATS).map((c) => c.tab))];
// Buffs, Nerfs, Tweaks and Reworks sit right after Balance.
CAT_TABS.splice(CAT_TABS.indexOf('Balance') + 1, 0, ...Object.values(PATCH_KINDS).map((k) => k.tab));
const kindOfTab = (tab) => Object.entries(PATCH_KINDS).find(([, k]) => k.tab === tab)?.[0];
// Every change of one kind in a post, as its own block (side-by-sides first, then lines).
function kindBlocks(post, kind) {
  const compare = post.blocks.flatMap((b) => (b.compare ?? []).filter((x) => x.kind === kind));
  const list = post.blocks.flatMap((b) => (b.list ?? []).filter((x) => x.kind === kind));
  const out = [];
  if (compare.length) out.push({ cat: 'change', h: PATCH_KINDS[kind].tab, compare });
  if (list.length) out.push({ cat: 'balance', h: PATCH_KINDS[kind].tab, list });
  return out;
}
const catsOfTab = (tab) => Object.entries(PATCH_CATS).filter(([, c]) => c.tab === tab).map(([k]) => k);

// The Vote tab: the current poll. The choices first; once you've voted, everyone's results (your pick marked).
// poll: { loading, error, counts, total, mine, sending }
function pollHTML(poll = {}) {
  const def = POLLS[CURRENT_POLL];
  if (!def) return '<p class="pn-intro">No vote is running right now.</p>';
  const voted = !!poll.mine;
  const options = def.options.map((o) => {
    const n = poll.counts?.[o.id] ?? 0;
    const pct = poll.total ? Math.round((100 * n) / poll.total) : 0;
    return `<button class="pv-option ${poll.mine === o.id ? 'mine' : ''}" data-act="patchVoteFor:${o.id}" ${poll.sending ? 'disabled' : ''}>
      ${o.art ? `<img class="pv-art" src="${o.art}" alt="" draggable="false">` : `<i class="pv-icon">${o.icon}</i>`}<b>${esc(o.name)}</b>${o.blurb ? `<p class="pv-blurb">${esc(o.blurb)}</p>` : ''}
      ${voted && poll.counts ? `<span class="pv-bar"><span style="width:${pct}%"></span></span><small>${pct}% · ${n} vote${n === 1 ? '' : 's'}</small>` : '<small>Vote</small>'}
      ${poll.mine === o.id ? '<em>Your vote</em>' : ''}</button>`;
  }).join('');
  const status = poll.error ? `<p class="pv-status err">${esc(poll.error)}</p>`
    : poll.sending ? '<p class="pv-status">Sending your vote...</p>'
    : voted ? `<p class="pv-status">Thanks for voting! ${poll.total ? `${poll.total} vote${poll.total === 1 ? '' : 's'} so far.` : ''} Tap another faction to change your vote.</p>`
    : poll.loading ? '<p class="pv-status">Loading the poll...</p>' : '<p class="pv-status">Pick one. The results show once you\'ve voted.</p>';
  return `<div class="pn-post-head"><span class="pn-tag">Community vote</span><h3>${esc(def.question)}</h3></div>
    <p class="pn-intro">${esc(def.blurb)}</p>
    <div class="pv-options">${options}</div>${status}
    <p class="pn-foot">One vote per player: signed in, you vote as your account; otherwise as this device.</p>`;
}

export function patchNotesHTML({ post = 0, tab = null, board = null, poll = null } = {}) {
  const voteTab = POLLS[CURRENT_POLL] ? `<button class="pn-tab pn-vote-tab ${tab === 'vote' ? 'on' : ''}" data-act="patchVote"><b>🗳️ Vote: next faction</b><small>Choose what we build next</small></button>` : '';
  const postTabs = voteTab + PATCH_NOTES.map((p, i) => `<button class="pn-tab ${tab == null && i === post ? 'on' : ''}" data-act="patchPost:${i}"><b>${esc(p.title)}</b><small>${esc(p.date)}</small></button>`).join('');
  const catTabs = CAT_TABS.map((t) => `<button class="pn-cattab ${tab === t ? 'on' : ''}" data-act="patchTab:${encodeURIComponent(t)}">${esc(t)}</button>`).join('');
  let body;
  if (tab === 'vote') body = pollHTML(poll ?? {});
  else if (tab) {
    const kind = kindOfTab(tab);
    const cats = catsOfTab(tab);
    const blocks = kind
      ? PATCH_NOTES.flatMap((p) => kindBlocks(p, kind).map((b) => blockHTML(b, p)))
      : PATCH_NOTES.flatMap((p) => p.blocks.filter((b) => cats.includes(b.cat)).map((b) => blockHTML(b, p)));
    body = `<div class="pn-post-head"><span class="pn-tag">All updates</span><h3>${esc(tab)}</h3><small>Newest first</small></div>${blocks.join('') || '<p class="pn-intro">Nothing here yet.</p>'}`;
  } else {
    const p = PATCH_NOTES[post] ?? PATCH_NOTES[0];
    body = `<div class="pn-post-head"><span class="pn-tag">${esc(p.tag)}</span><h3>${esc(p.title)}</h3><small>${esc(p.date)}</small></div>
      <p class="pn-intro">${esc(p.intro)}</p>${p.blocks.map((b) => blockHTML(b)).join('')}
      ${p.details?.length ? `<details class="pn-details"><summary>Every change in this update (${p.details.length})</summary><ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></details>` : ''}`;
  }
  const big = board && BOARD_ART[board] ? `<div class="pn-board-view" data-act="closePatchBoard"><img src="${BOARD_ART[board]}" alt=""><small>Tap to close</small></div>` : '';
  return `<div class="overlay patch-overlay"><div class="guide-backdrop" data-act="closePatch"></div>
    <div class="patch-panel" role="dialog" aria-label="Patch notes">
      <header class="pn-head"><h3>Patch notes</h3><button class="ghost pn-close" data-act="closePatch" aria-label="Close">✕</button></header>
      <nav class="pn-tabs">${postTabs}</nav>
      <nav class="pn-cattabs">${catTabs}</nav>
      <article class="pn-post">${body}${tab === 'vote' ? '' : '<p class="pn-foot">Tap any card or board to see it full size.</p>'}</article>
      ${big}
    </div></div>`;
}
