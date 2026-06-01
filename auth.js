/* ============================================================
   QUEENS CUSTOM CREATIONS — Auth System (auth.js)
   Login / Sign Up / Account Dashboard via localStorage
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY  = 'qcc_users';
  const SESSION_KEY  = 'qcc_session';
  const ORDERS_KEY   = 'qcc_orders';
  const WISHLIST_KEY = 'qcc_wishlist';

  /* ─── Storage helpers ────────────────────────────────────── */
  function getUsers()   { return JSON.parse(localStorage.getItem(STORAGE_KEY)  || '{}'); }
  function getSession() { return JSON.parse(localStorage.getItem(SESSION_KEY)  || 'null'); }
  function getOrders()  { return JSON.parse(localStorage.getItem(ORDERS_KEY)   || '[]'); }
  function getWishlist(){ return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }

  function saveUsers(u)   { localStorage.setItem(STORAGE_KEY,  JSON.stringify(u)); }
  function saveSession(s) { localStorage.setItem(SESSION_KEY,  JSON.stringify(s)); }
  function saveOrders(o)  { localStorage.setItem(ORDERS_KEY,   JSON.stringify(o)); }
  function saveWishlist(w){ localStorage.setItem(WISHLIST_KEY, JSON.stringify(w)); }

  /* ─── Sample orders for demo ─────────────────────────────── */
  function seedDemoOrders(email) {
    const existing = getOrders();
    if (existing.some(o => o.userEmail === email)) return; // already seeded
    const demo = [
      {
        id: 'QCC-10024',
        userEmail: email,
        date: '2026-05-12',
        items: [{ name: '30oz Quencher Custom — "Queen Mode"', qty: 2, price: 38 }],
        total: 76,
        status: 'delivered',
      },
      {
        id: 'QCC-10031',
        userEmail: email,
        date: '2026-05-28',
        items: [{ name: 'Custom 20oz Skinny — "Vibe"', qty: 1, price: 40 }],
        total: 40,
        status: 'shipped',
      },
      {
        id: 'QCC-10045',
        userEmail: email,
        date: '2026-06-01',
        items: [{ name: 'Custom 40oz Mega Tumbler', qty: 4, price: 38 }],
        total: 152,
        status: 'processing',
      },
    ];
    saveOrders([...existing, ...demo]);
  }

  /* ─── DOM Refs ───────────────────────────────────────────── */
  let overlay, modal, loginForm, signupForm, dashboard;
  let loginEmailInput, loginPassInput, loginError;
  let signupNameInput, signupEmailInput, signupPassInput, signupError;
  let tabs, authForms, authDashboard;

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    overlay   = document.getElementById('auth-overlay');
    modal     = document.getElementById('auth-modal');
    if (!overlay || !modal) return;

    loginForm   = document.getElementById('login-form');
    signupForm  = document.getElementById('signup-form');
    dashboard   = document.getElementById('auth-dashboard');

    loginEmailInput  = document.getElementById('login-email');
    loginPassInput   = document.getElementById('login-password');
    loginError       = document.getElementById('login-error');

    signupNameInput  = document.getElementById('signup-name');
    signupEmailInput = document.getElementById('signup-email');
    signupPassInput  = document.getElementById('signup-password');
    signupError      = document.getElementById('signup-error');

    // Close handlers
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
    const closeBtn = document.getElementById('auth-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Open modal buttons
    document.querySelectorAll('[data-open-auth]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const view = btn.dataset.openAuth || 'login';
        openModal(view);
      });
    });

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Form submissions
    if (loginForm)  loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    // Dashboard tabs
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
      tab.addEventListener('click', () => switchDashboardTab(tab.dataset.panel));
    });

    // Logout
    const logoutBtn = document.getElementById('dashboard-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Keyboard ESC to close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });

    // Auth overlay password toggle
    document.querySelectorAll('.toggle-pw').forEach(btn => {
      btn.addEventListener('click', () => {
        const inputId = btn.dataset.for;
        const input   = document.getElementById(inputId);
        if (!input) return;
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁';
        }
      });
    });

    // Restore session
    const session = getSession();
    if (session) {
      updateNavUserIcon(session);
    }

    // Expose to global scope
    window.openAuthModal  = openModal;
    window.closeAuthModal = closeModal;
    window.getAuthUser    = getSession;
    window.toggleWishlist = toggleWishlist;
  }

  /* ─── Modal open/close ───────────────────────────────────── */
  function openModal(view = 'login') {
    const session = getSession();
    if (session) {
      showDashboard(session);
    } else {
      showAuthForms(view);
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    clearErrors();
  }

  function showAuthForms(view) {
    if (loginForm)  loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.remove('active');
    if (dashboard)  dashboard.classList.remove('active');

    // Show tabs
    const tabsEl = document.getElementById('auth-tabs');
    if (tabsEl) tabsEl.style.display = '';

    if (view === 'signup') {
      if (signupForm) signupForm.classList.add('active');
      switchTab('signup');
    } else {
      if (loginForm) loginForm.classList.add('active');
      switchTab('login');
    }
  }

  function showDashboard(session) {
    if (loginForm)  loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.remove('active');
    if (dashboard)  dashboard.classList.add('active');

    // Hide auth tabs
    const tabsEl = document.getElementById('auth-tabs');
    if (tabsEl) tabsEl.style.display = 'none';

    // Populate dashboard header
    const nameEl  = document.getElementById('dashboard-name');
    const emailEl = document.getElementById('dashboard-email');
    if (nameEl)  nameEl.textContent  = session.name || 'Queen';
    if (emailEl) emailEl.textContent = session.email || '';

    // Load default panel
    switchDashboardTab('orders');
    renderOrders(session.email);
    renderWishlist();
    renderAddresses(session);
  }

  /* ─── Tab switching ──────────────────────────────────────── */
  function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    if (loginForm)  loginForm.classList.toggle('active',  tab === 'login');
    if (signupForm) signupForm.classList.toggle('active', tab === 'signup');
    clearErrors();
  }

  function switchDashboardTab(panel) {
    document.querySelectorAll('.dashboard-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.panel === panel);
    });
    document.querySelectorAll('.dashboard-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${panel}`);
    });
  }

  /* ─── Login ──────────────────────────────────────────────── */
  function handleLogin(e) {
    e.preventDefault();
    clearErrors();

    const email = loginEmailInput?.value.trim().toLowerCase();
    const pass  = loginPassInput?.value;

    if (!email || !pass) {
      showError(loginError, 'Please fill in all fields.');
      return;
    }

    const users = getUsers();
    const user  = users[email];

    if (!user) {
      showError(loginError, 'No account found with that email.');
      return;
    }

    if (user.password !== hashPass(pass)) {
      showError(loginError, 'Incorrect password. Try again.');
      return;
    }

    const session = { email: user.email, name: user.name, joinDate: user.joinDate };
    saveSession(session);
    seedDemoOrders(email);
    updateNavUserIcon(session);
    showDashboard(session);

    window.showToast && window.showToast(`Welcome back, ${user.name || 'Queen'}! 👑`, 'success');
  }

  /* ─── Sign Up ────────────────────────────────────────────── */
  function handleSignup(e) {
    e.preventDefault();
    clearErrors();

    const name  = signupNameInput?.value.trim();
    const email = signupEmailInput?.value.trim().toLowerCase();
    const pass  = signupPassInput?.value;

    if (!name || !email || !pass) {
      showError(signupError, 'Please fill in all fields.');
      return;
    }

    if (!validateEmail(email)) {
      showError(signupError, 'Please enter a valid email address.');
      return;
    }

    if (pass.length < 6) {
      showError(signupError, 'Password must be at least 6 characters.');
      return;
    }

    const users = getUsers();
    if (users[email]) {
      showError(signupError, 'An account with this email already exists.');
      return;
    }

    const newUser = {
      email,
      name,
      password: hashPass(pass),
      joinDate: new Date().toISOString().split('T')[0],
    };

    users[email] = newUser;
    saveUsers(users);

    const session = { email, name, joinDate: newUser.joinDate };
    saveSession(session);
    seedDemoOrders(email);
    updateNavUserIcon(session);
    showDashboard(session);

    window.showToast && window.showToast(`Welcome to the Queen Squad, ${name}! 👑`, 'success');
  }

  /* ─── Logout ─────────────────────────────────────────────── */
  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    updateNavUserIcon(null);
    closeModal();
    window.showToast && window.showToast('Logged out. See you next time, Queen!', 'info');
  }

  /* ─── Orders panel ───────────────────────────────────────── */
  function renderOrders(email) {
    const panel = document.getElementById('panel-orders');
    if (!panel) return;

    const orders = getOrders().filter(o => o.userEmail === email);
    if (!orders.length) {
      panel.innerHTML = '<p style="color:var(--text-3);font-size:0.9rem;text-align:center;padding:2rem 0;">No orders yet. Time to reign! 👑</p>';
      return;
    }

    panel.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-card-info">
          <div class="order-id">${o.id}</div>
          <div class="order-date">${formatDate(o.date)}</div>
          <div style="font-size:0.8rem;color:var(--text-3);margin-top:2px;">
            ${o.items.map(i => `${i.name} (×${i.qty})`).join(', ')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <span class="order-status status-${o.status}">${capitalize(o.status)}</span>
          <span class="order-total">$${o.total.toFixed(2)}</span>
        </div>
      </div>
    `).join('');
  }

  /* ─── Wishlist panel ─────────────────────────────────────── */
  function renderWishlist() {
    const panel = document.getElementById('panel-wishlist');
    if (!panel) return;
    const list = getWishlist();

    if (!list.length) {
      panel.innerHTML = '<p style="color:var(--text-3);font-size:0.9rem;text-align:center;padding:2rem 0;">Your wishlist is empty. Start saving your faves! ♥</p>';
      return;
    }

    panel.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;">
      ${list.map(item => `
        <div class="order-card">
          <div style="font-size:2rem;">${item.emoji || '🥤'}</div>
          <div class="order-card-info" style="flex:1;">
            <div class="order-id" style="font-size:0.9rem;">${item.name}</div>
            <div class="order-date">${item.sub || ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <span class="order-total">$${(item.price || 40).toFixed(2)}</span>
            <button onclick="window.removeFromWishlist('${item.id}')"
              style="font-size:0.72rem;color:var(--text-3);padding:4px 8px;border:1px solid var(--border);border-radius:20px;">
              Remove
            </button>
          </div>
        </div>
      `).join('')}
    </div>`;

    // Expose remove helper
    window.removeFromWishlist = function(id) {
      const updated = getWishlist().filter(w => w.id !== id);
      saveWishlist(updated);
      renderWishlist();
      updateWishlistCount();
    };
  }

  /* ─── Addresses panel ────────────────────────────────────── */
  function renderAddresses(session) {
    const panel = document.getElementById('panel-addresses');
    if (!panel) return;
    const users = getUsers();
    const user  = users[session.email];
    const address = user?.address;

    panel.innerHTML = `
      <div class="order-card" style="flex-direction:column;align-items:flex-start;gap:12px;">
        <div style="display:flex;justify-content:space-between;width:100%;">
          <strong style="font-size:0.9rem;color:var(--text);">Shipping Address</strong>
          <button id="edit-address-btn" style="font-size:0.78rem;color:var(--pink);font-weight:600;">
            ${address ? 'Edit' : 'Add Address'}
          </button>
        </div>
        <div id="address-display" style="font-size:0.85rem;color:var(--text-2);line-height:1.6;">
          ${address
            ? `${address.line1}<br>${address.city}, ${address.state} ${address.zip}<br>${address.country || 'USA'}`
            : '<em style="color:var(--text-3);">No address saved yet.</em>'}
        </div>
        <div id="address-form" style="display:none;flex-direction:column;gap:10px;width:100%;">
          <input id="addr-line1"  class="form-input" placeholder="Street address" style="font-size:0.85rem;" value="${address?.line1||''}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <input id="addr-city"  class="form-input" placeholder="City"  style="font-size:0.85rem;" value="${address?.city||''}">
            <input id="addr-state" class="form-input" placeholder="State" style="font-size:0.85rem;" value="${address?.state||''}">
          </div>
          <input id="addr-zip"   class="form-input" placeholder="ZIP Code" style="font-size:0.85rem;" value="${address?.zip||''}">
          <button id="save-address-btn" class="btn btn-primary btn-sm" style="align-self:flex-start;">Save Address</button>
        </div>
      </div>
    `;

    document.getElementById('edit-address-btn')?.addEventListener('click', () => {
      const formEl = document.getElementById('address-form');
      const dispEl = document.getElementById('address-display');
      if (formEl) formEl.style.display = formEl.style.display === 'none' ? 'flex' : 'none';
      if (dispEl) dispEl.style.display = dispEl.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('save-address-btn')?.addEventListener('click', () => {
      const newAddress = {
        line1: document.getElementById('addr-line1')?.value.trim() || '',
        city:  document.getElementById('addr-city')?.value.trim()  || '',
        state: document.getElementById('addr-state')?.value.trim() || '',
        zip:   document.getElementById('addr-zip')?.value.trim()   || '',
        country: 'USA',
      };
      const users2 = getUsers();
      if (users2[session.email]) {
        users2[session.email].address = newAddress;
        saveUsers(users2);
      }
      renderAddresses(session);
      window.showToast && window.showToast('Address saved!', 'success');
    });
  }

  /* ─── Wishlist toggle ────────────────────────────────────── */
  function toggleWishlist(item) {
    const list = getWishlist();
    const idx  = list.findIndex(w => w.id === item.id);
    if (idx !== -1) {
      list.splice(idx, 1);
      window.showToast && window.showToast('Removed from wishlist', 'info');
    } else {
      list.push(item);
      window.showToast && window.showToast('Added to wishlist! ♥', 'success');
    }
    saveWishlist(list);
    updateWishlistCount();
    return idx === -1; // true = added
  }

  function isWishlisted(id) {
    return getWishlist().some(w => w.id === id);
  }
  window.isWishlisted = isWishlisted;

  function updateWishlistCount() {
    const count = getWishlist().length;
    const el = document.getElementById('wishlist-count');
    if (el) {
      el.textContent  = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  /* ─── Nav icon update ────────────────────────────────────── */
  function updateNavUserIcon(session) {
    const btn = document.getElementById('nav-account-btn');
    if (!btn) return;
    if (session) {
      const initials = (session.name || '?')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      btn.innerHTML = `<span style="
        width:28px;height:28px;border-radius:50%;
        background:var(--pink);color:#fff;
        font-size:0.7rem;font-weight:700;
        display:flex;align-items:center;justify-content:center;"
      >${initials}</span>`;
      btn.title = `Signed in as ${session.name}`;
    } else {
      btn.innerHTML = '👤';
      btn.title = 'Login / Sign Up';
    }
  }

  /* ─── Utilities ──────────────────────────────────────────── */
  function hashPass(str) {
    // Simple hash — not cryptographic; for demo/localStorage only
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return `qcc_${Math.abs(h).toString(36)}`;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(el, msg) {
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function clearErrors() {
    [loginError, signupError].forEach(el => {
      if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
    // Clear inputs only on explicit tab switch, not every close
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* ─── Start ──────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
