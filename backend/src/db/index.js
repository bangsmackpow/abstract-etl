const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'sqlite.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  // console.log(`[DB] Creating directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o777 });
}

const sqlite = new Database(dbPath);

// Enable WAL mode for better performance/concurrency
sqlite.pragma('journal_mode = WAL');

const db = drizzle(sqlite);

module.exports = { db, sqlite };
