# Aaj Kya Bane — self-hosted

A tiny mobile-friendly web app that helps a household decide what to cook,
based on who's eating, what your cook makes well, and (roughly) what's in it
nutrition-wise. No external dependencies — just Node.js.

## Run it

```
node server.js
```

That's it. No `npm install` needed — the server only uses Node's built-in
modules. It listens on port 3000 by default (set `PORT=xxxx` to change it).

Data is stored in a file called `data.json` that gets created next to
`server.js` the first time someone creates a room. Back that file up if you
care about the data — it's the entire database.

## How "rooms" work

- Anyone can create a room from the home screen — this generates a short
  6-character code (e.g. `PB7K2Q`).
- Share that code with the people who should share that room's data (e.g.
  your sister for your household, or a separate code for your manager's
  household).
- Each room has its own people list, dish list, and settings — completely
  isolated from other rooms. One deployment can serve unlimited rooms.
- Anyone with a room's code can view and edit that room's data. There's no
  login system in this version — the code itself is the access control, so
  don't publish a code somewhere public if you want it private.

## Deploying on your office server

1. Copy this whole folder to the server.
2. Run `node server.js` (or use `pm2`, `systemd`, or a similar process
   manager so it survives reboots/crashes — ask your infra team if you're
   not sure which is standard there).
3. If the server already has a reverse proxy (nginx, etc.) put this behind
   it on a subdomain or path, and enable HTTPS through that proxy — plain
   HTTP will work for testing but isn't great for anything long-term.
4. On phones: open the URL in the browser, then use the browser's
   "Add to Home Screen" option so it behaves like a regular app icon.

## Notes on the nutrition numbers

The pre-loaded dishes have *approximate* per-serving nutrition figures
(calories, protein, carbs, fat, fibre) meant purely for casual awareness —
they are not lab-measured or medically verified, and don't account for your
specific portion sizes or recipe variations. Treat them as a rough guide,
not a tracker. Anything you add yourself is entirely up to you to fill in
or leave blank.

## Known limitations of this v1

- No accounts/login — a room code is the only access control.
- No push notifications — everyone needs to open the app to see updates.
- No offline mode — needs a network connection to your server.
- Data lives in one JSON file — fine for a household's worth of data, but
  not built for heavy concurrent traffic across many rooms at once.

These are reasonable things to revisit if this proves useful and you want
to build a "real" v2.
