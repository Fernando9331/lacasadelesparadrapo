'use strict';

// Escapa caracteres de control (incluidos \n y \r) para impedir la inyección de registros.
function sanitizeForLog(value) {
  return String(value).replace(
    /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

// Nunca pases aquí tokens, claves de stream ni datos personales.
function log(level, message, fields = {}) {
  const details = Object.entries(fields)
    .map(([key, value]) => `${sanitizeForLog(key)}=${sanitizeForLog(value)}`)
    .join(' ');
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${sanitizeForLog(message)} ${details}`.trim();
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = { sanitizeForLog, log };
