const { sqlite } = require('./index');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_TENANT_SLUG = 'default';

/**
 * Multi-tenant startup initialization (multi-tenant-plan.md §10 steps 1-2).
 * Mirrors the tenants table + tenant_id columns via raw SQL so fresh installs
 * work without a migrate step, and performs the one-time backfill of existing
 * users/jobs into the default tenant. Idempotent — safe on every boot.
 *
 * Ordering:
 *  1. CREATE TABLE tenants (IF NOT EXISTS)
 *  2. ALTER users/jobs ADD tenant_id (guarded; SQLite throws if present)
 *  3. Seed the 'default' tenant (INSERT OR IGNORE by slug)
 *  4. Backfill NULL tenant_id rows on users/jobs to the default tenant
 *  5. Add is_platform_admin to users (guarded)
 *  6. Add composite indexes (guarded)
 */
function ensureTenantSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  const guardedAlters = [
    'ALTER TABLE users ADD COLUMN tenant_id TEXT REFERENCES tenants(id)',
    'ALTER TABLE jobs ADD COLUMN tenant_id TEXT REFERENCES tenants(id)',
    'ALTER TABLE users ADD COLUMN is_platform_admin INTEGER DEFAULT 0',
  ];
  for (const stmt of guardedAlters) {
    try { sqlite.exec(stmt); } catch (e) {
      // Column already exists — expected on subsequent runs
    }
  }
}

function ensureIndexes() {
  const guardedIndexes = [
    'CREATE INDEX IF NOT EXISTS users_tenant_idx ON users (tenant_id)',
    'CREATE INDEX IF NOT EXISTS jobs_tenant_idx ON jobs (tenant_id)',
    'CREATE INDEX IF NOT EXISTS jobs_tenant_created_by_idx ON jobs (tenant_id, created_by)',
    'CREATE INDEX IF NOT EXISTS jobs_tenant_status_idx ON jobs (tenant_id, status)',
  ];
  for (const stmt of guardedIndexes) {
    try { sqlite.exec(stmt); } catch (e) { /* ignore */ }
  }
}

/**
 * Seeds the default tenant and backfills existing users/jobs into it.
 * Returns the default tenant row (or null if unavailable).
 */
async function ensureDefaultTenant() {
  ensureTenantSchema();
  ensureIndexes();

  const defaultId = uuidv4();

  // Seed the default tenant once (idempotent by slug)
  const insert = sqlite.prepare(
    'INSERT OR IGNORE INTO tenants (id, name, slug, status) VALUES (?, ?, ?, ?)'
  );
  insert.run(defaultId, 'Default Tenant', DEFAULT_TENANT_SLUG, 'active');

  // Fetch the default tenant row
  const row = sqlite.prepare('SELECT id FROM tenants WHERE slug = ?').get(DEFAULT_TENANT_SLUG);
  const defaultTenantId = row ? row.id : defaultId;

  // Backfill existing rows that have no tenant (one-time migration)
  sqlite.prepare('UPDATE users SET tenant_id = ? WHERE tenant_id IS NULL').run(defaultTenantId);
  sqlite.prepare('UPDATE jobs SET tenant_id = ? WHERE tenant_id IS NULL').run(defaultTenantId);

  return { id: defaultTenantId };
}

module.exports = { ensureDefaultTenant };