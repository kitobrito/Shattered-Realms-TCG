# Shattered Realms server

Accounts, Quick Match, Ranked (Iron 5 to Legendary) and Private Match for the online game.
It checks every move with the game's own engine, and also serves the game itself.

## Run it on your computer

    npm install
    npm start            # http://localhost:8080 (the game) and ws://localhost:8080/ws

Without `DATABASE_URL` accounts are saved in `server/data/accounts.json`.

## Put it online (Render + a free Neon database)

1. **Database:** sign up at neon.com (free), create a project, and copy its connection string
   (it starts with `postgresql://`).
2. **Server:** in Render, *New + → Blueprint*, pick this GitHub repository. Render reads
   `render.yaml`, asks for `DATABASE_URL`: paste the Neon string. Create it.
3. When it's live, Render shows its address, like `https://shattered-realms.onrender.com`.
   Put `wss://<that address>/ws` into `SERVER_URL` in `src/ui/server-link.js` and set
   `online: true` in `src/build.js`; the next itch and Android builds connect to it.

On Render's free plan the server sleeps after about 15 minutes with nobody online; the first
player to connect waits up to a minute while it wakes (the game says so).

## Tests

    npm run test:server                                     # with a temporary JSON file
    TEST_DATABASE_URL=postgres://... npm run test:server    # against a real Postgres
