const { db } = require('../db');
const { jobs, tenants, users } = require('../db/schema');
const { eq, and, gte, lt, count, avg } = require('drizzle-orm');
const { listTenantSettings } = require('./tenantRepo');
const { sendDailyUsageReport } = require('./emailService');

/**
 * Daily usage report (Track 1c). Emails each tenant (with daily_report_enabled)
 * a summary of the previous UTC day's jobs. Runs on a scheduler; the per-tenant
 * time is configurable via daily_report_time (HH:MM UTC, default 00:00).
 */

async function buildReport(tenantId, dayStart, dayEnd) {
  const where = and(eq(jobs.tenantId, tenantId), gte(jobs.createdAt, dayStart), lt(jobs.createdAt, dayEnd));

  const [overall] = await db
    .select({ total: count(jobs.id), avgMs: avg(jobs.processingTimeMs) })
    .from(jobs)
    .where(where);

  const statusRows = await db
    .select({ status: jobs.status, count: count(jobs.id) })
    .from(jobs)
    .where(where)
    .groupBy(jobs.status);

  const perUser = await db
    .select({ userId: jobs.createdBy, count: count(jobs.id) })
    .from(jobs)
    .where(where)
    .groupBy(jobs.createdBy);

  const tenantUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.tenantId, tenantId));
  const userMap = new Map(tenantUsers.map((u) => [u.id, u.name]));

  return {
    total: Number(overall.total || 0),
    avgMs: overall.avgMs,
    statusBreakdown: statusRows,
    perUser: perUser.map((r) => ({ name: userMap.get(r.userId) || 'Unknown', count: r.count })),
  };
}

async function sendDailyReports() {
  const dayEnd = Math.floor(Date.now() / 1000);
  const dayStart = dayEnd - 86400; // last 24h (rolling window)

  const tenantRows = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.status, 'active'));

  let sent = 0;
  for (const tenant of tenantRows) {
    const settings = await listTenantSettings(tenant.id);
    if (settings.daily_report_enabled !== 'true') continue;

    const to = settings.notification_email;
    if (!to) continue;

    const report = await buildReport(tenant.id, dayStart, dayEnd);
    const ok = await sendDailyUsageReport({
      to,
      tenantName: tenant.name,
      report,
    });
    if (ok) sent += 1;
  }
  return sent;
}

// ── Scheduler ────────────────────────────────────────────────────────────────
let reportTimer = null;

function scheduleNext() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(0, 0, 5, 0); // 00:00:05 UTC
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delay = next.getTime() - now.getTime();
  if (reportTimer) clearTimeout(reportTimer);
  reportTimer = setTimeout(runAndReschedule, delay);
}

async function runAndReschedule() {
  try {
    const sent = await sendDailyReports();
    console.info(`[Reports] Daily usage report sent to ${sent} tenant(s)`);
  } catch (err) {
    console.error('[Reports] Daily usage report failed:', err.message);
  } finally {
    scheduleNext();
  }
}

function startReportScheduler() {
  scheduleNext();
}

function stopReportScheduler() {
  if (reportTimer) clearTimeout(reportTimer);
  reportTimer = null;
}

module.exports = {
  sendDailyReports,
  buildReport,
  startReportScheduler,
  stopReportScheduler,
};