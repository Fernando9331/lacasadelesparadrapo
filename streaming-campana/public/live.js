'use strict';

(function () {
  const POLL_MS = 20000;
  const PLAYBACK_ID_PATTERN = /^[A-Za-z0-9]{1,128}$/;

  const video = document.getElementById('player');
  const message = document.getElementById('player-message');
  const badge = document.getElementById('live-badge');
  const title = document.getElementById('stream-title');

  let hls = null;
  let currentPlaybackId = null;

  // El servidor ya valida las URLs; aquí se revalida con new URL() antes de tocar el DOM.
  function safeHttpsUrl(raw) {
    try {
      const url = new URL(raw);
      return url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  }

  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  function stopPlayer() {
    if (hls) {
      hls.destroy();
      hls = null;
    }
    video.removeAttribute('src');
    video.load();
    currentPlaybackId = null;
  }

  function startPlayer(playbackId) {
    if (playbackId === currentPlaybackId) return;
    stopPlayer();
    const source = `https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8`;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
    } else if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({ lowLatencyMode: true });
      hls.loadSource(source);
      hls.attachMedia(video);
    } else {
      showMessage('Tu navegador no puede reproducir la transmisión.');
      return;
    }
    currentPlaybackId = playbackId;
    showMessage('');
    video.play().catch(() => {});
  }

  async function refreshEstado() {
    try {
      const response = await fetch('/api/estado', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      const { stream } = await response.json();

      if (stream.title) title.textContent = stream.title;
      const playbackId = typeof stream.playbackId === 'string' && PLAYBACK_ID_PATTERN.test(stream.playbackId)
        ? stream.playbackId
        : null;

      badge.hidden = !playbackId;
      if (playbackId) {
        startPlayer(playbackId);
      } else {
        stopPlayer();
        showMessage(stream.status === 'silencio'
          ? 'Contenido suspendido durante el periodo de silencio electoral.'
          : 'La transmisión comenzará pronto.');
      }
    } catch {
      showMessage('No se pudo consultar el estado de la transmisión.');
    }
  }

  function renderBanner(banner) {
    const imageUrl = safeHttpsUrl(banner.imageUrl);
    if (!imageUrl) return null;

    const figure = document.createElement('figure');
    figure.className = 'ad';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = banner.title;
    img.loading = 'lazy';

    const linkUrl = banner.linkUrl ? safeHttpsUrl(banner.linkUrl) : null;
    if (linkUrl) {
      const link = document.createElement('a');
      link.href = linkUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer sponsored';
      link.appendChild(img);
      figure.appendChild(link);
    } else {
      figure.appendChild(img);
    }

    const caption = document.createElement('figcaption');
    caption.textContent = `Publicidad pagada por: ${banner.paidBy}`;
    figure.appendChild(caption);
    return figure;
  }

  async function refreshBanners() {
    try {
      const response = await fetch('/api/banners', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      const { banners } = await response.json();

      document.querySelectorAll('.ad-slot').forEach((slot) => {
        const items = banners
          .filter((banner) => banner.position === slot.dataset.position)
          .map(renderBanner)
          .filter(Boolean);
        slot.replaceChildren(...items);
        slot.hidden = items.length === 0;
      });
    } catch {
      // Si falla la carga de banners, la transmisión sigue funcionando.
    }
  }

  refreshEstado();
  refreshBanners();
  setInterval(refreshEstado, POLL_MS);
  setInterval(refreshBanners, POLL_MS * 3);
})();
