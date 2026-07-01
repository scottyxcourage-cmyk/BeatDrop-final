'use strict';
// Uses Node's built-in sqlite module (node:sqlite) instead of better-sqlite3.
// This avoids native compilation entirely (no Python/node-gyp needed at deploy time),
// which is required on build servers like pxxl.run that don't have prebuilt binaries
// for every platform/libc combo. Requires Node 22.5+ (pxxl's runtime is Node 26).
const path = require('path');
const fs = require('fs');
const os = require('os');
const { DatabaseSync } = require('node:sqlite');

// Some hosts (pxxl.run included) run containers with a read-only filesystem outside
// a designated persistent volume. Set DATA_DIR to that volume's path in your env vars
// if writes to the default location fail. Falls back to the OS temp dir as a last
// resort so the app can still boot (NOTE: data in temp dir is NOT persistent across
// redeploys/restarts - set DATA_DIR properly for real persistence).
const preferredDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function resolveDataDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return dir;
  } catch (err) {
    console.error(`[db] Could not use data directory "${dir}": ${err.message}`);
    const fallback = path.join(os.tmpdir(), 'spiderhub-data');
    console.error(`[db] Falling back to "${fallback}" (NOT persistent - set DATA_DIR env var to fix this properly).`);
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

const dataDir = resolveDataDir(preferredDir);
console.log(`[db] Using data directory: ${dataDir}`);

let db;
try {
  db = new DatabaseSync(path.join(dataDir, 'spiderhub.db'));
  db.exec('PRAGMA journal_mode = WAL;');
} catch (err) {
  console.error('[db] Failed to open SQLite database:', err.message);
  throw err;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    verified        INTEGER NOT NULL DEFAULT 0,
    verify_token    TEXT,
    verify_expires  INTEGER,
    reset_token     TEXT,
    reset_expires   INTEGER,
    created_at      INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(verify_token);
  CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
`);

module.exports = db;
