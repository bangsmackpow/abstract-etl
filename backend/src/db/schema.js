const { sqliteTable, text, integer, index } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');

const tenants = sqliteTable('tenants', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  status: text('status').notNull().default('active'), // 'active' | 'suspended'
  logoBlob: text('logo_blob'), // base64-encoded image; null = no logo
  logoMime: text('logo_mime'), // e.g. 'image/png' | 'image/jpeg'

  // Billing / trial (Track 5)
  plan: text('plan').notNull().default('trial'), // 'trial' | 'solo' | 'team' | 'enterprise'
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: text('subscription_status').default('none'), // none|active|incomplete|past_due|canceled
  trialEndsAt: integer('trial_ends_at'), // unix seconds
  subscriptionEndsAt: integer('subscription_ends_at'), // unix seconds

  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// Per-tenant operational settings (Track 1a) — key-value scoped by tenant.
const tenantSettings = sqliteTable(
  'tenant_settings',
  {
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    key: text('key').notNull(),
    value: text('value').notNull(),
  },
  (table) => ({
    tenantKeyIndex: index('tenant_settings_tenant_key_idx').on(table.tenantId, table.key),
    tenantIndex: index('tenant_settings_tenant_idx').on(table.tenantId),
  })
);

const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    tenantId: text('tenant_id').references(() => tenants.id),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(), // Hashed
    role: text('role').notNull().default('abstractor'), // 'admin' (tenant admin) or 'abstractor'
    isPlatformAdmin: integer('is_platform_admin', { mode: 'boolean' }).default(false),

    // MFA / OTP (Track 2)
    mfaEnabled: integer('mfa_enabled', { mode: 'boolean' }).default(false),
    otpCodeHash: text('otp_code_hash'), // SHA-256 hash of current OTP code
    otpExpiresAt: integer('otp_expires_at'), // unix seconds

    // Incremented on password change/reset → invalidates previously issued JWTs
    tokenVersion: integer('token_version').default(0),

    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    tenantIndex: index('users_tenant_idx').on(table.tenantId),
  })
);

// One-time password reset tokens (Track 2) — hashed, expiring.
const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(), // SHA-256 of the emailed token
    expiresAt: integer('expires_at').notNull(), // unix seconds
    usedAt: integer('used_at'), // unix seconds
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    userIdIndex: index('pw_reset_user_idx').on(table.userId),
    tokenHashIndex: index('pw_reset_token_hash_idx').on(table.tokenHash),
  })
);

const jobs = sqliteTable(
  'jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    tenantId: text('tenant_id').references(() => tenants.id),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    status: text('status').notNull().default('draft'), // 'draft', 'needs_review', 'complete'
    propertyAddress: text('property_address').notNull(),
    borrowerNames: text('borrower_names'),
    county: text('county'),
    orderDate: text('order_date'),
    fieldsJson: text('fields_json', { mode: 'json' }),
    aiFlagsJson: text('ai_flags_json', { mode: 'json' }),
    templateVersion: text('template_version').default('v7'),
    emailSent: integer('email_sent', { mode: 'boolean' }).default(false),
    notes: text('notes'),

    // Metrics
    processingTimeMs: integer('processing_time_ms'),

    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    userIndex: index('user_idx').on(table.createdBy),
    statusIndex: index('status_idx').on(table.status),
    tenantUserIndex: index('jobs_tenant_created_by_idx').on(table.tenantId, table.createdBy),
    tenantStatusIndex: index('jobs_tenant_status_idx').on(table.tenantId, table.status),
    tenantIndex: index('jobs_tenant_idx').on(table.tenantId),
  })
);

const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

const backups = sqliteTable('backups', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  filename: text('filename').notNull(),
  sizeBytes: integer('size_bytes'),
  status: text('status').notNull().default('completed'), // completed, failed
  errorMessage: text('error_message'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    actorUserId: text('actor_user_id').references(() => users.id),
    action: text('action').notNull(), // e.g. 'job.move', 'tenant.logo_set'
    targetType: text('target_type').notNull(), // e.g. 'job', 'tenant'
    targetId: text('target_id').notNull(),
    fromTenantId: text('from_tenant_id').references(() => tenants.id),
    toTenantId: text('to_tenant_id').references(() => tenants.id),
    details: text('details'), // free-form JSON or note
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    actorIndex: index('audit_actor_idx').on(table.actorUserId),
    targetIndex: index('audit_target_idx').on(table.targetType, table.targetId),
    fromTenantIndex: index('audit_from_tenant_idx').on(table.fromTenantId),
    createdAtIndex: index('audit_created_idx').on(table.createdAt),
  })
);

module.exports = {
  tenants,
  tenantSettings,
  users,
  jobs,
  settings,
  backups,
  auditLog,
  passwordResetTokens,
};
