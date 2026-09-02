const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');
const { env } = require('../env');
const fs = require('fs');

// Ensure the data directory exists
const dbPath = env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'sqlite.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  // console.log(`[DB] Creating directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o777 });
}

const sqlite = new Database(dbPath);

// WAL + performance pragmas for higher-volume operation (Track 3)
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('synchronous = NORMAL'); // safe with WAL, reduces fsync stalls
sqlite.pragma('cache_size = -64000'); // ~64MB page cache
sqlite.pragma('wal_autocheckpoint = 1000');

const db = drizzle(sqlite);

module.exports = { db, sqlite };