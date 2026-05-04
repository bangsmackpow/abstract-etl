require('dotenv').config();
const { env } = require('./env');
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const jobRoutes = require('./routes/jobs');
const extractRoutes = require('./routes/extract');
const generateRoutes = require('./routes/generate');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = env.PORT || 3001;

// ── Uploads directory ────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [
      env.APP_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── No caching for API responses (prevent Cloudflare/CDN from caching dynamic data)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/admin', adminRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Startup ──────────────────────────────────────────────────────────────────
const { db } = require('./db');
const { users } = require('./db/schema');
const { eq } = require('drizzle-orm');

async function seedAdmin() {
  const adminEmail = env.ADMIN_EMAIL;
  const adminPass = env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPass) {
    console.warn('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seed/sync.');
    return;
  }

  const [existingAdmin] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  const bcrypt = require('bcryptjs');

  if (!existingAdmin) {
    // console.log('🌱 Seeding initial admin user...');
    const hashedPassword = bcrypt.hashSync(adminPass, 10);
    await db.insert(users).values({
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    });
    // console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    // Check if we need to update the password (e.g. if env changed)
    const isSame = bcrypt.compareSync(adminPass, existingAdmin.password);

    if (!isSame) {
      // console.log('👤 Admin password changed in env. Updating...');
      const hashedPassword = bcrypt.hashSync(adminPass, 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, existingAdmin.id));
      // console.log('✅ Admin password updated.');
    } else {
      // console.log('✅ Admin user verified.');
    }
  }
}

async function ensureSystemTables() {
  const { sqlite } = require('./db');

  // Create tables — IF NOT EXISTS handles first-run. ALTER TABLE handles schema drift.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      size_bytes INTEGER,
      status TEXT NOT NULL DEFAULT 'completed',
      error_message TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // ── Schema drift: add missing columns to existing tables ────────────────
  // SQLite throws "duplicate column" if column already exists, so try/catch.
  const migrations = [
    'ALTER TABLE backups ADD COLUMN notes TEXT',
    // Future: add new column ALTERs here as the schema evolves
  ];

  for (const stmt of migrations) {
    try { sqlite.exec(stmt); } catch (e) {
      // Column already exists or not applicable — expected on subsequent runs
    }
  }

  // ── Verify schema matches expectations ─────────────────────────────────
  const backupCols = sqlite.prepare('PRAGMA table_info(\'backups\')').all();
  const expectedBackupCols = ['id', 'filename', 'size_bytes', 'status', 'error_message', 'notes', 'created_at'];
  const missingBackupCols = expectedBackupCols.filter((c) => !backupCols.find((r) => r.name === c));
  if (missingBackupCols.length > 0) {
    console.warn(`⚠️  backups table missing columns: ${missingBackupCols.join(', ')}`);
  }

  const settingCols = sqlite.prepare('PRAGMA table_info(\'settings\')').all();
  const expectedSettingCols = ['key', 'value'];
  const missingSettingCols = expectedSettingCols.filter((c) => !settingCols.find((r) => r.name === c));
  if (missingSettingCols.length > 0) {
    console.warn(`⚠️  settings table missing columns: ${missingSettingCols.join(', ')}`);
  }
}

async function start() {
  try {
    // Note: In a real production app, you'd run migrations here.
    // For this migration, we'll assume the schema is created by drizzle-kit push
    // or we can use drizzle-orm/better-sqlite3/migrator
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    // console.log('🔄 Running database migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });

    await ensureSystemTables();
    await seedAdmin();

    const server = app.listen(PORT, () => {
      // console.log(`✅  Abstract ETL backend running on port ${PORT}`);
      // console.log('    Database: SQLite (WAL mode enabled)');
      // console.log('    AI Provider: Google Native (Gemini 2.5 Flash)');
    });

    // Start automated backup scheduler
    const { startBackupScheduler } = require('./services/backupService');
    startBackupScheduler();

    // Increase timeout for long AI extractions (10 mins)
    server.timeout = 600000;
    server.keepAliveTimeout = 610000;
  } catch (err) {
    console.error('❌ Failed to start backend:', err);
    process.exit(1);
  }
}

start();
