const nodemailer = require('nodemailer');
const { db } = require('../db');
const { settings } = require('../db/schema');
const { eq } = require('drizzle-orm');

let transporter = null;

async function getDbSetting(key) {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return row ? row.value : null;
  } catch {
    return null;
  }
}

async function getTransporter() {
  if (transporter) return transporter;

  const host = await getDbSetting('smtp_host') || process.env.SMTP_HOST;
  const port = parseInt(await getDbSetting('smtp_port') || process.env.SMTP_PORT || '587', 10);
  const user = await getDbSetting('smtp_user') || process.env.SMTP_USER;
  const pass = await getDbSetting('smtp_pass') || process.env.SMTP_PASS;

  if (!host || !user) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function resetTransporter() {
  transporter = null;
}

async function getFromAddress() {
  return await getDbSetting('smtp_from') || process.env.SMTP_FROM || process.env.SMTP_USER;
}

async function sendCompletionEmail({ to, abstractorName, propertyAddress, jobId, appUrl }) {
  const tr = await getTransporter();
  if (!tr) {
    console.warn('[Email] SMTP not configured — skipping notification');
    return false;
  }

  const jobUrl = `${appUrl || process.env.APP_URL}/jobs/${jobId}`;

  await tr.sendMail({
    from: await getFromAddress(),
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
  const tr = await getTransporter();
  if (!tr) return false;

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

  await tr.sendMail({
    from: await getFromAddress(),
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
  const tr = await getTransporter();
  if (!tr) return false;

  if (success) return true;

  await tr.sendMail({
    from: await getFromAddress(),
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

module.exports = {
  sendCompletionEmail,
  sendBulkImportNotification,
  sendBackupNotification,
  resetTransporter,
};
