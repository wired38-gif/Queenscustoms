/* ============================================================
   QUEENS CUSTOM CREATIONS — App Core (app.js)
   Cart drawer, coupon codes, filters, scroll animations,
   toast, search, mobile nav, dark mode, back-to-top,
   inspiration upload, TikTok embeds
   ============================================================ */

(function () {
  'use strict';

  /* ─── Cart State ─────────────────────────────────────────── */
  const CART_KEY = 'qcc_cart';
  let cartItems = [];

  /* ─── Coupon Definitions ──────────────────────────────────── */
  const COUPONS = {
    'QUEEN20':  { type: 'pct',   value: 20,  label: '20% off your first order' },
    'VIBE10':   { type: 'pct',   value: 10,  label: '10% welcome discount' },
    'QUEEN75':  { type: 'ship',  value: 0,   label: 'Free shipping on $75+' },
    'QUEEN50':  { type: 'flat',  value: 50,  label: '$50 off orders over $150' },
  };

  let appliedCoupon = null;

  /* ─── Product Catalog ─────────────────────────────────────── */
  const products = [
    {
      id: 'p1',
      name: 'Fairy Moon Dream',
      desc: 'White glitter skinny bottle with pink/purple marble pour and fairy silhouette on the moon. Pure magic.',
      price: 40,
      img: 'assets/products/fairy-moon.jpg',
      badge: 'Best Seller',
      urgency: true,
      category: 'glitter',
    },
    {
      id: 'p2',
      name: 'Walk By Faith',
      desc: '40oz handle mug — white glitter top, teal/black marble bottom, bold cross & scripture. Faith-forward.',
      price: 40,
      img: 'assets/products/walk-by-faith.jpg',
      badge: 'Fan Fave',
      urgency: false,
      category: 'custom',
    },
    {
      id: 'p3',
      name: 'Mountain Galaxy Bottle',
      desc: 'Wide-mouth bottle in purple/teal marble pour with mountain moonrise art. One-of-a-kind.',
      price: 40,
      img: 'assets/products/mountain-galaxy.jpg',
      badge: 'Limited',
      urgency: true,
      category: 'glitter',
    },
    {
      id: 'p4',
      name: 'Tropical Hibiscus Sunset',
      desc: 'Coral glitter skinny with deep blue hibiscus sunset art. Summer vibes year-round.',
      price: 40,
      img: 'assets/products/tropical-hibiscus.jpg',
      badge: null,
      urgency: false,
      category: 'glitter',
    },
    {
      id: 'p5',
      name: 'Pink Christmas Queen',
      desc: '40oz pink glitter handle mug with pink Christmas tree art and holographic snowflakes.',
      price: 40,
      img: 'assets/products/pink-christmas-tree-pink.jpg',
      badge: 'Seasonal',
      urgency: false,
      category: 'seasonal',
    },
    {
      id: 'p6',
      name: 'Mama & Mini Set',
      desc: 'Matching pink chunky glitter set — 40oz Mama mug + Mini mug. The cutest gift for mom.',
      price: 75,
      origPrice: 80,
      img: 'assets/products/mama-mini-set.jpg',
      badge: 'Set Deal',
      urgency: true,
      category: 'sets',
    },
    {
      id: 'p7',
      name: 'Wolf Glow-in-Dark',
      desc: 'Stunning UV glow tumbler — howling wolf scene glows electric blue in the dark. A showstopper.',
      price: 45,
      img: 'assets/products/wolf-glow.jpg',
      badge: 'New Arrival',
      urgency: true,
      category: 'glitter',
    },
    {
      id: 'p8',
      name: 'Back The Blue',
      desc: 'Bold blue marble epoxy pour tumbler with Back The Blue graphic. Perfect for the LEO in your life.',
      price: 40,
      img: 'assets/products/back-the-blue.jpg',
      badge: null,
      urgency: false,
      category: 'custom',
    },
    {
      id: 'p9',
      name: 'Grinch Face Wine Cup',
      desc: '12oz stemless wine cup — green chunky glitter with Grinch face vinyl. You know you love it.',
      price: 40,
      img: 'assets/products/grinch-face.jpg',
      badge: 'Seasonal',
      urgency: false,
      category: 'seasonal',
    },
    {
      id: 'p10',
      name: 'Psycho Path Skinny',
      desc: 'Pink chunky glitter 20oz with the iconic "Why Take The High Road" funny quote. Say it louder.',
      price: 40,
      img: 'assets/products/psycho-path.jpg',
      badge: 'Fan Fave',
      urgency: false,
      category: 'glitter',
    },
    {
      id: 'p11',
      name: 'Your Crazy Is Showing',
      desc: 'Rainbow marble 20oz skinny — bold colors, bold attitude. For the wildly unapologetic.',
      price: 40,
      img: 'assets/products/your-crazy.jpg',
      badge: null,
      urgency: false,
      category: 'glitter',
    },
    {
      id: 'p12',
      name: 'Blue Ocean Storm',
      desc: '40oz handle mug in teal, black and white marble epoxy pour. The ocean in your hand.',
      price: 40,
      img: 'assets/products/blue-ocean-storm.jpg',
      badge: null,
      urgency: false,
      category: 'glitter',
    },
    {
      id: 'p13',
      name: 'Freedom Skull Tumbler',
      desc: '30oz dark marble tumbler with patriotic skull cowboy art. Freedom isn't free — drink boldly.',
      price: 40,
      img: 'assets/products/freedom-skull.jpg',
      badge: null,
      urgency: false,
      category: 'custom',
    },
    {
      id: 'p14',
      name: "Don't Worry Be Hippie",
      desc: 'Purple holographic glitter skinny with rainbow sunflower and mushroom art. Peace, love, glitter.',
      price: 40,
      img: 'assets/products/dont-worry-hippie.jpg',
      badge: null,
      urgency: false,
      category: 'glitter',
    },
    {
      id: 'p15',
      name: 'Jack x Grinch Mashup',
      desc: 'Dark marble water bottle with the ultimate holiday villain mashup art. Collector piece.',
      price: 40,
      img: 'assets/products/jack-grinch-mashup.jpg',
      badge: 'Limited',
      urgency: true,
      category: 'seasonal',
    },
    {
      id: 'p16',
      name: 'Emerald Forest Bottle',
      desc: 'Wide-mouth bottle in rich green, black and silver epoxy swirl. Nature meets luxury.',
      price: 40,
      img: 'assets/products/emerald-forest.jpg',
      badge: null,
      urgency: false,
      category: 'glitter',
    },
  ];

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    loadCart();
    renderProducts('all');
    bindFilterBtns();
    bindCartDrawer();
    bindCoupon();
    bindSearch();
    bindMobileNav();
    bindDarkMode();
    bindScrollEffects();
    bindBackToTop();
    bindInspirationUpload();
    bindPromoCodeCopy();
    bindNavScroll();
    bindWishButtons();
    renderTikTokEmbeds();

    // Expose cart API
    window.addToCart    = addToCart;
    window.showToast    = showToast;
  }

  /* ─── Cart Storage ───────────────────────────────────────── */
  function loadCart() {
    try {
      cartItems = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      cartItems = [];
    }
    updateCartUI();
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }

  /* ─── Cart Logic ─────────────────────────────────────────── */
  function addToCart(item) {
    const existing = cartItems.find(c => c.id === item.id && !item.isCustom);
    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      cartItems.push({ ...item, qty: item.qty || 1 });
    }
    saveCart();
    updateCartUI();
    openCartDrawer();
  }

  function removeFromCart(id) {
    cartItems = cartItems.filter(c => c.id !== id);
    saveCart();
    updateCartUI();
    renderCartItems();
  }

  function updateCartQty(id, delta) {
    const item = cartItems.find(c => c.id === id);
    if (!item) return;
    item.qty = Math.max(1, (item.qty || 1) + delta);
    saveCart();
    updateCartUI();
    renderCartItems();
  }

  function cartSubtotal() {
    return cartItems.reduce((sum, item) => sum + (item.price || 40) * (item.qty || 1), 0);
  }

  function cartDiscount(subtotal) {
    if (!appliedCoupon) return 0;
    const c = COUPONS[appliedCoupon];
    if (!c) return 0;
    if (c.type === 'pct')  return (subtotal * c.value / 100);
    if (c.type === 'flat') return subtotal >= 150 ? c.value : 0;
    if (c.type === 'ship') return subtotal >= 75  ? 8.00    : 0;
    return 0;
  }

  /* ─── Cart UI ────────────────────────────────────────────── */
  function updateCartUI() {
    const totalItems = cartItems.reduce((s, i) => s + (i.qty || 1), 0);
    const countEl = document.querySelector('.cart-count');
    if (countEl) {
      countEl.textContent = totalItems;
      countEl.classList.toggle('visible', totalItems > 0);
    }
    renderCartItems();
  }

  function renderCartItems() {
    const container = document.getElementById('cart-items');
    const emptyEl   = document.getElementById('cart-empty');
    if (!container) return;

    if (!cartItems.length) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      updateCartTotals();
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    container.innerHTML = cartItems.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-img">${item.emoji || '🥤'}</div>
        <div class="cart-item-details">
          <div class="cart-item-name">${escHtml(item.name)}</div>
          ${item.sub ? `<div class="cart-item-sub">${escHtml(item.sub)}</div>` : ''}
          <div class="cart-item-controls">
            <button class="cart-qty-btn" onclick="qtyDown('${item.id}')">−</button>
            <span class="cart-qty-num">${item.qty || 1}</span>
            <button class="cart-qty-btn" onclick="qtyUp('${item.id}')">+</button>
          </div>
        </div>
        <span class="cart-item-price">$${((item.price || 40) * (item.qty || 1)).toFixed(2)}</span>
        <button class="cart-item-remove" onclick="removeItem('${item.id}')">✕</button>
      </div>
    `).join('');

    // Expose helpers to global scope for inline handlers
    window.qtyDown   = (id) => { updateCartQty(id, -1); };
    window.qtyUp     = (id) => { updateCartQty(id, +1); };
    window.removeItem = (id) => { removeFromCart(id); showToast('Item removed', 'info'); };

    updateCartTotals();
  }

  function updateCartTotals() {
    const sub      = cartSubtotal();
    const disc     = cartDiscount(sub);
    const total    = Math.max(0, sub - disc);

    const subEl    = document.getElementById('cart-subtotal-val');
    const discEl   = document.getElementById('cart-discount-val');
    const discRow  = document.getElementById('cart-discount-row');
    const totalEl  = document.getElementById('cart-total-val');

    if (subEl)   subEl.textContent   = `$${sub.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    if (discEl && discRow) {
      if (disc > 0) {
        discEl.textContent = `-$${disc.toFixed(2)}`;
        discRow.classList.add('show');
      } else {
        discRow.classList.remove('show');
      }
    }
  }

  /* ─── Cart Drawer ────────────────────────────────────────── */
  function bindCartDrawer() {
    const overlay    = document.getElementById('cart-overlay');
    const drawer     = document.getElementById('cart-drawer');
    const closeBtn   = document.getElementById('cart-close');
    const openBtns   = document.querySelectorAll('[data-open-cart]');

    openBtns.forEach(b => b.addEventListener('click', openCartDrawer));
    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
    if (overlay)  overlay.addEventListener('click', e => {
      if (e.target === overlay) closeCartDrawer();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer?.classList.contains('open')) closeCartDrawer();
    });

    // Checkout btn
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (!cartItems.length) { showToast('Your cart is empty!', 'error'); return; }
        const user = window.getAuthUser ? window.getAuthUser() : null;
        if (!user) {
          closeCartDrawer();
          window.openAuthModal && window.openAuthModal('login');
          showToast('Please sign in to complete your order', 'info');
        } else {
          showToast('Redirecting to checkout... 👑', 'success');
          // Future: redirect to checkout page
        }
      });
    }
  }

  function openCartDrawer() {
    const overlay = document.getElementById('cart-overlay');
    const drawer  = document.getElementById('cart-drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer)  drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCartItems();
  }

  function closeCartDrawer() {
    const overlay = document.getElementById('cart-overlay');
    const drawer  = document.getElementById('cart-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer)  drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ─── Coupon ─────────────────────────────────────────────── */
  function bindCoupon() {
    const input  = document.getElementById('coupon-input');
    const btn    = document.getElementById('coupon-apply');
    const msgEl  = document.getElementById('coupon-msg');

    if (!btn) return;
    btn.addEventListener('click', () => {
      const code = (input?.value || '').trim().toUpperCase();
      if (!code) { showCouponMsg(msgEl, 'Enter a coupon code', 'error'); return; }

      if (COUPONS[code]) {
        appliedCoupon = code;
        const c = COUPONS[code];
        showCouponMsg(msgEl, `✓ ${c.label} applied!`, 'success');
        if (input) input.value = code;
        btn.textContent = 'Applied ✓';
        btn.disabled = true;
        updateCartTotals();
        showToast(`Code "${code}" applied: ${c.label}`, 'success');
      } else {
        showCouponMsg(msgEl, 'Invalid code. Try QUEEN20, VIBE10, or QUEEN75', 'error');
      }
    });

    // Allow enter key
    if (input) {
      input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
    }
  }

  function showCouponMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'success' ? '#22c55e' : '#ef4444';
    el.style.display = 'block';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
  }

  /* ─── Promo code copy (announcement bar) ─────────────────── */
  function bindPromoCodeCopy() {
    document.querySelectorAll('.promo-code[data-code]').forEach(el => {
      el.addEventListener('click', () => {
        const code = el.dataset.code;
        navigator.clipboard?.writeText(code).catch(() => {});
        showToast(`Code "${code}" copied! Paste at checkout`, 'success');
      });
    });

    // Shop now button in promo banner
    const promoShopBtn = document.getElementById('promo-shop-btn');
    if (promoShopBtn) {
      promoShopBtn.addEventListener('click', () => {
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  /* ─── Product Rendering ──────────────────────────────────── */
  function renderProducts(filter) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const filtered = filter === 'all'
      ? products
      : products.filter(p => p.category === filter);

    grid.innerHTML = filtered.map((p, i) => `
      <div class="product-card fade-up stagger-${(i % 6) + 1}" data-category="${p.category}">
        <div class="product-img">
          ${p.img
            ? `<img src="${p.img}" alt="${p.name}" class="product-real-img" loading="lazy">`
            : `<div class="product-img-placeholder">${p.emoji || '✨'}</div>`
          }
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
          ${p.urgency ? `<span class="p-urgency">🔥 Only 1 Left!</span>` : ''}
          <button class="product-wish ${window.isWishlisted?.(p.id) ? 'wished' : ''}"
                  data-product-id="${p.id}"
                  data-product-name="${escHtml(p.name)}"
                  data-product-emoji="${p.emoji || '✨'}"
                  data-product-price="${p.price}"
                  onclick="handleWish(this)">
            ${window.isWishlisted?.(p.id) ? '♥' : '♡'}
          </button>
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.desc}</div>
          <div class="product-footer">
            <div>
              <span class="product-price">$${p.price.toFixed(2)}</span>
              ${p.origPrice ? `<span class="product-price-orig">$${p.origPrice.toFixed(2)}</span>` : ''}
            </div>
            <button class="product-add-btn"
              data-id="${p.id}" data-name="${escHtml(p.name)}"
              data-price="${p.price}" data-emoji="${p.emoji}"
              onclick="addFromCard(this)"
              aria-label="Add ${p.name} to cart">+</button>
          </div>
        </div>
      </div>
    `).join('');

    // Re-trigger scroll animations
    observeAnimations();

    // Global helpers for inline handlers
    window.addFromCard = function(btn) {
      const item = {
        id:    btn.dataset.id,
        name:  btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        emoji: btn.dataset.emoji,
        qty:   1,
      };
      addToCart(item);
      showToast(`${item.name} added to cart 🛍️`, 'success');
    };

    window.handleWish = function(btn) {
      const user = window.getAuthUser ? window.getAuthUser() : null;
      if (!user) {
        window.openAuthModal && window.openAuthModal('login');
        showToast('Sign in to save to your wishlist', 'info');
        return;
      }
      const item = {
        id:    btn.dataset.productId,
        name:  btn.dataset.productName,
        emoji: btn.dataset.productEmoji,
        price: parseFloat(btn.dataset.productPrice),
      };
      const added = window.toggleWishlist ? window.toggleWishlist(item) : false;
      btn.textContent = added ? '♥' : '♡';
      btn.classList.toggle('wished', added);
    };
  }

  /* ─── Filters ────────────────────────────────────────────── */
  function bindFilterBtns() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(btn.dataset.filter || 'all');
      });
    });
  }

  /* ─── Wishlist count badge ────────────────────────────────── */
  function bindWishButtons() {
    // Wishlist count in nav
    const wishEl = document.getElementById('wishlist-count');
    const wList  = JSON.parse(localStorage.getItem('qcc_wishlist') || '[]');
    if (wishEl && wList.length) {
      wishEl.textContent  = wList.length;
      wishEl.style.display = 'flex';
    }
  }

  /* ─── Search ─────────────────────────────────────────────── */
  function bindSearch() {
    const searchBar   = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');
    const openBtn     = document.getElementById('search-open-btn');
    const closeBtn    = document.getElementById('search-close-btn');

    if (!searchBar) return;

    openBtn?.addEventListener('click', () => {
      searchBar.classList.add('open');
      searchInput?.focus();
    });

    closeBtn?.addEventListener('click', () => {
      searchBar.classList.remove('open');
      if (searchInput) searchInput.value = '';
    });

    searchInput?.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeBtn?.click();
      if (e.key === 'Enter') {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) return;
        const match = products.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
        renderProducts('all');
        const grid = document.getElementById('products-grid');
        if (grid && match.length < products.length) {
          grid.querySelectorAll('.product-card').forEach(card => {
            const name = card.querySelector('.product-name')?.textContent.toLowerCase() || '';
            card.style.display = name.includes(q) ? '' : 'none';
          });
        }
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
        closeBtn?.click();
      }
    });
  }

  /* ─── Mobile Nav ─────────────────────────────────────────── */
  function bindMobileNav() {
    const burger    = document.getElementById('ham-btn');
    const mobileNav = document.getElementById('mob-nav');
    const overlay   = document.getElementById('mob-overlay');
    const closeBtn  = document.getElementById('mob-close');

    if (!burger || !mobileNav) return;

    function openNav() {
      mobileNav.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeNav() {
      mobileNav.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', openNav);
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (overlay) overlay.addEventListener('click', closeNav);

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeNav);
    });
  }

  /* ─── Dark Mode ──────────────────────────────────────────── */
  function bindDarkMode() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;

    const saved = localStorage.getItem('qcc_theme') || 'light';
    applyTheme(saved);

    btn.addEventListener('click', () => {
      const curr = document.documentElement.dataset.theme || 'light';
      const next = curr === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('qcc_theme', next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  /* ─── Nav scroll effect ──────────────────────────────────── */
  function bindNavScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ─── Scroll Animations ──────────────────────────────────── */
  function bindScrollEffects() {
    // Add fade-up class to section children
    document.querySelectorAll('.section-header, .product-card, .collection-card, .marketplace-card, .about-stat, .trust-item').forEach(el => {
      if (!el.classList.contains('fade-up')) el.classList.add('fade-up');
    });
    observeAnimations();
  }

  function observeAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up, .fade-in').forEach(el => {
      observer.observe(el);
    });
  }

  /* ─── Back to Top ────────────────────────────────────────── */
  function bindBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Inspiration Upload ─────────────────────────────────── */
  function bindInspirationUpload() {
    const zone      = document.getElementById('inspiration-upload-zone');
    const input     = document.getElementById('inspiration-file-input');
    const previews  = document.getElementById('inspiration-previews');
    const submitBtn = document.getElementById('inspiration-submit');
    const moodChips = document.querySelectorAll('.mood-chip');

    if (!zone) return;

    // Drag events
    ['dragenter', 'dragover'].forEach(ev => {
      zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
      zone.addEventListener(ev, () => zone.classList.remove('dragover'));
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    });

    input?.addEventListener('change', () => handleFiles(input.files));

    function handleFiles(files) {
      const allowed = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 3);
      if (!allowed.length) { showToast('Please upload image files (PNG, JPG, WEBP)', 'error'); return; }
      if (!previews) return;

      previews.innerHTML = '';
      allowed.forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.className = 'upload-preview-img';
          img.alt = 'Inspiration image';
          previews.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
      showToast(`${allowed.length} image${allowed.length > 1 ? 's' : ''} uploaded!`, 'success');
    }

    // Mood chips
    moodChips.forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
      });
    });

    // Submit
    submitBtn?.addEventListener('click', () => {
      const mood = Array.from(document.querySelectorAll('.mood-chip.selected'))
        .map(c => c.textContent.trim())
        .join(', ');
      const vision  = document.getElementById('inspiration-vision')?.value.trim() || '';
      const hasImg  = previews && previews.children.length > 0;

      if (!hasImg && !vision && !mood) {
        showToast('Add at least one image, mood, or description', 'error');
        return;
      }

      // Save to localStorage (simulate order request)
      const req = {
        id: `INS-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        mood,
        vision,
        images: hasImg ? previews.children.length : 0,
        status: 'Pending review',
      };
      const existing = JSON.parse(localStorage.getItem('qcc_inspiration') || '[]');
      existing.push(req);
      localStorage.setItem('qcc_inspiration', JSON.stringify(existing));

      showToast('Inspiration request sent to the artist! 🎨 She\'ll reach out soon.', 'success');

      // Reset
      if (previews) previews.innerHTML = '';
      if (input) input.value = '';
      moodChips.forEach(c => c.classList.remove('selected'));
      const visionEl = document.getElementById('inspiration-vision');
      if (visionEl) visionEl.value = '';
    });
  }

  /* ─── TikTok Embeds ──────────────────────────────────────── */
  function renderTikTokEmbeds() {
    const grid = document.getElementById('tiktok-grid');
    if (!grid) return;

    // Placeholder tiles with real TikTok profile link
    const tiktokUrl = 'https://www.tiktok.com/@the_vibe_queen_hbic';

    const tiles = [
      { bg: 'linear-gradient(135deg,#FF1A8C,#7B1FA2)', emoji: '🎨', label: 'Custom tumbler process ✨', likes: '3.2K likes' },
      { bg: 'linear-gradient(135deg,#0d0d0d,#FFD600)', emoji: '👑', label: 'New drop: Rose Gold Queen', likes: '5.1K likes' },
      { bg: 'linear-gradient(135deg,#00897B,#CE93D8)', emoji: '✨', label: 'Glitter pour satisfying ASMR', likes: '8.9K likes' },
    ];

    grid.innerHTML = tiles.map(t => `
      <a href="${tiktokUrl}" target="_blank" rel="noopener" class="tiktok-card" aria-label="Watch on TikTok">
        <div class="tiktok-card-bg" style="background:${t.bg};display:flex;align-items:center;justify-content:center;">
          <span style="font-size:5rem;">${t.emoji}</span>
        </div>
        <div class="tiktok-play">▶</div>
        <div class="tiktok-card-overlay">
          <div class="tiktok-card-info">
            <p>${t.label}</p>
            <p class="likes">${t.likes} · @the_vibe_queen_hbic</p>
          </div>
        </div>
      </a>
    `).join('');

    // TikTok follow button
    const followBtn = document.getElementById('tiktok-follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        window.open(tiktokUrl, '_blank', 'noopener');
      });
    }
  }

  /* ─── Toast ──────────────────────────────────────────────── */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ'}</div>
      <span>${escHtml(message)}</span>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  /* ─── Newsletter form ────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newsletter-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const email = input?.value.trim();
        if (!email) return;
        const subs = JSON.parse(localStorage.getItem('qcc_subscribers') || '[]');
        if (!subs.includes(email)) subs.push(email);
        localStorage.setItem('qcc_subscribers', JSON.stringify(subs));
        showToast('You\'re on the VIP list, Queen! 👑', 'success');
        if (input) input.value = '';
      });
    }

    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', e => {
        e.preventDefault();
        showToast('Message sent! The Vibe Queen will reply soon 💌', 'success');
        contactForm.reset();
      });
    }

    // Active nav link highlight on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks  = document.querySelectorAll('.nav-links a[href^="#"]');

    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(sec => navObserver.observe(sec));
  });

  /* ─── Utility ────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Start ──────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

/* ── DIY Kit Add to Cart ─────────────────────────────── */
window.addDIYKit = function() {
  const item = {
    id: 'diy-kit-10',
    name: 'Custom DIY Shopping List & Instruction Kit',
    price: 10,
    emoji: '📋',
    qty: 1,
  };
  if (typeof addToCart === 'function') {
    addToCart(item);
    showToast('DIY Kit added to cart — DM us your design vision after checkout!', 'success');
  } else {
    window.addToCart && window.addToCart(item);
    window.showToast && window.showToast('DIY Kit added to cart!', 'success');
  }
};

/* ══════════════════════════════════════════════════════════
   WISHLIST / PRODUCT VOTE
   ══════════════════════════════════════════════════════════ */
(function() {
  const WISH_KEY = 'qcc_wishes';
  const VOTED_KEY = 'qcc_voted';

  function loadWishes() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || {}; } catch(_) { return {}; }
  }

  function saveWishes(w) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(w)); } catch(_) {}
  }

  function loadVoted() {
    try { return JSON.parse(localStorage.getItem(VOTED_KEY)) || []; } catch(_) { return []; }
  }

  function saveVoted(v) {
    try { localStorage.setItem(VOTED_KEY, JSON.stringify(v)); } catch(_) {}
  }

  function renderCounts() {
    const wishes = loadWishes();
    document.querySelectorAll('.wish-item[data-item]').forEach(btn => {
      const key = btn.dataset.item;
      if (key === 'custom') return;
      const count = wishes[key] || 0;
      const countEl = btn.querySelector('.wish-count');
      if (countEl) countEl.textContent = count;
      const voted = loadVoted();
      if (voted.includes(key)) {
        btn.classList.add('wish-item--voted');
        const vb = btn.querySelector('.wish-vote-btn');
        if (vb) vb.textContent = 'Voted ♥';
      }
    });
    renderLeaderboard(wishes);
  }

  function renderLeaderboard(wishes) {
    const lb = document.getElementById('wishlist-leaderboard');
    if (!lb) return;
    const sorted = Object.entries(wishes)
      .filter(([,v]) => v > 0)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 5);
    if (sorted.length === 0) {
      lb.innerHTML = '<p class="board-empty">Be the first to vote! Every vote tells The Vibe Queen what to make next.</p>';
      return;
    }
    lb.innerHTML = sorted.map(([name, count], i) => `
      <div class="board-row">
        <span class="board-rank">${['👑','✨','🔥','⭐','💫'][i] || (i+1)}</span>
        <span class="board-name">${name}</span>
        <span class="board-count">${count} vote${count !== 1 ? 's' : ''}</span>
      </div>
    `).join('');
  }

  window.voteWish = function(btn) {
    const key = btn.dataset.item;
    if (!key || key === 'custom') return;
    const voted = loadVoted();
    if (voted.includes(key)) {
      window.showToast && window.showToast('You already voted for this one! 👑', 'info');
      return;
    }
    const wishes = loadWishes();
    wishes[key] = (wishes[key] || 0) + 1;
    saveWishes(wishes);
    voted.push(key);
    saveVoted(voted);
    renderCounts();
    window.showToast && window.showToast(`Vote cast for "${key}"! 🗳️`, 'success');
  };

  window.openSuggest = function() {
    const bar = document.getElementById('suggest-bar');
    if (bar) { bar.style.display = 'block'; bar.querySelector('input')?.focus(); }
  };

  window.closeSuggest = function() {
    const bar = document.getElementById('suggest-bar');
    if (bar) bar.style.display = 'none';
  };

  window.submitSuggest = function() {
    const input = document.getElementById('suggest-input');
    const val = input?.value?.trim();
    if (!val) return;
    const wishes = loadWishes();
    wishes[val] = (wishes[val] || 0) + 1;
    const voted = loadVoted();
    voted.push(val);
    saveWishes(wishes);
    saveVoted(voted);
    input.value = '';
    window.closeSuggest();
    renderCounts();
    window.showToast && window.showToast(`"${val}" submitted! The Vibe Queen will see it. 👑`, 'success');
  };

  // Init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCounts);
  } else {
    renderCounts();
  }
})();

/* ── About video toggle ──────────────────────────────── */
window.toggleVid = function(btn) {
  const wrap = btn.closest('.about-video-wrap');
  const video = wrap.querySelector('video');
  if (!video) return;
  if (video.paused) {
    video.play();
    wrap.classList.add('playing');
    btn.textContent = '⏸';
  } else {
    video.pause();
    wrap.classList.remove('playing');
    btn.textContent = '▶';
  }
};
