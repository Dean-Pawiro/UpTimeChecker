import Monitor from '../models/Monitor.js';
import MonitorCheckLog from '../models/MonitorCheckLog.js';
import MonitorShare from '../models/MonitorShare.js';
import User from '../models/User.js';
import { sendStatusChangeEmail } from '../services/emailService.js';

const WORKER_INTERVAL_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

let workerTimer = null;
let isRunning = false;

function isMonitorDue(monitor, nowMs) {
  if (!monitor.lastCheckedAt) {
    return true;
  }

  const lastCheckedMs = new Date(monitor.lastCheckedAt).getTime();
  const intervalMs = Number(monitor.intervalMinutes) * 60 * 1000;
  return nowMs - lastCheckedMs >= intervalMs;
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
    // ignore invalid JSON and use fallback
  }

  if (Number.isInteger(fallbackId) && fallbackId > 0) {
    return [fallbackId];
  }
  return [];
}

async function checkMonitor(monitor) {
  const previousStatus = monitor.currentStatus;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let status = 'DOWN';
  let responseTimeMs = null;
  let error = null;

  try {
    // Any HTTP response counts as UP for this phase; only transport/timeout errors are DOWN.
    await fetch(monitor.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    status = 'UP';
    responseTimeMs = Date.now() - startedAt;
  } catch (err) {
    status = 'DOWN';
    responseTimeMs = null;
    error = err?.name === 'AbortError' ? 'Request timeout' : (err?.message || 'Request failed');
  } finally {
    clearTimeout(timeoutId);
  }

  const checkedAt = new Date();
  const isKnownStatus = status === 'UP' || status === 'DOWN';
  const statusChanged = previousStatus !== status;

  await MonitorCheckLog.create({
    monitorId: monitor.id,
    status,
    responseTimeMs,
    error,
    checkedAt,
  });

  monitor.currentStatus = status;
  monitor.lastCheckedAt = checkedAt;
  monitor.lastResponseTimeMs = responseTimeMs;
  monitor.lastError = error;
  if (isKnownStatus && (statusChanged || !monitor.currentStatusSinceAt)) {
    monitor.currentStatusSinceAt = checkedAt;
  }
  await monitor.save();

  const isStatusTransition =
    (previousStatus === 'UP' && status === 'DOWN') ||
    (previousStatus === 'DOWN' && status === 'UP');

  if (isStatusTransition) {
    monitor.lastStatusChangeAt = checkedAt;
    monitor.lastStatusChangeFrom = previousStatus;
    monitor.lastStatusChangeTo = status;

    try {
      const shareRows = await MonitorShare.findAll({
        where: { monitorId: monitor.id },
        attributes: ['userId'],
      });
      const allowedIds = new Set([monitor.userId, ...shareRows.map((row) => row.userId)]);
      const selectedIds = parseAlertRecipientUserIds(monitor.alertRecipientUserIds, monitor.alertRecipientUserId)
        .filter((id) => allowedIds.has(id));

      const recipientIds = selectedIds.length > 0 ? selectedIds : [monitor.userId];
      const recipients = await User.findAll({
        where: { id: recipientIds },
        attributes: ['id', 'email'],
      });

      const failures = [];
      let sentCount = 0;

      for (const recipient of recipients) {
        if (!recipient?.email) continue;
        const emailResult = await sendStatusChangeEmail({
          to: recipient.email,
          monitorName: monitor.name || monitor.url,
          monitorUrl: monitor.url,
          previousStatus,
          currentStatus: status,
          checkedAt,
          error,
        });

        if (emailResult.sent) {
          sentCount += 1;
        } else {
          failures.push(`${recipient.email}: ${emailResult.reason || 'email-not-sent'}`);
        }
      }

      if (sentCount > 0) {
        monitor.lastAlertSentAt = checkedAt;
        monitor.lastAlertStatus = status;
      }

      monitor.lastAlertError = failures.length > 0
        ? failures.join(' | ')
        : (sentCount === 0 ? 'recipient-missing' : null);
    } catch (emailError) {
      monitor.lastAlertError = emailError.message || 'email-send-failed';
      console.error(`Email notification failed for monitor ${monitor.id}:`, emailError.message);
    }

    await monitor.save();
  }
}

export async function runMonitoringCycle() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const monitors = await Monitor.findAll();
    const nowMs = Date.now();

    for (const monitor of monitors) {
      if (!isMonitorDue(monitor, nowMs)) {
        continue;
      }
      await checkMonitor(monitor);
    }
  } catch (error) {
    console.error('Monitoring cycle failed:', error.message);
  } finally {
    isRunning = false;
  }
}

export function startMonitoringWorker() {
  if (workerTimer) {
    return;
  }

  runMonitoringCycle();
  workerTimer = setInterval(runMonitoringCycle, WORKER_INTERVAL_MS);
  console.log('✓ Monitoring worker started (runs every minute)');
}
