/* Queens Custom Studio — shop.js
   Auth gate, live canvas tumbler builder, pricing engine, cart, orders
   Pure static JS — no build step, no npm */

'use strict';

/* ══════════════════════════════════════════════════════
   CONSTANTS & CONFIG
══════════════════════════════════════════════════════ */
const COLORS = [
  { hex:'#FF1A8C', name:'Queen Pink' },   { hex:'#cc0066', name:'Deep Rose' },
  { hex:'#9B59B6', name:'Purple Reign' }, { hex:'#3498DB', name:'Ocean Blue' },
  { hex:'#1ABC9C', name:'Teal Dream' },   { hex:'#F39C12', name:'Gold Rush' },
  { hex:'#E74C3C', name:'Ruby Red' },     { hex:'#2C3E50', name:'Midnight' },
  { hex:'#ECF0F1', name:'Pearl White' },  { hex:'#000000', name:'Jet Black' },
  { hex:'#F8BBD0', name:'Blush' },        { hex:'#B2EBF2', name:'Ice Blue' },
  { hex:'#DCEDC8', name:'Sage' },         { hex:'#FFE0B2', name:'Peach' },
  { hex:'#D7CCC8', name:'Latte' },        { hex:'#CFD8DC', name:'Silver' },
  { hex:'#FF6F00', name:'Burnt Orange' }, { hex:'#6A1B9A', name:'Violet' },
  { hex:'#004D40', name:'Forest' },       { hex:'#BF360C', name:'Terracotta' },
];

const CUP_SHAPES = {
  skinny20:  { topW:60,  botW:55,  h:320, label:'Skinny 20oz' },
  quencher30:{ topW:100, botW:70,  h:290, label:'Quencher 30oz' },
  mega40:    { topW:115, botW:80,  h:310, label:'Mega 40oz' },
  wine20:    { topW:70,  botW:55,  h:285, label:'Wine 20oz' },
  pint16:    { topW:95,  botW:80,  h:250, label:'Pint 16oz' },
  mini12:    { topW:65,  botW:50,  h:210, label:'Mini 12oz' },
};

const BASE_PRICE    = 29;
const PRICE_BREAKS  = [{min:12, price:35},{min:4, price:38},{min:1, price:29}];

const SUPPLIES_BASE = {
  'Epoxy Resin (oz)':    { base:3,  per:0.5 },
  'Glitter (g)':         { base:0,  per:1   },
  'Alcohol Ink (drops)': { base:8,  per:2   },
  'Cup Molds':           { base:1,  per:0   },
  'Mixing Cups':         { base:2,  per:0.5 },
};
const GLITTER_SUPPLY = { none:0, fine:3, chunky:5, opal:4, holo:4, chrome:6, glow:5, chameleon:7 };

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const state = {
  cup:       'skinny20',
  qty:       1,
  color1:    '#FF1A8C',
  color2:    '#9B59B6',
  pattern:   'solid',
  glitter:   'none',
  glitterPrice: 0,
  persName:  '',
  persFont:  'serif',
  persColor: '#ffffff',
  uploadImg: null,
  uploadSize:    40,
  uploadPos:     50,
  uploadOpacity: 90,
  hasUpload: false,
  hasPers:   false,
};

const cart = JSON.parse(localStorage.getItem('qcc_shop_cart') || '[]');

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(36);
}

function getUsers()    { return JSON.parse(localStorage.getItem('qcc_shop_users') || '{}'); }
function saveUsers(u)  { localStorage.setItem('qcc_shop_users', JSON.stringify(u)); }
function getSession()  { return JSON.parse(localStorage.getItem('qcc_shop_session') || 'null'); }
function saveSession(s){ localStorage.setItem('qcc_shop_session', JSON.stringify(s)); }
function clearSession(){ localStorage.removeItem('qcc_shop_session'); }

/* ─── Pre-seed admin ─────────────────────────────────── */
function seedAdmin() {
  const users = getUsers();
  const adminEmail = 'wired4365@aol.com';
  if (!users[adminEmail]) {
    users[adminEmail] = {
      name: 'Vibe Queen Admin',
      hash: simpleHash('74Slimjim!'),
      isAdmin: true,
      signupDate: new Date().toISOString(),
    };
    saveUsers(users);
  }
}

function initAuth() {
  seedAdmin(); // ensure admin can always log in
  const gate    = document.getElementById('auth-gate');
  const app     = document.getElementById('shop-app');
  if (!gate || !app) return; // bulk page — no gate

  const session = getSession();
  if (session) {
    showApp(session);
    return;
  }

  gate.classList.remove('hidden');
  app.classList.add('hidden');

  // Tab switching
  document.querySelectorAll('.gate-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gate-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      document.getElementById('gate-login-form').classList.toggle('hidden',  which !== 'login');
      document.getElementById('gate-signup-form').classList.toggle('hidden', which !== 'signup');
    });
  });

  // Login
  document.getElementById('gate-login-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('gate-email').value.trim().toLowerCase();
    const pass  = document.getElementById('gate-pass').value;
    const users = getUsers();
    const msg   = document.getElementById('gate-login-msg');
    if (!users[email] || users[email].hash !== simpleHash(pass)) {
      msg.textContent = 'Incorrect email or password.';
      msg.style.color = '#ef4444';
      return;
    }
    const session = { email, name: users[email].name };
    saveSession(session);
    showApp(session);
  });

  // Signup
  document.getElementById('gate-signup-form').addEventListener('submit', e => {
    e.preventDefault();
    const name   = document.getElementById('su-name').value.trim();
    const email  = document.getElementById('su-email').value.trim().toLowerCase();
    const pass   = document.getElementById('su-pass').value;
    const social = document.getElementById('su-social').value.trim();
    const phone  = document.getElementById('su-phone').value.trim();
    const msg    = document.getElementById('gate-signup-msg');

    if (pass.length < 6) { msg.textContent = 'Password must be at least 6 characters.'; msg.style.color='#ef4444'; return; }
    const users = getUsers();
    if (users[email]) { msg.textContent = 'An account with this email already exists. Please sign in.'; msg.style.color='#ef4444'; return; }

    // Save user with marketing data
    users[email] = {
      name, hash: simpleHash(pass),
      social, phone,
      signupDate: new Date().toISOString(),
      source: 'queenscustoms.shop/shop',
    };
    saveUsers(users);

    // Save to marketing list
    const leads = JSON.parse(localStorage.getItem('qcc_leads') || '[]');
    leads.push({ name, email, social, phone, date: new Date().toISOString() });
    localStorage.setItem('qcc_leads', JSON.stringify(leads));

    const session = { email, name };
    saveSession(session);
    showApp(session);
  });
}

function showApp(session) {
  const gate = document.getElementById('auth-gate');
  const app  = document.getElementById('shop-app');
  if (gate) gate.classList.add('hidden');
  if (app)  app.classList.remove('hidden');
  const wn = document.getElementById('welcome-name');
  const users = getUsers();
  const isAdmin = users[session.email] && users[session.email].isAdmin;
  if (isAdmin) {
    if (wn) wn.textContent = `Admin: ${session.name.split(' ')[0]} 👑`;
    // Add admin panel link to nav if not already there
    const shopNav = document.querySelector('.shop-nav');
    if (shopNav && !document.getElementById('nav-admin')) {
      const adminLink = document.createElement('a');
      adminLink.href = '#admin-panel';
      adminLink.className = 'shop-nav-link';
      adminLink.id = 'nav-admin';
      adminLink.innerHTML = '🛠 Admin';
      adminLink.style.color = '#FF1A8C';
      shopNav.appendChild(adminLink);
      adminLink.addEventListener('click', e => {
        e.preventDefault();
        showAdminPanel(session);
      });
    }
  } else {
    if (wn) wn.textContent = `Hey, ${session.name.split(' ')[0]} 👑`;
  }
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearSession();
    location.reload();
  });
}

/* ══════════════════════════════════════════════════════
   CANVAS BUILDER
══════════════════════════════════════════════════════ */
let canvas, ctx, uploadImgEl = null;

function initCanvas() {
  canvas = document.getElementById('tumbler-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  drawTumbler();
}

function drawTumbler() {
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cup = CUP_SHAPES[state.cup];
  const cxLine = W / 2;
  const topY = (H - cup.h) / 2;
  const botY = topY + cup.h;
  const topX1 = cxLine - cup.topW / 2, topX2 = cxLine + cup.topW / 2;
  const botX1 = cxLine - cup.botW / 2, botX2 = cxLine + cup.botW / 2;

  // Build tumbler path
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(topX1, topY + 8);
  ctx.quadraticCurveTo(topX1, topY, cxLine, topY);
  ctx.quadraticCurveTo(topX2, topY, topX2, topY + 8);
  ctx.lineTo(botX2, botY - 8);
  ctx.quadraticCurveTo(botX2, botY, cxLine, botY);
  ctx.quadraticCurveTo(botX1, botY, botX1, botY - 8);
  ctx.closePath();
  ctx.clip();

  // Fill pattern
  fillPattern(ctx, W, H, topY, botY, topX1, botX1, topX2, botX2, cxLine);

  // Glitter overlay
  if (state.glitter !== 'none') drawGlitter(ctx, W, H);

  // Uploaded image
  if (state.hasUpload && uploadImgEl) {
    const imgW = (cup.topW + cup.botW) * (state.uploadSize / 100);
    const imgH = imgW * (uploadImgEl.naturalHeight / uploadImgEl.naturalWidth || 1);
    const imgX = cxLine - imgW / 2;
    const imgY = topY + (cup.h * state.uploadPos / 100) - imgH / 2;
    ctx.globalAlpha = state.uploadOpacity / 100;
    ctx.drawImage(uploadImgEl, imgX, imgY, imgW, imgH);
    ctx.globalAlpha = 1;
  }

  // Personalization text
  if (state.persName) {
    const fontMap = { serif:'Georgia,serif', script:'cursive', bold:'Arial Black,sans-serif', minimal:'Arial,sans-serif' };
    ctx.font = `bold 22px ${fontMap[state.persFont] || 'Georgia,serif'}`;
    ctx.fillStyle = state.persColor;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(state.persName, cxLine, topY + cup.h * 0.6);
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // Draw cup outline
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(topX1, topY + 8);
  ctx.quadraticCurveTo(topX1, topY, cxLine, topY);
  ctx.quadraticCurveTo(topX2, topY, topX2, topY + 8);
  ctx.lineTo(botX2, botY - 8);
  ctx.quadraticCurveTo(botX2, botY, cxLine, botY);
  ctx.quadraticCurveTo(botX1, botY, botX1, botY - 8);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shine highlight
  const shine = ctx.createLinearGradient(topX1, topY, topX1 + 18, botY);
  shine.addColorStop(0, 'rgba(255,255,255,0.25)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.moveTo(topX1 + 4, topY + 12);
  ctx.lineTo(topX1 + 18, topY + 12);
  ctx.lineTo(botX1 + 14, botY - 12);
  ctx.lineTo(botX1 + 4, botY - 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Lid
  ctx.save();
  ctx.fillStyle = 'rgba(50,50,50,0.85)';
  ctx.beginPath();
  ctx.ellipse(cxLine, topY + 4, cup.topW / 2 + 3, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function fillPattern(ctx, W, H, topY, botY, topX1, botX1, topX2, botX2, cx) {
  const c1 = state.color1, c2 = state.color2;
  const pat = state.pattern;

  if (pat === 'solid') {
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, W, H);

  } else if (pat === 'fade') {
    const grad = ctx.createLinearGradient(cx, topY, cx, botY);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

  } else if (pat === 'wave') {
    ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(0, topY + (botY - topY) * 0.4);
    for (let x = 0; x <= W; x += 8) {
      const y = topY + (botY - topY) * 0.4 + Math.sin(x / 30) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fill();

  } else if (pat === 'swirl') {
    ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const grad = ctx.createLinearGradient(
        cx + Math.cos(i * 1.2) * 40, topY,
        cx + Math.sin(i * 1.2) * 40, botY
      );
      grad.addColorStop(0, c2 + 'aa');
      grad.addColorStop(1, c1 + '00');
      ctx.fillStyle = grad;
      ctx.save();
      ctx.translate(cx, (topY + botY) / 2);
      ctx.rotate(i * 0.6);
      ctx.fillRect(-20, -(botY - topY) / 2, 40, botY - topY);
      ctx.restore();
    }

  } else if (pat === 'multiswirl') {
    ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
    const colors = [c1, c2, '#ffffff44', c2 + '88'];
    for (let i = 0; i < 8; i++) {
      const grad = ctx.createLinearGradient(
        cx + Math.cos(i * 0.8) * 50, topY,
        cx - Math.cos(i * 0.8) * 30, botY
      );
      grad.addColorStop(0, colors[i % colors.length]);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.save();
      ctx.translate(cx, (topY + botY) / 2);
      ctx.rotate(i * 0.4);
      ctx.fillRect(-15, -(botY - topY) / 2, 30, botY - topY);
      ctx.restore();
    }

  } else if (pat === 'drip') {
    const grad = ctx.createLinearGradient(0, topY, 0, botY);
    grad.addColorStop(0, c2);
    grad.addColorStop(0.4, c1);
    grad.addColorStop(1, c1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Draw drips
    ctx.fillStyle = c2 + 'cc';
    for (let i = 0; i < 6; i++) {
      const dx = topX1 + (topX2 - topX1) * (i / 5);
      const dripLen = 30 + Math.sin(i * 2.3) * 20;
      ctx.beginPath();
      ctx.ellipse(dx, topY + dripLen, 5, dripLen, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGlitter(ctx, W, H) {
  const glitterColors = {
    fine:      ['#fff','#ffddee','#ffaacc'],
    chunky:    ['#fff','#FFD700','#FF69B4'],
    opal:      ['#E0F7FA','#B2EBF2','#ffffff','#E1BEE7'],
    holo:      ['#FF1A8C','#00FFFF','#FFD700','#ADFF2F','#fff'],
    chrome:    ['#C0C0C0','#E8E8E8','#fff','#A8A8A8'],
    glow:      ['#39FF14','#00FF7F','#7FFF00','#ADFF2F'],
    chameleon: ['#FF1A8C','#FF6B00','#FFD700','#00FF7F','#00BFFF','#8A2BE2'],
  };
  const cols  = glitterColors[state.glitter] || ['#fff'];
  const count = state.glitter === 'chunky' ? 80 : 200;
  const size  = state.glitter === 'chunky' ? 4 : 1.5;

  for (let i = 0; i < count; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * size + 0.5, 0, Math.PI * 2);
    ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)] + Math.floor(Math.random() * 128 + 128).toString(16);
    ctx.fill();
  }
}

/* ══════════════════════════════════════════════════════
   PRICING ENGINE
══════════════════════════════════════════════════════ */
function getUnitPrice(qty) {
  const complexity = state.glitterPrice + (state.hasUpload ? 5 : 0) + (state.hasPers ? 3 : 0);
  const base = PRICE_BREAKS.find(b => qty >= b.min)?.price || BASE_PRICE;
  return Math.min(base + complexity, 60);
}

function updatePricing() {
  const unit  = getUnitPrice(state.qty);
  const total = unit * state.qty;

  // Update display
  el('price-base').textContent   = `$${(PRICE_BREAKS.find(b => state.qty >= b.min)?.price || BASE_PRICE).toFixed(2)}`;
  el('total-price').textContent  = `$${total.toFixed(2)}`;
  el('cart-total-btn').textContent = `$${total.toFixed(2)}`;
  el('qty-label').textContent    = `×${state.qty}`;
  el('qty-badge').textContent    = `${state.qty} × $${unit.toFixed(0)}`;

  const gr = el('glitter-row');
  if (gr) { gr.style.display = state.glitterPrice > 0 ? '' : 'none'; }
  el('price-glitter').textContent = `+$${state.glitterPrice.toFixed(2)}`;
  const ur = el('upload-row');
  if (ur) ur.style.display = state.hasUpload ? '' : 'none';
  const pr = el('pers-row');
  if (pr) pr.style.display = state.hasPers ? '' : 'none';

  // Tier highlight
  document.querySelectorAll('.tier').forEach(t => {
    const min = parseInt(t.dataset.min), max = parseInt(t.dataset.max);
    t.classList.toggle('active', state.qty >= min && state.qty <= max);
  });

  updateSupplies();
}

function updateSupplies() {
  const list = el('supplies-list');
  if (!list) return;
  const qty = state.qty;
  const glitterG = GLITTER_SUPPLY[state.glitter] || 0;

  const items = [
    { name:'Epoxy Resin', amount:`${(3 + qty * 0.5 + (state.pattern !== 'solid' ? 1 : 0)).toFixed(1)} oz` },
    { name:'Pigment / Alcohol Ink', amount:`${(8 + qty * 2 + (state.pattern !== 'solid' ? 4 : 0))} drops` },
    { name:'Glitter', amount: glitterG ? `${(glitterG * qty).toFixed(0)}g` : 'None' },
    { name:'Mixing Cups', amount:`${2 + Math.ceil(qty / 3)}` },
    { name:'Tumbler Cups', amount:`${qty} × ${CUP_SHAPES[state.cup]?.label || state.cup}` },
    { name:'Heat Gun / Torch', amount:'1 (shared)' },
    { name:'Epoxy Top Coat', amount:`${(qty * 1.2).toFixed(1)} oz` },
  ];
  if (state.hasUpload) items.push({ name:'Vinyl / Print Transfer', amount:`${qty} sheets` });

  list.innerHTML = items.map(it =>
    `<div class="supply-row"><span>${it.name}</span><span class="supply-amt">${it.amount}</span></div>`
  ).join('');
}

/* ══════════════════════════════════════════════════════
   CONTROLS BINDING
══════════════════════════════════════════════════════ */
function initControls() {
  if (!el('tumbler-canvas')) return;

  // Color grid
  const cg = el('color-grid');
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    btn.style.background = c.hex;
    btn.title = c.name;
    btn.dataset.hex = c.hex;
    btn.addEventListener('click', () => {
      state.color1 = c.hex;
      document.querySelectorAll('#color-grid .color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    if (c.hex === state.color1) btn.classList.add('active');
    cg.appendChild(btn);
  });

  // Color grid 2
  const cg2 = el('color-grid-2');
  if (cg2) {
    COLORS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'color-swatch';
      btn.style.background = c.hex;
      btn.title = c.name;
      btn.dataset.hex = c.hex;
      btn.addEventListener('click', () => {
        state.color2 = c.hex;
        document.querySelectorAll('#color-grid-2 .color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        redraw();
      });
      if (c.hex === state.color2) btn.classList.add('active');
      cg2.appendChild(btn);
    });
  }

  // Custom color
  el('custom-color')?.addEventListener('input', e => {
    state.color1 = e.target.value;
    el('custom-hex').textContent = e.target.value;
    redraw();
  });

  // Cup options
  document.querySelectorAll('.cup-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cup-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.cup = btn.dataset.cup;
      redraw();
    });
  });

  // Quantity
  el('qty-up')?.addEventListener('click', () => { state.qty = Math.min(state.qty + 1, 200); updateQtyUI(); });
  el('qty-down')?.addEventListener('click', () => { state.qty = Math.max(state.qty - 1, 1); updateQtyUI(); });

  // Pattern
  document.querySelectorAll('.pat-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pat-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.pattern = btn.dataset.pat;
      const multiPat = ['swirl','multiswirl','wave','fade','drip'];
      el('second-color-row')?.classList.toggle('hidden', !multiPat.includes(state.pattern));
      redraw();
    });
  });

  // Glitter
  document.querySelectorAll('.gltr-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gltr-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.glitter = btn.dataset.glitter;
      state.glitterPrice = parseFloat(btn.dataset.price) || 0;
      updatePricing();
      redraw();
    });
  });

  // Personalization
  el('pers-name')?.addEventListener('input', e => {
    state.persName = e.target.value;
    state.hasPers  = e.target.value.length > 0;
    updatePricing();
    redraw();
  });
  el('pers-font')?.addEventListener('change', e => { state.persFont = e.target.value; redraw(); });
  el('pers-color')?.addEventListener('input', e => { state.persColor = e.target.value; redraw(); });

  // Image upload
  const uploadZone = el('upload-zone');
  const fileInput  = el('img-upload');
  uploadZone?.addEventListener('click', () => fileInput?.click());
  uploadZone?.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone?.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleImageFile(e.dataTransfer.files[0]);
  });
  fileInput?.addEventListener('change', e => handleImageFile(e.target.files[0]));

  el('img-size')?.addEventListener('input',    e => { state.uploadSize    = +e.target.value; redraw(); });
  el('img-pos')?.addEventListener('input',     e => { state.uploadPos     = +e.target.value; redraw(); });
  el('img-opacity')?.addEventListener('input', e => { state.uploadOpacity = +e.target.value; redraw(); });
  el('img-remove')?.addEventListener('click',  () => {
    state.hasUpload = false; uploadImgEl = null;
    el('upload-controls')?.classList.add('hidden');
    el('upload-zone')?.classList.remove('hidden');
    updatePricing(); redraw();
  });

  // Cart
  el('btn-add-cart')?.addEventListener('click', addToCart);
  el('btn-save-design')?.addEventListener('click', saveDesign);
  el('cart-fab')?.addEventListener('click', openCart);
  el('cart-close')?.addEventListener('click', closeCart);
  el('cart-overlay')?.addEventListener('click', closeCart);
  el('btn-checkout')?.addEventListener('click', checkout);

  // Initial render
  updateQtyUI();
  drawTumbler();
}

function updateQtyUI() {
  el('qty-val').textContent = state.qty;
  updatePricing();
}

function handleImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    uploadImgEl = new Image();
    uploadImgEl.onload = () => {
      state.hasUpload = true;
      el('upload-preview').src = e.target.result;
      el('upload-controls')?.classList.remove('hidden');
      el('upload-zone')?.classList.add('hidden');
      updatePricing();
      redraw();
    };
    uploadImgEl.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function redraw() {
  requestAnimationFrame(drawTumbler);
}

/* ══════════════════════════════════════════════════════
   CART
══════════════════════════════════════════════════════ */
function addToCart() {
  const unit  = getUnitPrice(state.qty);
  const total = unit * state.qty;
  const item = {
    id: Date.now(),
    cup:      CUP_SHAPES[state.cup]?.label || state.cup,
    pattern:  state.pattern,
    color1:   state.color1,
    glitter:  state.glitter,
    persName: state.persName,
    hasUpload:state.hasUpload,
    qty:      state.qty,
    unitPrice:unit,
    total,
    thumbnail: canvas?.toDataURL('image/png', 0.5),
  };
  cart.push(item);
  saveCart();
  updateCartFab();
  showToast(`Added to cart! $${total.toFixed(2)} total`);
}

function saveCart()  { localStorage.setItem('qcc_shop_cart', JSON.stringify(cart)); }

function updateCartFab() {
  const fab = el('cart-fab');
  const cnt = el('cart-fab-count');
  if (!fab || !cnt) return;
  const total = cart.reduce((a, b) => a + b.qty, 0);
  cnt.textContent = total;
  fab.classList.toggle('has-items', total > 0);
}

function openCart() {
  const drawer  = el('cart-drawer');
  const overlay = el('cart-overlay');
  const items   = el('cart-items');
  if (!drawer) return;

  items.innerHTML = cart.length === 0
    ? '<p class="cart-empty">Your cart is empty 👑</p>'
    : cart.map(item => `
      <div class="cart-item">
        ${item.thumbnail ? `<img src="${item.thumbnail}" class="cart-thumb"/>` : ''}
        <div class="cart-item-info">
          <div class="cart-item-name">${item.cup} — ${item.pattern}</div>
          <div class="cart-item-desc">${item.persName ? `"${item.persName}" · ` : ''}${item.glitter !== 'none' ? item.glitter + ' glitter · ' : ''}Qty: ${item.qty}</div>
          <div class="cart-item-price">$${item.total.toFixed(2)}</div>
        </div>
        <button class="cart-remove" data-id="${item.id}">✕</button>
      </div>`).join('');

  const grand = cart.reduce((a, b) => a + b.total, 0);
  el('cart-grand-total').textContent = `$${grand.toFixed(2)}`;

  // Remove buttons
  items.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = cart.findIndex(i => i.id === parseInt(btn.dataset.id));
      if (idx > -1) { cart.splice(idx, 1); saveCart(); updateCartFab(); openCart(); }
    });
  });

  drawer.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function closeCart() {
  el('cart-drawer')?.classList.add('hidden');
  el('cart-overlay')?.classList.add('hidden');
}

function checkout() {
  const session = getSession();
  if (!session) { showToast('Please sign in to checkout'); return; }
  const order = {
    id:    'QCC-' + Date.now().toString(36).toUpperCase(),
    date:  new Date().toISOString(),
    email: session.email,
    items: [...cart],
    total: cart.reduce((a, b) => a + b.total, 0),
    status:'Pending — The Vibe Queen will confirm within 24hrs',
  };
  const orders = JSON.parse(localStorage.getItem('qcc_shop_orders') || '[]');
  orders.push(order);
  localStorage.setItem('qcc_shop_orders', JSON.stringify(orders));
  cart.length = 0;
  saveCart();
  updateCartFab();
  closeCart();
  showToast(`Order #${order.id} placed! 👑 Check your email for confirmation.`, 4000);
}

function saveDesign() {
  const designs = JSON.parse(localStorage.getItem('qcc_saved_designs') || '[]');
  designs.push({ ...state, thumbnail: canvas?.toDataURL('image/png', 0.5), savedAt: new Date().toISOString() });
  localStorage.setItem('qcc_saved_designs', JSON.stringify(designs));
  showToast('Design saved! 💾');
}

/* ══════════════════════════════════════════════════════
   BULK FORM
══════════════════════════════════════════════════════ */
function initBulkForm() {
  const form = el('bulk-quote-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      name:     el('bq-name')?.value,
      email:    el('bq-email')?.value,
      phone:    el('bq-phone')?.value,
      occasion: el('bq-occasion')?.value,
      qty:      el('bq-qty')?.value,
      cup:      el('bq-cup')?.value,
      date:     el('bq-date')?.value,
      budget:   el('bq-budget')?.value,
      vision:   el('bq-vision')?.value,
      source:   'queenscustoms.shop/shop/bulk',
      submittedAt: new Date().toISOString(),
    };
    // Save lead
    const leads = JSON.parse(localStorage.getItem('qcc_leads') || '[]');
    leads.push(data);
    localStorage.setItem('qcc_leads', JSON.stringify(leads));

    form.querySelectorAll('input,select,textarea').forEach(f => f.disabled = true);
    form.querySelector('button[type="submit"]').style.display = 'none';
    el('bq-response')?.classList.remove('hidden');
  });
}

/* ══════════════════════════════════════════════════════
   TOAST & UTILS
══════════════════════════════════════════════════════ */
function showToast(msg, duration = 3000) {
  const t = el('shop-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 400); }, duration);
}

function el(id) { return document.getElementById(id); }

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */

/* ─── Admin Panel ────────────────────────────────────── */
function showAdminPanel(session) {
  // Build admin overlay showing all orders, leads, and designs
  let overlay = document.getElementById('admin-panel-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'admin-panel-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;overflow:auto;padding:2rem;`;
    document.body.appendChild(overlay);
  }

  const orders = JSON.parse(localStorage.getItem('qcc_orders') || '[]');
  const shopOrders = JSON.parse(localStorage.getItem('qcc_shop_orders') || '[]');
  const leads  = JSON.parse(localStorage.getItem('qcc_leads') || '[]');
  const designs = JSON.parse(localStorage.getItem('qcc_saved_designs') || '[]');

  const allOrders = [...orders, ...shopOrders];

  overlay.innerHTML = `
    <div style="max-width:900px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
        <h1 style="color:#FF1A8C;font-size:1.8rem;font-weight:700;">👑 Queens Admin Dashboard</h1>
        <button onclick="document.getElementById('admin-panel-overlay').remove()"
          style="background:rgba(255,26,140,0.15);border:1px solid #FF1A8C;color:#FF1A8C;padding:0.5rem 1.2rem;border-radius:2rem;cursor:pointer;font-size:0.9rem;">
          ✕ Close
        </button>
      </div>

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem;">
        <div style="background:rgba(255,26,140,0.08);border:1px solid rgba(255,26,140,0.3);border-radius:1rem;padding:1.5rem;text-align:center;">
          <div style="font-size:2.5rem;font-weight:700;color:#FF1A8C;">${allOrders.length}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:0.85rem;">Total Orders</div>
        </div>
        <div style="background:rgba(0,220,255,0.06);border:1px solid rgba(0,220,255,0.2);border-radius:1rem;padding:1.5rem;text-align:center;">
          <div style="font-size:2.5rem;font-weight:700;color:#00DCFF;">${leads.length}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:0.85rem;">Signups / Leads</div>
        </div>
        <div style="background:rgba(255,26,140,0.08);border:1px solid rgba(255,26,140,0.3);border-radius:1rem;padding:1.5rem;text-align:center;">
          <div style="font-size:2.5rem;font-weight:700;color:#FF1A8C;">${designs.length}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:0.85rem;">Saved Designs</div>
        </div>
      </div>

      <!-- Orders -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,26,140,0.2);border-radius:1rem;padding:1.5rem;margin-bottom:1.5rem;">
        <h2 style="color:#fff;font-size:1.1rem;margin-bottom:1rem;">📦 All Orders (${allOrders.length})</h2>
        ${allOrders.length === 0 ? '<p style="color:rgba(255,255,255,0.4);">No orders yet.</p>' :
          allOrders.map(o => `
            <div style="border-bottom:1px solid rgba(255,255,255,0.06);padding:0.75rem 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
              <div>
                <span style="color:#FF1A8C;font-weight:600;">${o.id || 'Studio Order'}</span>
                <span style="color:rgba(255,255,255,0.5);font-size:0.8rem;margin-left:0.5rem;">${o.date || o.createdAt || ''}</span>
                <div style="color:rgba(255,255,255,0.7);font-size:0.82rem;margin-top:2px;">
                  Customer: ${o.userEmail || o.email || 'n/a'}
                </div>
                <div style="color:rgba(255,255,255,0.55);font-size:0.78rem;">
                  ${Array.isArray(o.items) ? o.items.map(i => i.name || JSON.stringify(i)).join(', ') : (o.summary || '')}
                </div>
              </div>
              <div style="text-align:right;">
                <span style="color:#FF1A8C;font-weight:700;">$${(o.total || 0).toFixed(2)}</span>
                <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-top:2px;">${o.status || 'pending'}</div>
              </div>
            </div>
          `).join('')}
      </div>

      <!-- Leads / Signups -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,220,255,0.15);border-radius:1rem;padding:1.5rem;margin-bottom:1.5rem;">
        <h2 style="color:#fff;font-size:1.1rem;margin-bottom:1rem;">👥 Customer Signups (${leads.length})</h2>
        ${leads.length === 0 ? '<p style="color:rgba(255,255,255,0.4);">No signups yet.</p>' :
          `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
            <thead><tr style="color:rgba(255,255,255,0.5);border-bottom:1px solid rgba(255,255,255,0.1);">
              <th style="text-align:left;padding:6px 8px;">Name</th>
              <th style="text-align:left;padding:6px 8px;">Email</th>
              <th style="text-align:left;padding:6px 8px;">Social</th>
              <th style="text-align:left;padding:6px 8px;">Date</th>
            </tr></thead>
            <tbody>
              ${leads.map(l => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);color:rgba(255,255,255,0.8);">
                <td style="padding:6px 8px;">${l.name}</td>
                <td style="padding:6px 8px;">${l.email}</td>
                <td style="padding:6px 8px;color:#FF1A8C;">${l.social||'-'}</td>
                <td style="padding:6px 8px;color:rgba(255,255,255,0.4);">${l.date ? new Date(l.date).toLocaleDateString() : '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
      </div>

      <!-- Saved Designs -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,26,140,0.2);border-radius:1rem;padding:1.5rem;">
        <h2 style="color:#fff;font-size:1.1rem;margin-bottom:1rem;">🎨 Saved Designs (${designs.length})</h2>
        ${designs.length === 0 ? '<p style="color:rgba(255,255,255,0.4);">No saved designs yet.</p>' :
          designs.map(d => `
            <div style="border-bottom:1px solid rgba(255,255,255,0.06);padding:0.75rem 0;color:rgba(255,255,255,0.8);font-size:0.82rem;">
              <span style="color:#FF1A8C;">${d.customer || d.email || 'Customer'}</span> — 
              ${d.cup || ''} · ${d.color || ''} · ${d.glitter || ''} · ${d.theme || ''}
              <span style="color:rgba(255,255,255,0.4);margin-left:0.5rem;">${d.date || ''}</span>
            </div>
          `).join('')}
      </div>
    </div>
  `;
  overlay.scrollTop = 0;
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initCanvas();
  initControls();
  initBulkForm();
  updateCartFab();
});

/* ── Admin Account ──────────────────────────────────── */
// Admin account is created at first login via the signup form.
// Use the signup tab to register with your admin email — account
// persists in localStorage on that device going forward.

/* ── Gate Music Player ──────────────────────────────── */
(function initGateMusic() {
  const audio   = document.getElementById('gate-audio');
  const toggle  = document.getElementById('gm-toggle');
  const volSldr = document.getElementById('gm-vol');
  const iconPlay= document.getElementById('gm-icon-play');
  const iconPause=document.getElementById('gm-icon-pause');
  if (!audio || !toggle) return;

  audio.volume = 0.05;
  let playing = false;

  toggle.addEventListener('click', () => {
    if (playing) {
      audio.pause();
      iconPlay.style.display = '';
      iconPause.style.display = 'none';
    } else {
      audio.play().catch(() => {});
      iconPlay.style.display = 'none';
      iconPause.style.display = '';
    }
    playing = !playing;
  });

  if (volSldr) {
    volSldr.addEventListener('input', () => { audio.volume = parseFloat(volSldr.value); });
  }

  // Also hide music player when logged in (main app has its own)
  document.addEventListener('qcc:loggedin', () => {
    const gm = document.getElementById('gate-music');
    if (gm) gm.style.display = 'none';
    audio.pause();
  });
})();
