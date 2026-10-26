'use strict';

const path = require('node:path');

function parseHostList(value) {
  return (value || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

// Los orígenes CORS se normalizan con new URL() y se rechaza cualquier comodín.
function parseOrigins(value) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      if (origin.includes('*')) {
        throw new Error('CORS_ORIGINS no admite comodines');
      }
      const url = new URL(origin);
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
        throw new Error(`Origen CORS inseguro: ${url.origin}`);
      }
      return url.origin;
    });
}

function parseDate(value, name) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${name} no es una fecha ISO 8601 válida`);
  }
  return date;
}

function loadConfig(env = process.env) {
  const adminToken = env.ADMIN_TOKEN || '';
  if (adminToken.length < 32) {
    throw new Error('ADMIN_TOKEN debe tener al menos 32 caracteres');
  }

  const silencioInicio = parseDate(env.SILENCIO_ELECTORAL_INICIO, 'SILENCIO_ELECTORAL_INICIO');
  const silencioFin = parseDate(env.SILENCIO_ELECTORAL_FIN, 'SILENCIO_ELECTORAL_FIN');
  if ((silencioInicio && !silencioFin) || (!silencioInicio && silencioFin)) {
    throw new Error('Define SILENCIO_ELECTORAL_INICIO y SILENCIO_ELECTORAL_FIN juntos');
  }

  return {
    port: Number(env.PORT) || 4000,
    trustProxy: env.TRUST_PROXY === 'true' ? 1 : false,
    adminToken,
    dbPath: env.DB_PATH || path.resolve(__dirname, '..', 'data', 'campana.db'),
    corsOrigins: parseOrigins(env.CORS_ORIGINS),
    allowedAssetHosts: parseHostList(env.ALLOWED_ASSET_HOSTS),
    allowedLinkHosts: parseHostList(env.ALLOWED_LINK_HOSTS),
    mux: {
      tokenId: env.MUX_TOKEN_ID || '',
      tokenSecret: env.MUX_TOKEN_SECRET || '',
      webhookSecret: env.MUX_WEBHOOK_SECRET || '',
    },
    silencio: { inicio: silencioInicio, fin: silencioFin },
  };
}

module.exports = { loadConfig };
