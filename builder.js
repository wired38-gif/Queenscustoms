/* ============================================================
   QUEENS CUSTOM CREATIONS — Tumbler Builder (builder.js)
   Interactive configurator: cup selection, color, glitter,
   theme, personalization, live SVG preview, pricing
   ============================================================ */

(function () {
  'use strict';

  /* ─── State ─────────────────────────────────────────────── */
  const state = {
    step: 1,
    cup: null,
    qty: 1,
    baseColor: null,
    glitter: null,
    theme: null,
    name: '',
    font: 'script',
    notes: '',
    totalStepsComplete: 0,
  };

  /* ─── Pricing ────────────────────────────────────────────── */
  const PRICE_SINGLE = 40;
  const PRICE_BULK_4 = 38;
  const PRICE_BULK_12 = 35;

  function unitPrice(qty) {
    if (qty >= 12) return PRICE_BULK_12;
    if (qty >= 4)  return PRICE_BULK_4;
    return PRICE_SINGLE;
  }

  function totalPrice(qty) {
    return (unitPrice(qty) * qty).toFixed(2);
  }

  /* ─── Cup Definitions ────────────────────────────────────── */
  const cups = [
    { id: 'skinny20',  icon: '🥤', name: '20oz Skinny',    oz: '20oz',  svgPath: 'M60,20 L80,20 L90,280 L50,280 Z' },
    { id: 'quencher30',icon: '☕', name: '30oz Quencher',  oz: '30oz',  svgPath: 'M40,30 Q40,10 70,10 Q100,10 100,30 L110,270 Q110,285 70,285 Q30,285 30,270 Z' },
    { id: 'mega40',    icon: '🫙', name: '40oz Mega',      oz: '40oz',  svgPath: 'M35,25 L105,25 L115,275 L25,275 Z' },
    { id: 'wine20',    icon: '🍷', name: '20oz Wine',      oz: '20oz',  svgPath: 'M55,20 L85,20 L95,130 L105,280 L35,280 L45,130 Z' },
    { id: 'pint16',    icon: '🍺', name: '16oz Pint',      oz: '16oz',  svgPath: 'M50,30 L90,30 L95,250 L45,250 Z' },
    { id: 'mini12',    icon: '🧸', name: '12oz Kids/Mini', oz: '12oz',  svgPath: 'M58,35 L82,35 L88,220 L52,220 Z' },
  ];

  /* ─── Color Palette ──────────────────────────────────────── */
  const colors = [
    { id: 'hot-pink',      hex: '#FF1A8C', label: 'Hot Pink' },
    { id: 'rose-gold',     hex: '#C9956B', label: 'Rose Gold' },
    { id: 'black',         hex: '#0d0d0d', label: 'Midnight Black' },
    { id: 'white',         hex: '#F5F5F5', label: 'Pearl White' },
    { id: 'red',           hex: '#E53935', label: 'Cherry Red' },
    { id: 'navy',          hex: '#1A237E', label: 'Navy Blue' },
    { id: 'teal',          hex: '#00897B', label: 'Teal' },
    { id: 'purple',        hex: '#7B1FA2', label: 'Royal Purple' },
    { id: 'gold',          hex: '#FFD600', label: 'Gold' },
    { id: 'silver',        hex: '#9E9E9E', label: 'Silver' },
    { id: 'orange',        hex: '#F4511E', label: 'Burnt Orange' },
    { id: 'sky',           hex: '#29B6F6', label: 'Sky Blue' },
    { id: 'lime',          hex: '#AED638', label: 'Lime Green' },
    { id: 'nude',          hex: '#E8D5C0', label: 'Nude/Blush' },
    { id: 'lavender',      hex: '#CE93D8', label: 'Lavender' },
    { id: 'forest',        hex: '#2E7D32', label: 'Forest Green' },
    { id: 'pink-purple',   hex: 'linear-gradient(135deg,#FF1A8C,#7B1FA2)', label: 'Pink→Purple Ombré', isGradient: true },
    { id: 'pink-white',    hex: 'linear-gradient(135deg,#FF1A8C,#ffffff)', label: 'Pink→White Ombré', isGradient: true },
    { id: 'black-gold',    hex: 'linear-gradient(135deg,#0d0d0d,#FFD600)', label: 'Black→Gold Ombré', isGradient: true },
    { id: 'navy-gold',     hex: 'linear-gradient(135deg,#1A237E,#FFD600)', label: 'Navy→Gold Ombré', isGradient: true },
    { id: 'teal-gold',     hex: 'linear-gradient(135deg,#00897B,#FFD600)', label: 'Teal→Gold Ombré', isGradient: true },
    { id: 'rainbow',       hex: 'linear-gradient(135deg,#FF1A8C,#FF9800,#FFD600,#00BCD4,#7B1FA2)', label: 'Rainbow', isGradient: true },
  ];

  /* ─── Glitter Types ──────────────────────────────────────── */
  const glitters = [
    { id: 'fine',        icon: '✨', name: 'Fine Glitter',       sub: 'Subtle sparkle' },
    { id: 'chunky',      icon: '⭐', name: 'Chunky Glitter',     sub: 'Bold statement' },
    { id: 'opal',        icon: '🌈', name: 'Chunky Opal',        sub: 'Colorshift effect' },
    { id: 'holographic', icon: '💫', name: 'Holographic',        sub: 'Rainbow laser' },
    { id: 'chameleon',   icon: '🦎', name: 'Chameleon Flakes',   sub: 'Color-shifting' },
    { id: 'glow',        icon: '🌙', name: 'Glow in the Dark',   sub: 'Lights up at night' },
    { id: 'chrome',      icon: '🪞', name: 'Metallic Chrome',    sub: 'Mirror finish' },
    { id: 'none',        icon: '⬜', name: 'No Glitter',         sub: 'Clean & classic' },
  ];

  /* ─── Design Themes ──────────────────────────────────────── */
  const themes = [
    { id: 'queen',    emoji: '👑', name: 'Queen Energy' },
    { id: 'floral',   emoji: '🌸', name: 'Floral Dream' },
    { id: 'galaxy',   emoji: '🌌', name: 'Galaxy' },
    { id: 'boho',     emoji: '🌿', name: 'Boho Chic' },
    { id: 'mermaid',  emoji: '🧜', name: 'Mermaid Vibes' },
    { id: 'minimal',  emoji: '⬜', name: 'Minimal Luxe' },
    { id: 'birthday', emoji: '🎂', name: 'Birthday Glam' },
    { id: 'holiday',  emoji: '🎄', name: 'Holiday/Season' },
    { id: 'sports',   emoji: '⚡', name: 'Sports Fan' },
    { id: 'custom',   emoji: '🎨', name: 'Custom / My Own' },
  ];

  /* ─── Font options ───────────────────────────────────────── */
  const fonts = [
    { id: 'script',   label: 'Script (Cursive)' },
    { id: 'serif',    label: 'Elegant Serif' },
    { id: 'block',    label: 'Bold Block' },
    { id: 'modern',   label: 'Modern Sans' },
  ];

  /* ─── DOM Refs ───────────────────────────────────────────── */
  let builderSection, stepEls, previewSvg, previewLabel, summaryEls,
      qtyDisplay, qtyPriceTag, qtyBreakdown;

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    builderSection = document.getElementById('builder');
    if (!builderSection) return;

    renderCupGrid();
    renderColorGrid();
    renderGlitterGrid();
    renderThemeGrid();
    renderFontSelect();
    bindStepHeaders();
    bindQtyControls();
    bindPersonalization();
    bindBuilderCTA();
    updatePreview();
    updateSummary();
    openStep(1);
  }

  /* ─── Step accordion ─────────────────────────────────────── */
  function bindStepHeaders() {
    document.querySelectorAll('.step-header').forEach(header => {
      header.addEventListener('click', () => {
        const step = parseInt(header.closest('.builder-step').dataset.step);
        openStep(step === state.step ? 0 : step);
      });
    });
  }

  function openStep(num) {
    state.step = num;
    document.querySelectorAll('.builder-step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle('active', s === num);
    });
  }

  function markStepDone(stepNum) {
    const el = document.querySelector(`.builder-step[data-step="${stepNum}"] .step-check`);
    if (el) el.classList.add('done');
    el && (el.textContent = '✓');
  }

  /* ─── Cup Grid ───────────────────────────────────────────── */
  function renderCupGrid() {
    const grid = document.getElementById('cup-grid');
    if (!grid) return;
    grid.innerHTML = cups.map(c => `
      <div class="cup-option" data-cup="${c.id}" role="radio" aria-label="${c.name}" tabindex="0">
        <span class="cup-icon">${c.icon}</span>
        <div class="cup-name">${c.name}</div>
        <div class="cup-oz">${c.oz}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.cup-option').forEach(el => {
      el.addEventListener('click', () => selectCup(el.dataset.cup, el));
      el.addEventListener('keydown', e => e.key === 'Enter' && selectCup(el.dataset.cup, el));
    });
  }

  function selectCup(id, el) {
    state.cup = id;
    document.querySelectorAll('.cup-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    markStepDone(1);
    updatePreview();
    updateSummary();
    openStep(2);
  }

  /* ─── Quantity Controls ──────────────────────────────────── */
  function bindQtyControls() {
    qtyDisplay   = document.getElementById('qty-display');
    qtyPriceTag  = document.getElementById('qty-price-tag');
    qtyBreakdown = document.getElementById('qty-breakdown');

    const btnMinus = document.getElementById('qty-minus');
    const btnPlus  = document.getElementById('qty-plus');

    if (btnMinus) {
      btnMinus.addEventListener('click', () => {
        if (state.qty > 1) { state.qty--; updateQty(); }
      });
    }
    if (btnPlus) {
      btnPlus.addEventListener('click', () => {
        if (state.qty < 99) { state.qty++; updateQty(); }
      });
    }

    updateQty();
  }

  function updateQty() {
    if (qtyDisplay)   qtyDisplay.textContent   = state.qty;
    if (qtyPriceTag)  qtyPriceTag.textContent  = `$${totalPrice(state.qty)}`;
    if (qtyBreakdown) {
      const up = unitPrice(state.qty);
      let msg = `$${up.toFixed(2)} each`;
      if (state.qty >= 12)     msg += ' — Bulk 12+ rate';
      else if (state.qty >= 4) msg += ' — Bulk 4–11 rate';
      else                     msg += ' — Standard rate';
      qtyBreakdown.textContent = msg;
    }
    markStepDone(2);
    updateSummary();
  }

  /* ─── Color Grid ─────────────────────────────────────────── */
  function renderColorGrid() {
    const grid = document.getElementById('color-grid');
    if (!grid) return;
    grid.innerHTML = colors.map(c => {
      const bg = c.isGradient ? c.hex : `#${c.hex.replace('#','')}`;
      return `
        <div class="color-swatch" data-color="${c.id}"
             style="background:${c.isGradient ? c.hex : c.hex}"
             data-tooltip="${c.label}"
             role="radio" aria-label="${c.label}" tabindex="0"></div>
      `;
    }).join('');

    grid.querySelectorAll('.color-swatch').forEach(el => {
      el.addEventListener('click', () => selectColor(el.dataset.color, el));
      el.addEventListener('keydown', e => e.key === 'Enter' && selectColor(el.dataset.color, el));
    });
  }

  function selectColor(id, el) {
    state.baseColor = id;
    document.querySelectorAll('.color-swatch').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    markStepDone(3);
    updatePreview();
    updateSummary();
    openStep(4);
  }

  /* ─── Glitter Grid ───────────────────────────────────────── */
  function renderGlitterGrid() {
    const grid = document.getElementById('glitter-grid');
    if (!grid) return;
    grid.innerHTML = glitters.map(g => `
      <div class="glitter-option" data-glitter="${g.id}" role="radio" aria-label="${g.name}" tabindex="0">
        <span class="glitter-icon">${g.icon}</span>
        <div>
          <div class="glitter-label">${g.name}</div>
          <div class="glitter-sub">${g.sub}</div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.glitter-option').forEach(el => {
      el.addEventListener('click', () => selectGlitter(el.dataset.glitter, el));
      el.addEventListener('keydown', e => e.key === 'Enter' && selectGlitter(el.dataset.glitter, el));
    });
  }

  function selectGlitter(id, el) {
    state.glitter = id;
    document.querySelectorAll('.glitter-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    markStepDone(4);
    updateSummary();
    openStep(5);
  }

  /* ─── Theme Grid ─────────────────────────────────────────── */
  function renderThemeGrid() {
    const grid = document.getElementById('theme-grid');
    if (!grid) return;
    grid.innerHTML = themes.map(t => `
      <div class="theme-option" data-theme="${t.id}" role="radio" aria-label="${t.name}" tabindex="0">
        <span class="theme-emoji">${t.emoji}</span>
        <span class="theme-name">${t.name}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.theme-option').forEach(el => {
      el.addEventListener('click', () => selectTheme(el.dataset.theme, el));
      el.addEventListener('keydown', e => e.key === 'Enter' && selectTheme(el.dataset.theme, el));
    });
  }

  function selectTheme(id, el) {
    state.theme = id;
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    markStepDone(5);
    updateSummary();
    openStep(6);
  }

  /* ─── Font Select ────────────────────────────────────────── */
  function renderFontSelect() {
    const sel = document.getElementById('font-select');
    if (!sel) return;
    sel.innerHTML = fonts.map(f => `<option value="${f.id}">${f.label}</option>`).join('');
    sel.addEventListener('change', () => {
      state.font = sel.value;
      updatePreview();
    });
  }

  /* ─── Personalization ────────────────────────────────────── */
  function bindPersonalization() {
    const nameInput  = document.getElementById('tumbler-name');
    const notesInput = document.getElementById('tumbler-notes');

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        state.name = nameInput.value;
        updatePreview();
        if (state.name.trim()) markStepDone(6);
      });
    }
    if (notesInput) {
      notesInput.addEventListener('input', () => {
        state.notes = notesInput.value;
      });
    }
  }

  /* ─── Live SVG Preview ───────────────────────────────────── */
  function updatePreview() {
    const area = document.getElementById('preview-area');
    if (!area) return;

    const cup = cups.find(c => c.id === state.cup) || cups[0];
    const color = colors.find(c => c.id === state.baseColor);
    const theme = themes.find(t => t.id === state.theme);
    const glitter = glitters.find(g => g.id === state.glitter);

    const fillColor = color ? (color.isGradient ? 'url(#cupGrad)' : color.hex) : '#FF1A8C';
    const gradientDef = (color && color.isGradient) ? buildGradientDef(color.hex) : '';
    const hasGlitter = glitter && glitter.id !== 'none';
    const sparkles = hasGlitter ? generateSparkles(12) : '';
    const displayName = state.name || 'Your Name';
    const themeMark = theme ? theme.emoji : '✨';

    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 300" width="140" height="300">
  <defs>
    ${gradientDef}
    <filter id="dropShadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
    <filter id="glitterFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
      <feColorMatrix type="matrix"
        values="0 0 0 0 1  0 0 0 0 0.4  0 0 0 0 0.6  0 0 0 0.4 0"
        in="noise" result="coloredNoise"/>
      <feBlend in="SourceGraphic" in2="coloredNoise" mode="screen"/>
    </filter>
    <clipPath id="cupClip">
      <path d="${cup.svgPath}"/>
    </clipPath>
  </defs>

  <!-- Cup body -->
  <g filter="url(#dropShadow)">
    <path d="${cup.svgPath}" fill="${fillColor}" opacity="0.95"/>
  </g>

  <!-- Glitter overlay -->
  ${hasGlitter ? `<g clip-path="url(#cupClip)" opacity="0.6" filter="url(#glitterFilter)">
    <path d="${cup.svgPath}" fill="rgba(255,255,255,0.15)"/>
    ${sparkles}
  </g>` : ''}

  <!-- Highlight sheen -->
  <g clip-path="url(#cupClip)">
    <ellipse cx="45" cy="80" rx="12" ry="40" fill="rgba(255,255,255,0.25)" transform="rotate(-10,45,80)"/>
    <ellipse cx="38" cy="60" rx="5" ry="20" fill="rgba(255,255,255,0.3)" transform="rotate(-10,38,60)"/>
  </g>

  <!-- Cup outline -->
  <path d="${cup.svgPath}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>

  <!-- Theme icon -->
  <text x="70" y="140" text-anchor="middle" font-size="22" opacity="0.9">${themeMark}</text>

  <!-- Personalization text -->
  <text x="70" y="175"
    text-anchor="middle"
    font-family="${getFontFamily(state.font)}"
    font-size="${displayName.length > 10 ? '9' : '11'}"
    fill="rgba(255,255,255,0.95)"
    font-weight="${state.font === 'block' ? '700' : '400'}"
    letter-spacing="${state.font === 'block' ? '1' : '0.5'}">
    ${escapeXml(displayName)}
  </text>

  <!-- Crown decoration at top -->
  <text x="70" y="38" text-anchor="middle" font-size="14" opacity="0.85">♛</text>
</svg>`;

    area.innerHTML = svgContent;

    // Update label
    const labelEl = document.getElementById('preview-label');
    if (labelEl) {
      labelEl.querySelector('.cup-type').textContent =
        cup ? cup.name : 'Select a cup style';
      const persEl = labelEl.querySelector('.cup-personalization');
      if (persEl) persEl.textContent = state.name || '';
    }
  }

  function buildGradientDef(gradientStr) {
    // Parse linear-gradient colors for SVG
    const colors = extractGradientColors(gradientStr);
    if (!colors.length) return '';
    const stops = colors.map((c, i) =>
      `<stop offset="${Math.round(i / (colors.length - 1) * 100)}%" stop-color="${c}"/>`
    ).join('');
    return `<linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">${stops}</linearGradient>`;
  }

  function extractGradientColors(grad) {
    const matches = grad.match(/#[0-9a-fA-F]{3,6}/g) || [];
    return matches;
  }

  function generateSparkles(count) {
    const sparkles = [];
    for (let i = 0; i < count; i++) {
      const x = 30 + Math.random() * 80;
      const y = 30 + Math.random() * 240;
      const size = 1 + Math.random() * 3;
      sparkles.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="rgba(255,255,255,0.8)"/>`
      );
    }
    return sparkles.join('');
  }

  function getFontFamily(fontId) {
    const map = {
      script: "'Dancing Script', cursive",
      serif:  "'Georgia', serif",
      block:  "'Arial Black', sans-serif",
      modern: "'Arial', sans-serif",
    };
    return map[fontId] || "'Georgia', serif";
  }

  function escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─── Order Summary ──────────────────────────────────────── */
  function updateSummary() {
    const cup    = cups.find(c => c.id === state.cup);
    const color  = colors.find(c => c.id === state.baseColor);
    const glitter = glitters.find(g => g.id === state.glitter);
    const theme  = themes.find(t => t.id === state.theme);
    const up     = unitPrice(state.qty);
    const total  = totalPrice(state.qty);

    setEl('summary-cup',     cup     ? cup.name          : '—');
    setEl('summary-qty',     state.qty);
    setEl('summary-color',   color   ? color.label       : '—');
    setEl('summary-glitter', glitter ? glitter.name      : '—');
    setEl('summary-theme',   theme   ? theme.name        : '—');
    setEl('summary-name',    state.name || '—');
    setEl('summary-unit',    `$${up.toFixed(2)}`);
    setEl('summary-total',   `$${total}`);
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ─── Builder CTA ────────────────────────────────────────── */
  function bindBuilderCTA() {
    const btn = document.getElementById('builder-add-cart');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!state.cup) {
        window.showToast && window.showToast('Please select a cup style first', 'error');
        openStep(1);
        return;
      }
      if (!state.baseColor) {
        window.showToast && window.showToast('Please choose a base color', 'error');
        openStep(3);
        return;
      }

      const cup    = cups.find(c => c.id === state.cup);
      const color  = colors.find(c => c.id === state.baseColor);
      const glitter = glitters.find(g => g.id === state.glitter);
      const theme  = themes.find(t => t.id === state.theme);

      const item = {
        id: `custom-${Date.now()}`,
        name: `Custom ${cup.name}${state.name ? ` — "${state.name}"` : ''}`,
        sub: [
          color   ? color.label  : '',
          glitter ? glitter.name : '',
          theme   ? theme.name   : '',
        ].filter(Boolean).join(' · '),
        price: unitPrice(state.qty),
        qty: state.qty,
        emoji: cup.icon,
        isCustom: true,
      };

      if (window.addToCart) {
        window.addToCart(item);
        window.showToast && window.showToast(`${item.name} added to your cart! 👑`, 'success');
      }
    });
  }

  /* ─── Start ──────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
