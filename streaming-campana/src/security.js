'use strict';

const crypto = require('node:crypto');

// Compara en tiempo constante; el hash iguala longitudes antes de timingSafeEqual.
function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function requireAdmin(adminToken) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token || !safeEqual(token, adminToken)) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    return next();
  };
}

// Valida URLs externas con new URL(): solo https, sin credenciales y con hostname exacto en la lista blanca.
function parseAllowedHttpsUrl(raw, allowedHosts) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (!allowedHosts.includes(url.hostname.toLowerCase())) return null;
  return url.href;
}

// Cabecera de Mux: "mux-signature: t=<unix>,v1=<hmac hex>" firmada sobre "<t>.<cuerpo crudo>".
function verifyMuxSignature(rawBody, header, secret, nowSeconds, toleranceSeconds = 300) {
  if (!secret || typeof header !== 'string' || !Buffer.isBuffer(rawBody)) return false;

  let timestamp = null;
  const signatures = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = Number(value);
    if (key === 'v1' && /^[0-9a-f]{64}$/i.test(value || '')) signatures.push(value);
  }
  if (!Number.isInteger(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest();

  return signatures.some((signature) =>
    crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex')),
  );
}

module.exports = { safeEqual, requireAdmin, parseAllowedHttpsUrl, verifyMuxSignature };
