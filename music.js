/* Queens Custom Creations — Vibe Selector Music Player */
(function () {

  const VIBES = [
    { id: 'chill',   label: 'Chill',        emoji: '✨', src: 'assets/vibe-music.mp3',   desc: 'Lo-fi chill' },
    { id: 'jazz',    label: 'Smooth Jazz',   emoji: '🎷', src: 'assets/vibe-jazz.mp3',    desc: 'Smooth jazz' },
    { id: 'cafe',    label: 'French Café',   emoji: '☕', src: 'assets/vibe-jazz.mp3',    desc: 'French café' },
    { id: 'upbeat',  label: 'Upbeat',        emoji: '⚡', src: 'assets/vibe-upbeat.mp3',  desc: 'Upbeat energy' },
    { id: 'pop',     label: 'Pop',           emoji: '🎀', src: 'assets/vibe-upbeat.mp3',  desc: 'Pop vibes' },
  ];

  let currentVibe = localStorage.getItem('qcc_vibe') || 'chill';
  let isOpen      = false;
  const DEFAULT_VOL = 0.05;

  /* ── Build HTML ───────────────────────────────────────── */
  const playerHTML = `
<div class="vibe-player" id="vibe-player">

  <!-- Main pill -->
  <div class="vibe-pill" id="vibe-pill">
    <button class="vibe-toggle-btn" id="vibe-toggle-btn" aria-label="Play/Pause">
      <svg class="vibe-icon-play" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
      <svg class="vibe-icon-pause" viewBox="0 0 24 24" fill="white" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    </button>
    <div class="vibe-bars" id="vibe-bars">
      <div class="vibe-bar"></div>
      <div class="vibe-bar"></div>
      <div class="vibe-bar"></div>
      <div class="vibe-bar"></div>
    </div>
    <div class="vibe-info">
      <span class="vibe-label-top">Vibe Mode</span>
      <span class="vibe-label-name" id="vibe-label-name">Chill ✨</span>
    </div>
    <button class="vibe-pick-btn" id="vibe-pick-btn" aria-label="Pick your vibe">
      🎵
    </button>
    <input type="range" class="vibe-vol" id="vibe-vol" min="0" max="1" step="0.05" value="${DEFAULT_VOL}" aria-label="Volume">
  </div>

  <!-- Vibe picker panel -->
  <div class="vibe-picker" id="vibe-picker">
    <p class="vibe-picker-title">Pick Your Vibe</p>
    <div class="vibe-options" id="vibe-options">
      ${VIBES.map(v => `
      <button class="vibe-opt${v.id === currentVibe ? ' active' : ''}" data-vibe="${v.id}" aria-label="${v.label}">
        <span class="vibe-opt-emoji">${v.emoji}</span>
        <span class="vibe-opt-label">${v.label}</span>
      </button>`).join('')}
    </div>
  </div>

</div>`;

  /* ── Inject into page ─────────────────────────────────── */
  document.body.insertAdjacentHTML('beforeend', playerHTML);

  const audio      = document.createElement('audio');
  audio.loop       = true;
  audio.preload    = 'none';
  document.body.appendChild(audio);

  /* ── Get elements ─────────────────────────────────────── */
  const player     = document.getElementById('vibe-player');
  const toggleBtn  = document.getElementById('vibe-toggle-btn');
  const pickBtn    = document.getElementById('vibe-pick-btn');
  const picker     = document.getElementById('vibe-picker');
  const labelName  = document.getElementById('vibe-label-name');
  const bars       = document.getElementById('vibe-bars');
  const volSlider  = document.getElementById('vibe-vol');
  const opts       = document.querySelectorAll('.vibe-opt');

  /* ── State ────────────────────────────────────────────── */
  const savedVol = parseFloat(localStorage.getItem('qcc_music_vol') || DEFAULT_VOL);
  audio.volume   = savedVol;
  if (volSlider) volSlider.value = savedVol;

  function getVibe(id) {
    return VIBES.find(v => v.id === id) || VIBES[0];
  }

  function loadVibe(id, autoplay) {
    const vibe = getVibe(id);
    currentVibe = id;
    localStorage.setItem('qcc_vibe', id);

    // Update source only if changed
    if (audio.src !== new URL(vibe.src, location.href).href) {
      const wasPlaying = !audio.paused;
      audio.src = vibe.src;
      audio.load();
      if (wasPlaying || autoplay) {
        audio.play().catch(() => {});
      }
    }

    // Update label
    if (labelName) labelName.textContent = `${vibe.label} ${vibe.emoji}`;

    // Update active button
    opts.forEach(o => o.classList.toggle('active', o.dataset.vibe === id));
  }

  function setPlayState(playing) {
    if (playing) {
      if (!audio.src) loadVibe(currentVibe, true);
      audio.play().catch(() => {});
      bars.classList.remove('paused');
      toggleBtn.querySelector('.vibe-icon-play').style.display  = 'none';
      toggleBtn.querySelector('.vibe-icon-pause').style.display = '';
    } else {
      audio.pause();
      bars.classList.add('paused');
      toggleBtn.querySelector('.vibe-icon-play').style.display  = '';
      toggleBtn.querySelector('.vibe-icon-pause').style.display = 'none';
    }
    localStorage.setItem('qcc_music_playing', playing);
  }

  /* ── Events ───────────────────────────────────────────── */
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setPlayState(audio.paused);
  });

  pickBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen = !isOpen;
    picker.classList.toggle('open', isOpen);
    pickBtn.classList.toggle('active', isOpen);
  });

  // Close picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!player.contains(e.target)) {
      isOpen = false;
      picker.classList.remove('open');
      pickBtn.classList.remove('active');
    }
  });

  // Vibe option click
  opts.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      loadVibe(opt.dataset.vibe, true);
      isOpen = false;
      picker.classList.remove('open');
      pickBtn.classList.remove('active');
    });
  });

  // Volume
  volSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volSlider.value);
    localStorage.setItem('qcc_music_vol', volSlider.value);
  });

  /* ── Auto-play on first interaction ───────────────────── */
  loadVibe(currentVibe, false);

  let autoPlayed = false;
  function tryAutoPlay() {
    if (autoPlayed) return;
    autoPlayed = true;
    if (false && localStorage.getItem('qcc_music_playing') !== 'false') { // autoplay disabled — user must click play
      setPlayState(true);
    }
  }
  document.addEventListener('click',      tryAutoPlay, { once: true });
  document.addEventListener('scroll',     tryAutoPlay, { once: true });
  document.addEventListener('touchstart', tryAutoPlay, { once: true });

})();
