const { db } = require('../db');
const { tenants, users, jobs } = require('../db/schema');
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

async function createTenant({ name, slug = null, status = 'active' }) {
  const [row] = await db
    .insert(tenants)
    .values({ id: uuidv4(), name, slug, status })
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
    .set({ password, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
  return true;
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

module.exports = {
  // tenants
  getTenantBySlug,
  listTenants,
  createTenant,
  setTenantStatus,
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
  deleteUserByTenant,
};