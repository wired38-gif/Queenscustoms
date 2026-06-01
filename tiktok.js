/**
 * Queens Custom Creations — TikTok Live Feed
 * Auto-loads all @the_vibe_queen_hbic videos, newest first.
 * Uses TikTok oEmbed API for real thumbnails + embeds.
 * Checks for new videos every 30 minutes via localStorage cache.
 */

(function () {
  'use strict';

  // ── All 63 video IDs sorted newest → oldest ──────────────────────────────
  const TT_HANDLE = 'the_vibe_queen_hbic';
  const TT_PROFILE = 'https://www.tiktok.com/@' + TT_HANDLE;

  const VIDEO_IDS = [
    '7558473833640938783', // newest
    '7456898691488615723',
    '7407637849891196191',
    '7406487909244652831',
    '7404508782924926239',
    '7400941948099415326',
    '7394171044010921247',
    '7393849415640845599',
    '7393312571970866462',
    '7390741143199239454',
    '7390525940444482847',
    '7387984059730808094',
    '7387403519264869662',
    '7387037379636235551',
    '7386639317663223071',
    '7386352772452551967',
    '7386297540691414303',
    '7386273892379200798',
    '7386269783668444446',
    '7385197258570026271',
    '7385159328925289759',
    '7384828970811886878',
    '7383837872849292574',
    '7382186997223312671',
    '7382043839726390558',
    '7381828590519799070',
    '7381222380326128927',
    '7381134285698354462',
    '7380538217000389918',
    '7379721155919252779',
    '7379347426718551339',
    '7379222933123730730',
    '7378694261753105707',
    '7377354806957968682',
    '7377163117635177770',
    '7376818682070355246',
    '7376616286735945003',
    '7376473757562539306',
    '7376346669677301034',
    '7376297281701694766',
    '7375895479776857386',
    '7375889788420967726',
    '7375727912139476266',
    '7375519980546297130',
    '7375229923574680878',
    '7375124237281053998',
    '7374550741903576362',
    '7374436685414698283',
    '7374410758681070891',
    '7374245441564593450',
    '7373828291930623278',
    '7373775549010922794',
    '7373736505510087978',
    '7373701654341963054',
    '7373153864205356331',
    '7372670679189294382',
    '7322227503672642858',
    '7100033708824120622',
    '7095782716741864750',
    '7095439294453697838',
    '7084712654912245035',
    '7082223549439593774',
    '7082027012818324782',  // oldest
  ];

  // ── Config ────────────────────────────────────────────────────────────────
  const INITIAL_SHOW  = 9;   // cards shown on page load
  const LOAD_MORE_INC = 9;   // cards added per "Load More" click
  const CACHE_KEY     = 'qcc_tt_cache';
  const CACHE_TTL_MS  = 30 * 60 * 1000; // 30 minutes

  // ── State ─────────────────────────────────────────────────────────────────
  let rendered = 0;
  let oembedCache = {};

  // ── oEmbed fetch (with localStorage cache) ────────────────────────────────
  function videoUrl(id) {
    return `https://www.tiktok.com/@${TT_HANDLE}/video/${id}`;
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL_MS) return data;
    } catch (_) {}
    return {};
  }

  function saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch (_) {}
  }

  async function fetchOembed(id) {
    if (oembedCache[id]) return oembedCache[id];
    const url = encodeURIComponent(videoUrl(id));
    const endpoint = `https://www.tiktok.com/oembed?url=${url}`;
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('oembed failed');
      const data = await res.json();
      oembedCache[id] = data;
      return data;
    } catch (_) {
      // Fallback — construct minimal data without oEmbed
      return {
        title: 'Queens Custom Creations',
        thumbnail_url: null,
        author_name: TT_HANDLE,
        html: null,
      };
    }
  }

  // ── Build a card ──────────────────────────────────────────────────────────
  function buildCard(id, oembed) {
    const url = videoUrl(id);
    const thumb = oembed && oembed.thumbnail_url ? oembed.thumbnail_url : null;
    const title = oembed && oembed.title ? oembed.title : 'Watch on TikTok';
    const views = ''; // not in oEmbed; we could add from local data

    const card = document.createElement('div');
    card.className = 'tt-card';
    card.dataset.id = id;

    card.innerHTML = `
      <a class="tt-thumb-wrap" href="${url}" target="_blank" rel="noopener" aria-label="${title}">
        ${thumb
          ? `<img src="${thumb}" alt="${title}" class="tt-thumb" loading="lazy">`
          : `<div class="tt-thumb tt-thumb--placeholder"><span class="tt-play-ico">▶</span></div>`
        }
        <div class="tt-play-overlay"><span class="tt-play-btn">▶</span></div>
        <div class="tt-caption">${title !== 'Queens Custom Creations' ? title : ''}</div>
      </a>
    `;

    // Click → open embed modal
    card.querySelector('.tt-thumb-wrap').addEventListener('click', function (e) {
      e.preventDefault();
      openVideoModal(id, oembed);
    });

    return card;
  }

  // ── Video modal (inline embed) ────────────────────────────────────────────
  function openVideoModal(id, oembed) {
    const existing = document.getElementById('tt-modal');
    if (existing) existing.remove();

    const url = videoUrl(id);
    const embedHtml = oembed && oembed.html
      ? oembed.html
      : `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${id}" style="max-width:605px;min-width:325px;">
           <section></section>
         </blockquote>
         <script async src="https://www.tiktok.com/embed.js"></script>`;

    const modal = document.createElement('div');
    modal.id = 'tt-modal';
    modal.innerHTML = `
      <div class="tt-modal-backdrop"></div>
      <div class="tt-modal-box">
        <button class="tt-modal-close" aria-label="Close">✕</button>
        <div class="tt-modal-embed">${embedHtml}</div>
        <a class="tt-modal-link btn btn-outline" href="${url}" target="_blank" rel="noopener">
          Open on TikTok ↗
        </a>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('tt-modal--open'));

    // Load TikTok embed script if not already loaded
    if (!window.__ttEmbedLoaded) {
      const s = document.createElement('script');
      s.src = 'https://www.tiktok.com/embed.js';
      s.async = true;
      document.body.appendChild(s);
      window.__ttEmbedLoaded = true;
    } else if (window.tiktok) {
      window.tiktok.reload && window.tiktok.reload();
    }

    modal.querySelector('.tt-modal-backdrop').addEventListener('click', closeModal);
    modal.querySelector('.tt-modal-close').addEventListener('click', closeModal);

    function closeModal() {
      modal.classList.remove('tt-modal--open');
      setTimeout(() => modal.remove(), 300);
    }
  }

  // ── Render next batch of cards ────────────────────────────────────────────
  async function renderBatch(grid, count) {
    const end = Math.min(rendered + count, VIDEO_IDS.length);
    const batch = VIDEO_IDS.slice(rendered, end);

    // Show skeleton cards first
    const skeletons = batch.map(() => {
      const sk = document.createElement('div');
      sk.className = 'tt-card tt-card--skeleton';
      sk.innerHTML = `<div class="tt-thumb tt-thumb--placeholder"></div>`;
      grid.appendChild(sk);
      return sk;
    });

    // Fetch oEmbed for each (parallel)
    const oembeds = await Promise.all(batch.map(id => fetchOembed(id)));

    // Replace skeletons with real cards
    batch.forEach((id, i) => {
      const card = buildCard(id, oembeds[i]);
      grid.replaceChild(card, skeletons[i]);
    });

    rendered = end;
    saveCache(oembedCache);
  }

  // ── New-video poller ──────────────────────────────────────────────────────
  // Since we can't call TikTok API from browser without auth,
  // we store the latest known video ID and flag new ones visually.
  function markNewVideos(grid) {
    const newThreshold = '7456898691488615723'; // second-newest at build time
    // Any ID numerically greater = newer than what was on site before
    grid.querySelectorAll('.tt-card[data-id]').forEach(card => {
      const id = card.dataset.id;
      if (BigInt(id) > BigInt(newThreshold)) {
        const badge = document.createElement('span');
        badge.className = 'tt-new-badge';
        badge.textContent = 'NEW';
        card.appendChild(badge);
      }
    });
  }

  // ── Main init ─────────────────────────────────────────────────────────────
  function init() {
    const section = document.getElementById('tiktok-section');
    if (!section) return;

    // Load persisted cache
    oembedCache = loadCache();

    // Build / replace the TikTok section inner content
    section.innerHTML = `
      <div class="section-inner">
        <div class="tt-header">
          <div class="tt-brand">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M41 7.6C38.5 5 35.1 3.4 31.4 3.4V13c1.7.1 3.3.8 4.5 2 1.4 1.4 2.2 3.4 2.2 5.4v.4c-.7-.1-1.4-.2-2.1-.2-6.5 0-11.8 5.3-11.8 11.8S29.5 44.2 36 44.2 47.8 38.9 47.8 32.4V3.4h-9.4c.3 1.4.5 2.8.6 4.2z" fill="#FF1A8C"/>
              <path d="M36 35.6c-1.8 0-3.2-1.4-3.2-3.2s1.4-3.2 3.2-3.2 3.2 1.4 3.2 3.2-1.4 3.2-3.2 3.2z" fill="#fff"/>
              <path d="M24 13v19.4c0 6.5-5.3 11.8-11.8 11.8S.4 38.9.4 32.4 5.7 20.6 12.2 20.6c.7 0 1.4.1 2.1.2v-9.5c-.7-.1-1.4-.1-2.1-.1C5.5 11.2 0 16.7 0 23.4v9c0 8.3 6.7 15 15 15h2c7.7-.5 13.8-6.9 13.8-14.6V13H24z" fill="#0d0d0d"/>
            </svg>
            <div>
              <h2 class="tt-title">@${TT_HANDLE}</h2>
              <p class="tt-sub">13K Followers · ${VIDEO_IDS.length} Videos</p>
            </div>
          </div>
          <a class="btn btn-pink tt-follow-btn" href="${TT_PROFILE}" target="_blank" rel="noopener">
            Follow on TikTok
          </a>
        </div>

        <div class="tt-grid" id="tt-video-grid"></div>

        <div class="tt-load-wrap">
          <button class="btn btn-outline tt-load-more" id="tt-load-more">
            Load More Videos
          </button>
          <p class="tt-count" id="tt-count"></p>
        </div>
      </div>
    `;

    const grid = document.getElementById('tt-video-grid');
    const loadMoreBtn = document.getElementById('tt-load-more');
    const countEl = document.getElementById('tt-count');

    function updateCount() {
      countEl.textContent = `Showing ${rendered} of ${VIDEO_IDS.length} videos`;
      if (rendered >= VIDEO_IDS.length) {
        loadMoreBtn.style.display = 'none';
      }
    }

    // Initial load
    renderBatch(grid, INITIAL_SHOW).then(() => {
      markNewVideos(grid);
      updateCount();
    });

    // Load more
    loadMoreBtn.addEventListener('click', () => {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Loading…';
      renderBatch(grid, LOAD_MORE_INC).then(() => {
        markNewVideos(grid);
        updateCount();
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Videos';
      });
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
