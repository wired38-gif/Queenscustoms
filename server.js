/**
 * Queens Custom Creations — Express Server
 * Serves static site + REST API + Admin portal
 */

require('dotenv').config();
const express  = require('express');
const path     = require('path');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const { initDB, queryAll, queryOne, run, generateOrderNum } = require('./db');
const { notifyNewOrder } = require('./notify');
const oauth = require('./oauth');
const setupCoach = require('./setupCoach');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'queens-custom-creations-secret-2026';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname), { index: 'index.html', extensions: ['html'] }));

// HTTP → HTTPS redirect
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

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const existing = queryOne('SELECT id FROM customers WHERE email = ?', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const hash = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO customers (name, email, phone, password) VALUES (?, ?, ?, ?)',
    [name, email.toLowerCase(), phone || null, hash]);
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
  res.json({ token: signToken(customer), user: { id: customer.id, name: customer.name, email: customer.email, role: customer.role } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const customer = queryOne('SELECT * FROM customers WHERE email = ?', [email.toLowerCase()]);
  if (!customer) return res.status(401).json({ error: 'No account found with that email' });
  if (!bcrypt.compareSync(password, customer.password)) return res.status(401).json({ error: 'Incorrect password' });
  res.json({ token: signToken(customer), user: { id: customer.id, name: customer.name, email: customer.email, role: customer.role } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const customer = queryOne('SELECT id, name, email, phone, role, created_at FROM customers WHERE id = ?', [req.user.id]);
  res.json(customer);
});

// Public: which social login buttons to show
app.get('/api/auth/providers', (req, res) => {
  res.json(oauth.publicProviders());
});

function redirectAuthError(res, message) {
  const q = encodeURIComponent(message || 'Sign-in failed');
  return res.redirect(`/?auth_error=${q}`);
}

function finishSocialLogin(res, profile) {
  const customer = oauth.upsertOAuthCustomer(profile, bcrypt);
  const token = signToken(customer);
  return res.redirect(`/?auth_token=${encodeURIComponent(token)}&auth_name=${encodeURIComponent(customer.name || '')}`);
}

// Google OAuth
app.get('/api/auth/google', (req, res) => {
  try {
    const cfg = oauth.socialConfig('google');
    if (!cfg.enabled || !cfg.clientId || !cfg.clientSecret) {
      return redirectAuthError(res, 'Google Sign-In is not configured yet. Add it in Admin → Setup → Logins.');
    }
    const state = oauth.makeState({ provider: 'google' });
    res.redirect(oauth.googleAuthUrl(state));
  } catch (e) {
    redirectAuthError(res, e.message);
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    if (req.query.error) return redirectAuthError(res, req.query.error);
    oauth.readState(req.query.state);
    const profile = await oauth.exchangeGoogle(req.query.code);
    finishSocialLogin(res, profile);
  } catch (e) {
    console.error('[oauth/google]', e.message);
    redirectAuthError(res, e.message);
  }
});

// Facebook OAuth
app.get('/api/auth/facebook', (req, res) => {
  try {
    const cfg = oauth.socialConfig('facebook');
    if (!cfg.enabled || !cfg.clientId || !cfg.clientSecret) {
      return redirectAuthError(res, 'Facebook Sign-In is not configured yet. Add it in Admin → Setup → Logins.');
    }
    const state = oauth.makeState({ provider: 'facebook' });
    res.redirect(oauth.facebookAuthUrl(state));
  } catch (e) {
    redirectAuthError(res, e.message);
  }
});

app.get('/api/auth/facebook/callback', async (req, res) => {
  try {
    if (req.query.error) return redirectAuthError(res, req.query.error_description || req.query.error);
    oauth.readState(req.query.state);
    const profile = await oauth.exchangeFacebook(req.query.code);
    finishSocialLogin(res, profile);
  } catch (e) {
    console.error('[oauth/facebook]', e.message);
    redirectAuthError(res, e.message);
  }
});

// Apple Sign In (form_post callback)
app.get('/api/auth/apple', (req, res) => {
  try {
    const cfg = oauth.socialConfig('apple');
    if (!cfg.enabled || !cfg.clientId) {
      return redirectAuthError(res, 'Apple Sign-In is not configured yet. Add it in Admin → Setup → Logins.');
    }
    const state = oauth.makeState({ provider: 'apple' });
    res.redirect(oauth.appleAuthUrl(state));
  } catch (e) {
    redirectAuthError(res, e.message);
  }
});

app.post('/api/auth/apple/callback', async (req, res) => {
  try {
    if (req.body.error) return redirectAuthError(res, req.body.error);
    oauth.readState(req.body.state);
    const profile = await oauth.exchangeApple(req.body.code);
    if (req.body.user) {
      try {
        const u = JSON.parse(req.body.user);
        const full = [u.name && u.name.firstName, u.name && u.name.lastName].filter(Boolean).join(' ');
        if (full) profile.name = full;
      } catch (_) { /* ignore */ }
    }
    finishSocialLogin(res, profile);
  } catch (e) {
    console.error('[oauth/apple]', e.message);
    redirectAuthError(res, e.message);
  }
});

// ── Orders API ────────────────────────────────────────────────────────────────

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_email, customer_phone, items, subtotal, discount, total, coupon, notes } = req.body;
  if (!customer_name || !customer_email || !items || !total) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }
  const order_num  = generateOrderNum();
  const itemsJson  = JSON.stringify(items);
  const existing   = queryOne('SELECT id FROM customers WHERE email = ?', [customer_email.toLowerCase()]);
  const customer_id = existing ? existing.id : null;

  const result = run(
    `INSERT INTO orders (order_num, customer_id, customer_name, customer_email, customer_phone, items, subtotal, discount, total, coupon, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [order_num, customer_id, customer_name, customer_email, customer_phone || null,
     itemsJson, subtotal || total, discount || 0, total, coupon || null, notes || null]
  );

  const order = queryOne('SELECT * FROM orders WHERE id = ?', [result.lastInsertRowid]);
  notifyNewOrder(order).catch(err => console.error('[order] notify error:', err));
  res.status(201).json({ success: true, order_num, order_id: order.id });
});

app.get('/api/orders/my', authMiddleware, (req, res) => {
  const orders = queryAll('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

// ── PayPal ────────────────────────────────────────────────────────────────────

const PAYPAL_CLIENT_ID     = process.env.PAYPAL_CLIENT_ID     || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
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

app.post('/api/paypal/create-order', async (req, res) => {
  const { total, order_id } = req.body;
  try {
    const token = await getPayPalToken();
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ reference_id: String(order_id), amount: { currency_code: 'USD', value: parseFloat(total).toFixed(2) } }],
        application_context: {
          brand_name: 'Queens Custom Creations',
          user_action: 'PAY_NOW',
          return_url: 'https://queenscustoms.shop/order-success',
          cancel_url: 'https://queenscustoms.shop/order-cancel',
        },
      }),
    });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: 'PayPal error' });
  }
});

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
      run(`UPDATE orders SET payment_status='paid', paypal_order_id=?, paypal_capture_id=?, status='confirmed', updated_at=datetime('now') WHERE id=?`,
        [paypal_order_id, captureId, our_order_id]);
      const order = queryOne('SELECT * FROM orders WHERE id = ?', [our_order_id]);
      if (order) notifyNewOrder(order).catch(() => {});
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'PayPal capture error' });
  }
});

// ── Admin API ─────────────────────────────────────────────────────────────────

app.get('/api/admin/orders', adminMiddleware, (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status && status !== 'all') { sql += ' AND status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (customer_name LIKE ? OR customer_email LIKE ? OR order_num LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const orders   = queryAll(sql, params);
  const total    = queryOne('SELECT COUNT(*) as cnt FROM orders')?.cnt || 0;
  const pending  = queryOne("SELECT COUNT(*) as cnt FROM orders WHERE status='pending'")?.cnt || 0;
  const revenue  = queryOne("SELECT SUM(total) as sum FROM orders WHERE payment_status='paid'")?.sum || 0;
  res.json({ orders: orders.map(o => ({ ...o, items: JSON.parse(o.items) })), meta: { total, pending, revenue: parseFloat(revenue).toFixed(2) } });
});

app.get('/api/admin/orders/:id', adminMiddleware, (req, res) => {
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json({ ...order, items: JSON.parse(order.items) });
});

app.patch('/api/admin/orders/:id/status', adminMiddleware, (req, res) => {
  const { status } = req.body;
  const allowed = ['pending','confirmed','in_progress','shipped','delivered','cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  run("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?", [status, req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/customers', adminMiddleware, (req, res) => {
  res.json(queryAll("SELECT id,name,email,phone,role,created_at FROM customers ORDER BY created_at DESC"));
});

app.get('/api/admin/stats', adminMiddleware, (req, res) => {
  const totalOrders   = queryOne('SELECT COUNT(*) as cnt FROM orders')?.cnt || 0;
  const paidOrders    = queryOne("SELECT COUNT(*) as cnt FROM orders WHERE payment_status='paid'")?.cnt || 0;
  const pendingOrders = queryOne("SELECT COUNT(*) as cnt FROM orders WHERE status='pending'")?.cnt || 0;
  const revenue       = queryOne("SELECT SUM(total) as sum FROM orders WHERE payment_status='paid'")?.sum || 0;
  const customers     = queryOne("SELECT COUNT(*) as cnt FROM customers WHERE role='customer'")?.cnt || 0;
  const newInquiries  = queryOne("SELECT COUNT(*) as cnt FROM inquiries WHERE status='new'")?.cnt || 0;
  const activeProducts = queryOne("SELECT COUNT(*) as cnt FROM products WHERE status='active'")?.cnt || 0;
  const recentOrders  = queryAll('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
  res.json({
    totalOrders, paidOrders, pendingOrders, customers, newInquiries, activeProducts,
    revenue: parseFloat(revenue).toFixed(2),
    recentOrders: recentOrders.map(o => ({ ...o, items: JSON.parse(o.items) })),
  });
});

// ── Admin: Inquiries ──────────────────────────────────────────────────────────

app.get('/api/admin/inquiries', adminMiddleware, (req, res) => {
  res.json(queryAll('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 100'));
});

app.put('/api/admin/inquiries/:id', adminMiddleware, (req, res) => {
  const { status, reply } = req.body;
  const existing = queryOne('SELECT id FROM inquiries WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (status) run("UPDATE inquiries SET status=?, updated_at=datetime('now') WHERE id=?", [status, req.params.id]);
  if (reply !== undefined) {
    run("UPDATE inquiries SET reply=?, status='replied', updated_at=datetime('now') WHERE id=?", [reply, req.params.id]);
  }
  res.json(queryOne('SELECT * FROM inquiries WHERE id = ?', [req.params.id]));
});

// Public contact form → inquiries inbox
app.post('/api/inquiries', (req, res) => {
  const { name, email, subject, message, source } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'name, email, and message are required' });
  const result = run(
    'INSERT INTO inquiries (name, email, subject, message, source) VALUES (?, ?, ?, ?, ?)',
    [name, email.toLowerCase(), subject || 'Contact Form', message, source || 'website']
  );
  res.status(201).json({ success: true, id: result.lastInsertRowid, message: 'Message received! The Vibe Queen responds within 24 hours. 👑' });
});

// ── Admin: Products ───────────────────────────────────────────────────────────

app.get('/api/admin/products', adminMiddleware, (req, res) => {
  const products = queryAll('SELECT * FROM products ORDER BY name ASC');
  res.json({
    products,
    stats: {
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      outOfStock: products.filter(p => p.status === 'out_of_stock' || p.inventory === 0).length,
      totalSales: products.reduce((s, p) => s + (p.sales || 0), 0),
    },
  });
});

app.put('/api/admin/products/:id', adminMiddleware, (req, res) => {
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const price = req.body.price !== undefined ? parseFloat(req.body.price) : existing.price;
  const inventory = req.body.inventory !== undefined ? parseInt(req.body.inventory, 10) : existing.inventory;
  let status = req.body.status || existing.status;
  if (inventory === 0) status = 'out_of_stock';
  else if (status === 'out_of_stock' && inventory > 0) status = 'active';
  run("UPDATE products SET price=?, inventory=?, status=?, updated_at=datetime('now') WHERE id=?",
    [price, inventory, status, req.params.id]);
  res.json(queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]));
});

// Public product catalog
app.get('/api/products', (req, res) => {
  const products = queryAll("SELECT id, name, sku, price, inventory, category, description, image, status FROM products WHERE status='active'");
  res.json(products.map(p => ({
    ...p,
    inStock: p.inventory > 0,
    lowStock: p.inventory > 0 && p.inventory <= 3,
  })));
});

// ── Admin: Integrations (Setup Wizard) ────────────────────────────────────────

const SECRET_FIELDS = [
  'apiKey', 'appSecret', 'secretKey', 'clientSecret', 'webhookSecret',
  'mwsToken', 'privateKey', 'accessToken', 'refreshToken',
];

function maskSecrets(obj, depth = 0) {
  if (depth > 4 || typeof obj !== 'object' || obj === null) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_FIELDS.includes(k) && typeof v === 'string' && v.length > 8) {
      out[k] = v.slice(0, 4) + '••••••••' + v.slice(-4);
    } else if (typeof v === 'object' && v !== null) {
      out[k] = maskSecrets(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function mergeSkipMasked(target, source, depth = 0) {
  if (depth > 4) return source;
  const out = { ...target };
  for (const [k, v] of Object.entries(source || {})) {
    if (SECRET_FIELDS.includes(k) && typeof v === 'string' && v.includes('••••••••')) continue;
    if (typeof v === 'object' && v !== null && typeof target[k] === 'object') {
      out[k] = mergeSkipMasked(target[k] || {}, v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

app.get('/api/admin/integrations', adminMiddleware, (req, res) => {
  const row = queryOne('SELECT settings FROM integrations WHERE id = 1');
  const settings = row ? JSON.parse(row.settings) : {};
  res.json(maskSecrets(settings));
});

app.put('/api/admin/integrations', adminMiddleware, (req, res) => {
  const row = queryOne('SELECT settings FROM integrations WHERE id = 1');
  const current = row ? JSON.parse(row.settings) : {};
  const merged = mergeSkipMasked(current, req.body);
  if (row) {
    run("UPDATE integrations SET settings=?, updated_at=datetime('now') WHERE id=1", [JSON.stringify(merged)]);
  } else {
    run('INSERT INTO integrations (id, settings) VALUES (1, ?)', [JSON.stringify(merged)]);
  }
  res.json(maskSecrets(merged));
});

/** After Save: report what's live + optional next browser action (no terminal). */
app.post('/api/admin/integrations/activate', adminMiddleware, async (req, res) => {
  try {
    const row = queryOne('SELECT settings FROM integrations WHERE id = 1');
    const current = row ? JSON.parse(row.settings) : {};
    const payload = Object.assign({}, req.body || {});
    const step = typeof payload._wizardStep === 'number' ? payload._wizardStep : null;
    delete payload._wizardStep;
    const merged = mergeSkipMasked(current, payload);

    merged.setup = Object.assign({}, merged.setup || {}, {
      step: step != null ? step : (merged.setup && merged.setup.step) || 0,
      lastSavedAt: new Date().toISOString(),
      complete: !!(merged.setup && merged.setup.complete),
    });

    if (row) {
      run("UPDATE integrations SET settings=?, updated_at=datetime('now') WHERE id=1", [JSON.stringify(merged)]);
    } else {
      run('INSERT INTO integrations (id, settings) VALUES (1, ?)', [JSON.stringify(merged)]);
    }

    const stripe = merged.stripe || {};
    const social = merged.socialAuth || {};
    const paypal = merged.paypal || {};
    const status = {
      stripeConnected: !!(stripe.connected || stripe.stripeUserId),
      stripeKeysReady: !!(stripe.secretKey && (stripe.publishableKey || stripe.stripeUserId)),
      stripeConnectReady: !!(stripe.connectClientId && stripe.secretKey) && !stripe.stripeUserId,
      paypalReady: !!(paypal.clientId && paypal.clientSecret),
      googleLive: !!(social.google && social.google.enabled && social.google.clientId && social.google.clientSecret),
      appleLive: !!(social.apple && social.apple.enabled && social.apple.clientId && social.apple.teamId && social.apple.keyId && social.apple.privateKey),
      facebookLive: !!(social.facebook && social.facebook.enabled && (social.facebook.appId || social.facebook.clientId) && (social.facebook.appSecret || social.facebook.clientSecret)),
    };

    let nextAction = null;
    // Payments step: automatically hand off to Stripe in the browser after Save
    if (step === 2 && status.stripeConnectReady) {
      try {
        const state = oauth.makeState({ purpose: 'stripe_connect', adminId: req.user.id });
        nextAction = { type: 'redirect', url: oauth.stripeConnectAuthUrl(state), message: 'Opening Stripe so you can approve the connection…' };
      } catch (e) {
        nextAction = { type: 'message', level: 'error', message: e.message };
      }
    }

    const messages = [];
    if (step === 2) {
      if (status.stripeConnected) messages.push('Stripe is connected and ready for checkout.');
      else if (status.stripeKeysReady) messages.push('Stripe API keys saved. Checkout can use these keys.');
      if (status.paypalReady) messages.push('PayPal credentials saved.');
      if (!status.stripeConnected && !status.stripeKeysReady && !status.paypalReady && !status.stripeConnectReady) {
        messages.push('Nothing to activate yet — add at least Stripe or PayPal, then hit Save again.');
      }
    }
    if (step === 3) {
      if (status.googleLive) messages.push('Google Sign-In is now live on your shop login.');
      if (status.appleLive) messages.push('Apple Sign-In is now live on your shop login.');
      if (status.facebookLive) messages.push('Facebook Sign-In is now live on your shop login.');
      if (!status.googleLive && !status.appleLive && !status.facebookLive) {
        messages.push('No social logins enabled yet. Toggle one on, paste your keys, then Save.');
      }
    }

    res.json({
      integrations: maskSecrets(merged),
      status,
      messages,
      nextAction,
    });
  } catch (e) {
    console.error('[integrations/activate]', e);
    res.status(500).json({ error: e.message || 'Activation failed' });
  }
});

app.post('/api/admin/integrations/complete-setup', adminMiddleware, (req, res) => {
  const row = queryOne('SELECT settings FROM integrations WHERE id = 1');
  const current = row ? JSON.parse(row.settings) : {};
  current.setup = Object.assign({}, current.setup || {}, {
    complete: true,
    completedAt: new Date().toISOString(),
    step: 7,
  });
  if (row) {
    run("UPDATE integrations SET settings=?, updated_at=datetime('now') WHERE id=1", [JSON.stringify(current)]);
  } else {
    run('INSERT INTO integrations (id, settings) VALUES (1, ?)', [JSON.stringify(current)]);
  }
  res.json(maskSecrets(current));
});

// ── Admin: Setup Coach (rules + optional OpenAI) ──────────────────────────────
app.get('/api/admin/setup-coach/status', adminMiddleware, (req, res) => {
  res.json(setupCoach.coachStatus());
});

app.post('/api/admin/setup-coach', adminMiddleware, async (req, res) => {
  try {
    const message = req.body && req.body.message;
    const step = req.body && typeof req.body.step === 'number' ? req.body.step : null;
    const context = (req.body && req.body.context) || {};
    const result = await setupCoach.answerSetupCoach(message, { step, context });
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json(result);
  } catch (e) {
    console.error('[setup-coach]', e);
    res.status(500).json({ error: e.message || 'Setup Coach failed' });
  }
});

// Stripe Connect OAuth (Setup → Payments)
app.get('/api/admin/integrations/stripe/connect', adminMiddleware, (req, res) => {
  try {
    const state = oauth.makeState({ purpose: 'stripe_connect', adminId: req.user.id });
    const url = oauth.stripeConnectAuthUrl(state);
    res.json({ url });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/admin/integrations/stripe/callback', async (req, res) => {
  try {
    if (req.query.error) {
      return res.redirect(`/admin/?setup=payments&stripe_error=${encodeURIComponent(req.query.error_description || req.query.error)}`);
    }
    oauth.readState(req.query.state);
    const data = await oauth.exchangeStripeConnect(req.query.code);
    const current = oauth.getIntegrations();
    const stripe = Object.assign({}, current.stripe || {}, {
      stripeUserId: data.stripe_user_id || '',
      publishableKey: data.stripe_publishable_key || (current.stripe && current.stripe.publishableKey) || '',
      connected: true,
      mode: 'connect',
      accessToken: data.access_token || '',
      refreshToken: data.refresh_token || '',
    });
    oauth.patchIntegrations({ stripe });
    res.redirect('/admin/?setup=payments&stripe_connected=1');
  } catch (e) {
    console.error('[stripe/connect]', e.message);
    res.redirect(`/admin/?setup=payments&stripe_error=${encodeURIComponent(e.message)}`);
  }
});

app.post('/api/admin/integrations/stripe/disconnect', adminMiddleware, (req, res) => {
  const current = oauth.getIntegrations();
  const stripe = Object.assign({}, current.stripe || {}, {
    stripeUserId: '',
    connected: !!(current.stripe && current.stripe.publishableKey && current.stripe.secretKey),
    mode: 'keys',
    accessToken: '',
    refreshToken: '',
  });
  const merged = oauth.patchIntegrations({ stripe });
  res.json(maskSecrets(merged));
});

// ── Admin: User management ────────────────────────────────────────────────────

app.get('/api/admin/users', adminMiddleware, (req, res) => {
  res.json(queryAll("SELECT id, name, email, phone, role, created_at FROM customers WHERE role='admin' ORDER BY created_at ASC"));
});

app.post('/api/admin/users', adminMiddleware, (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const existing = queryOne('SELECT id FROM customers WHERE email = ?', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const result = run(
    "INSERT INTO customers (name, email, password, role) VALUES (?, ?, ?, 'admin')",
    [name || email.split('@')[0], email.toLowerCase(), hash]
  );
  res.status(201).json(queryOne('SELECT id, name, email, role, created_at FROM customers WHERE id = ?', [result.lastInsertRowid]));
});

app.put('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const user = queryOne("SELECT * FROM customers WHERE id = ? AND role='admin'", [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Admin user not found' });
  if (req.body.email) {
    const conflict = queryOne('SELECT id FROM customers WHERE email = ? AND id != ?', [req.body.email.toLowerCase(), req.params.id]);
    if (conflict) return res.status(409).json({ error: 'Email already taken' });
    run('UPDATE customers SET email = ? WHERE id = ?', [req.body.email.toLowerCase(), req.params.id]);
  }
  if (req.body.name) run('UPDATE customers SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
  if (req.body.password) {
    if (req.body.password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    run('UPDATE customers SET password = ? WHERE id = ?', [bcrypt.hashSync(req.body.password, 10), req.params.id]);
  }
  res.json(queryOne('SELECT id, name, email, role, created_at FROM customers WHERE id = ?', [req.params.id]));
});

app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const user = queryOne("SELECT id FROM customers WHERE id = ? AND role='admin'", [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Admin user not found' });
  run('DELETE FROM customers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Admin user deleted' });
});

app.get('/api/config', (req, res) => {
  res.json({
    paypalClientId: PAYPAL_CLIENT_ID,
    authProviders: oauth.publicProviders(),
  });
});

// ── Page routes ───────────────────────────────────────────────────────────────
app.get('/shop',          (req, res) => res.sendFile(path.join(__dirname, 'shop/index.html')));
app.get('/shop/',         (req, res) => res.sendFile(path.join(__dirname, 'shop/index.html')));
app.get('/order-success', (req, res) => res.sendFile(path.join(__dirname, 'order-success.html')));
app.get('/order-cancel',  (req, res) => res.sendFile(path.join(__dirname, 'order-cancel.html')));
app.get('/admin',         (req, res) => res.sendFile(path.join(__dirname, 'admin/index.html')));
app.get('/admin/*',       (req, res) => res.sendFile(path.join(__dirname, 'admin/index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Queens Custom Creations server running on ${HOST}:${PORT}`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
