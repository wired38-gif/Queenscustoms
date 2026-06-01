/* Queens Custom Creations — Background Music Player */
(function () {
  const audio     = document.getElementById('bg-music');
  const player    = document.getElementById('music-player');
  const toggleBtn = document.getElementById('music-toggle-btn');
  const playIcon  = document.getElementById('music-play-icon');
  const pauseIcon = document.getElementById('music-pause-icon');
  const volSlider = document.getElementById('music-vol');

  if (!audio || !player || !toggleBtn) return;

  // Restore saved volume & state
  const savedVol     = parseFloat(localStorage.getItem('qcc_music_vol') ?? '0.3');
  const savedPlaying = localStorage.getItem('qcc_music_playing') === 'true';

  audio.volume = savedVol;
  if (volSlider) volSlider.value = savedVol;

  function setPlayState(playing) {
    if (playing) {
      audio.play().catch(() => {});
      player.classList.remove('paused');
      playIcon.style.display  = 'none';
      pauseIcon.style.display = '';
    } else {
      audio.pause();
      player.classList.add('paused');
      playIcon.style.display  = '';
      pauseIcon.style.display = 'none';
    }
    localStorage.setItem('qcc_music_playing', playing);
  }

  // Toggle on button click
  toggleBtn.addEventListener('click', () => {
    const isPlaying = !audio.paused;
    setPlayState(!isPlaying);
  });

  // Volume slider
  if (volSlider) {
    volSlider.addEventListener('input', () => {
      audio.volume = parseFloat(volSlider.value);
      localStorage.setItem('qcc_music_vol', volSlider.value);
    });
  }

  // Collapse/expand on player click (anywhere except button & slider)
  player.addEventListener('click', (e) => {
    if (e.target === toggleBtn || toggleBtn.contains(e.target)) return;
    if (e.target === volSlider) return;
    player.classList.toggle('collapsed');
  });

  // Auto-play on first user interaction with page (browser policy)
  let hasAutoPlayed = false;
  function tryAutoPlay() {
    if (hasAutoPlayed) return;
    hasAutoPlayed = true;
    // Only auto-play if user hasn't explicitly turned it off
    if (localStorage.getItem('qcc_music_playing') !== 'false') {
      setPlayState(true);
    }
    document.removeEventListener('click', tryAutoPlay);
    document.removeEventListener('scroll', tryAutoPlay);
    document.removeEventListener('touchstart', tryAutoPlay);
  }

  document.addEventListener('click', tryAutoPlay, { once: true });
  document.addEventListener('scroll', tryAutoPlay, { once: true });
  document.addEventListener('touchstart', tryAutoPlay, { once: true });

  // Restore previous play state
  if (savedPlaying) {
    // Will be handled by first interaction due to browser autoplay policy
    // Show as "should be playing" so first interaction triggers it
  }
})();
