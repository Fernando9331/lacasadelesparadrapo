'use strict';

(function () {
  // El token vive solo en memoria: no se guarda en localStorage ni en cookies.
  let token = '';

  const $ = (id) => document.getElementById(id);

  async function api(method, url, body) {
    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(data.errors) ? data.errors.join('; ') : data.error;
      throw new Error(detail || `Error ${response.status}`);
    }
    return data;
  }

  function setStatus(id, text, isError) {
    const el = $(id);
    el.textContent = text;
    el.classList.toggle('error', Boolean(isError));
  }

  function toIso(value) {
    return value ? new Date(value).toISOString() : null;
  }

  function renderBannerItem(banner) {
    const li = document.createElement('li');

    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = banner.title;
    const meta = document.createElement('small');
    meta.textContent = `${banner.position} · Pagado por: ${banner.paidBy} · ${banner.active ? 'activo' : 'pausado'}`;
    info.append(name, document.createElement('br'), meta);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = banner.active ? 'Pausar' : 'Activar';
    toggle.addEventListener('click', async () => {
      await api('PATCH', `/api/admin/banners/${encodeURIComponent(banner.id)}`, { active: !banner.active });
      loadBanners();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', async () => {
      if (!window.confirm('¿Eliminar este banner?')) return;
      await api('DELETE', `/api/admin/banners/${encodeURIComponent(banner.id)}`);
      loadBanners();
    });

    li.append(info, toggle, remove);
    return li;
  }

  async function loadBanners() {
    const { banners } = await api('GET', '/api/admin/banners');
    $('banner-list').replaceChildren(...banners.map(renderBannerItem));
  }

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    token = $('admin-token').value;
    try {
      await loadBanners();
      $('admin-token').value = '';
      $('admin-panel').hidden = false;
      setStatus('login-status', 'Sesión iniciada.');
    } catch (error) {
      token = '';
      setStatus('login-status', error.message, true);
    }
  });

  $('stream-button').addEventListener('click', async () => {
    setStatus('stream-msg', 'Consultando Mux…');
    try {
      const data = await api('POST', '/api/admin/stream');
      $('rtmp-url').value = data.rtmpUrl;
      $('stream-key').value = data.streamKey || '';
      $('stream-status').textContent = data.status === 'active' ? 'En vivo' : 'Esperando señal';
      $('ingest').hidden = false;
      setStatus('stream-msg', 'Copia el servidor y la clave en OBS. No compartas la clave.');
    } catch (error) {
      setStatus('stream-msg', error.message, true);
    }
  });

  $('toggle-key').addEventListener('click', () => {
    const input = $('stream-key');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('toggle-key').textContent = show ? 'Ocultar' : 'Mostrar';
  });

  $('title-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('PATCH', '/api/admin/stream', { title: $('stream-title-input').value });
      setStatus('stream-msg', 'Título guardado.');
    } catch (error) {
      setStatus('stream-msg', error.message, true);
    }
  });

  $('banner-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await api('POST', '/api/admin/banners', {
        title: form.get('title'),
        paidBy: form.get('paidBy'),
        imageUrl: form.get('imageUrl'),
        linkUrl: form.get('linkUrl') || null,
        position: form.get('position'),
        startsAt: toIso(form.get('startsAt')),
        endsAt: toIso(form.get('endsAt')),
      });
      event.target.reset();
      setStatus('banner-msg', 'Banner creado.');
      loadBanners();
    } catch (error) {
      setStatus('banner-msg', error.message, true);
    }
  });
})();
