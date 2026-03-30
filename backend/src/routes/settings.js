import express from 'express';
import { adminMiddleware } from '../middleware/auth.js';
import { getOrCreateEmailSettings, sendTestEmail } from '../services/emailService.js';

const router = express.Router();

function toSafeResponse(settings) {
  return {
    id: settings.id,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPassword: settings.smtpPassword ? '********' : '',
    smtpFrom: settings.smtpFrom,
    smtpSecure: settings.smtpSecure,
    notificationsEnabled: settings.notificationsEnabled,
    hasPassword: Boolean(settings.smtpPassword),
  };
}

// GET /settings/email
router.get('/email', adminMiddleware, async (_req, res) => {
  try {
    const settings = await getOrCreateEmailSettings();
    res.json({ settings: toSafeResponse(settings) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /settings/email
router.put('/email', adminMiddleware, async (req, res) => {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFrom,
      smtpSecure,
      notificationsEnabled,
    } = req.body;

    const settings = await getOrCreateEmailSettings();

    if (smtpHost !== undefined) settings.smtpHost = String(smtpHost || '').trim() || null;
    if (smtpPort !== undefined) settings.smtpPort = Number(smtpPort) || 587;
    if (smtpUser !== undefined) settings.smtpUser = String(smtpUser || '').trim() || null;
    if (smtpFrom !== undefined) settings.smtpFrom = String(smtpFrom || '').trim() || null;
    if (smtpSecure !== undefined) settings.smtpSecure = Boolean(smtpSecure);
    if (notificationsEnabled !== undefined) settings.notificationsEnabled = Boolean(notificationsEnabled);

    // Keep existing password unless explicitly changed.
    if (smtpPassword !== undefined) {
      const trimmed = String(smtpPassword || '');
      if (trimmed.length > 0) {
        settings.smtpPassword = trimmed;
      }
    }

    await settings.save();

    res.json({ message: 'Email settings updated', settings: toSafeResponse(settings) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /settings/email/test
router.post('/email/test', adminMiddleware, async (req, res) => {
  try {
    const { to } = req.body || {};
    const result = await sendTestEmail({ to: to || req.user.email });

    if (!result.sent) {
      return res.status(400).json({ error: result.reason || 'Failed to send test email' });
    }

    res.json({ message: `Test email sent to ${result.recipient}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
