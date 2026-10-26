'use strict';

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const { requireAdmin, verifyMuxSignature } = require('./security');
const { validateBanner, toPublicBanner, cleanText } = require('./banners');
const { log } = require('./logger');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const HLS_SCRIPT = require.resolve('hls.js/dist/hls.min.js');
const PLAYBACK_ID_PATTERN = /^[A-Za-z0-9]{1,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const MUX_STATUS = {
  'video.live_stream.active': 'active',
  'video.live_stream.idle': 'idle',
  'video.live_stream.disconnected': 'idle',
};

function enSilencioElectoral(silencio, now) {
  return Boolean(silencio.inicio && silencio.fin && now >= silencio.inicio && now < silencio.fin);
}

function createApp({ config, db, mux, now = () => new Date() }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://image.mux.com', ...config.allowedAssetHosts.map((h) => `https://${h}`)],
          mediaSrc: ["'self'", 'blob:', 'https://stream.mux.com'],
          connectSrc: ["'self'", 'https://stream.mux.com', 'https://*.mux.com'],
          workerSrc: ["'self'", 'blob:'],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // Rate limiting global y uno más estricto para administración y webhooks.
  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false });
  const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
  const webhookLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
  app.use(globalLimiter);

  // CORS solo para lecturas públicas y solo para orígenes listados explícitamente.
  const publicCors = cors({
    origin: (origin, callback) => callback(null, Boolean(origin) && config.corsOrigins.includes(origin)),
    methods: ['GET'],
  });

  // El webhook necesita el cuerpo crudo para verificar la firma HMAC.
  app.post('/api/webhooks/mux', webhookLimiter, express.raw({ type: 'application/json', limit: '256kb' }), (req, res) => {
    const nowSeconds = Math.floor(now().getTime() / 1000);
    if (!verifyMuxSignature(req.body, req.get('mux-signature'), config.mux.webhookSecret, nowSeconds)) {
      log('warn', 'Webhook de Mux con firma inválida', { ip: req.ip });
      return res.status(401).json({ error: 'Firma inválida' });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'JSON inválido' });
    }

    const status = MUX_STATUS[event && event.type];
    const liveStreamId = event && event.data && event.data.id;
    if (status && typeof liveStreamId === 'string') {
      const updated = db.setStreamStatus(liveStreamId, status);
      log('info', 'Estado de transmisión actualizado', { status, updated });
    }
    return res.status(204).end();
  });

  app.use(express.json({ limit: '20kb' }));

  app.get('/api/estado', publicCors, (req, res) => {
    const silencio = enSilencioElectoral(config.silencio, now());
    const stream = db.getStream();
    const enVivo = !silencio && stream.status === 'active' && PLAYBACK_ID_PATTERN.test(stream.playbackId || '');
    res.set('Cache-Control', 'public, max-age=10');
    res.json({
      silencioElectoral: silencio,
      stream: {
        status: silencio ? 'silencio' : stream.status,
        title: stream.title,
        playbackId: enVivo ? stream.playbackId : null,
      },
    });
  });

  app.get('/api/banners', publicCors, (req, res) => {
    const current = now();
    const silencio = enSilencioElectoral(config.silencio, current);
    const banners = silencio ? [] : db.listActiveBanners(current.toISOString()).map(toPublicBanner);
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ silencioElectoral: silencio, banners });
  });

  const admin = express.Router();
  admin.use(adminLimiter, requireAdmin(config.adminToken), (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  admin.get('/banners', (req, res) => {
    res.json({ banners: db.listBanners() });
  });

  admin.post('/banners', (req, res) => {
    const { value, errors } = validateBanner(req.body, config);
    if (errors) return res.status(400).json({ errors });
    const banner = db.insertBanner(value);
    log('info', 'Banner creado', { id: banner.id, position: banner.position });
    return res.status(201).json({ banner });
  });

  admin.patch('/banners/:id', (req, res) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(404).json({ error: 'No encontrado' });
    if (typeof (req.body && req.body.active) !== 'boolean') {
      return res.status(400).json({ errors: ['active debe ser booleano'] });
    }
    if (!db.setBannerActive(req.params.id, req.body.active)) return res.status(404).json({ error: 'No encontrado' });
    return res.json({ banner: db.getBanner(req.params.id) });
  });

  admin.delete('/banners/:id', (req, res) => {
    if (!UUID_PATTERN.test(req.params.id) || !db.deleteBanner(req.params.id)) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    log('info', 'Banner eliminado', { id: req.params.id });
    return res.status(204).end();
  });

  // Crea la transmisión en Mux (una sola vez) y devuelve los datos de ingesta para OBS.
  // La clave del stream solo viaja en esta respuesta: no se guarda ni se registra en logs.
  admin.post('/stream', async (req, res, next) => {
    try {
      const current = db.getStream();
      const liveStream = current.liveStreamId
        ? await mux.getLiveStream(current.liveStreamId)
        : await mux.createLiveStream();
      const playbackId = liveStream.playback_ids && liveStream.playback_ids[0] && liveStream.playback_ids[0].id;
      if (!PLAYBACK_ID_PATTERN.test(playbackId || '')) throw new Error('Mux no devolvió un playback ID válido');

      const status = liveStream.status === 'active' ? 'active' : 'idle';
      db.setStreamIds(liveStream.id, playbackId, status);
      log('info', current.liveStreamId ? 'Transmisión consultada en Mux' : 'Transmisión creada en Mux', { status });

      res.json({
        liveStreamId: liveStream.id,
        playbackId,
        status,
        rtmpUrl: mux.rtmpUrl,
        streamKey: liveStream.stream_key,
      });
    } catch (error) {
      next(error);
    }
  });

  admin.patch('/stream', (req, res) => {
    const title = req.body && req.body.title === '' ? '' : cleanText(req.body && req.body.title, 140);
    if (title === null) return res.status(400).json({ errors: ['title debe tener máx. 140 caracteres'] });
    db.setStreamTitle(title);
    return res.json({ title });
  });

  app.use('/api/admin', admin);

  app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));

  app.get('/vendor/hls.min.js', (req, res) => res.sendFile(HLS_SCRIPT));
  app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Cuerpo demasiado grande' });
    log('error', 'Error no controlado', { message: error.message, path: req.path });
    return res.status(500).json({ error: 'Error interno' });
  });

  return app;
}

module.exports = { createApp, enSilencioElectoral };
