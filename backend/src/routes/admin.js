const express = require('express');
const path = require('path');
const router = express.Router();
const { db } = require('../db');
const { users, jobs, settings } = require('../db/schema');
const { eq, sql, avg, count } = require('drizzle-orm');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');
const { hashPassword } = require('../services/authService');
const { createError } = require('../middleware/errorHandler');
const { manualBackup, listBackups, restoreBackup, getBackupPath, restartScheduler } = require('../services/backupService');
const { resetTransporter } = require('../services/emailService');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/metrics', async (req, res) => {
  const jobsPerUser = await db
    .select({
      userId: users.id,
      userName: users.name,
      jobCount: count(jobs.id),
      avgProcessingTime: avg(jobs.processingTimeMs),
    })
    .from(users)
    .leftJoin(jobs, eq(users.id, jobs.createdBy))
    .groupBy(users.id);

  const [overall] = await db
    .select({
      totalJobs: count(jobs.id),
      avgProcessingTime: avg(jobs.processingTimeMs),
    })
    .from(jobs);

  res.json({
    perUser: jobsPerUser,
    overall: overall,
  });
});

router.get('/users', async (req, res) => {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users);
  res.json(allUsers);
});

router.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw createError('Name, email, and password are required', 400);
  }

  const hashedPassword = await hashPassword(password);

  try {
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role: role || 'abstractor',
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw createError('Email already exists', 400);
    }
    throw err;
  }
});

router.patch('/users/:id/password', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw createError('New password is required', 400);
  }

  const hashedPassword = await hashPassword(password);

  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(users.id, req.params.id));

  res.json({ success: true, message: 'Password updated successfully' });
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    throw createError('Cannot delete your own account', 400);
  }

  await db.delete(users).where(eq(users.id, req.params.id));
  res.json({ success: true });
});

// ── Backup Routes ─────────────────────────────────────────────────────────────

router.post('/backup', async (req, res) => {
  const { notes } = req.body || {};
  const record = await manualBackup(notes);
  res.status(201).json(record);
});

router.get('/backups', async (req, res) => {
  const list = await listBackups();
  res.json(list);
});

router.get('/backups/:id/download', async (req, res) => {
  const filePath = await getBackupPath(req.params.id);
  const filename = path.basename(filePath);
  res.download(filePath, filename);
});

router.post('/backups/:id/restore', async (req, res) => {
  await restoreBackup(req.params.id);
  res.json({ success: true, message: 'Database restored successfully' });
});

// ── Settings Routes ───────────────────────────────────────────────────────────

const SETTING_KEYS = [
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
  'admin_email',
  'backup_enabled', 'backup_interval_minutes', 'backup_retention_days',
];

router.get('/settings', async (req, res) => {
  const rows = await db.select().from(settings);
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

router.patch('/settings', async (req, res) => {
  const allowedKeys = new Set(SETTING_KEYS);
  const changedKeys = [];

  for (const [key, value] of Object.entries(req.body)) {
    if (!allowedKeys.has(key)) continue;
    if (value === null || value === '') {
      await db.delete(settings).where(eq(settings.key, key));
    } else {
      await db.delete(settings).where(eq(settings.key, key));
      await db.insert(settings).values({ key, value: String(value) });
    }
    changedKeys.push(key);
  }

  // Reinitialize services if SMTP settings changed
  const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];
  if (smtpKeys.some((k) => changedKeys.includes(k))) {
    resetTransporter();
  }

  // Restart backup scheduler if backup settings changed
  if (['backup_enabled', 'backup_interval_minutes'].some((k) => changedKeys.includes(k))) {
    restartScheduler();
  }

  const rows = await db.select().from(settings);
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

module.exports = router;
