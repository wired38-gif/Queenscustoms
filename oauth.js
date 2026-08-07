/**
 * Queens Custom Creations — OAuth helpers
 * Stripe Connect + Google / Apple / Facebook social login
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { queryOne, run } = require('./db');

const SITE_URL = (process.env.SITE_URL || 'https://queenscustoms.shop').replace(/\/$/, '');

function getIntegrations() {
  const row = queryOne('SELECT settings FROM integrations WHERE id = 1');
  return row ? JSON.parse(row.settings) : {};
}

function saveIntegrations(settings) {
  const row = queryOne('SELECT settings FROM integrations WHERE id = 1');
  if (row) {
    run("UPDATE integrations SET settings=?, updated_at=datetime('now') WHERE id=1", [JSON.stringify(settings)]);
  } else {
    run('INSERT INTO integrations (id, settings) VALUES (1, ?)', [JSON.stringify(settings)]);
  }
  return settings;
}

function patchIntegrations(partial) {
  const current = getIntegrations();
  const merged = deepMerge(current, partial);
  return saveIntegrations(merged);
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof a[k] === 'object') {
      out[k] = deepMerge(a[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function socialConfig(provider) {
  const integ = getIntegrations();
  const social = (integ.socialAuth && integ.socialAuth[provider]) || {};
  if (provider === 'google') {
    return {
      clientId: social.clientId || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: social.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(social.enabled && (social.clientId || process.env.GOOGLE_CLIENT_ID)),
    };
  }
  if (provider === 'apple') {
    return {
      clientId: social.clientId || process.env.APPLE_CLIENT_ID || '',
      teamId: social.teamId || process.env.APPLE_TEAM_ID || '',
      keyId: social.keyId || process.env.APPLE_KEY_ID || '',
      privateKey: (social.privateKey || process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      enabled: !!(social.enabled && (social.clientId || process.env.APPLE_CLIENT_ID)),
    };
  }
  if (provider === 'facebook') {
    return {
      clientId: social.appId || social.clientId || process.env.FACEBOOK_APP_ID || '',
      clientSecret: social.appSecret || social.clientSecret || process.env.FACEBOOK_APP_SECRET || '',
      enabled: !!(social.enabled && (social.appId || social.clientId || process.env.FACEBOOK_APP_ID)),
    };
  }
  return { enabled: false };
}

function stripeConnectConfig() {
  const integ = getIntegrations();
  const stripe = integ.stripe || {};
  return {
    clientId: stripe.connectClientId || process.env.STRIPE_CONNECT_CLIENT_ID || '',
    secretKey: stripe.secretKey || process.env.STRIPE_SECRET_KEY || '',
    connected: !!(stripe.connected || stripe.stripeUserId),
    stripeUserId: stripe.stripeUserId || '',
  };
}

function publicProviders() {
  return {
    google: socialConfig('google').enabled,
    apple: socialConfig('apple').enabled,
    facebook: socialConfig('facebook').enabled,
  };
}

function makeState(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'queens-custom-creations-secret-2026', { expiresIn: '15m' });
}

function readState(state) {
  return jwt.verify(state, process.env.JWT_SECRET || 'queens-custom-creations-secret-2026');
}

function appleClientSecret(cfg) {
  if (!cfg.privateKey || !cfg.teamId || !cfg.keyId || !cfg.clientId) {
    throw new Error('Apple Sign In is missing Team ID, Key ID, Services ID, or private key (.p8)');
  }
  return jwt.sign({}, cfg.privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d',
    audience: 'https://appleid.apple.com',
    issuer: cfg.teamId,
    subject: cfg.clientId,
    keyid: cfg.keyId,
  });
}

async function exchangeGoogle(code) {
  const cfg = socialConfig('google');
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: `${SITE_URL}/api/auth/google/callback`,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(tokens.error_description || tokens.error || 'Google token exchange failed');

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();
  if (!profileRes.ok || !profile.email) throw new Error('Could not load Google profile');
  return {
    provider: 'google',
    oauthId: profile.sub,
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
  };
}

async function exchangeFacebook(code) {
  const cfg = socialConfig('facebook');
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', cfg.clientId);
  tokenUrl.searchParams.set('client_secret', cfg.clientSecret);
  tokenUrl.searchParams.set('redirect_uri', `${SITE_URL}/api/auth/facebook/callback`);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl);
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || tokens.error) throw new Error((tokens.error && tokens.error.message) || 'Facebook token exchange failed');

  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email');
  profileUrl.searchParams.set('access_token', tokens.access_token);
  const profileRes = await fetch(profileUrl);
  const profile = await profileRes.json();
  if (!profile.email) throw new Error('Facebook did not return an email — enable the email permission');
  return {
    provider: 'facebook',
    oauthId: profile.id,
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
  };
}

async function exchangeApple(code) {
  const cfg = socialConfig('apple');
  const clientSecret = appleClientSecret(cfg);
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: clientSecret,
    redirect_uri: `${SITE_URL}/api/auth/apple/callback`,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(tokens.error_description || tokens.error || 'Apple token exchange failed');

  const idToken = tokens.id_token;
  const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
  const email = payload.email || `${payload.sub}@privaterelay.appleid.com`;
  return {
    provider: 'apple',
    oauthId: payload.sub,
    email,
    name: email.split('@')[0],
  };
}

async function exchangeStripeConnect(code) {
  const cfg = stripeConnectConfig();
  if (!cfg.secretKey) throw new Error('Stripe Secret Key is required to finish Connect (add it in Setup → Payments)');
  const body = new URLSearchParams({
    client_secret: cfg.secretKey,
    code,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Stripe Connect failed');
  return data;
}

function upsertOAuthCustomer({ provider, oauthId, email, name }, bcrypt) {
  const lower = email.toLowerCase();
  let customer = queryOne('SELECT * FROM customers WHERE oauth_provider = ? AND oauth_id = ?', [provider, oauthId]);
  if (!customer) {
    customer = queryOne('SELECT * FROM customers WHERE email = ?', [lower]);
  }
  if (customer) {
    run('UPDATE customers SET oauth_provider = ?, oauth_id = ?, name = COALESCE(NULLIF(?, ""), name) WHERE id = ?',
      [provider, oauthId, name || '', customer.id]);
    return queryOne('SELECT * FROM customers WHERE id = ?', [customer.id]);
  }
  const randomPass = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);
  const result = run(
    'INSERT INTO customers (name, email, password, role, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?)',
    [name || lower.split('@')[0], lower, randomPass, 'customer', provider, oauthId]
  );
  return queryOne('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
}

function googleAuthUrl(state) {
  const cfg = socialConfig('google');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', `${SITE_URL}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);
  return url.toString();
}

function facebookAuthUrl(state) {
  const cfg = socialConfig('facebook');
  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', `${SITE_URL}/api/auth/facebook/callback`);
  url.searchParams.set('scope', 'email,public_profile');
  url.searchParams.set('state', state);
  return url.toString();
}

function appleAuthUrl(state) {
  const cfg = socialConfig('apple');
  const url = new URL('https://appleid.apple.com/auth/authorize');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', `${SITE_URL}/api/auth/apple/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('response_mode', 'form_post');
  url.searchParams.set('scope', 'name email');
  url.searchParams.set('state', state);
  return url.toString();
}

function stripeConnectAuthUrl(state) {
  const cfg = stripeConnectConfig();
  if (!cfg.clientId) throw new Error('Add Stripe Connect Client ID in Setup → Payments (or STRIPE_CONNECT_CLIENT_ID env)');
  const url = new URL('https://connect.stripe.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('redirect_uri', `${SITE_URL}/api/admin/integrations/stripe/callback`);
  url.searchParams.set('state', state);
  return url.toString();
}

module.exports = {
  SITE_URL,
  getIntegrations,
  saveIntegrations,
  patchIntegrations,
  socialConfig,
  stripeConnectConfig,
  publicProviders,
  makeState,
  readState,
  exchangeGoogle,
  exchangeFacebook,
  exchangeApple,
  exchangeStripeConnect,
  upsertOAuthCustomer,
  googleAuthUrl,
  facebookAuthUrl,
  appleAuthUrl,
  stripeConnectAuthUrl,
};
