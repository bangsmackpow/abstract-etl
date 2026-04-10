require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

const jobRoutes      = require('./routes/jobs');
const extractRoutes  = require('./routes/extract');
const generateRoutes = require('./routes/generate');
const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Uploads directory ────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    process.env.APP_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/jobs',     jobRoutes);
app.use('/api/extract',  extractRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/admin',    adminRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Startup ──────────────────────────────────────────────────────────────────
const { db } = require('./db');
const { users } = require('./db/schema');
const { hashPassword } = require('./services/authService');

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPass  = process.env.ADMIN_PASSWORD || 'admin123';
  
  const [existingAdmin] = await db.select().from(users).limit(1);
  
  if (!existingAdmin) {
    console.log('🌱 Seeding initial admin user...');
    const hashedPassword = await hashPassword(adminPass);
    await db.insert(users).values({
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  }
}

async function start() {
  try {
    // Note: In a real production app, you'd run migrations here.
    // For this migration, we'll assume the schema is created by drizzle-kit push
    // or we can use drizzle-orm/better-sqlite3/migrator
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    console.log('🔄 Running database migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`✅  Abstract ETL backend running on port ${PORT}`);
      console.log(`    Database: SQLite (WAL mode enabled)`);
      
      const provider = process.env.AI_PROVIDER || 'openrouter';
      const model    = provider === 'openrouter' ? (process.env.AI_MODEL || 'google/gemini-flash-1.5-8b') : 'gemini-1.5-flash';
      console.log(`    AI Provider: ${provider} (${model})`);
    });
  } catch (err) {
    console.error('❌ Failed to start backend:', err);
    process.exit(1);
  }
}

start();
