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
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

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
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    tenantIndex: index('users_tenant_idx').on(table.tenantId),
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
  users,
  jobs,
  settings,
  backups,
  auditLog,
};
