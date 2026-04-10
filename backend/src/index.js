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

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅  Abstract ETL backend running on internal port ${PORT}`);
  console.log(`    PocketBase: ${process.env.POCKETBASE_URL}`);
  
  const provider = process.env.AI_PROVIDER || 'openrouter';
  const model    = provider === 'openrouter' ? (process.env.AI_MODEL || 'google/gemini-flash-1.5-8b') : 'gemini-1.5-flash';
  console.log(`    AI Provider: ${provider} (${model})`);
  console.log(`    AI Keys: ${provider === 'gemini' ? (process.env.GEMINI_API_KEY ? '✓ set' : '✗ MISSING') : (process.env.OPENROUTER_API_KEY ? '✓ set' : '✗ MISSING')}`);
});
