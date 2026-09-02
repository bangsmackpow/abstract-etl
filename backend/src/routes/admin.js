const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const { db } = require('../db');
const { jobs, settings } = require('../db/schema');
const { avg, count, eq, desc, and, gte, lte, sql } = require('drizzle-orm');
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
  setTenantLogo,
  clearTenantLogo,
  getTenantLogo,
} = require('../services/tenantRepo');

// Logo upload — in-memory buffer (no disk write), max 2MB.
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') cb(null, true);
    else cb(createError('Logo must be a PNG or JPG image (max 2MB)', 400));
  },
});

router.use(requireAuth);

// ── Tenant-scoped routes (requireTenantAdmin) ──────────────────────────────
// Helper: build a tenant + date-range filter for jobs queries.
function tenantDateFilter(tenantId, from, to) {
  const conds = [eq(jobs.tenantId, tenantId)];
  if (from) {
    const fromTs = Math.floor(new Date(from).getTime() / 1000);
    if (!Number.isNaN(fromTs)) conds.push(gte(jobs.createdAt, fromTs));
  }
  if (to) {
    // Inclusive end-of-day
    const toTs = Math.floor(new Date(to).getTime() / 1000) + 86399;
    if (!Number.isNaN(toTs)) conds.push(lte(jobs.createdAt, toTs));
  }
  return and(...conds);
}

// Metrics: only this tenant's users and jobs, with status breakdown,
// date-range filter, volume over time, and processing-time stats.
router.get('/metrics', requireTenantAdmin, async (req, res) => {
  const tenantId = req.tenantId;
  const { from, to } = req.query;
  const where = tenantDateFilter(tenantId, from, to);

  // Overall
  const [overall] = await db
    .select({ totalJobs: count(jobs.id), avgProcessingTime: avg(jobs.processingTimeMs) })
    .from(jobs)
    .where(where);

  // Status breakdown
  const statusRows = await db
    .select({ status: jobs.status, count: count(jobs.id) })
    .from(jobs)
    .where(where)
    .groupBy(jobs.status);

  // Per-user counts + time
  const jobsPerUser = await db
    .select({
      userId: jobs.createdBy,
      jobCount: count(jobs.id),
      avgProcessingTime: avg(jobs.processingTimeMs),
      maxProcessingTime: sql`max(${jobs.processingTimeMs})`,
    })
    .from(jobs)
    .where(where)
    .groupBy(jobs.createdBy);

  // Per-user × status
  const userStatusRows = await db
    .select({
      userId: jobs.createdBy,
      status: jobs.status,
      count: count(jobs.id),
    })
    .from(jobs)
    .where(where)
    .groupBy(jobs.createdBy, jobs.status);

  // Volume over time (per calendar day, newest last)
  const volumeRows = await db
    .select({
      day: sql`date(created_at, 'unixepoch')`,
      count: count(jobs.id),
    })
    .from(jobs)
    .where(where)
    .groupBy(sql`date(created_at, 'unixepoch')`)
    .orderBy(sql`date(created_at, 'unixepoch')`);

  // Processing-time distribution (for percentiles) + slow extractions
  const procRows = await db
    .select({ id: jobs.id, propertyAddress: jobs.propertyAddress, borrowerNames: jobs.borrowerNames, processingTimeMs: jobs.processingTimeMs, status: jobs.status })
    .from(jobs)
    .where(and(where, sql`${jobs.processingTimeMs} is not null`));

  const procTimes = procRows.map((r) => Number(r.processingTimeMs)).sort((a, b) => a - b);
  const percentile = (p) => {
    if (procTimes.length === 0) return null;
    const idx = Math.min(procTimes.length - 1, Math.max(0, Math.ceil((p / 100) * procTimes.length) - 1));
    return procTimes[idx];
  };
  const procStats = {
    avg: overall.avgProcessingTime ? Number(overall.avgProcessingTime) : null,
    max: procTimes.length ? procTimes[procTimes.length - 1] : null,
    p50: percentile(50),
    p95: percentile(95),
    count: procTimes.length,
  };

  // Slow extractions: top 10 by processing time
  const slowJobs = [...procRows].sort((a, b) => (b.processingTimeMs || 0) - (a.processingTimeMs || 0)).slice(0, 10);

  // Join user names from this tenant for the per-user table
  const tenantUsers = await listUsersByTenant(tenantId);
  const userMap = new Map(tenantUsers.map((u) => [u.id, u.name]));
  const perUser = jobsPerUser.map((r) => ({
    userId: r.userId,
    userName: userMap.get(r.userId) || 'Unknown',
    jobCount: r.jobCount,
    avgProcessingTime: r.avgProcessingTime,
    maxProcessingTime: r.maxProcessingTime,
  }));
  const userStatus = userStatusRows.map((r) => ({
    userId: r.userId,
    userName: userMap.get(r.userId) || 'Unknown',
    status: r.status,
    count: r.count,
  }));

  res.json({
    overall,
    statusBreakdown: statusRows,
    perUser,
    userStatus,
    volumeOverTime: volumeRows,
    processing: procStats,
    slowJobs,
    filters: { from: from || null, to: to || null },
  });
});

// GET /metrics/export — CSV of the tenant's jobs (respects date range).
router.get('/metrics/export', requireTenantAdmin, async (req, res) => {
  const tenantId = req.tenantId;
  const { from, to } = req.query;
  const where = tenantDateFilter(tenantId, from, to);

  const rows = await db
    .select({
      id: jobs.id,
      propertyAddress: jobs.propertyAddress,
      borrowerNames: jobs.borrowerNames,
      county: jobs.county,
      status: jobs.status,
      templateVersion: jobs.templateVersion,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      processingTimeMs: jobs.processingTimeMs,
    })
    .from(jobs)
    .where(where)
    .orderBy(desc(jobs.createdAt));

  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['id', 'property_address', 'borrower_names', 'county', 'status', 'template_version', 'created_at', 'updated_at', 'processing_time_ms'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      esc(r.id),
      esc(r.propertyAddress),
      esc(r.borrowerNames),
      esc(r.county),
      esc(r.status),
      esc(r.templateVersion),
      r.createdAt ? new Date(r.createdAt * 1000).toISOString() : '',
      r.updatedAt ? new Date(r.updatedAt * 1000).toISOString() : '',
      esc(r.processingTimeMs),
    ].join(','));
  }

  const range = from || to ? `_${from || 'start'}-${to || 'end'}` : '';
  const filename = `abstract-jobs-${tenantId.slice(0, 8)}${range}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(lines.join('\n'));
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

// ── Tenant Logo (requireTenantAdmin; affects own tenant only) ────────────────

// GET /api/admin/logo — current tenant's logo (data URI) for preview
router.get('/logo', requireTenantAdmin, async (req, res) => {
  const logo = await getTenantLogo(req.tenantId);
  if (!logo) return res.json({ hasLogo: false });
  res.json({
    hasLogo: true,
    mime: logo.mime,
    dataUri: `data:${logo.mime};base64,${logo.blob}`,
  });
});

// PUT /api/admin/logo — upload/replace the tenant logo
router.put('/logo', requireTenantAdmin, logoUpload.single('logo'), async (req, res) => {
  if (!req.file) throw createError('No logo file provided', 400);

  const blob = req.file.buffer.toString('base64');
  await setTenantLogo(req.tenantId, { blob, mime: req.file.mimetype });
  res.json({
    hasLogo: true,
    mime: req.file.mimetype,
    dataUri: `data:${req.file.mimetype};base64,${blob}`,
  });
});

// DELETE /api/admin/logo — remove the tenant logo
router.delete('/logo', requireTenantAdmin, async (req, res) => {
  await clearTenantLogo(req.tenantId);
  res.json({ hasLogo: false });
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