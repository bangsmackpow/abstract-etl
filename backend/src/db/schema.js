const { sqliteTable, text, integer, index } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');

const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // Hashed
  role: text('role').notNull().default('abstractor'), // 'admin' or 'abstractor'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

const jobs = sqliteTable(
  'jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv4()),
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
    templateVersion: text('template_version').default('v1'),
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

module.exports = {
  users,
  jobs,
  settings,
  backups,
};
