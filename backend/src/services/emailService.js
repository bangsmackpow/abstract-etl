const { db } = require('../db');
const { settings } = require('../db/schema');
const { eq } = require('drizzle-orm');

/**
 * Transactional email via Resend (mandatory provider — no SMTP fallback).
 * Sends from a platform address (abstract@builtnetworks.com by default,
 * overridable via MAIL_FROM / the mail_from setting). The sending domain is
 * verified in Resend (SPF/DKIM). Uses fetch (Web API, Cloudflare-friendly).
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Abstract ETL <abstract@builtnetworks.com>';

let cachedApiKey = null;
let cachedFrom = null;

async function getDbSetting(key) {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return row ? row.value : null;
  } catch {
    return null;
  }
}

async function getApiKey() {
  return cachedApiKey || await getDbSetting('resend_api_key') || process.env.RESEND_API_KEY || null;
}

async function getFromAddress() {
  return cachedFrom || await getDbSetting('mail_from') || process.env.MAIL_FROM || DEFAULT_FROM;
}

function resetTransporter() {
  cachedApiKey = null;
  cachedFrom = null;
}

/**
 * Send an email through Resend. Throws when Resend is unavailable or the API
 * rejects the request.
 */
async function sendViaResend({ to, subject, html, from }) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const fromAddr = from || await getFromAddress();

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddr, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[Email] Resend error ${res.status}: ${text}`);
    throw new Error(`Resend request failed (${res.status})`);
  }
  return true;
}

async function sendCompletionEmail({ to, abstractorName, propertyAddress, jobId, appUrl }) {
  const jobUrl = `${appUrl || process.env.APP_URL}/jobs/${jobId}`;
  await sendViaResend({
    to,
    subject: `Abstract Complete: ${propertyAddress}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1F4E79; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0;">Abstract Job Complete</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #ddd; border-top: none;">
          <p>Hi${abstractorName ? ' ' + abstractorName : ''},</p>
          <p>An abstract job has been marked as <strong>complete</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; background: #f5f5f5; font-weight: bold; width: 40%;">Property Address</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px; background: #f5f5f5; font-weight: bold;">Completed</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</td>
            </tr>
          </table>
          <a href="${jobUrl}"
             style="display: inline-block; background: #2E75B6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; margin-top: 8px;">
            View Job
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Abstract ETL Tool — ${appUrl || 'Internal Tool'}
          </p>
        </div>
      </div>
    `,
  });
  return true;
}

async function sendBulkImportNotification({ to, results }) {
  const total = results.length;
  const succeeded = results.filter((r) => r.status === 'created').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  const rows = results.map((r) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${r.filename}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        <span style="color: ${r.status === 'created' ? 'green' : 'red'}; font-weight: bold;">
          ${r.status === 'created' ? 'Imported' : 'Failed'}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${r.propertyAddress || r.error || '—'}</td>
    </tr>
  `).join('');

  await sendViaResend({
    to,
    subject: `Bulk Import Complete: ${succeeded}/${total} files imported`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1F4E79; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0;">Bulk Import Results</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #ddd; border-top: none;">
          <p>Your bulk import has completed.</p>
          <p style="font-size: 18px;">
            <span style="color: green;">${succeeded} succeeded</span>
            ${failed > 0 ? ` · <span style="color: red;">${failed} failed</span>` : ''}
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 8px; text-align: left;">File</th>
                <th style="padding: 8px; text-align: left;">Status</th>
                <th style="padding: 8px; text-align: left;">Address</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Abstract ETL Tool — ${process.env.APP_URL || 'Internal Tool'}
          </p>
        </div>
      </div>
    `,
  });
  return true;
}

async function sendBackupNotification({ to, success, error }) {
  if (success) return true;

  await sendViaResend({
    to,
    subject: '[ALERT] Database Backup Failed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #c0392b; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0;">Backup Failed</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #ddd; border-top: none;">
          <p>The automated database backup has <strong style="color: red;">failed</strong>.</p>
          <p style="background: #fdf0ef; padding: 12px; border-radius: 4px; font-family: monospace;">
            ${error || 'Unknown error'}
          </p>
          <p>Please check the server and resolve the issue.</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Abstract ETL Tool — ${process.env.APP_URL || 'Internal Tool'}
          </p>
        </div>
      </div>
    `,
  });
  return true;
}

async function sendOtpEmail({ to, otp }) {
  await sendViaResend({
    to,
    subject: 'Your Abstract ETL verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1F4E79; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0;">Verification Code</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #ddd; border-top: none;">
          <p>Use the code below to finish signing in to Abstract ETL. It expires in 10 minutes.</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; text-align: center; margin: 24px 0; color: #1F4E79;">
            ${otp}
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Abstract ETL Tool — ${process.env.APP_URL || 'Internal Tool'}
          </p>
        </div>
      </div>
    `,
  });
  return true;
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  await sendViaResend({
    to,
    subject: 'Reset your Abstract ETL password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1F4E79; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0;">Password Reset</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #ddd; border-top: none;">
          <p>We received a request to reset your Abstract ETL password. Click the button below to set a new one.</p>
          <p>This link is valid for <strong>1 hour</strong>.</p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #2E75B6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; margin-top: 8px;">
            Reset Password
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email.
          </p>
          <p style="color: #888; font-size: 12px;">
            Abstract ETL Tool — ${process.env.APP_URL || 'Internal Tool'}
          </p>
        </div>
      </div>
    `,
  });
  return true;
}

async function sendDailyUsageReport({ to, tenantName, report }) {
  const statusRows = (report.statusBreakdown || [])
    .map((r) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: capitalize;">${r.status}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${r.count}</td></tr>`)
    .join('') || '<tr><td colspan="2" style="padding: 8px; border-bottom: 1px solid #eee;">No jobs</td></tr>';

  const userRows = (report.perUser || [])
    .map((r) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${r.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${r.count}</td></tr>`)
    .join('') || '<tr><td colspan="2" style="padding: 8px; border-bottom: 1px solid #eee;">No activity</td></tr>';

  await sendViaResend({
    to,
    subject: `Daily Usage Report — ${tenantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1F4E79; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0;">Daily Usage Report</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #ddd; border-top: none;">
          <p><strong>${tenantName}</strong> — last 24 hours.</p>
          <p style="font-size: 24px; font-weight: 700; color: #1F4E79;">${report.total} job(s)</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead><tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Status</th>
              <th style="padding: 8px; text-align: right;">Count</th>
            </tr></thead>
            <tbody>${statusRows}</tbody>
          </table>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead><tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">User</th>
              <th style="padding: 8px; text-align: right;">Jobs</th>
            </tr></thead>
            <tbody>${userRows}</tbody>
          </table>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Abstract ETL Tool — ${process.env.APP_URL || 'Internal Tool'}
          </p>
        </div>
      </div>
    `,
  });
  return true;
}

module.exports = {
  sendCompletionEmail,
  sendBulkImportNotification,
  sendBackupNotification,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendDailyUsageReport,
  resetTransporter,
};