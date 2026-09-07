# Deploying Aaj Kya Bane to a free cloud host

The app is a single Node.js server with **zero dependencies**. Its entire
database is the file `data.json`. The only real trick to hosting is keeping
that file on **persistent storage** so rooms don't disappear on restart.

The code reads `process.env.PORT` (the host sets it) and stores data at
`DATA_DIR/data.json` — point `DATA_DIR` at a mounted disk and data survives.

---

## Step 1 — Put the code on GitHub (once)

From this folder (`aajkyabane/`):

```bash
git init
git add .
git commit -m "Aaj Kya Bane v1"
```

Create an empty repo on github.com (no README/license), then:

```bash
git remote add origin https://github.com/<your-username>/aaj-kya-bane.git
git branch -M main
git push -u origin main
```

`data.json` is gitignored, so your local test data stays on your machine.

---

## Step 2 — Deploy on Render (recommended)

1. Sign up at **render.com** (free) and connect your GitHub account.
2. **New +** → **Web Service** → pick the `aaj-kya-bane` repo.
3. Settings:
   - **Runtime:** Node
   - **Build Command:** *(leave blank)*
   - **Start Command:** `node server.js`
   - **Instance type:** Free (for a trial) — see the disk note below.
4. Create the service. Render builds and gives you a URL like
   `https://aaj-kya-bane.onrender.com` — that (with `https`) is what you share.

### Keeping data safe (important)
Render's **Free** instances use a temporary disk: `data.json` resets whenever
the service redeploys or wakes from sleep — fine for trying it out, **not** for
real use. To keep rooms permanently:

- Upgrade the service to a paid instance and add a **Disk**:
  - **Mount path:** `/var/data`  ·  **Size:** 1 GB
- Add an environment variable: **`DATA_DIR` = `/var/data`**

(Or just deploy the included `render.yaml` as a **Blueprint**, which sets the
disk + env var for you.)

Also note: free services **sleep after ~15 min idle** and take ~30s to wake on
the next visit. A paid instance stays always-on.

---

## Alternative — Railway

Railway's trial includes **Volumes**, which give persistence more easily:

1. Sign up at **railway.app**, **New Project** → **Deploy from GitHub repo**.
2. It auto-detects Node and runs `npm start` (= `node server.js`).
3. Add a **Volume**, mount it at `/var/data`.
4. Add a variable **`DATA_DIR` = `/var/data`**.
5. Under **Settings → Networking**, generate a public domain to share.

Check current free-tier/pricing details on either platform before relying on it
for the long term — plans change.

---

## Step 3 — Share it

Send people the `https://…` URL. On the home screen they either **create a
room** (gets a 6-character code) or **join** with a code you share. The room
code is the only access control, so don't post codes publicly.

On phones: open the URL, then use the browser's **Add to Home Screen** so it
behaves like an app icon.

## Updating later
Push changes to GitHub; Render/Railway auto-redeploy. Because `data.json` lives
on the mounted disk (not in the repo), existing rooms are untouched by deploys.
