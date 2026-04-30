const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendCompletionEmail({ to, abstractorName, propertyAddress, jobId, appUrl }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[Email] SMTP not configured — skipping notification');
    return false;
  }

  const jobUrl = `${appUrl || process.env.APP_URL}/jobs/${jobId}`;

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
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

module.exports = { sendCompletionEmail };
