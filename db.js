/**
 * Queens Custom Creations — SQLite Database (sql.js — pure JS, no native build)
 * Persists to data.db file via fs sync.
 */

const path = require('path');
const fs   = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.db');

// ── Load sql.js ───────────────────────────────────────────────────────────────
const initSqlJs = require('sql.js');

let db;
let SQL;

async function initDB() {
  SQL = await initSqlJs();

  // Load existing DB from disk or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Save helper — writes DB to disk after each write
  global.saveDB = function () {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  // ── Schema ──────────────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      phone       TEXT,
      password    TEXT NOT NULL,
      role        TEXT DEFAULT 'customer',
      oauth_provider TEXT,
      oauth_id       TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);
  try { db.run('ALTER TABLE customers ADD COLUMN oauth_provider TEXT'); } catch (_) { /* exists */ }
  try { db.run('ALTER TABLE customers ADD COLUMN oauth_id TEXT'); } catch (_) { /* exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_num       TEXT UNIQUE NOT NULL,
      customer_id     INTEGER,
      customer_name   TEXT NOT NULL,
      customer_email  TEXT NOT NULL,
      customer_phone  TEXT,
      items           TEXT NOT NULL,
      subtotal        REAL NOT NULL,
      discount        REAL DEFAULT 0,
      shipping        REAL DEFAULT 0,
      total           REAL NOT NULL,
      coupon          TEXT,
      notes           TEXT,
      status          TEXT DEFAULT 'pending',
      paypal_order_id TEXT,
      paypal_capture_id TEXT,
      payment_status  TEXT DEFAULT 'unpaid',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      subject     TEXT,
      message     TEXT NOT NULL,
      status      TEXT DEFAULT 'new',
      reply       TEXT DEFAULT '',
      source      TEXT DEFAULT 'website',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      sku         TEXT UNIQUE NOT NULL,
      price       REAL NOT NULL,
      inventory   INTEGER DEFAULT 0,
      category    TEXT DEFAULT 'Tumblers',
      description TEXT DEFAULT '',
      image       TEXT DEFAULT '',
      sales       INTEGER DEFAULT 0,
      status      TEXT DEFAULT 'active',
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS integrations (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      settings    TEXT NOT NULL,
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  saveDB();

  // ── Seed admins ─────────────────────────────────────────────────────────────
  function ensureAdmin(email, name, password) {
    const normalized = String(email).toLowerCase();
    // Collapse any mixed-case duplicates into one lowercase admin row
    const matches = queryAll(
      "SELECT id, email FROM customers WHERE lower(email) = ?",
      [normalized]
    );
    let keepId = null;
    for (const row of matches) {
      if (row.email === normalized && keepId == null) {
        keepId = row.id;
      } else {
        db.run('DELETE FROM customers WHERE id = ?', [row.id]);
      }
    }
    if (keepId == null && matches.length) {
      // All rows were mixed-case — recreate lowercase from the first match id path
      keepId = null;
    }
    if (keepId != null) {
      // Ensure email casing stays lowercase for login lookups
      db.run("UPDATE customers SET email = ?, role = 'admin' WHERE id = ?", [normalized, keepId]);
      saveDB();
      return;
    }
    const hash = bcrypt.hashSync(password, 10);
    db.run(
      "INSERT INTO customers (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, normalized, hash, 'admin']
    );
    saveDB();
    console.log(`Admin seeded: ${normalized}`);
  }
  ensureAdmin('wired4365@aol.com', 'The Vibe Queen', '74Slimjim!');
  ensureAdmin('queenscustoms25@gmail.com', 'Queens Customs Admin', 'Mad!son0306!');
  // Optional extra admin from env (override via ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)
  const seedEmail = process.env.ADMIN_SEED_EMAIL || 'mike@myk.com';
  const seedPass  = process.env.ADMIN_SEED_PASSWORD || '87188718';
  ensureAdmin(seedEmail, 'Master Admin', seedPass);

  // ── Seed products if empty ──────────────────────────────────────────────────
  const prodCount = queryOne('SELECT COUNT(*) as cnt FROM products');
  if (!prodCount || prodCount.cnt === 0) {
    const seedProducts = [
      ['Pink Glitter Queen Tumbler', 'QC-T001', 40, 1, '30oz Quencher', 'Chunky pink & holographic glitter. 30oz Stanley-style.', 47],
      ['Americana Queen Tumbler', 'QC-T002', 40, 3, '30oz Quencher', 'Red, white & blue chunky glitter with patriotic design.', 31],
      ['Gothic Queen Tumbler', 'QC-T003', 40, 1, '30oz Quencher', 'Deep red chunky glitter with gothic arch design.', 22],
      ['Purple Reign Tumbler', 'QC-T004', 40, 4, '30oz Quencher', 'Deep purple with galaxy glitter. Queen energy only.', 38],
      ["Queen's Duo Gift Set", 'QC-G001', 60, 2, 'Gift Sets', 'Two matching custom tumblers — perfect for gifting.', 19],
      ['Vibe Queen Special', 'QC-T005', 40, 1, '30oz Quencher', 'One-of-a-kind custom epoxy pour by The Vibe Queen.', 14],
      ['Glitter Royale Tumbler', 'QC-T006', 40, 5, '30oz Quencher', 'Luxury chunky glitter pour with holographic finish.', 27],
      ['Custom Order Tumbler', 'QC-CUSTOM', 40, 999, 'Custom Orders', 'You pick the colors, theme & vibe. From $40.', 112],
      ['Custom DIY Kit', 'QC-DIY001', 10, 999, 'Digital Products', 'Personalized shopping list + step-by-step guide.', 34],
    ];
    for (const [name, sku, price, inv, cat, desc, sales] of seedProducts) {
      const status = inv === 0 ? 'out_of_stock' : 'active';
      db.run(
        'INSERT INTO products (name, sku, price, inventory, category, description, sales, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, sku, price, inv, cat, desc, sales, status]
      );
    }
    saveDB();
    console.log('Products seeded');
  }

  // ── Seed default integrations row ───────────────────────────────────────────
  const integ = queryOne('SELECT id FROM integrations WHERE id = 1');
  if (!integ) {
    const defaults = {
      etsy: { apiKey: '', shopId: '', connected: false },
      amazon: { sellerId: '', mwsToken: '', connected: false },
      tiktokShop: { appKey: '', appSecret: '', connected: false },
      emailMarketing: { provider: 'mailchimp', apiKey: '', listId: '', connected: false },
      stripe: {
        publishableKey: '', secretKey: '', webhookSecret: '', connectClientId: '',
        stripeUserId: '', connected: false, mode: 'keys',
      },
      paypal: { clientId: '', clientSecret: '', connected: false },
      socialAuth: {
        google: { enabled: false, clientId: '', clientSecret: '' },
        apple: { enabled: false, clientId: '', teamId: '', keyId: '', privateKey: '' },
        facebook: { enabled: false, appId: '', appSecret: '' },
      },
      setup: { complete: false, step: 0, lastSavedAt: null },
    };
    db.run("INSERT INTO integrations (id, settings) VALUES (1, ?)", [JSON.stringify(defaults)]);
    saveDB();
  } else {
    // Ensure newer integration keys exist on older DBs
    const row = queryOne('SELECT settings FROM integrations WHERE id = 1');
    if (row) {
      const s = JSON.parse(row.settings);
      let changed = false;
      if (!s.socialAuth) {
        s.socialAuth = {
          google: { enabled: false, clientId: '', clientSecret: '' },
          apple: { enabled: false, clientId: '', teamId: '', keyId: '', privateKey: '' },
          facebook: { enabled: false, appId: '', appSecret: '' },
        };
        changed = true;
      }
      if (s.stripe && s.stripe.connectClientId === undefined) {
        s.stripe.connectClientId = '';
        s.stripe.stripeUserId = s.stripe.stripeUserId || '';
        s.stripe.mode = s.stripe.mode || 'keys';
        changed = true;
      }
      if (!s.setup) {
        s.setup = { complete: false, step: 0, lastSavedAt: null };
        changed = true;
      }
      if (changed) {
        db.run("UPDATE integrations SET settings=?, updated_at=datetime('now') WHERE id=1", [JSON.stringify(s)]);
        saveDB();
      }
    }
  }

  console.log('Database ready');
  return db;
}

// ── Query helpers (sync-style wrappers) ──────────────────────────────────────

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
  // Get last insert rowid
  const result = queryOne("SELECT last_insert_rowid() as id");
  return { lastInsertRowid: result ? result.id : null };
}

function generateOrderNum() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `QCC-${ts}-${rand}`;
}

module.exports = { initDB, queryAll, queryOne, run, generateOrderNum };
