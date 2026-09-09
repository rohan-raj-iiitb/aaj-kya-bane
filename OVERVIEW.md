# Aaj Kya Banwaye — overview & tradeoffs

A small web app that helps a household decide what to cook — together — and then
send the decision to their cook over WhatsApp. Built mobile-first, installable as
an app.

**Live:** https://aaj-kya-bane-production.up.railway.app
**Repo:** https://github.com/rohan-raj-iiitb/aaj-kya-bane

---

## What it does
- **Rooms** — a household shares a 6-char room code (or a one-tap invite link).
- **Setup wizard** on room creation: household name, members, veg/non-veg leaning,
  and cuisines (North/South Indian, Chinese, Italian) → seeds a tailored dish list.
- **Decide together** — propose a dish for a meal → it messages the other member on
  WhatsApp → they Agree (or counter-propose) → only then can you send it to the cook.
- **Plan** the week, auto-build a **shopping list** from planned ingredients, and see
  a **This-week** log of what got made each day with rough nutrition.
- **Dishes** — add/edit, veg/non-veg, meal-times, cook rating, "who likes it";
  library auto-fills nutrition for known dishes; search + "decide for me".
- **PWA** — installable to the phone home screen, works offline (app shell).

## Stack
- **Backend:** a single ~350-line Node.js file, **zero npm dependencies** (only Node
  built-ins). Plain HTTP server + a JSON-file store.
- **Frontend:** one `index.html` — vanilla JS, no framework/build step.
- **Hosting:** Railway, with a **persistent volume** (`/var/data`) so data survives
  redeploys. HTTPS via the platform. Deploys from GitHub `main`.
- **Data:** one `data.json` per deployment (all rooms).

## Deliberate v1 scope (household tool, not a SaaS)
These are conscious tradeoffs for a family-sized tool, not oversights:
- **Access control = the room code / invite link.** No accounts or passwords; anyone
  with the link has full read/write to that room. Identity ("who am I") is a per-device
  choice, and "joined" status is informational, not verified.
- **Storage is a single JSON file**, read-modified-rewritten per request. Simple and
  dependency-free; not built for high concurrency.

## Known limitations (v2 candidates)
- **AuthN/AuthZ** — add real accounts + per-room membership if it goes beyond trusted
  households.
- **Concurrency** — current writes are last-write-wins on the whole file; move to a
  real datastore (SQLite/Postgres) for safe concurrent writes and scale.
- **Backups** — data lives on one volume; there's an in-app "download backup," but no
  automated off-site backup yet.
- **Tests** — no automated test suite yet (validated manually + syntax/boot checks).

## Hardening already in place
- Request body capped at 256 KB; bounded collection sizes (members/dishes/plan) and
  clamped string lengths, so a client can't bloat or OOM the store.
- Static file serving is path-traversal guarded; `/api` is never cached by the
  service worker.

## Roughly what v2 would take
Accounts + a real database (SQLite to start) + automated backups + a test suite. The
product surface stays the same; the change is the storage/auth layer underneath.
