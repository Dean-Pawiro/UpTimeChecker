import nodemailer from 'nodemailer';
import EmailSettings from '../models/EmailSettings.js';

let cachedTransport = null;
let cachedTransportKey = null;

export async function getOrCreateEmailSettings() {
  const existing = await EmailSettings.findOne({ order: [['id', 'ASC']] });
  if (existing) {
    return existing;
  }

  return EmailSettings.create({
    smtpHost: process.env.SMTP_HOST || null,
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || null,
    smtpPassword: process.env.SMTP_PASSWORD || null,
    smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || null,
    smtpSecure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    notificationsEnabled: String(process.env.EMAIL_NOTIFICATIONS_ENABLED || 'false').toLowerCase() === 'true',
  });
}

function getTransportKey(settings) {
  return [
    settings.smtpHost || '',
    settings.smtpPort || '',
    settings.smtpUser || '',
    settings.smtpPassword || '',
    settings.smtpSecure ? '1' : '0',
  ].join('|');
}

async function getTransport(settings) {
  const key = getTransportKey(settings);
  if (cachedTransport && cachedTransportKey === key) {
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: Boolean(settings.smtpSecure),
    auth: settings.smtpUser && settings.smtpPassword
      ? {
          user: settings.smtpUser,
          pass: settings.smtpPassword,
        }
      : undefined,
  });
  cachedTransportKey = key;
  return cachedTransport;
}

export async function sendStatusChangeEmail({ to, monitorName, monitorUrl, previousStatus, currentStatus, checkedAt, error }) {
  const settings = await getOrCreateEmailSettings();

  if (!settings.notificationsEnabled) {
    return { sent: false, reason: 'notifications-disabled' };
  }

  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpFrom || !settings.smtpUser || !settings.smtpPassword) {
    return { sent: false, reason: 'smtp-not-configured' };
  }

  const transport = await getTransport(settings);

  const isDown = currentStatus === 'DOWN';
  const subject = isDown
    ? `Site is DOWN: ${monitorName}`
    : `Site is BACK UP: ${monitorName}`;

  const lines = [
    `Monitor: ${monitorName}`,
    `URL: ${monitorUrl}`,
    `Status change: ${previousStatus} -> ${currentStatus}`,
    `Time: ${new Date(checkedAt).toISOString()}`,
  ];

  if (error) {
    lines.push(`Error: ${error}`);
  }

  const badgeColor = isDown ? '#ff6b7d' : '#39de8f';
  const panelColor = isDown ? 'rgba(181, 68, 85, 0.15)' : 'rgba(58, 223, 144, 0.15)';
  const title = isDown ? 'Monitor Is DOWN' : 'Monitor Is BACK UP';

  const html = `
    <div style="background:#070d19;padding:20px 10px;font-family:Segoe UI,Arial,sans-serif;color:#d8e4ff;">
      <div style="max-width:640px;margin:0 auto;background:#0e172a;border:1px solid #27385d;border-radius:12px;overflow:hidden;">
        <div style="padding:16px 18px;border-bottom:1px solid #27385d;background:#131f38;">
          <div style="font-size:20px;font-weight:700;color:#f0f6ff;">UpTimeChecker</div>
          <div style="margin-top:6px;font-size:13px;color:#93acd8;">Website status notification</div>
        </div>

        <div style="padding:16px 18px;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${panelColor};border:1px solid ${badgeColor};color:${badgeColor};font-size:12px;font-weight:700;letter-spacing:0.2px;">
            ${title}
          </div>

          <div style="margin-top:14px;color:#eaf2ff;font-size:18px;font-weight:700;">${monitorName}</div>
          <div style="margin-top:4px;color:#9bb2da;font-size:13px;word-break:break-all;">${monitorUrl}</div>

          <div style="margin-top:14px;padding:12px;border:1px solid #243a61;border-radius:10px;background:#0b1730;">
            <div style="font-size:13px;color:#b7caec;margin-bottom:6px;">Status Change</div>
            <div style="font-size:15px;color:#f0f6ff;font-weight:700;">${previousStatus} -> ${currentStatus}</div>
            <div style="font-size:12px;color:#88a2d0;margin-top:8px;">${new Date(checkedAt).toISOString()}</div>
          </div>

          ${error ? `<div style="margin-top:10px;padding:10px;border:1px solid #b84c5c;border-radius:10px;background:rgba(170,47,70,0.18);color:#ffb7c3;font-size:13px;"><strong>Error:</strong> ${error}</div>` : ''}
        </div>
      </div>
    </div>
  `;

  await transport.sendMail({
    from: settings.smtpFrom,
    to,
    subject,
    text: lines.join('\n'),
    html,
  });

  return { sent: true };
}

export async function sendTestEmail({ to }) {
  const settings = await getOrCreateEmailSettings();

  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpFrom || !settings.smtpUser || !settings.smtpPassword) {
    return { sent: false, reason: 'smtp-not-configured' };
  }

  const recipient = String(to || '').trim() || settings.smtpUser;
  if (!recipient) {
    return { sent: false, reason: 'recipient-missing' };
  }

  const transport = await getTransport(settings);
  const now = new Date().toISOString();
  await transport.sendMail({
    from: settings.smtpFrom,
    to: recipient,
    subject: 'UpTimeChecker SMTP Test Email',
    text: [
      'This is a test email from UpTimeChecker.',
      `SMTP Host: ${settings.smtpHost}`,
      `Time: ${now}`,
    ].join('\n'),
    html: `
      <div style="background:#070d19;padding:20px 10px;font-family:Segoe UI,Arial,sans-serif;color:#d8e4ff;">
        <div style="max-width:640px;margin:0 auto;background:#0e172a;border:1px solid #27385d;border-radius:12px;overflow:hidden;">
          <div style="padding:16px 18px;border-bottom:1px solid #27385d;background:#131f38;">
            <div style="font-size:20px;font-weight:700;color:#f0f6ff;">UpTimeChecker</div>
            <div style="margin-top:6px;font-size:13px;color:#93acd8;">SMTP connectivity test</div>
          </div>
          <div style="padding:16px 18px;">
            <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(58,223,144,0.15);border:1px solid #39de8f;color:#39de8f;font-size:12px;font-weight:700;">TEST EMAIL</div>
            <p style="margin:12px 0 6px;color:#eaf2ff;">This is a test email from UpTimeChecker.</p>
            <div style="font-size:13px;color:#9bb2da;">SMTP Host: ${settings.smtpHost}</div>
            <div style="font-size:13px;color:#9bb2da;">Time: ${now}</div>
          </div>
        </div>
      </div>
    `,
  });

  return { sent: true, recipient };
}
