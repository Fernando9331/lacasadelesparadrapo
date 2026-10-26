'use strict';

const crypto = require('node:crypto');
const { parseAllowedHttpsUrl } = require('./security');

const POSITIONS = ['top', 'left', 'right', 'bottom'];

function cleanText(value, max) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return text.length > 0 && text.length <= max ? text : null;
}

function cleanDate(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, value: date.toISOString() };
}

function validateBanner(input, { allowedAssetHosts, allowedLinkHosts }) {
  const errors = [];
  const body = input && typeof input === 'object' ? input : {};

  const title = cleanText(body.title, 120);
  if (!title) errors.push('title es obligatorio (máx. 120 caracteres)');

  // Identificación obligatoria de quién paga la pieza publicitaria.
  const paidBy = cleanText(body.paidBy, 160);
  if (!paidBy) errors.push('paidBy es obligatorio (máx. 160 caracteres)');

  const imageUrl = parseAllowedHttpsUrl(body.imageUrl, allowedAssetHosts);
  if (!imageUrl) errors.push('imageUrl debe ser https y pertenecer a ALLOWED_ASSET_HOSTS');

  let linkUrl = null;
  if (body.linkUrl !== undefined && body.linkUrl !== null && body.linkUrl !== '') {
    linkUrl = parseAllowedHttpsUrl(body.linkUrl, allowedLinkHosts);
    if (!linkUrl) errors.push('linkUrl debe ser https y pertenecer a ALLOWED_LINK_HOSTS');
  }

  const position = POSITIONS.includes(body.position) ? body.position : null;
  if (!position) errors.push(`position debe ser uno de: ${POSITIONS.join(', ')}`);

  const startsAt = cleanDate(body.startsAt);
  const endsAt = cleanDate(body.endsAt);
  if (!startsAt.ok) errors.push('startsAt no es una fecha válida');
  if (!endsAt.ok) errors.push('endsAt no es una fecha válida');
  if (startsAt.value && endsAt.value && startsAt.value >= endsAt.value) {
    errors.push('endsAt debe ser posterior a startsAt');
  }

  if (body.active !== undefined && typeof body.active !== 'boolean') {
    errors.push('active debe ser booleano');
  }

  if (errors.length > 0) return { errors };

  return {
    value: {
      id: crypto.randomUUID(),
      title,
      paidBy,
      imageUrl,
      linkUrl,
      position,
      active: body.active !== false,
      startsAt: startsAt.value,
      endsAt: endsAt.value,
      createdAt: new Date().toISOString(),
    },
  };
}

function toPublicBanner(banner) {
  return {
    id: banner.id,
    title: banner.title,
    paidBy: banner.paidBy,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl,
    position: banner.position,
  };
}

module.exports = { POSITIONS, validateBanner, toPublicBanner, cleanText };
