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
    'ALTER TABLE tenants ADD COLUMN logo_blob TEXT',
    'ALTER TABLE tenants ADD COLUMN logo_mime TEXT',
    'ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN otp_code_hash TEXT',
    'ALTER TABLE users ADD COLUMN otp_expires_at INTEGER',
    'ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0',
    'ALTER TABLE tenants ADD COLUMN plan TEXT DEFAULT \'trial\' NOT NULL',
    'ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT',
    'ALTER TABLE tenants ADD COLUMN stripe_subscription_id TEXT',
    'ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT \'none\'',
    'ALTER TABLE tenants ADD COLUMN trial_ends_at INTEGER',
    'ALTER TABLE tenants ADD COLUMN subscription_ends_at INTEGER',
  ];
  for (const stmt of guardedAlters) {
    try { sqlite.exec(stmt); } catch (e) {
      // Column already exists — expected on subsequent runs
    }
  }

  // Tenant-scoped operational settings (Track 1a)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenant_settings (
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      key TEXT NOT NULL,
      value TEXT NOT NULL
    )
  `);

  // One-time password reset tokens (Track 2)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Audit log (multi-tenant privileged ops history)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      from_tenant_id TEXT REFERENCES tenants(id),
      to_tenant_id TEXT REFERENCES tenants(id),
      details TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
}

function ensureIndexes() {
  const guardedIndexes = [
    'CREATE INDEX IF NOT EXISTS users_tenant_idx ON users (tenant_id)',
    'CREATE INDEX IF NOT EXISTS jobs_tenant_idx ON jobs (tenant_id)',
    'CREATE INDEX IF NOT EXISTS jobs_tenant_created_by_idx ON jobs (tenant_id, created_by)',
    'CREATE INDEX IF NOT EXISTS jobs_tenant_status_idx ON jobs (tenant_id, status)',
    'CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_log (actor_user_id)',
    'CREATE INDEX IF NOT EXISTS audit_target_idx ON audit_log (target_type, target_id)',
    'CREATE INDEX IF NOT EXISTS audit_from_tenant_idx ON audit_log (from_tenant_id)',
    'CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log (created_at)',
    'CREATE INDEX IF NOT EXISTS tenant_settings_tenant_key_idx ON tenant_settings (tenant_id, key)',
    'CREATE INDEX IF NOT EXISTS tenant_settings_tenant_idx ON tenant_settings (tenant_id)',
    'CREATE INDEX IF NOT EXISTS pw_reset_user_idx ON password_reset_tokens (user_id)',
    'CREATE INDEX IF NOT EXISTS pw_reset_token_hash_idx ON password_reset_tokens (token_hash)',
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

  // Seed the default tenant once (idempotent by slug). The default tenant hosts
  // the platform admin and is never trial-gated — set plan=enterprise so the
  // trial/subscription guard always lets it generate.
  const insert = sqlite.prepare(
    'INSERT OR IGNORE INTO tenants (id, name, slug, status, plan) VALUES (?, ?, ?, ?, ?)'
  );
  insert.run(defaultId, 'Default Tenant', DEFAULT_TENANT_SLUG, 'active', 'enterprise');

  // Idempotently ensure the default tenant is enterprise (repairs rows created
  // before plan existed or backfilled as 'trial').
  sqlite.prepare(
    "UPDATE tenants SET plan = 'enterprise', subscription_status = 'active' WHERE slug = ? AND (plan IS NULL OR plan != 'enterprise')"
  ).run(DEFAULT_TENANT_SLUG);

  // Fetch the default tenant row
  const row = sqlite.prepare('SELECT id FROM tenants WHERE slug = ?').get(DEFAULT_TENANT_SLUG);
  const defaultTenantId = row ? row.id : defaultId;

  // Backfill existing rows that have no tenant (one-time migration)
  sqlite.prepare('UPDATE users SET tenant_id = ? WHERE tenant_id IS NULL').run(defaultTenantId);
  sqlite.prepare('UPDATE jobs SET tenant_id = ? WHERE tenant_id IS NULL').run(defaultTenantId);

  return { id: defaultTenantId };
}

module.exports = { ensureDefaultTenant };