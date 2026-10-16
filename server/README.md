# Shattered Realms server

Accounts, Quick Match, Ranked (Iron 5 to Legendary) and Private Match for the online game.
It checks every move with the game's own engine, and also serves the game itself.

## Run it on your computer

    npm install
    npm start            # http://localhost:8080 (the game) and ws://localhost:8080/ws

Without `DATABASE_URL` accounts are saved in `server/data/accounts.json`.

## Put it online (Render)

In Render: *New + → Blueprint*, pick this GitHub repository, and create it. `render.yaml` sets up
an always-on web service and a Postgres database for it (accounts, ranks, leaderboard), already
connected. When it's live, Render shows its address, like `https://shattered-realms.onrender.com`:
put `wss://<that address>/ws` into `SERVER_URL` in `src/ui/server-link.js` and set
`online: true` in `src/build.js`; the next itch and Android builds connect to it.

Any other Postgres works too (e.g. a free Neon database): set `DATABASE_URL` to its connection
string instead. Without a database the server keeps accounts in a file, which Render wipes on
every deploy.

## Tests

    npm run test:server                                     # with a temporary JSON file
    TEST_DATABASE_URL=postgres://... npm run test:server    # against a real Postgres
