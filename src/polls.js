// Community polls, shared by the game (the Vote tab in the patch notes) and the server (which counts the
// votes). One vote per player: a signed-in account votes as itself, anyone else as their device; voting
// again changes your vote. To start a new poll, add it here and point CURRENT_POLL at it.
export const POLLS = {
  'next-faction': {
    question: 'Which faction should join the realms next?',
    blurb: 'Your vote picks the next realm we build. You can change your vote until the poll closes.',
    options: [
      { id: 'space-cowboys', name: 'Space Cowboys', icon: '🤠' },
      { id: 'fruit-ninjas', name: 'Fruit Ninjas', icon: '🍉' },
      { id: 'spirit-clowns', name: 'Spirit Clowns', icon: '🤡' },
    ],
  },
};
export const CURRENT_POLL = 'next-faction';
