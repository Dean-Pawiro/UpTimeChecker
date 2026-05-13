import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Monitor from '../models/Monitor.js';
import ContactInfo from '../models/ContactInfo.js';
import { runMonitoringCycle } from '../workers/monitorWorker.js';

const router = express.Router();

// GET /service/clients - List all monitors with contact info
router.get('/clients', authMiddleware, async (req, res) => {
  try {
    const clients = await ContactInfo.findAll({
      include: [{ model: Monitor }],
      order: [['name', 'ASC']],
    });
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /service/run-checks - trigger a single monitoring cycle
// Access allowed either by a valid authenticated user or by providing
// an `x-cron-secret` header that matches `process.env.CRON_SECRET`.
router.post('/run-checks', async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const provided = req.get('x-cron-secret');

    // If no cron secret configured, allow anonymous trigger (convenient for quick setup).
    if (!cronSecret) {
      await runMonitoringCycle();
      return res.json({ ok: true, message: 'Monitoring cycle triggered (no cron secret configured)'});
    }

    // If provided secret matches configured secret, allow.
    if (provided && provided === cronSecret) {
      await runMonitoringCycle();
      return res.json({ ok: true, message: 'Monitoring cycle triggered (cron secret)'});
    }

    // Otherwise require authenticated user
    return authMiddleware(req, res, async () => {
      await runMonitoringCycle();
      res.json({ ok: true, message: 'Monitoring cycle triggered (auth)'});
    });
  } catch (err) {
    console.error('Failed to trigger monitoring cycle:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
