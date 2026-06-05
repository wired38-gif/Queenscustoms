/**
 * Queens Custom Creations — Express Server
 * Serves static site + REST API + Admin portal
 */

require('dotenv').config();
const express    = require('express');
const path       = require('path');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const { db, generateOrderNum } = require('./db');
const { notifyNewOrder }       = require('./notify');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'queens-custom-creations-secret-2026';

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (main site)
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
}));

// Redirect HTTP → HTTPS (GoDaddy sets X-Forwarded-Proto)
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }
  next();
});

// ── Auth Helpers ──────────────────────────────────────────────────────────────

function signToken(customer) {
  return jwt.sign(
    { id: customer.id, email: customer.email, role: customer.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// ── Auth API ──────────────────────────────────────────────────────────────────

// POST /api/auth/signup
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO customers (name, email, phone, password) VALUES (?, ?, ?, ?)'
  ).run(name, email.toLowerCase(), phone || null, hash);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(customer);
  res.json({ token, user: { id: customer.id, name: customer.name, email: customer.email, role: customer.role } });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(email.toLowerCase());
  if (!customer) return res.status(401).json({ error: 'No account found with that email' });
  if (!bcrypt.compareSync(password, customer.password)) return res.status(401).json({ error: 'Incorrect password' });

  const token = signToken(customer);
  res.json({ token, user: { id: customer.id, name: customer.name, email: customer.email, role: customer.role } });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const customer = db.prepare('SELECT id, name, email, phone, role, created_at FROM customers WHERE id = ?').get(req.user.id);
  res.json(customer);
});

// ── Orders API ────────────────────────────────────────────────────────────────

// POST /api/orders — place a new order (guest or logged-in)
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_email, customer_phone, items, subtotal, discount, total, coupon, notes } = req.body;
  if (!customer_name || !customer_email || !items || !total) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  const order_num = generateOrderNum();
  const itemsJson = JSON.stringify(items);

  // Try to find existing customer
  let customer_id = null;
  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(customer_email.toLowerCase());
  if (existing) customer_id = existing.id;

  const result = db.prepare(`
    INSERT INTO orders (order_num, customer_id, customer_name, customer_email, customer_phone, items, subtotal, discount, total, coupon, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(order_num, customer_id, customer_name, customer_email, customer_phone || null, itemsJson,
    subtotal || total, discount || 0, total, coupon || null, notes || null);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

  // Fire-and-forget notifications
  notifyNewOrder(order).catch(err => console.error('[order] notify error:', err));

  res.status(201).json({ success: true, order_num, order_id: order.id });
});

// GET /api/orders/my — customer's own orders
app.get('/api/orders/my', authMiddleware, (req, res) => {
  const orders = db.prepare(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

// ── PayPal Integration ────────────────────────────────────────────────────────

const PAYPAL_CLIENT_ID     = process.env.PAYPAL_CLIENT_ID     || 'YOUR_PAYPAL_CLIENT_ID';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'YOUR_PAYPAL_CLIENT_SECRET';
const PAYPAL_BASE          = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalToken() {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await r.json();
  return data.access_token;
}

// POST /api/paypal/create-order
app.post('/api/paypal/create-order', async (req, res) => {
  const { total, order_id } = req.body;
  try {
    const token = await getPayPalToken();
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: order_id,
          amount: { currency_code: 'USD', value: parseFloat(total).toFixed(2) },
          description: 'Queens Custom Creations — Custom Tumbler Order',
          payee: { email_address: 'wired4365@aol.com' },
        }],
        application_context: {
          brand_name: 'Queens Custom Creations',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: 'https://queenscustoms.shop/order-success',
          cancel_url: 'https://queenscustoms.shop/order-cancel',
        },
      }),
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('[paypal] create-order error:', err);
    res.status(500).json({ error: 'PayPal error' });
  }
});

// POST /api/paypal/capture-order
app.post('/api/paypal/capture-order', async (req, res) => {
  const { paypal_order_id, our_order_id } = req.body;
  try {
    const token = await getPayPalToken();
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await r.json();

    if (data.status === 'COMPLETED') {
      const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      // Update order payment status
      db.prepare(`
        UPDATE orders SET payment_status = 'paid', paypal_order_id = ?, paypal_capture_id = ?, status = 'confirmed', updated_at = datetime('now')
        WHERE id = ?
      `).run(paypal_order_id, captureId, our_order_id);

      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(our_order_id);
      if (order) notifyNewOrder(order).catch(() => {});
    }

    res.json(data);
  } catch (err) {
    console.error('[paypal] capture error:', err);
    res.status(500).json({ error: 'PayPal capture error' });
  }
});

// ── Admin API ─────────────────────────────────────────────────────────────────

// GET /api/admin/orders
app.get('/api/admin/orders', adminMiddleware, (req, res) => {
  const { status, search, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status && status !== 'all') { query += ' AND status = ?'; params.push(status); }
  if (search) {
    query += ' AND (customer_name LIKE ? OR customer_email LIKE ? OR order_num LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const orders  = db.prepare(query).all(...params);
  const total   = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get().cnt;
  const revenue = db.prepare("SELECT SUM(total) as sum FROM orders WHERE payment_status = 'paid'").get().sum || 0;

  res.json({
    orders: orders.map(o => ({ ...o, items: JSON.parse(o.items) })),
    meta: { total, pending, revenue: revenue.toFixed(2) },
  });
});

// GET /api/admin/orders/:id
app.get('/api/admin/orders/:id', adminMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ ...order, items: JSON.parse(order.items) });
});

// PATCH /api/admin/orders/:id/status
app.patch('/api/admin/orders/:id/status', adminMiddleware, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'in_progress', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, req.params.id);
  res.json({ success: true });
});

// GET /api/admin/customers
app.get('/api/admin/customers', adminMiddleware, (req, res) => {
  const customers = db.prepare(
    "SELECT id, name, email, phone, role, created_at FROM customers ORDER BY created_at DESC"
  ).all();
  res.json(customers);
});

// GET /api/admin/stats
app.get('/api/admin/stats', adminMiddleware, (req, res) => {
  const totalOrders   = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
  const paidOrders    = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE payment_status = 'paid'").get().cnt;
  const pendingOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get().cnt;
  const revenue       = db.prepare("SELECT SUM(total) as sum FROM orders WHERE payment_status = 'paid'").get().sum || 0;
  const customers     = db.prepare('SELECT COUNT(*) as cnt FROM customers WHERE role = ?').get('customer').cnt;
  const recentOrders  = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();

  res.json({
    totalOrders, paidOrders, pendingOrders, customers,
    revenue: parseFloat(revenue).toFixed(2),
    recentOrders: recentOrders.map(o => ({ ...o, items: JSON.parse(o.items) })),
  });
});

// ── Config endpoint (expose PayPal client ID to frontend) ─────────────────────
app.get('/api/config', (req, res) => {
  res.json({ paypalClientId: PAYPAL_CLIENT_ID });
});

// ── Static page routes ────────────────────────────────────────────────────────
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'shop/index.html')));
app.get('/shop/', (req, res) => res.sendFile(path.join(__dirname, 'shop/index.html')));
app.get('/order-success', (req, res) => res.sendFile(path.join(__dirname, 'order-success.html')));
app.get('/order-cancel', (req, res) => res.sendFile(path.join(__dirname, 'order-cancel.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin/index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'admin/index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Queens Custom Creations server running on port ${PORT}`);
});
