/**
 * Queens Custom Creations — SQLite Database
 * All orders, customers, and products live here.
 * File: data.db (GoDaddy persists this across deploys)
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    phone       TEXT,
    password    TEXT NOT NULL,
    role        TEXT DEFAULT 'customer',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_num     TEXT UNIQUE NOT NULL,
    customer_id   INTEGER REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    items         TEXT NOT NULL,
    subtotal      REAL NOT NULL,
    discount      REAL DEFAULT 0,
    shipping      REAL DEFAULT 0,
    total         REAL NOT NULL,
    coupon        TEXT,
    notes         TEXT,
    status        TEXT DEFAULT 'pending',
    paypal_order_id TEXT,
    paypal_capture_id TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    price       REAL NOT NULL,
    category    TEXT,
    image       TEXT,
    stock       INTEGER DEFAULT 1,
    active      INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// ── Seed admin account ────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');

const adminExists = db.prepare('SELECT id FROM customers WHERE email = ?').get('wired4365@aol.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('74Slimjim!', 10);
  db.prepare(`
    INSERT INTO customers (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `).run('The Vibe Queen', 'wired4365@aol.com', hash, 'admin');
  console.log('Admin account seeded');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateOrderNum() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `QCC-${ts}-${rand}`;
}

module.exports = { db, generateOrderNum };
