
import express from 'express';
import ContactInfo from '../models/ContactInfo.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

// Get contact info for a monitor
router.get('/:monitorId', authMiddleware, async (req, res) => {
  try {
    const { monitorId } = req.params;
    const contact = await ContactInfo.findOne({ monitor: monitorId });
    if (!contact) return res.status(404).json({ error: 'Contact info not found' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set or update contact info for a monitor
router.post('/:monitorId', authMiddleware, async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { name, email } = req.body;
    let contact = await ContactInfo.findOne({ where: { monitorId } });
    if (contact) {
      await contact.update({ name, email });
    } else {
      contact = await ContactInfo.create({ monitorId, name, email });
    }
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
