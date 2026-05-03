const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { backups, settings } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { sendBackupNotification } = require('./emailService');

const BACKUP_DIR = path.resolve(__dirname, '../../backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function manualBackup() {
  ensureBackupDir();
  const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../data/sqlite.db');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `abstract-backup-${timestamp}.db`;
  const dest = path.join(BACKUP_DIR, filename);

  try {
    fs.copyFileSync(dbPath, dest);
    const stats = fs.statSync(dest);
    const [record] = await db
      .insert(backups)
      .values({
        filename,
        sizeBytes: stats.size,
        status: 'completed',
      })
      .returning();
    await cleanupOldBackups();
    return record;
  } catch (err) {
    await db.insert(backups).values({
      filename,
      status: 'failed',
      errorMessage: err.message,
    });
    const adminEmail = await getSetting('admin_email');
    if (adminEmail) {
      sendBackupNotification({ to: adminEmail, success: false, error: err.message });
    }
    throw err;
  }
}

async function cleanupOldBackups() {
  const retentionDays = parseInt(await getSetting('backup_retention_days') || '30', 10);
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
  const oldRecords = await db
    .select()
    .from(backups)
    .where(backups.createdAt < cutoff);
  for (const r of oldRecords) {
    const filePath = path.join(BACKUP_DIR, r.filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
  await db.delete(backups).where(backups.createdAt < cutoff);
}

async function getSetting(key) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row ? row.value : null;
}

async function scheduledBackup() {
  try {
    await manualBackup();
    console.log(`[Backup] Auto-backup completed at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[Backup] Auto-backup failed:', err.message);
  }
}

let backupInterval = null;

function startBackupScheduler() {
  if (backupInterval) clearInterval(backupInterval);
  checkInterval();
}

async function checkInterval() {
  const enabled = await getSetting('backup_enabled');
  if (enabled !== 'true') return;
  const minutes = parseInt(await getSetting('backup_interval_minutes') || '60', 10);
  backupInterval = setInterval(scheduledBackup, minutes * 60 * 1000);
  console.log(`[Backup] Scheduler started — every ${minutes} minute(s)`);
}

function stopBackupScheduler() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
}

async function restartScheduler() {
  stopBackupScheduler();
  await checkInterval();
}

module.exports = {
  manualBackup,
  listBackups: () => db.select().from(backups).orderBy(backups.createdAt),
  getSetting,
  startBackupScheduler,
  stopBackupScheduler,
  restartScheduler,
};
