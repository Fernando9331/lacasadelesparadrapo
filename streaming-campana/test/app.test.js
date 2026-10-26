'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { loadConfig } = require('../src/config');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');
const { sanitizeForLog } = require('../src/logger');

const ADMIN_TOKEN = crypto.randomBytes(32).toString('hex');
const WEBHOOK_SECRET = crypto.randomBytes(24).toString('hex');

const config = loadConfig({
  ADMIN_TOKEN,
  DB_PATH: ':memory:',
  ALLOWED_ASSET_HOSTS: 'cdn.partido.example',
  ALLOWED_LINK_HOSTS: 'partido.example',
  MUX_WEBHOOK_SECRET: WEBHOOK_SECRET,
  SILENCIO_ELECTORAL_INICIO: '2027-02-05T00:00:00-05:00',
  SILENCIO_ELECTORAL_FIN: '2027-02-07T17:00:00-05:00',
});

const fakeMux = {
  rtmpUrl: 'rtmps://global-live.mux.com:443/app',
  calls: 0,
  async createLiveStream() {
    this.calls += 1;
    return { id: 'ls123', stream_key: 'secret-key', status: 'idle', playback_ids: [{ id: 'PlayBack123' }] };
  },
  async getLiveStream(id) {
    return { id, stream_key: 'secret-key', status: 'idle', playback_ids: [{ id: 'PlayBack123' }] };
  },
};

let clock = new Date('2026-11-01T12:00:00Z');
let server;
let base;

before(async () => {
  const db = openDb(':memory:');
  const app = createApp({ config, db, mux: fakeMux, now: () => clock });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const adminHeaders = { authorization: `Bearer ${ADMIN_TOKEN}`, 'content-type': 'application/json' };
const validBanner = {
  title: 'Vota lista 10',
  paidBy: 'Movimiento Ejemplo, RUC 0000000000001',
  imageUrl: 'https://cdn.partido.example/banner.png',
  linkUrl: 'https://partido.example/propuestas',
  position: 'top',
};

function postBanner(body, headers = adminHeaders) {
  return fetch(`${base}/api/admin/banners`, { method: 'POST', headers, body: JSON.stringify(body) });
}

function signedWebhook(payload, secret = WEBHOOK_SECRET) {
  const body = JSON.stringify(payload);
  const t = Math.floor(clock.getTime() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return fetch(`${base}/api/webhooks/mux`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'mux-signature': `t=${t},v1=${v1}` },
    body,
  });
}

test('responde con cabeceras de seguridad y CSP', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.ok(res.headers.get('ratelimit-policy'));
});

test('CORS no se abre a orígenes no listados', async () => {
  const res = await fetch(`${base}/api/banners`, { headers: { origin: 'https://evil.example' } });
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('las rutas admin exigen token válido', async () => {
  assert.equal((await postBanner(validBanner, { 'content-type': 'application/json' })).status, 401);
  const wrong = { ...adminHeaders, authorization: 'Bearer incorrecto' };
  assert.equal((await postBanner(validBanner, wrong)).status, 401);
});

test('rechaza URLs fuera de la lista blanca o sin https', async () => {
  const cases = [
    { imageUrl: 'http://cdn.partido.example/a.png' },
    { imageUrl: 'https://cdn.partido.example.evil.com/a.png' },
    { imageUrl: 'https://evil.com/?cdn.partido.example' },
    { imageUrl: 'https://user:pass@cdn.partido.example/a.png' },
    { linkUrl: 'javascript:alert(1)' },
    { linkUrl: 'https://evil.com/partido.example' },
  ];
  for (const override of cases) {
    const res = await postBanner({ ...validBanner, ...override });
    assert.equal(res.status, 400, JSON.stringify(override));
  }
});

test('exige identificar quién paga la publicidad', async () => {
  const res = await postBanner({ ...validBanner, paidBy: '   ' });
  assert.equal(res.status, 400);
});

test('crea, lista, pausa y elimina banners', async () => {
  const created = await postBanner(validBanner);
  assert.equal(created.status, 201);
  const { banner } = await created.json();
  assert.match(banner.id, /^[0-9a-f-]{36}$/);

  let pub = await (await fetch(`${base}/api/banners`)).json();
  assert.deepEqual(pub.banners.map((b) => b.paidBy), [validBanner.paidBy]);

  const paused = await fetch(`${base}/api/admin/banners/${banner.id}`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ active: false }),
  });
  assert.equal(paused.status, 200);
  pub = await (await fetch(`${base}/api/banners`)).json();
  assert.equal(pub.banners.length, 0);

  const removed = await fetch(`${base}/api/admin/banners/${banner.id}`, { method: 'DELETE', headers: adminHeaders });
  assert.equal(removed.status, 204);
});

test('respeta las fechas de vigencia del banner', async () => {
  await postBanner({ ...validBanner, startsAt: '2026-12-01T00:00:00Z' });
  const pub = await (await fetch(`${base}/api/banners`)).json();
  assert.equal(pub.banners.length, 0);
});

test('entrega datos de ingesta solo al admin y sin caché', async () => {
  const res = await fetch(`${base}/api/admin/stream`, { method: 'POST', headers: adminHeaders });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const data = await res.json();
  assert.equal(data.streamKey, 'secret-key');
  assert.equal(data.playbackId, 'PlayBack123');

  await fetch(`${base}/api/admin/stream`, { method: 'POST', headers: adminHeaders });
  assert.equal(fakeMux.calls, 1, 'no debe crear una segunda transmisión');

  const estado = await (await fetch(`${base}/api/estado`)).json();
  assert.equal(JSON.stringify(estado).includes('secret-key'), false);
  assert.equal(estado.stream.playbackId, null);
});

test('el webhook rechaza firmas inválidas y aplica las válidas', async () => {
  const bad = await signedWebhook({ type: 'video.live_stream.active', data: { id: 'ls123' } }, 'otro-secreto');
  assert.equal(bad.status, 401);

  const ok = await signedWebhook({ type: 'video.live_stream.active', data: { id: 'ls123' } });
  assert.equal(ok.status, 204);
  const estado = await (await fetch(`${base}/api/estado`)).json();
  assert.equal(estado.stream.status, 'active');
  assert.equal(estado.stream.playbackId, 'PlayBack123');
});

test('durante el silencio electoral oculta banners y transmisión', async () => {
  await postBanner(validBanner);
  clock = new Date('2027-02-06T12:00:00-05:00');
  try {
    const banners = await (await fetch(`${base}/api/banners`)).json();
    assert.equal(banners.silencioElectoral, true);
    assert.equal(banners.banners.length, 0);

    const estado = await (await fetch(`${base}/api/estado`)).json();
    assert.equal(estado.stream.status, 'silencio');
    assert.equal(estado.stream.playbackId, null);
  } finally {
    clock = new Date('2026-11-01T12:00:00Z');
  }
});

test('sanitizeForLog escapa saltos de línea y caracteres de control', () => {
  assert.equal(sanitizeForLog('a\nb\rc'), 'a\\u000ab\\u000dc');
});

test('loadConfig rechaza CORS comodín y tokens cortos', () => {
  assert.throws(() => loadConfig({ ADMIN_TOKEN: 'corto' }));
  assert.throws(() => loadConfig({ ADMIN_TOKEN, CORS_ORIGINS: '*' }));
});
