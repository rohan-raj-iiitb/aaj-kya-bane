// Aaj Kya Bane — self-hosted server
// Zero external dependencies. Just needs Node.js (v16+) installed.
// Run: node server.js
// Data is stored in data.json next to this file.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
// Where the JSON "database" lives. Point DATA_DIR at a mounted persistent disk
// on your host (e.g. /var/data on Render) so rooms survive restarts/redeploys.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// make sure the data directory exists (a fresh disk mount may be empty)
try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); } catch (e) {}

// ---------- tiny JSON file "database" ----------
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { rooms: {} };
  }
}
function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function newId() {
  return crypto.randomBytes(5).toString('hex');
}
function newRoomCode() {
  // short, easy to say/type/share e.g. "PB7K2Q"
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(chars.length)];
  return code;
}

// Cuisine-tagged starter library. A new room is seeded from the cuisines the
// household picks (diet leaning is a filter default, so we seed both veg & non-veg).
const CUISINES = ['north-indian', 'south-indian', 'chinese', 'italian'];
const DISH_LIBRARY = [
  // ---- North Indian ----
  { name: 'Aloo Paratha', cuisine: 'north-indian', category: 'paratha', diet: 'veg', mealTimes: ['breakfast', 'dinner'], ingredients: ['potato', 'wheat flour'], nutrition: { kcal: 260, protein: 6, carbs: 40, fat: 9 } },
  { name: 'Gobi Paratha', cuisine: 'north-indian', category: 'paratha', diet: 'veg', mealTimes: ['breakfast', 'dinner'], ingredients: ['cauliflower', 'wheat flour'], nutrition: { kcal: 240, protein: 6, carbs: 36, fat: 8 } },
  { name: 'Chana Masala', cuisine: 'north-indian', category: 'curry', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['chickpeas', 'onion', 'tomato'], nutrition: { kcal: 280, protein: 12, carbs: 38, fat: 9 } },
  { name: 'Rajma', cuisine: 'north-indian', category: 'curry', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['kidney beans', 'onion', 'tomato'], nutrition: { kcal: 290, protein: 13, carbs: 40, fat: 8 } },
  { name: 'Dal Tadka', cuisine: 'north-indian', category: 'dal', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['toor dal', 'garlic'], nutrition: { kcal: 200, protein: 10, carbs: 28, fat: 6 } },
  { name: 'Dal Makhani', cuisine: 'north-indian', category: 'dal', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['black dal', 'butter', 'cream'], nutrition: { kcal: 330, protein: 12, carbs: 30, fat: 18 } },
  { name: 'Paneer Butter Masala', cuisine: 'north-indian', category: 'paneer', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['paneer', 'butter', 'tomato'], nutrition: { kcal: 400, protein: 14, carbs: 14, fat: 30 } },
  { name: 'Palak Paneer', cuisine: 'north-indian', category: 'paneer', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['paneer', 'spinach'], nutrition: { kcal: 300, protein: 14, carbs: 12, fat: 22 } },
  { name: 'Bhindi Masala', cuisine: 'north-indian', category: 'curry', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['okra', 'onion'], nutrition: { kcal: 180, protein: 4, carbs: 14, fat: 12 } },
  { name: 'Jeera Rice', cuisine: 'north-indian', category: 'rice', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'cumin'], nutrition: { kcal: 280, protein: 5, carbs: 52, fat: 6 } },
  { name: 'Poha', cuisine: 'north-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], ingredients: ['flattened rice', 'onion', 'peanuts'], nutrition: { kcal: 250, protein: 5, carbs: 45, fat: 6 } },
  { name: 'Moong Dal Chilla', cuisine: 'north-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast', 'dinner'], ingredients: ['moong dal', 'onion'], nutrition: { kcal: 220, protein: 12, carbs: 28, fat: 6 } },
  { name: 'Chicken Curry', cuisine: 'north-indian', category: 'curry', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], ingredients: ['chicken', 'onion', 'tomato'], nutrition: { kcal: 330, protein: 28, carbs: 10, fat: 20 } },
  { name: 'Butter Chicken', cuisine: 'north-indian', category: 'curry', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], ingredients: ['chicken', 'butter', 'tomato'], nutrition: { kcal: 420, protein: 27, carbs: 12, fat: 30 } },
  { name: 'Egg Curry', cuisine: 'north-indian', category: 'egg', diet: 'nonveg', mealTimes: ['breakfast', 'lunch', 'dinner'], ingredients: ['egg', 'onion', 'tomato'], nutrition: { kcal: 260, protein: 16, carbs: 10, fat: 18 } },
  { name: 'Chicken Biryani', cuisine: 'north-indian', category: 'rice', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], ingredients: ['chicken', 'rice', 'spices'], nutrition: { kcal: 450, protein: 25, carbs: 55, fat: 15 } },
  // ---- South Indian ----
  { name: 'Plain Dosa', cuisine: 'south-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast', 'dinner'], ingredients: ['rice', 'urad dal'], nutrition: { kcal: 250, protein: 6, carbs: 40, fat: 7 } },
  { name: 'Masala Dosa', cuisine: 'south-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast', 'dinner'], ingredients: ['rice', 'potato'], nutrition: { kcal: 330, protein: 7, carbs: 52, fat: 10 } },
  { name: 'Idli', cuisine: 'south-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast', 'dinner'], ingredients: ['rice', 'urad dal'], nutrition: { kcal: 180, protein: 6, carbs: 36, fat: 1 } },
  { name: 'Uttapam', cuisine: 'south-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], ingredients: ['rice', 'onion'], nutrition: { kcal: 230, protein: 6, carbs: 38, fat: 6 } },
  { name: 'Medu Vada', cuisine: 'south-indian', category: 'snack', diet: 'veg', mealTimes: ['breakfast'], ingredients: ['urad dal'], nutrition: { kcal: 280, protein: 8, carbs: 30, fat: 14 } },
  { name: 'Upma', cuisine: 'south-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], ingredients: ['semolina', 'vegetables'], nutrition: { kcal: 270, protein: 6, carbs: 40, fat: 9 } },
  { name: 'Ven Pongal', cuisine: 'south-indian', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], ingredients: ['rice', 'moong dal'], nutrition: { kcal: 300, protein: 9, carbs: 45, fat: 9 } },
  { name: 'Sambar', cuisine: 'south-indian', category: 'curry', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['toor dal', 'vegetables', 'tamarind'], nutrition: { kcal: 150, protein: 7, carbs: 22, fat: 4 } },
  { name: 'Rasam', cuisine: 'south-indian', category: 'curry', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['tamarind', 'tomato'], nutrition: { kcal: 90, protein: 3, carbs: 14, fat: 2 } },
  { name: 'Curd Rice', cuisine: 'south-indian', category: 'rice', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'curd'], nutrition: { kcal: 250, protein: 7, carbs: 40, fat: 7 } },
  { name: 'Lemon Rice', cuisine: 'south-indian', category: 'rice', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'lemon', 'peanuts'], nutrition: { kcal: 270, protein: 5, carbs: 48, fat: 7 } },
  { name: 'Coconut Rice', cuisine: 'south-indian', category: 'rice', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'coconut'], nutrition: { kcal: 300, protein: 5, carbs: 46, fat: 11 } },
  // ---- Chinese (Indo) ----
  { name: 'Veg Hakka Noodles', cuisine: 'chinese', category: 'noodles', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['noodles', 'vegetables'], nutrition: { kcal: 350, protein: 8, carbs: 55, fat: 11 } },
  { name: 'Chicken Hakka Noodles', cuisine: 'chinese', category: 'noodles', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], ingredients: ['noodles', 'chicken'], nutrition: { kcal: 400, protein: 20, carbs: 52, fat: 13 } },
  { name: 'Schezwan Noodles', cuisine: 'chinese', category: 'noodles', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['noodles', 'schezwan sauce'], nutrition: { kcal: 370, protein: 8, carbs: 56, fat: 13 } },
  { name: 'Veg Fried Rice', cuisine: 'chinese', category: 'rice', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'vegetables'], nutrition: { kcal: 330, protein: 7, carbs: 58, fat: 8 } },
  { name: 'Egg Fried Rice', cuisine: 'chinese', category: 'rice', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'egg'], nutrition: { kcal: 360, protein: 12, carbs: 56, fat: 10 } },
  { name: 'Chilli Paneer', cuisine: 'chinese', category: 'paneer', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['paneer', 'capsicum'], nutrition: { kcal: 320, protein: 16, carbs: 18, fat: 20 } },
  { name: 'Chilli Chicken', cuisine: 'chinese', category: 'curry', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], ingredients: ['chicken', 'capsicum'], nutrition: { kcal: 350, protein: 26, carbs: 16, fat: 20 } },
  { name: 'Gobi Manchurian', cuisine: 'chinese', category: 'snack', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['cauliflower', 'cornflour'], nutrition: { kcal: 300, protein: 6, carbs: 34, fat: 16 } },
  { name: 'Veg Manchurian', cuisine: 'chinese', category: 'snack', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['vegetables', 'cornflour'], nutrition: { kcal: 290, protein: 6, carbs: 32, fat: 15 } },
  { name: 'Spring Rolls', cuisine: 'chinese', category: 'snack', diet: 'veg', mealTimes: ['breakfast', 'dinner'], ingredients: ['vegetables', 'wrapper'], nutrition: { kcal: 250, protein: 5, carbs: 30, fat: 12 } },
  // ---- Italian ----
  { name: 'Red Sauce Pasta', cuisine: 'italian', category: 'pasta', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['pasta', 'tomato'], nutrition: { kcal: 350, protein: 10, carbs: 58, fat: 9 } },
  { name: 'White Sauce Pasta', cuisine: 'italian', category: 'pasta', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['pasta', 'cream', 'cheese'], nutrition: { kcal: 420, protein: 12, carbs: 52, fat: 18 } },
  { name: 'Pesto Pasta', cuisine: 'italian', category: 'pasta', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['pasta', 'basil'], nutrition: { kcal: 400, protein: 11, carbs: 54, fat: 16 } },
  { name: 'Penne Alfredo', cuisine: 'italian', category: 'pasta', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['penne', 'cream'], nutrition: { kcal: 450, protein: 13, carbs: 54, fat: 20 } },
  { name: 'Chicken Pasta', cuisine: 'italian', category: 'pasta', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], ingredients: ['pasta', 'chicken'], nutrition: { kcal: 440, protein: 26, carbs: 50, fat: 16 } },
  { name: 'Margherita Pizza', cuisine: 'italian', category: 'pizza', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['pizza base', 'cheese', 'tomato'], nutrition: { kcal: 480, protein: 18, carbs: 58, fat: 18 } },
  { name: 'Veg Pizza', cuisine: 'italian', category: 'pizza', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['pizza base', 'vegetables', 'cheese'], nutrition: { kcal: 500, protein: 18, carbs: 60, fat: 20 } },
  { name: 'Garlic Bread', cuisine: 'italian', category: 'snack', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['bread', 'garlic', 'butter'], nutrition: { kcal: 330, protein: 8, carbs: 44, fat: 14 } },
  { name: 'Veg Risotto', cuisine: 'italian', category: 'rice', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'parmesan'], nutrition: { kcal: 400, protein: 10, carbs: 56, fat: 15 } },
  { name: 'Mushroom Risotto', cuisine: 'italian', category: 'rice', diet: 'veg', mealTimes: ['lunch', 'dinner'], ingredients: ['rice', 'mushroom'], nutrition: { kcal: 380, protein: 10, carbs: 54, fat: 14 } },
];


// A person's meal schedule — who is normally home for which meal.
// Defaults to present for all meals unless a meal is explicitly false.
function normalizeMeals(m) {
  m = m || {};
  return { breakfast: m.breakfast !== false, lunch: m.lunch !== false, dinner: m.dinner !== false };
}

function createRoom(db, opts = {}) {
  let code;
  do { code = newRoomCode(); } while (db.rooms[code]);
  // seed dishes from the chosen cuisines (default to North Indian if none/skipped)
  const cuisines = Array.isArray(opts.cuisines) ? opts.cuisines.filter(c => CUISINES.includes(c)) : [];
  const seedFrom = cuisines.length ? DISH_LIBRARY.filter(d => cuisines.includes(d.cuisine))
                                   : DISH_LIBRARY.filter(d => d.cuisine === 'north-indian');
  const names = Array.isArray(opts.people) ? opts.people.map(n => clampStr(n, LIMITS.name).trim()).filter(Boolean).slice(0, LIMITS.people) : [];
  const people = (names.length ? names : ['Me']).map((n, i) => ({ id: newId(), name: n, meals: normalizeMeals(), phone: '', joined: i === 0 }));
  db.rooms[code] = {
    code,
    createdAt: new Date().toISOString(),
    householdName: clampStr(opts.householdName, 60).trim(),
    dietPref: ['veg', 'nonveg', 'both'].includes(opts.dietPref) ? opts.dietPref : 'both',
    cuisines,
    cookLanguage: '',
    cookName: '',  // what the household calls the cook (e.g. Didi, Bhaiya, a name)
    cookPhone: '', // cook's WhatsApp number (digits only, incl. country code)
    people,
    dishes: seedFrom.map(d => ({
      id: newId(),
      name: d.name,
      category: d.category,
      diet: d.diet,             // 'veg' | 'nonveg'
      mealTimes: d.mealTimes,   // which meals this dish suits
      cuisine: d.cuisine,
      cookRating: 'unknown',    // fresh household — rate as you go
      likedBy: [],
      ingredients: d.ingredients,
      nutrition: d.nutrition, // approximate, per serving — informational only
      timesMade: 0,
      lastMade: null,
    })),
    plan: [], // saved meal requests: { id, date, meal, dishId, dishName, createdAt }
    bought: [], // shopping items already ticked off (ingredient names, shared)
  };
  saveDB(db);
  return db.rooms[code];
}

// ---------- analytics (aggregates only, no names/numbers) ----------
// "activated" = the household actually did something, not just created & abandoned
function isActivated(r) {
  const madeSum = (r.dishes || []).reduce((a, d) => a + (d.timesMade || 0), 0);
  return !!r.householdName
    || (Array.isArray(r.cuisines) && r.cuisines.length > 0)
    || (r.people || []).length > 1                       // added a member
    || (r.people || []).filter(p => p.joined).length > 1 // someone beyond the auto-joined creator
    || (r.plan || []).length > 0
    || madeSum > 0
    || !!r.cookName || !!r.cookPhone;
}
function computeStats(db) {
  const rooms = Object.values(db.rooms || {});
  const now = Date.now();
  const daysAgo = ms => (now - ms) / 86400000;
  const parse = s => (s ? Date.parse(s) : 0);
  let active7 = 0, active30 = 0, new7 = 0, new30 = 0, activatedRooms = 0;
  let totalMembers = 0, joinedMembers = 0, totalDishes = 0, mealsMade = 0;
  let proposed = 0, agreed = 0, made = 0;
  const cuisines = {}, newRoomsPerDay = {};
  const cohort = []; // rooms created >= 7 days ago: was each active in the last 7 days?
  // what the library offers, and which dishes users added that aren't in it
  const libraryByCuisine = {};
  DISH_LIBRARY.forEach(d => { libraryByCuisine[d.cuisine] = (libraryByCuisine[d.cuisine] || 0) + 1; });
  const libraryNames = new Set(DISH_LIBRARY.map(d => d.name.trim().toLowerCase()));
  const customDishes = {}; // nameLower -> { name, count } (dishes not in the library)
  rooms.forEach(r => {
    const created = parse(r.createdAt);
    const lastActive = parse(r.lastActiveAt) || created;
    if (daysAgo(lastActive) <= 7) active7++;
    if (daysAgo(lastActive) <= 30) active30++;
    if (created && daysAgo(created) <= 7) new7++;
    if (created && daysAgo(created) <= 30) new30++;
    if (created && daysAgo(created) <= 14) {
      const d = new Date(created).toISOString().slice(0, 10);
      newRoomsPerDay[d] = (newRoomsPerDay[d] || 0) + 1;
    }
    if (created && daysAgo(created) >= 7) cohort.push(daysAgo(lastActive) <= 7);
    if (isActivated(r)) activatedRooms++;
    (r.people || []).forEach(p => { totalMembers++; if (p.joined) joinedMembers++; });
    (r.dishes || []).forEach(d => {
      totalDishes++; mealsMade += (d.timesMade || 0);
      const key = (d.name || '').trim().toLowerCase();
      if (key && !libraryNames.has(key)) {
        if (!customDishes[key]) customDishes[key] = { name: (d.name || '').trim(), count: 0 };
        customDishes[key].count++;
      }
    });
    (r.plan || []).forEach(p => { const s = p.status || 'agreed'; if (s === 'made') made++; else if (s === 'agreed') agreed++; else proposed++; });
    (r.cuisines || []).forEach(c => { cuisines[c] = (cuisines[c] || 0) + 1; });
  });
  const weekRetentionPct = cohort.length ? Math.round(100 * cohort.filter(Boolean).length / cohort.length) : null;
  return {
    generatedAt: new Date().toISOString(),
    totalRooms: rooms.length,
    activatedRooms,
    newRoomsLast7: new7, newRoomsLast30: new30,
    activeLast7: active7, activeLast30: active30,
    weekRetentionPct, cohortSize: cohort.length,
    totalMembers, joinedMembers,
    totalDishes, mealsMade,
    plan: { proposed, agreed, made },
    cuisines, newRoomsPerDay,
    library: { total: DISH_LIBRARY.length, byCuisine: libraryByCuisine },
    customDishes: Object.values(customDishes).sort((a, b) => b.count - a.count),
  };
}

// ---------- HTTP helpers ----------
function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const MAX_BODY = 256 * 1024; // 256 KB — plenty for a room; caps memory per request
function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [], size = 0, aborted = false;
    req.on('data', c => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY) { aborted = true; req.destroy(); reject(new Error('Body too large')); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted || chunks.length === 0) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

// clamp helpers so stored data stays bounded
function clampStr(s, n) { return String(s == null ? '' : s).slice(0, n); }
function clampArr(a, n) { return Array.isArray(a) ? a.slice(0, n) : []; }
const LIMITS = { people: 50, dishes: 1000, plan: 3000, ingredients: 40, name: 80 };

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(PUBLIC_DIR, decodeURIComponent(filePath.split('?')[0]));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback -> index.html
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(idx);
      });
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const parts = url.split('/').filter(Boolean); // e.g. ['api','room','ABC123','dishes','id']

  if (parts[0] !== 'api') return serveStatic(req, res);

  const db = loadDB();

  try {
    // POST /api/room  -> create room
    if (req.method === 'POST' && parts.length === 2 && parts[1] === 'room') {
      const body = await readBody(req);
      const room = createRoom(db, body);
      return sendJSON(res, 200, room);
    }

    // GET /api/room/:code -> fetch room
    if (req.method === 'GET' && parts.length === 3 && parts[1] === 'room') {
      const room = db.rooms[parts[2]];
      if (!room) return sendJSON(res, 404, { error: 'Room not found. Check the code.' });
      return sendJSON(res, 200, room);
    }

    // GET /api/stats?key=... -> private aggregate metrics (only if STATS_KEY is set)
    if (req.method === 'GET' && parts.length === 2 && parts[1] === 'stats') {
      if (!process.env.STATS_KEY) return sendJSON(res, 404, { error: 'Not found' });
      const q = new URLSearchParams((req.url.split('?')[1]) || '');
      if (q.get('key') !== process.env.STATS_KEY) return sendJSON(res, 403, { error: 'Forbidden' });
      return sendJSON(res, 200, computeStats(db));
    }

    // admin (same STATS_KEY): list + delete rooms, for cleaning up test data
    if (parts[1] === 'admin') {
      if (!process.env.STATS_KEY) return sendJSON(res, 404, { error: 'Not found' });
      const q = new URLSearchParams((req.url.split('?')[1]) || '');
      if (q.get('key') !== process.env.STATS_KEY) return sendJSON(res, 403, { error: 'Forbidden' });
      if (req.method === 'GET' && parts.length === 3 && parts[2] === 'rooms') {
        const list = Object.values(db.rooms).map(r => ({
          code: r.code, createdAt: r.createdAt, lastActiveAt: r.lastActiveAt || null,
          householdName: r.householdName || '', cuisines: r.cuisines || [],
          members: (r.people || []).length, joined: (r.people || []).filter(p => p.joined).length,
          dishes: (r.dishes || []).length, plan: (r.plan || []).length,
          mealsMade: (r.dishes || []).reduce((a, d) => a + (d.timesMade || 0), 0),
          activated: isActivated(r),
        })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return sendJSON(res, 200, list);
      }
      if (req.method === 'DELETE' && parts.length === 4 && parts[2] === 'room') {
        const code = parts[3];
        if (db.rooms[code]) { delete db.rooms[code]; saveDB(db); return sendJSON(res, 200, { ok: true, deleted: code }); }
        return sendJSON(res, 404, { error: 'Room not found' });
      }
    }

    // room-scoped routes need a valid room
    if (parts[1] === 'room' && parts.length >= 3) {
      const room = db.rooms[parts[2]];
      if (!room) return sendJSON(res, 404, { error: 'Room not found. Check the code.' });
      if (req.method !== 'GET') room.lastActiveAt = new Date().toISOString(); // activity signal for retention

      // PUT /api/room/:code -> update room-level settings (e.g. cookLanguage)
      if (req.method === 'PUT' && parts.length === 3) {
        const body = await readBody(req);
        if (typeof body.cookLanguage === 'string') room.cookLanguage = body.cookLanguage;
        if (typeof body.householdName === 'string') room.householdName = body.householdName.trim();
        if (typeof body.cookName === 'string') room.cookName = body.cookName.trim();
        if (typeof body.cookPhone === 'string') room.cookPhone = body.cookPhone.replace(/\D/g, ''); // digits only, wa.me-ready
        saveDB(db);
        return sendJSON(res, 200, room);
      }

      // ---- people ----
      if (parts[3] === 'people') {
        if (req.method === 'POST' && parts.length === 4) {
          if (room.people.length >= LIMITS.people) return sendJSON(res, 400, { error: 'Too many members in this room' });
          const body = await readBody(req);
          const name = clampStr(body.name, LIMITS.name).trim();
          if (!name) return sendJSON(res, 400, { error: 'Name required' });
          const person = { id: newId(), name, meals: normalizeMeals(body.meals), phone: (body.phone || '').replace(/\D/g, '').slice(0, 20), joined: body.joined === true };
          room.people.push(person);
          saveDB(db);
          return sendJSON(res, 200, person);
        }
        // PUT /api/room/:code/people/:id -> rename / update meal schedule
        if (req.method === 'PUT' && parts.length === 5) {
          const person = room.people.find(p => p.id === parts[4]);
          if (!person) return sendJSON(res, 404, { error: 'Person not found' });
          const body = await readBody(req);
          if (typeof body.name === 'string' && body.name.trim()) person.name = body.name.trim();
          if (body.meals) person.meals = normalizeMeals(body.meals);
          if (typeof body.phone === 'string') person.phone = body.phone.replace(/\D/g, '');
          if (typeof body.joined === 'boolean') person.joined = body.joined;
          saveDB(db);
          return sendJSON(res, 200, person);
        }
        if (req.method === 'DELETE' && parts.length === 5) {
          const pid = parts[4];
          room.people = room.people.filter(p => p.id !== pid);
          room.dishes.forEach(d => { d.likedBy = d.likedBy.filter(id => id !== pid); });
          saveDB(db);
          return sendJSON(res, 200, { ok: true });
        }
      }

      // ---- dishes ----
      if (parts[3] === 'dishes') {
        if (req.method === 'POST' && parts.length === 4) {
          if (room.dishes.length >= LIMITS.dishes) return sendJSON(res, 400, { error: 'Too many dishes in this room' });
          const body = await readBody(req);
          const dishName = clampStr(body.name, LIMITS.name).trim();
          if (!dishName) return sendJSON(res, 400, { error: 'Dish name required' });
          const dish = {
            id: newId(),
            name: dishName,
            category: clampStr(body.category, 20) || 'other',
            diet: body.diet === 'nonveg' ? 'nonveg' : 'veg',
            mealTimes: Array.isArray(body.mealTimes) ? body.mealTimes : [],
            cookRating: body.cookRating || 'unknown',
            likedBy: clampArr(body.likedBy, LIMITS.people),
            ingredients: clampArr(body.ingredients, LIMITS.ingredients).map(i => clampStr(i, 40)),
            nutrition: body.nutrition || null,
            timesMade: 0,
            lastMade: null,
          };
          room.dishes.push(dish);
          saveDB(db);
          return sendJSON(res, 200, dish);
        }
        if (req.method === 'PUT' && parts.length === 5) {
          const dish = room.dishes.find(d => d.id === parts[4]);
          if (!dish) return sendJSON(res, 404, { error: 'Dish not found' });
          const body = await readBody(req);
          if (body.markMadeToday) {
            dish.timesMade = (dish.timesMade || 0) + 1;
            dish.lastMade = new Date().toISOString().slice(0, 10);
          }
          // mark made on a specific past date (catch-up for forgotten meals)
          if (typeof body.markMadeOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.markMadeOn)) {
            dish.timesMade = (dish.timesMade || 0) + 1;
            if (!dish.lastMade || body.markMadeOn > dish.lastMade) dish.lastMade = body.markMadeOn;
          }
          ['name', 'category', 'diet', 'mealTimes', 'cookRating', 'likedBy', 'ingredients', 'nutrition'].forEach(k => {
            if (body[k] !== undefined) dish[k] = body[k];
          });
          saveDB(db);
          return sendJSON(res, 200, dish);
        }
        if (req.method === 'DELETE' && parts.length === 5) {
          room.dishes = room.dishes.filter(d => d.id !== parts[4]);
          saveDB(db);
          return sendJSON(res, 200, { ok: true });
        }
      }

      // ---- plan (saved meal requests, e.g. "make this for lunch tomorrow") ----
      if (parts[3] === 'plan') {
        if (!room.plan) room.plan = [];
        if (req.method === 'POST' && parts.length === 4) {
          if (room.plan.length >= LIMITS.plan) return sendJSON(res, 400, { error: 'Plan is full — clear some old entries' });
          const body = await readBody(req);
          const dish = room.dishes.find(d => d.id === body.dishId);
          if (!dish) return sendJSON(res, 404, { error: 'Dish not found' });
          const meal = ['breakfast', 'lunch', 'dinner'].includes(body.meal) ? body.meal : 'dinner';
          const date = (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date))
            ? body.date : new Date().toISOString().slice(0, 10);
          // dedupe: one request per (date, meal, dish)
          const status = body.status === 'proposed' ? 'proposed' : 'agreed';
          const proposedBy = typeof body.proposedBy === 'string' ? body.proposedBy : null;
          let entry = room.plan.find(p => p.date === date && p.meal === meal && p.dishId === dish.id);
          if (!entry) {
            entry = { id: newId(), date, meal, dishId: dish.id, dishName: dish.name, status, proposedBy, createdAt: new Date().toISOString() };
            room.plan.push(entry);
            saveDB(db);
          }
          return sendJSON(res, 200, entry);
        }
        // PUT /api/room/:code/plan/:id -> update status (e.g. household agreed)
        if (req.method === 'PUT' && parts.length === 5) {
          const entry = room.plan.find(p => p.id === parts[4]);
          if (!entry) return sendJSON(res, 404, { error: 'Plan item not found' });
          const body = await readBody(req);
          if (['proposed', 'agreed', 'made'].includes(body.status)) entry.status = body.status;
          saveDB(db);
          return sendJSON(res, 200, entry);
        }
        if (req.method === 'DELETE' && parts.length === 5) {
          room.plan = room.plan.filter(p => p.id !== parts[4]);
          saveDB(db);
          return sendJSON(res, 200, { ok: true });
        }
      }

      // ---- bought (shopping ticks, shared across the household) ----
      if (parts[3] === 'bought') {
        if (!Array.isArray(room.bought)) room.bought = [];
        if (req.method === 'POST' && parts.length === 4) {
          const body = await readBody(req);
          const item = clampStr(body.item, 60).trim().toLowerCase();
          if (!item) return sendJSON(res, 400, { error: 'item required' });
          if (body.on) { if (!room.bought.includes(item)) room.bought.push(item); }
          else { room.bought = room.bought.filter(i => i !== item); }
          saveDB(db);
          return sendJSON(res, 200, { ok: true, bought: room.bought });
        }
        if (req.method === 'DELETE' && parts.length === 4) {
          room.bought = [];
          saveDB(db);
          return sendJSON(res, 200, { ok: true, bought: [] });
        }
      }
    }

    sendJSON(res, 404, { error: 'Unknown route' });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Aaj Kya Bane running on http://localhost:${PORT}`);
});
