import express from 'express';
import { Op } from 'sequelize';
import { authMiddleware } from '../middleware/auth.js';
import Monitor from '../models/Monitor.js';
import MonitorCheckLog from '../models/MonitorCheckLog.js';
import MonitorShare from '../models/MonitorShare.js';
import User from '../models/User.js';

const router = express.Router();

function normalizeUrl(inputUrl) {
  const value = String(inputUrl || '').trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

function deriveNameFromUrl(normalizedUrl) {
  try {
    const parsed = new URL(normalizedUrl);
    return parsed.hostname.replace(/^www\./i, '');
  } catch (_error) {
    return normalizedUrl;
  }
}

function normalizeName(inputName, normalizedUrl) {
  const value = String(inputName || '').trim();
  if (value) return value;
  return deriveNameFromUrl(normalizedUrl);
}

function build24hBars(logs) {
  const now = Date.now();
  const bucketCount = 48;
  const bucketSizeMs = 30 * 60 * 1000;
  const startMs = now - (bucketCount * bucketSizeMs);

  const latestPerBucket = new Array(bucketCount).fill(null);

  for (const log of logs) {
    const checkedMs = new Date(log.checkedAt).getTime();
    if (checkedMs < startMs || checkedMs > now) {
      continue;
    }

    const index = Math.floor((checkedMs - startMs) / bucketSizeMs);
    if (index < 0 || index >= bucketCount) {
      continue;
    }

    const current = latestPerBucket[index];
    if (!current || new Date(log.checkedAt).getTime() > new Date(current.checkedAt).getTime()) {
      latestPerBucket[index] = log;
    }
  }

  return latestPerBucket.map((entry) => {
    if (!entry) return null;
    return entry.status === 'UP' ? 'UP' : 'DOWN';
  });
}

function summarizeLogs(logs) {
  const upCount = logs.filter((log) => log.status === 'UP').length;
  const downCount = logs.filter((log) => log.status === 'DOWN').length;
  const totalChecks = upCount + downCount;
  const availability = totalChecks ? Math.round((upCount / totalChecks) * 10000) / 100 : 0;

  const ordered = [...logs].sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());
  let upDurationMs = 0;
  let downDurationMs = 0;

  for (let i = 0; i < ordered.length; i += 1) {
    const current = ordered[i];
    const currentTime = new Date(current.checkedAt).getTime();
    const nextTime = ordered[i + 1]
      ? new Date(ordered[i + 1].checkedAt).getTime()
      : Date.now();
    const delta = Math.max(0, nextTime - currentTime);

    if (current.status === 'UP') upDurationMs += delta;
    if (current.status === 'DOWN') downDurationMs += delta;
  }

  return {
    totalChecks,
    upCount,
    downCount,
    availability,
    upDurationMs,
    downDurationMs,
  };
}

function parseAlertRecipientUserIds(rawValue, fallbackId = null) {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);
      if (normalized.length > 0) {
        return [...new Set(normalized)];
      }
    }
  } catch (_err) {
    // ignore invalid persisted JSON and fall back
  }

  if (Number.isInteger(fallbackId) && fallbackId > 0) {
    return [fallbackId];
  }
  return [];
}

async function getMonitorAccess(monitorId, userId) {
  const monitor = await Monitor.findByPk(monitorId);
  if (!monitor) {
    return null;
  }

  if (monitor.userId === userId) {
    return {
      monitor,
      accessRole: 'owner',
      canEdit: true,
      canDelete: true,
      canManageShares: true,
    };
  }

  const share = await MonitorShare.findOne({
    where: { monitorId: monitor.id, userId },
  });

  if (!share) {
    return null;
  }

  const isAdminShare = share.role === 'admin';
  return {
    monitor,
    accessRole: share.role,
    canEdit: isAdminShare,
    canDelete: false,
    canManageShares: isAdminShare,
  };
}

function withAccess(monitor, access) {
  const alertRecipientUserIds = parseAlertRecipientUserIds(
    monitor.alertRecipientUserIds,
    monitor.alertRecipientUserId,
  );

  return {
    ...monitor.toJSON(),
    alertRecipientUserIds,
    accessRole: access.accessRole,
    canEdit: access.canEdit,
    canDelete: access.canDelete,
    canManageShares: access.canManageShares,
  };
}

async function getAccessibleMonitorIds(user) {
  if (user.role === 'admin') {
    const allMonitors = await Monitor.findAll({ attributes: ['id'] });
    return allMonitors.map((m) => m.id);
  }

  const ownedMonitors = await Monitor.findAll({
    where: { userId: user.userId },
    attributes: ['id'],
  });
  const shares = await MonitorShare.findAll({
    where: { userId: user.userId },
    attributes: ['monitorId'],
  });

  return [...new Set([
    ...ownedMonitors.map((m) => m.id),
    ...shares.map((s) => s.monitorId),
  ])];
}

// GET /monitors/summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const accessibleMonitorIds = await getAccessibleMonitorIds(req.user);
    const accessibleTotal = accessibleMonitorIds.length;

    let globalTotal = accessibleTotal;
    if (req.user.role === 'admin') {
      globalTotal = await Monitor.count();
    }

    res.json({
      accessibleTotal,
      globalTotal,
      isAdmin: req.user.role === 'admin',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /monitors
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ownedMonitors = await Monitor.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']],
    });

    const shares = await MonitorShare.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']],
    });

    const sharedMonitorIds = [...new Set(shares.map((share) => share.monitorId))];
    const sharedMonitors = sharedMonitorIds.length > 0
      ? await Monitor.findAll({
          where: { id: { [Op.in]: sharedMonitorIds } },
          order: [['createdAt', 'DESC']],
        })
      : [];

    const shareRoleByMonitorId = new Map();
    shares.forEach((share) => {
      shareRoleByMonitorId.set(share.monitorId, share.role);
    });

    const monitors = [
      ...ownedMonitors.map((monitor) => ({
        monitor,
        accessRole: 'owner',
        canEdit: true,
        canDelete: true,
        canManageShares: true,
      })),
      ...sharedMonitors.map((monitor) => {
        const role = shareRoleByMonitorId.get(monitor.id) || 'viewer';
        return {
          monitor,
          accessRole: role,
          canEdit: role === 'admin',
          canDelete: false,
          canManageShares: role === 'admin',
        };
      }),
    ];

    const monitorIds = monitors.map((entry) => entry.monitor.id);
    const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));

    let logs = [];
    if (monitorIds.length > 0) {
      logs = await MonitorCheckLog.findAll({
        where: {
          monitorId: { [Op.in]: monitorIds },
          checkedAt: { [Op.gte]: twentyFourHoursAgo },
        },
        order: [['checkedAt', 'DESC']],
      });
    }

    const logsByMonitorId = new Map();
    for (const log of logs) {
      const arr = logsByMonitorId.get(log.monitorId) || [];
      arr.push(log);
      logsByMonitorId.set(log.monitorId, arr);
    }

    const responseMonitors = monitors.map((entry) => {
      const monitorLogs = logsByMonitorId.get(entry.monitor.id) || [];
      return {
        ...entry.monitor.toJSON(),
        accessRole: entry.accessRole,
        canEdit: entry.canEdit,
        canDelete: entry.canDelete,
        canManageShares: entry.canManageShares,
        stats24h: {
          ...summarizeLogs(monitorLogs),
          bars: build24hBars(monitorLogs),
        },
      };
    });

    res.json({ monitors: responseMonitors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /monitors/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await getMonitorAccess(id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    res.json({ monitor: withAccess(access.monitor, access) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /monitors/:id/logs
router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const hours = Number(req.query.hours || 24);
    const lookbackHours = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 62) : 24;
    const fromDateRaw = String(req.query.fromDate || '').trim();
    const toDateRaw = String(req.query.toDate || '').trim();

    const access = await getMonitorAccess(id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const { monitor } = access;

    let since = new Date(Date.now() - (lookbackHours * 60 * 60 * 1000));
    let until = new Date();

    if (fromDateRaw || toDateRaw) {
      if (fromDateRaw) {
        const fromDate = new Date(`${fromDateRaw}T00:00:00.000Z`);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({ error: 'Invalid fromDate, expected YYYY-MM-DD' });
        }
        since = fromDate;
      }

      if (toDateRaw) {
        const toDate = new Date(`${toDateRaw}T23:59:59.999Z`);
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({ error: 'Invalid toDate, expected YYYY-MM-DD' });
        }
        until = toDate;
      }

      if (since.getTime() > until.getTime()) {
        return res.status(400).json({ error: 'fromDate must be before or equal to toDate' });
      }
    }

    const logs = await MonitorCheckLog.findAll({
      where: {
        monitorId: monitor.id,
        checkedAt: {
          [Op.gte]: since,
          [Op.lte]: until,
        },
      },
      order: [['checkedAt', 'DESC']],
      limit: 1000,
    });

    res.json({
      monitor: withAccess(monitor, access),
      summary: summarizeLogs(logs),
      bars24h: build24hBars(logs),
      logs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /monitors/:id/logs
router.delete('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await getMonitorAccess(id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canEdit) {
      return res.status(403).json({ error: 'You need admin access on this monitor to clear logs' });
    }

    const deletedCount = await MonitorCheckLog.destroy({
      where: { monitorId: access.monitor.id },
    });

    access.monitor.currentStatus = 'UNKNOWN';
    access.monitor.currentStatusSinceAt = null;
    access.monitor.lastCheckedAt = null;
    access.monitor.lastResponseTimeMs = null;
    access.monitor.lastError = null;
    access.monitor.lastStatusChangeAt = null;
    access.monitor.lastStatusChangeFrom = null;
    access.monitor.lastStatusChangeTo = null;
    access.monitor.lastAlertSentAt = null;
    access.monitor.lastAlertStatus = null;
    access.monitor.lastAlertError = null;
    await access.monitor.save();

    res.json({
      message: `Cleared ${deletedCount} log entries`,
      monitor: withAccess(access.monitor, access),
      deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /monitors
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { url, name, intervalMinutes } = req.body;
    const normalizedUrl = normalizeUrl(url);
    const parsedInterval = Number(intervalMinutes);

    if (!normalizedUrl) {
      return res.status(400).json({ error: 'A valid URL is required' });
    }

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 1440) {
      return res.status(400).json({ error: 'Interval must be an integer between 1 and 1440 minutes' });
    }

    const monitor = await Monitor.create({
      userId: req.user.userId,
      url: normalizedUrl,
      name: normalizeName(name, normalizedUrl),
      alertRecipientUserId: req.user.userId,
      alertRecipientUserIds: JSON.stringify([req.user.userId]),
      intervalMinutes: parsedInterval,
    });

    res.status(201).json({ monitor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /monitors/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, name, intervalMinutes } = req.body;

    const access = await getMonitorAccess(id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canEdit) {
      return res.status(403).json({ error: 'You need admin access on this monitor to edit it' });
    }

    const { monitor } = access;

    if (url !== undefined) {
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl) {
        return res.status(400).json({ error: 'A valid URL is required' });
      }
      monitor.url = normalizedUrl;
      if (name === undefined) {
        monitor.name = normalizeName(monitor.name, normalizedUrl);
      }
    }

    if (name !== undefined) {
      monitor.name = normalizeName(name, monitor.url);
    }

    if (intervalMinutes !== undefined) {
      const parsedInterval = Number(intervalMinutes);
      if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 1440) {
        return res.status(400).json({ error: 'Interval must be an integer between 1 and 1440 minutes' });
      }
      monitor.intervalMinutes = parsedInterval;
    }

    await monitor.save();

    res.json({ monitor: withAccess(monitor, access) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /monitors/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const access = await getMonitorAccess(id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canDelete) {
      return res.status(403).json({ error: 'Only the owner can delete this monitor' });
    }

    await MonitorShare.destroy({ where: { monitorId: id } });
    await Monitor.destroy({ where: { id, userId: req.user.userId } });

    res.json({ message: 'Monitor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /monitors/:id/shares
router.get('/:id/shares', authMiddleware, async (req, res) => {
  try {
    const access = await getMonitorAccess(req.params.id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canManageShares) {
      return res.status(403).json({ error: 'You need admin access on this monitor to view shares' });
    }

    const owner = await User.findByPk(access.monitor.userId, {
      attributes: ['id', 'email', 'name'],
    });
    const shares = await MonitorShare.findAll({
      where: { monitorId: access.monitor.id },
      order: [['createdAt', 'ASC']],
    });

    const userIds = shares.map((share) => share.userId);
    const users = userIds.length > 0
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'email', 'name'] })
      : [];
    const usersById = new Map(users.map((u) => [u.id, u]));

    res.json({
      owner,
      shares: shares.map((share) => ({
        id: share.id,
        userId: share.userId,
        role: share.role,
        invitedByUserId: share.invitedByUserId,
        createdAt: share.createdAt,
        user: usersById.get(share.userId) || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /monitors/:id/shares
router.post('/:id/shares', authMiddleware, async (req, res) => {
  try {
    const access = await getMonitorAccess(req.params.id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canManageShares) {
      return res.status(403).json({ error: 'You need admin access on this monitor to invite users' });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || 'viewer').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!['admin', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or viewer' });
    }

    const invitedUser = await User.findOne({ where: { email } });
    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found. Ask them to register first.' });
    }

    if (invitedUser.id === access.monitor.userId) {
      return res.status(400).json({ error: 'Owner already has full access' });
    }

    const existing = await MonitorShare.findOne({
      where: { monitorId: access.monitor.id, userId: invitedUser.id },
    });

    if (existing) {
      existing.role = role;
      existing.invitedByUserId = req.user.userId;
      await existing.save();
      return res.json({
        message: 'Share updated successfully',
        share: existing,
      });
    }

    const share = await MonitorShare.create({
      monitorId: access.monitor.id,
      userId: invitedUser.id,
      role,
      invitedByUserId: req.user.userId,
    });

    res.status(201).json({
      message: 'User invited and monitor shared successfully',
      share,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /monitors/:id/shares/:shareId
router.put('/:id/shares/:shareId', authMiddleware, async (req, res) => {
  try {
    const access = await getMonitorAccess(req.params.id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canManageShares) {
      return res.status(403).json({ error: 'You need admin access on this monitor to update roles' });
    }

    const role = String(req.body.role || '').trim().toLowerCase();
    if (!['admin', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or viewer' });
    }

    const share = await MonitorShare.findOne({
      where: { id: req.params.shareId, monitorId: access.monitor.id },
    });

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    share.role = role;
    await share.save();

    res.json({ message: 'Share role updated successfully', share });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /monitors/:id/shares/:shareId
router.delete('/:id/shares/:shareId', authMiddleware, async (req, res) => {
  try {
    const access = await getMonitorAccess(req.params.id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canManageShares) {
      return res.status(403).json({ error: 'You need admin access on this monitor to remove users' });
    }

    const deletedRows = await MonitorShare.destroy({
      where: { id: req.params.shareId, monitorId: access.monitor.id },
    });

    if (!deletedRows) {
      return res.status(404).json({ error: 'Share not found' });
    }

    res.json({ message: 'Shared access removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /monitors/:id/alert-recipient
router.put('/:id/alert-recipient', authMiddleware, async (req, res) => {
  try {
    const access = await getMonitorAccess(req.params.id, req.user.userId);
    if (!access) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (!access.canManageShares) {
      return res.status(403).json({ error: 'You need admin access on this monitor to change alert recipient' });
    }

    const rawUserIds = Array.isArray(req.body.userIds)
      ? req.body.userIds
      : (req.body.userId !== undefined ? [req.body.userId] : []);

    const parsedUserIds = [...new Set(
      rawUserIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    )];

    if (parsedUserIds.length === 0) {
      return res.status(400).json({ error: 'At least one valid user must be selected' });
    }

    const shares = await MonitorShare.findAll({
      where: { monitorId: access.monitor.id },
      attributes: ['userId'],
    });
    const allowedIds = new Set([access.monitor.userId, ...shares.map((share) => share.userId)]);

    const invalidId = parsedUserIds.find((id) => !allowedIds.has(id));
    if (invalidId) {
      return res.status(400).json({ error: 'Each recipient must be the owner or a shared user of this monitor' });
    }

    const recipients = await User.findAll({
      where: { id: { [Op.in]: parsedUserIds } },
      attributes: ['id', 'email', 'name'],
    });
    if (recipients.length !== parsedUserIds.length) {
      return res.status(404).json({ error: 'One or more recipient users were not found' });
    }

    access.monitor.alertRecipientUserId = parsedUserIds[0];
    access.monitor.alertRecipientUserIds = JSON.stringify(parsedUserIds);
    await access.monitor.save();

    res.json({
      message: 'Alert recipient updated successfully',
      monitor: withAccess(access.monitor, access),
      recipients,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
