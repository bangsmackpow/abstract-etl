#!/usr/bin/env node
/**
 * Sends an email notification when a CI workflow job fails.
 * Used by the `notify` job in build.yml (runs only on failure/cancellation).
 * Reads SMTP config + recipients from env (GitHub Actions secrets).
 */
const nodemailer = require('nodemailer');

const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'NOTIFY_TO'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`[notify] Skipping email — missing env: ${missing.join(', ')}`);
  process.exit(0);
}

const port = parseInt(process.env.SMTP_PORT || '587', 10);

function summarizeResults(raw) {
  try {
    const needs = JSON.parse(raw || '{}');
    return Object.entries(needs)
      .map(([job, result]) => `${job}: ${result}`)
      .join(' · ');
  } catch {
    return 'unknown';
  }
}

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const results = summarizeResults(process.env.RESULTS);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: process.env.NOTIFY_TO,
    subject: `[CI] ${process.env.WORKFLOW || 'workflow'} failed — ${process.env.BRANCH || 'unknown branch'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="background: #c0392b; padding: 20px; border-radius: 4px 4px 0 0;">
          <h2 style="color: white; margin: 0;">CI Pipeline Failure</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #ddd; border-top: none;">
          <p>A GitHub Actions workflow has <strong style="color: #c0392b;">failed</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; background: #f5f5f5; font-weight: bold; width: 35%;">Workflow</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${process.env.WORKFLOW || '—'}</td></tr>
            <tr><td style="padding: 8px; background: #f5f5f5; font-weight: bold;">Branch</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${process.env.BRANCH || '—'}</td></tr>
            <tr><td style="padding: 8px; background: #f5f5f5; font-weight: bold;">Jobs</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${results}</td></tr>
          </table>
          <a href="${process.env.RUN_URL || '#'}"
             style="display: inline-block; background: #2E75B6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; margin-top: 8px;">
            View Run Details
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Abstract ETL CI — ${process.env.GITHUB_SERVER_URL || 'GitHub'}
          </p>
        </div>
      </div>
    `,
  });

  console.log('[notify] Failure email sent');
}

main().catch((err) => {
  console.error('[notify] Failed to send email:', err.message);
  process.exit(1);
});
