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

// diet: 'veg' | 'nonveg' (egg is treated as non-veg here)
// mealTimes: which meals a dish suits — subset of ['breakfast','lunch','dinner']
const SEED_DISHES = [
  { name: 'Aloo Paratha', category: 'paratha', diet: 'veg', mealTimes: ['breakfast', 'dinner'], cookRating: 'great', ingredients: ['potato', 'wheat flour'], nutrition: { kcal: 260, protein: 6, carbs: 40, fat: 9, fiber: 4 } },
  { name: 'Gobi Paratha', category: 'paratha', diet: 'veg', mealTimes: ['breakfast', 'dinner'], cookRating: 'okay', ingredients: ['cauliflower', 'wheat flour'], nutrition: { kcal: 240, protein: 6, carbs: 36, fat: 8, fiber: 5 } },
  { name: 'Sattu Paratha', category: 'paratha', diet: 'veg', mealTimes: ['breakfast', 'dinner'], cookRating: 'unknown', ingredients: ['sattu', 'wheat flour'], nutrition: { kcal: 290, protein: 10, carbs: 38, fat: 10, fiber: 6 } },
  { name: 'Chana Masala', category: 'curry', diet: 'veg', mealTimes: ['lunch', 'dinner'], cookRating: 'great', ingredients: ['chickpeas', 'onion', 'tomato'], nutrition: { kcal: 280, protein: 12, carbs: 38, fat: 9, fiber: 10 } },
  { name: 'Paneer Butter Masala', category: 'paneer', diet: 'veg', mealTimes: ['lunch', 'dinner'], cookRating: 'great', ingredients: ['paneer', 'butter', 'tomato'], nutrition: { kcal: 400, protein: 14, carbs: 14, fat: 30, fiber: 2 } },
  { name: 'Paneer Chilli', category: 'paneer', diet: 'veg', mealTimes: ['lunch', 'dinner'], cookRating: 'okay', ingredients: ['paneer', 'capsicum'], nutrition: { kcal: 320, protein: 16, carbs: 18, fat: 20, fiber: 3 } },
  { name: 'Paneer Tikka Masala', category: 'paneer', diet: 'veg', mealTimes: ['lunch', 'dinner'], cookRating: 'unknown', ingredients: ['paneer', 'capsicum', 'onion'], nutrition: { kcal: 350, protein: 16, carbs: 16, fat: 24, fiber: 3 } },
  { name: 'Mushroom Masala', category: 'curry', diet: 'veg', mealTimes: ['lunch', 'dinner'], cookRating: 'okay', ingredients: ['mushroom', 'onion', 'tomato'], nutrition: { kcal: 180, protein: 6, carbs: 14, fat: 11, fiber: 3 } },
  { name: 'Chicken Curry', category: 'curry', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], cookRating: 'great', ingredients: ['chicken', 'onion', 'tomato'], nutrition: { kcal: 330, protein: 28, carbs: 10, fat: 20, fiber: 2 } },
  { name: 'Egg Curry', category: 'egg', diet: 'nonveg', mealTimes: ['breakfast', 'lunch', 'dinner'], cookRating: 'great', ingredients: ['egg', 'onion', 'tomato'], nutrition: { kcal: 260, protein: 16, carbs: 10, fat: 18, fiber: 2 } },
  { name: 'Egg Biryani', category: 'egg', diet: 'nonveg', mealTimes: ['lunch', 'dinner'], cookRating: 'unknown', ingredients: ['egg', 'rice', 'spices'], nutrition: { kcal: 420, protein: 14, carbs: 60, fat: 14, fiber: 2 } },
  // common breakfast / tiffin items
  { name: 'Poha', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], cookRating: 'great', ingredients: ['flattened rice', 'onion', 'peanuts'], nutrition: { kcal: 250, protein: 5, carbs: 45, fat: 6, fiber: 3 } },
  { name: 'Upma', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], cookRating: 'great', ingredients: ['semolina', 'onion'], nutrition: { kcal: 270, protein: 6, carbs: 40, fat: 9, fiber: 3 } },
  { name: 'Vermicelli Upma', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], cookRating: 'great', ingredients: ['vermicelli', 'vegetables'], nutrition: { kcal: 260, protein: 5, carbs: 42, fat: 8, fiber: 2 } },
  { name: 'Bread Omelette', category: 'egg', diet: 'nonveg', mealTimes: ['breakfast'], cookRating: 'great', ingredients: ['egg', 'bread', 'onion'], nutrition: { kcal: 320, protein: 14, carbs: 28, fat: 17, fiber: 2 } },
  { name: 'Dosa', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast', 'dinner'], cookRating: 'great', ingredients: ['rice', 'urad dal'], nutrition: { kcal: 250, protein: 6, carbs: 40, fat: 7, fiber: 2 } },
  { name: 'Idli', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast', 'dinner'], cookRating: 'great', ingredients: ['rice', 'urad dal'], nutrition: { kcal: 180, protein: 6, carbs: 36, fat: 1, fiber: 2 } },
  { name: 'Moong Dal Chilla', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast', 'dinner'], cookRating: 'great', ingredients: ['moong dal', 'onion'], nutrition: { kcal: 220, protein: 12, carbs: 28, fat: 6, fiber: 5 } },
  { name: 'Cheese Sandwich', category: 'breakfast', diet: 'veg', mealTimes: ['breakfast'], cookRating: 'great', ingredients: ['bread', 'cheese'], nutrition: { kcal: 350, protein: 12, carbs: 38, fat: 17, fiber: 3 } },
];

// A person's meal schedule — who is normally home for which meal.
// Defaults to present for all meals unless a meal is explicitly false.
function normalizeMeals(m) {
  m = m || {};
  return { breakfast: m.breakfast !== false, lunch: m.lunch !== false, dinner: m.dinner !== false };
}

function createRoom(db) {
  let code;
  do { code = newRoomCode(); } while (db.rooms[code]);
  db.rooms[code] = {
    code,
    createdAt: new Date().toISOString(),
    cookLanguage: '',
    cookPhone: '', // didi's WhatsApp number (digits only, incl. country code)
    people: [{ id: newId(), name: 'Me', meals: normalizeMeals() }],
    dishes: SEED_DISHES.map(d => ({
      id: newId(),
      name: d.name,
      category: d.category,
      diet: d.diet,             // 'veg' | 'nonveg'
      mealTimes: d.mealTimes,   // which meals this dish suits
      cookRating: d.cookRating,
      likedBy: [],
      ingredients: d.ingredients,
      nutrition: d.nutrition, // approximate, per serving — informational only
      timesMade: 0,
      lastMade: null,
    })),
    plan: [], // saved meal requests: { id, date, meal, dishId, dishName, createdAt }
  };
  saveDB(db);
  return db.rooms[code];
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

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
      const room = createRoom(db);
      return sendJSON(res, 200, room);
    }

    // GET /api/room/:code -> fetch room
    if (req.method === 'GET' && parts.length === 3 && parts[1] === 'room') {
      const room = db.rooms[parts[2]];
      if (!room) return sendJSON(res, 404, { error: 'Room not found. Check the code.' });
      return sendJSON(res, 200, room);
    }

    // room-scoped routes need a valid room
    if (parts[1] === 'room' && parts.length >= 3) {
      const room = db.rooms[parts[2]];
      if (!room) return sendJSON(res, 404, { error: 'Room not found. Check the code.' });

      // PUT /api/room/:code -> update room-level settings (e.g. cookLanguage)
      if (req.method === 'PUT' && parts.length === 3) {
        const body = await readBody(req);
        if (typeof body.cookLanguage === 'string') room.cookLanguage = body.cookLanguage;
        if (typeof body.cookPhone === 'string') room.cookPhone = body.cookPhone.replace(/\D/g, ''); // digits only, wa.me-ready
        saveDB(db);
        return sendJSON(res, 200, room);
      }

      // ---- people ----
      if (parts[3] === 'people') {
        if (req.method === 'POST' && parts.length === 4) {
          const body = await readBody(req);
          const name = (body.name || '').trim();
          if (!name) return sendJSON(res, 400, { error: 'Name required' });
          const person = { id: newId(), name, meals: normalizeMeals(body.meals) };
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
          const body = await readBody(req);
          if (!body.name) return sendJSON(res, 400, { error: 'Dish name required' });
          const dish = {
            id: newId(),
            name: body.name,
            category: body.category || 'other',
            diet: body.diet === 'nonveg' ? 'nonveg' : 'veg',
            mealTimes: Array.isArray(body.mealTimes) ? body.mealTimes : [],
            cookRating: body.cookRating || 'unknown',
            likedBy: body.likedBy || [],
            ingredients: body.ingredients || [],
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
          const body = await readBody(req);
          const dish = room.dishes.find(d => d.id === body.dishId);
          if (!dish) return sendJSON(res, 404, { error: 'Dish not found' });
          const meal = ['breakfast', 'lunch', 'dinner'].includes(body.meal) ? body.meal : 'dinner';
          const date = (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date))
            ? body.date : new Date().toISOString().slice(0, 10);
          // dedupe: one request per (date, meal, dish)
          let entry = room.plan.find(p => p.date === date && p.meal === meal && p.dishId === dish.id);
          if (!entry) {
            entry = { id: newId(), date, meal, dishId: dish.id, dishName: dish.name, createdAt: new Date().toISOString() };
            room.plan.push(entry);
            saveDB(db);
          }
          return sendJSON(res, 200, entry);
        }
        if (req.method === 'DELETE' && parts.length === 5) {
          room.plan = room.plan.filter(p => p.id !== parts[4]);
          saveDB(db);
          return sendJSON(res, 200, { ok: true });
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
