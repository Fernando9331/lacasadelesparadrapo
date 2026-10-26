'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const BANNER_COLUMNS = `id, title, paid_by AS paidBy, image_url AS imageUrl, link_url AS linkUrl,
  position, active, starts_at AS startsAt, ends_at AS endsAt, created_at AS createdAt`;

function toBanner(row) {
  return row ? { ...row, active: row.active === 1 } : null;
}

// Todas las consultas usan sentencias preparadas con parámetros; nunca concatenación.
function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      paid_by TEXT NOT NULL,
      image_url TEXT NOT NULL,
      link_url TEXT,
      position TEXT NOT NULL CHECK (position IN ('top', 'left', 'right', 'bottom')),
      active INTEGER NOT NULL DEFAULT 1,
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stream_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      live_stream_id TEXT,
      playback_id TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      title TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    INSERT OR IGNORE INTO stream_state (id, status, title, updated_at)
      VALUES (1, 'idle', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `);

  const stmts = {
    listAll: db.prepare(`SELECT ${BANNER_COLUMNS} FROM banners ORDER BY created_at DESC`),
    listActive: db.prepare(`SELECT ${BANNER_COLUMNS} FROM banners
      WHERE active = 1
        AND (starts_at IS NULL OR starts_at <= ?)
        AND (ends_at IS NULL OR ends_at > ?)
      ORDER BY created_at DESC`),
    get: db.prepare(`SELECT ${BANNER_COLUMNS} FROM banners WHERE id = ?`),
    insert: db.prepare(`INSERT INTO banners
      (id, title, paid_by, image_url, link_url, position, active, starts_at, ends_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    setActive: db.prepare('UPDATE banners SET active = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM banners WHERE id = ?'),
    getStream: db.prepare(`SELECT live_stream_id AS liveStreamId, playback_id AS playbackId,
      status, title, updated_at AS updatedAt FROM stream_state WHERE id = 1`),
    setStreamIds: db.prepare(`UPDATE stream_state
      SET live_stream_id = ?, playback_id = ?, status = ?, updated_at = ? WHERE id = 1`),
    setStreamStatus: db.prepare('UPDATE stream_state SET status = ?, updated_at = ? WHERE id = 1 AND live_stream_id = ?'),
    setStreamTitle: db.prepare('UPDATE stream_state SET title = ?, updated_at = ? WHERE id = 1'),
  };

  return {
    listBanners: () => stmts.listAll.all().map(toBanner),
    listActiveBanners: (nowIso) => stmts.listActive.all(nowIso, nowIso).map(toBanner),
    getBanner: (id) => toBanner(stmts.get.get(id)),
    insertBanner(banner) {
      stmts.insert.run(
        banner.id, banner.title, banner.paidBy, banner.imageUrl, banner.linkUrl,
        banner.position, banner.active ? 1 : 0, banner.startsAt, banner.endsAt, banner.createdAt,
      );
      return this.getBanner(banner.id);
    },
    setBannerActive: (id, active) => stmts.setActive.run(active ? 1 : 0, id).changes > 0,
    deleteBanner: (id) => stmts.remove.run(id).changes > 0,
    getStream: () => stmts.getStream.get(),
    setStreamIds: (liveStreamId, playbackId, status) =>
      stmts.setStreamIds.run(liveStreamId, playbackId, status, new Date().toISOString()),
    setStreamStatus: (liveStreamId, status) =>
      stmts.setStreamStatus.run(status, new Date().toISOString(), liveStreamId).changes > 0,
    setStreamTitle: (title) => stmts.setStreamTitle.run(title, new Date().toISOString()),
    close: () => db.close(),
  };
}

module.exports = { openDb };
