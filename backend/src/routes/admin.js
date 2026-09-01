const express = require('express');
const path = require('path');
const router = express.Router();
const { db } = require('../db');
const { jobs, settings } = require('../db/schema');
const { avg, count, eq } = require('drizzle-orm');
const { requireAuth, requireTenantAdmin, requirePlatformAdmin } = require('../middleware/requireAuth');
const { hashPassword } = require('../services/authService');
const { createError } = require('../middleware/errorHandler');
const { manualBackup, listBackups, restoreBackup, getBackupPath, restartScheduler } = require('../services/backupService');
const { resetTransporter } = require('../services/emailService');
const {
  listUsersByTenant,
  createUserForTenant,
  updateUserPassword,
  deleteUserByTenant,
} = require('../services/tenantRepo');

router.use(requireAuth);

// ── Tenant-scoped routes (requireTenantAdmin) ──────────────────────────────
// Metrics: only this tenant's users and jobs.
router.get('/metrics', requireTenantAdmin, async (req, res) => {
  const tenantId = req.tenantId;

  const jobsPerUser = await db
    .select({
      userId: jobs.createdBy,
      jobCount: count(jobs.id),
      avgProcessingTime: avg(jobs.processingTimeMs),
    })
    .from(jobs)
    .where(eq(jobs.tenantId, tenantId))
    .groupBy(jobs.createdBy);

  const [overall] = await db
    .select({
      totalJobs: count(jobs.id),
      avgProcessingTime: avg(jobs.processingTimeMs),
    })
    .from(jobs)
    .where(eq(jobs.tenantId, tenantId));

  // Join user names from this tenant for the per-user table
  const tenantUsers = await listUsersByTenant(tenantId);
  const userMap = new Map(tenantUsers.map((u) => [u.id, u.name]));
  const perUser = jobsPerUser.map((r) => ({
    userId: r.userId,
    userName: userMap.get(r.userId) || 'Unknown',
    jobCount: r.jobCount,
    avgProcessingTime: r.avgProcessingTime,
  }));

  res.json({
    perUser,
    overall,
  });
});

router.get('/users', requireTenantAdmin, async (req, res) => {
  const allUsers = await listUsersByTenant(req.tenantId);
  res.json(allUsers);
});

router.post('/users', requireTenantAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw createError('Name, email, and password are required', 400);
  }

  const hashedPassword = await hashPassword(password);

  try {
    const newUser = await createUserForTenant(req.tenantId, {
      name,
      email,
      password: hashedPassword,
      role: role || 'abstractor',
    });

    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw createError('Email already exists', 400);
    }
    throw err;
  }
});

router.patch('/users/:id/password', requireTenantAdmin, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw createError('New password is required', 400);
  }

  const hashedPassword = await hashPassword(password);
  await updateUserPassword(req.tenantId, req.params.id, hashedPassword);

  res.json({ success: true, message: 'Password updated successfully' });
});

router.delete('/users/:id', requireTenantAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    throw createError('Cannot delete your own account', 400);
  }

  await deleteUserByTenant(req.tenantId, req.params.id);
  res.json({ success: true });
});

// ── Platform-only routes (requirePlatformAdmin) ─────────────────────────────
// Global settings and whole-DB backups/restore must never be reachable by a
// tenant admin (multi-tenant-plan.md §5.3).

router.post('/backup', requirePlatformAdmin, async (req, res) => {
  const { notes } = req.body || {};
  const record = await manualBackup(notes);
  res.status(201).json(record);
});

router.get('/backups', requirePlatformAdmin, async (req, res) => {
  const list = await listBackups();
  res.json(list);
});

router.get('/backups/:id/download', requirePlatformAdmin, async (req, res) => {
  const filePath = await getBackupPath(req.params.id);
  const filename = path.basename(filePath);
  res.download(filePath, filename);
});

router.post('/backups/:id/restore', requirePlatformAdmin, async (req, res) => {
  await restoreBackup(req.params.id);
  res.json({ success: true, message: 'Database restored successfully' });
});

// ── Settings Routes (platform-only) ─────────────────────────────────────────

const SETTING_KEYS = [
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
  'admin_email',
  'backup_enabled', 'backup_interval_minutes', 'backup_retention_days',
];

const POSITIVE_INT_KEYS = new Set(['backup_interval_minutes', 'backup_retention_days']);

router.get('/settings', requirePlatformAdmin, async (req, res) => {
  const rows = await db.select().from(settings);
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

router.patch('/settings', requirePlatformAdmin, async (req, res) => {
  const allowedKeys = new Set(SETTING_KEYS);
  const changedKeys = [];

  for (const [key, value] of Object.entries(req.body)) {
    if (!allowedKeys.has(key)) continue;
    if (value === null || value === '') {
      await db.delete(settings).where(eq(settings.key, key));
    } else {
      if (POSITIVE_INT_KEYS.has(key)) {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1) {
          throw createError(`Setting "${key}" must be a positive integer`, 400);
        }
      }
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