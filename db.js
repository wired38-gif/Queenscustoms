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
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

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

  saveDB();

  // ── Seed admin ──────────────────────────────────────────────────────────────
  const adminRows = db.exec("SELECT id FROM customers WHERE email = 'wired4365@aol.com'");
  if (!adminRows.length || !adminRows[0].values.length) {
    const hash = bcrypt.hashSync('74Slimjim!', 10);
    db.run(
      "INSERT INTO customers (name, email, password, role) VALUES (?, ?, ?, ?)",
      ['The Vibe Queen', 'wired4365@aol.com', hash, 'admin']
    );
    saveDB();
    console.log('Admin account seeded');
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
