// Community polls, shared by the game (the Vote tab in the patch notes) and the server (which counts the
// votes). One vote per player: a signed-in account votes as itself, anyone else as their device; voting
// again changes your vote. An option can have `art` (a square picture); until then its `icon` emoji shows.
// To start a new poll, add it here and point CURRENT_POLL at it.
export const POLLS = {
  'next-faction': {
    question: 'Which faction should join the realms next?',
    blurb: 'Your vote picks the next realm we build. You can change your vote until the poll closes.',
    options: [
      { id: 'space-cowboys', art: 'art/ui/vote-space-cowboys.jpg', name: 'Space Cowboys', icon: '🤠', blurb: 'Six-shooters, star-sabers and a showdown under three moons. Who says you can\'t bring a blade to a gunfight?' },
      { id: 'fruit-ninjas', art: 'art/ui/vote-fruit-ninjas.jpg', name: 'Fruit Ninjas', icon: '🍉', blurb: 'Slice open a mystic fruit and its power is yours. The cleaner the cut, the deadlier the ninja.' },
      { id: 'spirit-clowns', art: 'art/ui/vote-spirit-clowns.jpg', name: 'Spirit Clowns', icon: '🤡', blurb: 'Aztec warrior spirits in feathers and face paint, running the circus of the dead. Just when you thought this game couldn\'t get any stranger.' },
      { id: 'locusts-and-leftovers', art: 'art/ui/vote-locusts-and-leftovers.jpg', name: 'Locusts and Leftovers', icon: '🦗', blurb: 'A plague of locusts that devours everything in its path, and a Thanksgiving feast that bites back. The holidays just got a lot hungrier.' },
    ],
  },
};
export const CURRENT_POLL = 'next-faction';
