const { db } = require('../db');
const { tenants, tenantSettings, users, jobs, auditLog, passwordResetTokens } = require('../db/schema');
const { eq, and, or, like, desc, sql } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');

/**
 * Tenant-scoped data access layer (multi-tenant-plan.md §5.1).
 * THE only place routes may query jobs/users. Every call takes tenantId and
 * injects eq(table.tenantId, tenantId). tenantId is derived ONLY from the JWT
 * (req.user.tenantId) — never from request bodies or URL params.
 */

// ---------------------------------------------------------------------------
// Tenants (platform admin)
// ---------------------------------------------------------------------------
async function getTenantBySlug(slug) {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return row || null;
}

async function listTenants() {
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

async function createTenant({ name, slug = null, status = 'active', plan = 'trial', trialEndsAt = null }) {
  const [row] = await db
    .insert(tenants)
    .values({ id: uuidv4(), name, slug, status, plan, trialEndsAt })
    .returning();
  return row;
}

async function setTenantStatus(id, status) {
  const [row] = await db
    .update(tenants)
    .set({ status, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(tenants.id, id))
    .returning();
  return row || null;
}

// ---------------------------------------------------------------------------
// Tenant logo (tenant admin manages their own tenant's logo)
// ---------------------------------------------------------------------------
async function setTenantLogo(tenantId, { blob, mime }) {
  const [row] = await db
    .update(tenants)
    .set({ logoBlob: blob, logoMime: mime, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(tenants.id, tenantId))
    .returning({
      id: tenants.id,
      name: tenants.name,
      logoBlob: tenants.logoBlob,
      logoMime: tenants.logoMime,
    });
  return row || null;
}

async function clearTenantLogo(tenantId) {
  const [row] = await db
    .update(tenants)
    .set({ logoBlob: null, logoMime: null, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(tenants.id, tenantId))
    .returning({
      id: tenants.id,
      name: tenants.name,
      logoBlob: tenants.logoBlob,
      logoMime: tenants.logoMime,
    });
  return row || null;
}

/**
 * Returns the tenant's logo data (blob + mime) or null when not set.
 * Used by the generate route to pass the logo into generators.
 */
async function getTenantLogo(tenantId) {
  const [row] = await db
    .select({ logoBlob: tenants.logoBlob, logoMime: tenants.logoMime })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!row || !row.logoBlob) return null;
  return { blob: row.logoBlob, mime: row.logoMime };
}

// ---------------------------------------------------------------------------
// Jobs — every query is tenant-scoped
// ---------------------------------------------------------------------------
async function listJobs(tenantId, opts = {}) {
  const { search, status, userId, page = 1, perPage = 25 } = opts;
  const offset = (Number(page) - 1) * Number(perPage);
  const limit = Number(perPage);

  const filters = [eq(jobs.tenantId, tenantId)];
  if (userId) filters.push(eq(jobs.createdBy, userId));
  if (status) filters.push(eq(jobs.status, status));
  if (search) {
    filters.push(
      or(
        like(jobs.propertyAddress, `%${search}%`),
        like(jobs.borrowerNames, `%${search}%`),
        like(jobs.county, `%${search}%`)
      )
    );
  }

  const whereClause = and(...filters);

  const records = await db
    .select()
    .from(jobs)
    .where(whereClause)
    .orderBy(desc(jobs.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql`count(*)` })
    .from(jobs)
    .where(whereClause);

  return {
    items: records,
    page: Number(page),
    perPage: Number(perPage),
    totalItems: Number(countResult.count),
    totalPages: Math.ceil(Number(countResult.count) / limit),
  };
}

async function getJob(tenantId, id) {
  const [row] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
    .limit(1);
  return row || null;
}

async function createJob(tenantId, data) {
  const [row] = await db
    .insert(jobs)
    .values({
      tenantId,
      createdBy: data.createdBy,
      status: data.status || 'draft',
      propertyAddress: data.propertyAddress || 'PENDING ADDRESS',
      borrowerNames: data.borrowerNames || '',
      county: data.county || '',
      orderDate: data.orderDate || null,
      fieldsJson: data.fieldsJson || {},
      aiFlagsJson: data.aiFlagsJson || {},
      templateVersion: data.templateVersion || 'v7',
      emailSent: false,
      notes: data.notes || '',
      processingTimeMs: data.processingTimeMs || null,
    })
    .returning();
  return row;
}

async function updateJob(tenantId, id, updates) {
  const [row] = await db
    .update(jobs)
    .set({ ...updates, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
    .returning();
  return row || null;
}

async function deleteJob(tenantId, id) {
  await db
    .delete(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)));
  return true;
}

async function setJobEmailSent(tenantId, id) {
  await db
    .update(jobs)
    .set({ emailSent: true, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)));
}

// ---------------------------------------------------------------------------
// Users — every query is tenant-scoped (platform admins may span, handled at
// route level via explicit userRepo functions that don't assume a tenant)
// ---------------------------------------------------------------------------
async function listUsersByTenant(tenantId) {
  return db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      name: users.name,
      email: users.email,
      role: users.role,
      isPlatformAdmin: users.isPlatformAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .orderBy(users.name);
}

async function getUserByTenant(tenantId, userId) {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);
  return row || null;
}

async function createUserForTenant(tenantId, { name, email, password, role = 'abstractor' }) {
  const [row] = await db
    .insert(users)
    .values({ tenantId, name, email, password, role })
    .returning({
      id: users.id,
      tenantId: users.tenantId,
      name: users.name,
      email: users.email,
      role: users.role,
      isPlatformAdmin: users.isPlatformAdmin,
    });
  return row;
}

async function updateUserPassword(tenantId, userId, password) {
  await db
    .update(users)
    .set({
      password,
      tokenVersion: sql`COALESCE(token_version, 0) + 1`,
      updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
  return true;
}

/**
 * Invalidate all previously-issued JWTs for a user (password change/reset).
 */
async function bumpTokenVersion(userId) {
  await db
    .update(users)
    .set({ tokenVersion: sql`COALESCE(token_version, 0) + 1`, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(users.id, userId));
}

/**
 * Platform-level: update a user's email (e.g. the tenant admin's login email).
 * Validates uniqueness; returns { error: 'email_taken' } on conflict.
 */
async function updateUserEmail(userId, email) {
  const cleanEmail = String(email).trim().toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  if (existing && existing.id !== userId) return { error: 'email_taken' };

  await db
    .update(users)
    .set({ email: cleanEmail, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(users.id, userId));
  const [row] = await db
    .select({ id: users.id, tenantId: users.tenantId, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { user: row };
}

async function deleteUserByTenant(tenantId, userId) {
  await db
    .delete(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
  return true;
}

/**
 * Platform-level user lookup by id (no tenant filter) — used by requireAuth
 * to resolve the authenticated user. Not exposed to tenant-scoped routes.
 */

// ---------------------------------------------------------------------------
// Tenant settings (Track 1a) — key-value scoped by tenant
// ---------------------------------------------------------------------------
// The ONLY keys writable through setTenantSettings. Enforced centrally so
// every caller (tenant admin AND platform admin) is held to the same contract.
const TENANT_SETTING_KEYS = new Set([
  'notification_email',
  'daily_report_enabled',
  'daily_report_time', // HH:MM (24h, UTC)
  'default_output_format', // docx-text | docx-table | pdf | markdown
  'enable_completion_emails',
  'enable_bulk_import_emails',
]);

async function getTenantSetting(tenantId, key) {
  const [row] = await db
    .select({ value: tenantSettings.value })
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)))
    .limit(1);
  return row ? row.value : null;
}

async function listTenantSettings(tenantId) {
  const rows = await db
    .select({ key: tenantSettings.key, value: tenantSettings.value })
    .from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenantId));
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

async function setTenantSetting(tenantId, key, value) {
  if (value === null || value === '') {
    await db
      .delete(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)));
    return;
  }
  await db
    .delete(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)));
  await db.insert(tenantSettings).values({ tenantId, key, value: String(value) });
}

async function setTenantSettings(tenantId, entries) {
  for (const [key, value] of Object.entries(entries)) {
    if (!TENANT_SETTING_KEYS.has(key)) continue; // drop unknown keys centrally
    await setTenantSetting(tenantId, key, value);
  }
  return listTenantSettings(tenantId);
}

// ---------------------------------------------------------------------------
// MFA / OTP (Track 2)
// ---------------------------------------------------------------------------
async function setUserMfa(userId, enabled, { otpCodeHash = null, otpExpiresAt = null } = {}) {
  await db
    .update(users)
    .set({
      mfaEnabled: enabled,
      otpCodeHash,
      otpExpiresAt,
      updatedAt: sql`(strftime('%s', 'now'))`,
    })
    .where(eq(users.id, userId));
}

async function setUserOtp(userId, { otpCodeHash, otpExpiresAt }) {
  await db
    .update(users)
    .set({ otpCodeHash, otpExpiresAt, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Password reset tokens (Track 2)
// ---------------------------------------------------------------------------
async function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
  const [row] = await db
    .insert(passwordResetTokens)
    .values({ id: uuidv4(), userId, tokenHash, expiresAt })
    .returning();
  return row;
}

async function findValidResetToken(tokenHash) {
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), sql`used_at IS NULL`))
    .limit(1);
  if (!row) return null;
  if (new Date(row.expiresAt * 1000) < new Date()) return null; // expired
  return row;
}

async function markResetTokenUsed(id) {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(passwordResetTokens.id, id));
}

// ---------------------------------------------------------------------------
// Platform-level operations (super-admin only) — documented exceptions to the
// JWT-only tenantId rule (multi-tenant-plan.md §5.1). Used by /api/platform.
// ---------------------------------------------------------------------------
async function getTenantById(id) {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return row || null;
}

async function listJobsForTenant(tenantId, opts = {}) {
  const { search, status, page = 1, perPage = 50 } = opts;
  const offset = (Number(page) - 1) * Number(perPage);
  const limit = Number(perPage);

  const filters = [eq(jobs.tenantId, tenantId)];
  if (status) filters.push(eq(jobs.status, status));
  if (search) {
    filters.push(
      or(
        like(jobs.propertyAddress, `%${search}%`),
        like(jobs.borrowerNames, `%${search}%`),
        like(jobs.county, `%${search}%`)
      )
    );
  }
  const whereClause = and(...filters);

  const items = await db
    .select()
    .from(jobs)
    .where(whereClause)
    .orderBy(desc(jobs.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql`count(*)` })
    .from(jobs)
    .where(whereClause);

  return {
    items,
    page: Number(page),
    perPage: Number(perPage),
    totalItems: Number(countResult.count),
    totalPages: Math.ceil(Number(countResult.count) / limit),
  };
}

/**
 * First admin user of a tenant — used as the reassignment target when moving a
 * job into a tenant (the job's createdBy must belong to that tenant).
 */
async function getTenantFirstAdmin(tenantId) {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, 'admin')))
    .orderBy(users.createdAt)
    .limit(1);
  return row || null;
}

/**
 * Move a job to another tenant (platform super-admin only). Reassigns
 * createdBy to the destination tenant's first admin and preserves all other
 * job state. Returns the updated job, or null if the job isn't found.
 */
async function moveJobToTenant(jobId, toTenantId) {
  const [targetTenant] = await db.select().from(tenants).where(eq(tenants.id, toTenantId)).limit(1);
  if (!targetTenant) return { error: 'tenant_not_found' };

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return { error: 'job_not_found' };

  const fromTenantId = job.tenantId;
  if (fromTenantId === toTenantId) return { error: 'same_tenant' };

  const destAdmin = await getTenantFirstAdmin(toTenantId);
  if (!destAdmin) return { error: 'no_destination_admin' };

  const [updated] = await db
    .update(jobs)
    .set({ tenantId: toTenantId, createdBy: destAdmin.id, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(jobs.id, jobId))
    .returning();

  return { job: updated, fromTenantId, toTenantId, destAdminId: destAdmin.id };
}

async function createAuditLog({ actorUserId, action, targetType, targetId, fromTenantId = null, toTenantId = null, details = null }) {
  const [row] = await db
    .insert(auditLog)
    .values({ id: uuidv4(), actorUserId, action, targetType, targetId, fromTenantId, toTenantId, details })
    .returning();
  return row;
}

async function listAuditLog(limit = 100) {
  return db
    .select({
      id: auditLog.id,
      actorUserId: auditLog.actorUserId,
      actorName: users.name,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      fromTenantId: auditLog.fromTenantId,
      toTenantId: auditLog.toTenantId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorUserId))
    .orderBy(desc(auditLog.createdAt))
    .limit(Number(limit) || 100);
}

module.exports = {
  // tenants
  getTenantBySlug,
  getTenantById,
  listTenants,
  createTenant,
  setTenantStatus,
  // tenant logo
  setTenantLogo,
  clearTenantLogo,
  getTenantLogo,
  // tenant settings
  getTenantSetting,
  listTenantSettings,
  setTenantSettings,
  // jobs
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  setJobEmailSent,
  // users
  listUsersByTenant,
  getUserByTenant,
  createUserForTenant,
  updateUserPassword,
  updateUserEmail,
  deleteUserByTenant,
  bumpTokenVersion,
  // MFA / OTP
  setUserMfa,
  setUserOtp,
  // password reset
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed,
  // platform-level
  listJobsForTenant,
  getTenantFirstAdmin,
  moveJobToTenant,
  createAuditLog,
  listAuditLog,
};