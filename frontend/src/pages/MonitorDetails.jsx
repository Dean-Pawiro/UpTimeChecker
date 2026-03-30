import React, { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL;
import { useAuth } from '../context/AuthContext';
import LeftNav from '../components/LeftNav';
import './UptimeDark.css';

const buildMonthCalendar = (logs, year, month) => {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = new Map();
  logs.forEach((log) => {
    const checked = new Date(log.checkedAt);
    if (checked.getFullYear() !== year || checked.getMonth() !== month) {
      return;
    }
    const day = checked.getDate();
    const current = byDate.get(day) || { up: false, down: false };
    if (log.status === 'DOWN') current.down = true;
    if (log.status === 'UP') current.up = true;
    byDate.set(day, current);
  });

  const leadingEmpty = firstDay.getDay();
  const cells = [];

  for (let i = 0; i < leadingEmpty; i += 1) {
    cells.push({ type: 'empty', key: `e-${year}-${month}-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const statusInfo = byDate.get(day);
    let status = 'no-data';
    if (statusInfo?.down) {
      status = 'down';
    } else if (statusInfo?.up) {
      status = 'up';
    }
    cells.push({ type: 'day', key: `d-${year}-${month}-${day}`, day, status });
  }

  return {
    monthLabel: new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    cells,
  };
};

const toDateInput = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const MonitorDetails = ({ monitorId, onBackMonitors, onBackDashboard, onEditMonitor, onGoUsers, onGoSettings }) => {
  const { token, logout, user } = useAuth();
  const [monitor, setMonitor] = useState(null);
  const [summary, setSummary] = useState({ availability: 0, upCount: 0, downCount: 0 });
  const [bars, setBars] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [shares, setShares] = useState([]);
  const [owner, setOwner] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [shareMessage, setShareMessage] = useState('');
  const [shareError, setShareError] = useState('');
  const [alertRecipientUserIds, setAlertRecipientUserIds] = useState([]);

  const loadMonitor = async (range = null) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const hoursSinceMonthStart = Math.ceil((now.getTime() - monthStart.getTime()) / (60 * 60 * 1000)) + 24;
      const requestedHours = Math.max(24, hoursSinceMonthStart);

      const params = new URLSearchParams();
      if (range?.fromDate || range?.toDate) {
        if (range.fromDate) params.set('fromDate', range.fromDate);
        if (range.toDate) params.set('toDate', range.toDate);
      } else {
        params.set('hours', String(requestedHours));
      }

      const response = await fetch(`${API}/monitors/${monitorId}/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setMonitor(data.monitor);
        setSummary(data.summary || { availability: 0, upCount: 0, downCount: 0 });
        setBars(data.bars24h || []);
        setLogs(data.logs || []);
        setAlertRecipientUserIds((data.monitor?.alertRecipientUserIds || []).map((id) => String(id)));

        if (data.monitor?.canManageShares) {
          await loadShares();
        } else {
          setShares([]);
          setOwner(null);
        }
      } else {
        setError(data.error || 'Failed to load monitor details');
      }
    } catch (_err) {
      setError('Failed to load monitor details');
    }
  };

  const loadShares = async () => {
    try {
      const response = await fetch(`${API}/monitors/${monitorId}/shares`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setShares(data.shares || []);
        setOwner(data.owner || null);
      }
    } catch (_err) {
      // no-op
    }
  };

  useEffect(() => {
    if (monitorId && token) {
      const now = new Date();
      const start = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const initialFrom = toDateInput(start);
      const initialTo = toDateInput(now);
      setFromDate(initialFrom);
      setToDate(initialTo);
      loadMonitor({ fromDate: initialFrom, toDate: initialTo });
    }
  }, [monitorId, token]);

  const applyDateFilter = () => {
    setError('');
    loadMonitor({ fromDate, toDate });
  };

  const clearDateFilter = () => {
    setError('');
    setFromDate('');
    setToDate('');
    loadMonitor();
  };

  const clearMonitorLogs = async () => {
    const confirmed = window.confirm('Clear all logs for this monitor? This cannot be undone.');
    if (!confirmed) return;

    setError('');
    try {
      const response = await fetch(`${API}/monitors/${monitorId}/logs`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to clear logs');
        return;
      }
      await loadMonitor({ fromDate, toDate });
    } catch (_err) {
      setError('Failed to clear logs');
    }
  };

  const inviteUser = async () => {
    setShareError('');
    setShareMessage('');
    try {
      const response = await fetch(`${API}/monitors/${monitorId}/shares`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        setShareError(data.error || 'Failed to invite user');
        return;
      }
      setShareMessage(data.message || 'Invite sent');
      setInviteEmail('');
      await loadShares();
    } catch (_err) {
      setShareError('Failed to invite user');
    }
  };

  const updateShareRole = async (shareId, role) => {
    setShareError('');
    setShareMessage('');
    try {
      const response = await fetch(`${API}/monitors/${monitorId}/shares/${shareId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setShareError(data.error || 'Failed to update role');
        return;
      }
      setShareMessage('Role updated');
      await loadShares();
    } catch (_err) {
      setShareError('Failed to update role');
    }
  };

  const removeShare = async (shareId) => {
    setShareError('');
    setShareMessage('');
    try {
      const response = await fetch(`${API}/monitors/${monitorId}/shares/${shareId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setShareError(data.error || 'Failed to remove user');
        return;
      }
      setShareMessage('Shared access removed');
      await loadShares();
    } catch (_err) {
      setShareError('Failed to remove user');
    }
  };

  const saveAlertRecipient = async () => {
    setShareError('');
    setShareMessage('');
    if (alertRecipientUserIds.length === 0) {
      setShareError('Please select at least one recipient');
      return;
    }

    try {
      const response = await fetch(`${API}/monitors/${monitorId}/alert-recipient`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: alertRecipientUserIds.map((id) => Number(id)) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setShareError(data.error || 'Failed to update alert recipient');
        return;
      }
      setShareMessage('Alert recipient updated');
      if (data.monitor) {
        setMonitor(data.monitor);
      }
    } catch (_err) {
      setShareError('Failed to update alert recipient');
    }
  };

  const availability = useMemo(() => summary.availability || 0, [summary]);

  const responseSeries = useMemo(() => {
    const since = Date.now() - (24 * 60 * 60 * 1000);
    return logs
      .filter((log) => log.responseTimeMs !== null && new Date(log.checkedAt).getTime() >= since)
      .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());
  }, [logs]);

  const responseStats = useMemo(() => {
    if (responseSeries.length === 0) {
      return { avg: null, min: null, max: null };
    }
    const values = responseSeries.map((item) => item.responseTimeMs);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return {
      avg: Math.round(sum / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [responseSeries]);

  const graphData = useMemo(() => {
    if (responseSeries.length === 0) {
      return null;
    }

    const width = 1000;
    const height = 240;
    const leftPad = 58;
    const rightPad = 14;
    const topPad = 14;
    const bottomPad = 24;

    const maxRaw = Math.max(...responseSeries.map((item) => item.responseTimeMs), 1);
    const maxScale = Math.max(50, Math.ceil(maxRaw / 50) * 50);
    const plotWidth = width - leftPad - rightPad;
    const plotHeight = height - topPad - bottomPad;

    const points = responseSeries.map((item, index) => {
      const x = responseSeries.length === 1
        ? leftPad + plotWidth / 2
        : leftPad + (index / (responseSeries.length - 1)) * plotWidth;
      const y = topPad + (1 - (item.responseTimeMs / maxScale)) * plotHeight;
      return {
        x,
        y,
        value: item.responseTimeMs,
        at: item.checkedAt,
      };
    });

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
      value: Math.round(maxScale * ratio),
      y: topPad + (1 - ratio) * plotHeight,
    }));

    return {
      width,
      height,
      leftPad,
      rightPad,
      bottomPad,
      points,
      polyline,
      ticks,
    };
  }, [responseSeries]);

  const monthCalendars = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const prev = new Date(currentYear, currentMonth - 1, 1);
    const current = new Date(currentYear, currentMonth, 1);

    return [
      buildMonthCalendar(logs, prev.getFullYear(), prev.getMonth()),
      buildMonthCalendar(logs, current.getFullYear(), current.getMonth()),
    ];
  }, [logs]);

  const statusTrackedMs = useMemo(() => {
    if (!monitor?.currentStatusSinceAt) return null;
    const since = new Date(monitor.currentStatusSinceAt).getTime();
    if (Number.isNaN(since)) return null;
    return Math.max(0, Date.now() - since);
  }, [monitor]);

  const recipientOptions = useMemo(() => {
    const options = [];
    if (owner?.id) {
      options.push({ id: owner.id, label: `${owner.name || owner.email} (${owner.email})` });
    }
    shares.forEach((share) => {
      if (!share?.user?.id) return;
      options.push({
        id: share.user.id,
        label: `${share.user.name || share.user.email} (${share.user.email})`,
      });
    });

    const seen = new Set();
    return options.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [owner, shares]);

  return (
    <div className="dark-bg app-shell">
      <LeftNav
        current="monitors"
        showUsers={user?.role === 'admin'}
        showSettings={user?.role === 'admin'}
        onGoDashboard={onBackDashboard}
        onGoMonitors={onBackMonitors}
        onGoUsers={onGoUsers}
        onGoSettings={onGoSettings}
      />

      <main className="content-area uptime-page">
        <header className="topbar">
          <div>
            <h1>Monitor Details</h1>
            <p className="subtext">Deep view for one monitored website</p>
          </div>
          <div className="topbar-actions">
            <button className="btn danger" onClick={logout}>Logout</button>
          </div>
        </header>

        {error && <div className="alert error">{error}</div>}

        {monitor && (
          <>
          <section className="panel">
            <div className="panel-head split">
              <div>
                <h2>{monitor.name || monitor.url}</h2>
                <p className="subtext">{monitor.url}</p>
                <p className="subtext">Interval: every {monitor.intervalMinutes} minute(s)</p>
                <p className="subtext">Access role: {monitor.accessRole || 'owner'}</p>
              </div>
              {monitor.canEdit && (
                <button className="btn primary" onClick={() => onEditMonitor(monitor.id)}>Edit Monitor</button>
              )}
            </div>
          </section>

          <section className="stats-grid">
            <article className="stat-card">
              <h3>Current Status</h3>
              <p className={`stat-number ${monitor.currentStatus === 'UP' ? 'good' : monitor.currentStatus === 'DOWN' ? 'bad' : ''}`}>
                {monitor.currentStatus}
              </p>
            </article>
            <article className="stat-card">
              <h3>Availability</h3>
              <p className="stat-number">{availability}%</p>
            </article>
            <article className="stat-card">
              <h3>Downtime</h3>
              <p className="stat-number">{(100 - availability).toFixed(2)}%</p>
            </article>
            <article className="stat-card">
              <h3>Avg Response</h3>
              <p className="stat-number">{monitor.lastResponseTimeMs ?? 0} ms</p>
            </article>
            <article className="stat-card">
              <h3>Tracked Up Time</h3>
              <p className="stat-number">{formatDuration(summary.upDurationMs || 0)}</p>
            </article>
            <article className="stat-card">
              <h3>Tracked Down Time</h3>
              <p className="stat-number">{formatDuration(summary.downDurationMs || 0)}</p>
            </article>
            <article className="stat-card">
              <h3>Current State For</h3>
              <p className="stat-number">{statusTrackedMs === null ? 'N/A' : formatDuration(statusTrackedMs)}</p>
            </article>
          </section>

          <section className="panel">
            <h2>Response Timeline (Last 24h)</h2>
            <div className="timeline-bars">
              {bars.map((status, index) => (
                <span key={`${monitor.id}-bar-${index}`} className={`bar ${status === 'UP' ? 'up' : status === 'DOWN' ? 'down' : 'none'}`} />
              ))}
            </div>
            <p className="subtext">Green = up, red = down</p>
          </section>

          <section className="panel">
            <div className="panel-head split">
              <h2>Response Time (Last 24h)</h2>
            </div>

            {responseSeries.length === 0 ? (
              <div className="graph-empty">No response time data yet for this period.</div>
            ) : (
              <div className="response-graph-wrap">
                <svg viewBox="0 0 1000 240" className="response-graph" preserveAspectRatio="none">
                  {graphData.ticks.map((tick) => (
                    <g key={`tick-${tick.value}`}>
                      <line
                        x1={graphData.leftPad}
                        y1={tick.y}
                        x2={1000 - graphData.rightPad}
                        y2={tick.y}
                        className="response-grid-line"
                      />
                      <text x={6} y={tick.y + 4} className="response-axis-label">{tick.value}ms</text>
                    </g>
                  ))}

                  <polyline points={graphData.polyline} className="response-line" />

                  {graphData.points.map((point, index) => (
                    <g key={`p-${index}`}>
                      <circle cx={point.x} cy={point.y} r={2.8} className="response-point" />
                      {index % Math.max(1, Math.floor(graphData.points.length / 8)) === 0 && (
                        <text x={point.x} y={point.y - 8} className="response-point-label">{point.value}</text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            )}

            <div className="response-stats-grid">
              <div className="response-stat-item">
                <p className="response-stat-value">{responseStats.avg ?? 'N/A'}{responseStats.avg !== null ? ' ms' : ''}</p>
                <p className="subtext">Average</p>
              </div>
              <div className="response-stat-item">
                <p className="response-stat-value">{responseStats.min ?? 'N/A'}{responseStats.min !== null ? ' ms' : ''}</p>
                <p className="subtext">Minimum</p>
              </div>
              <div className="response-stat-item">
                <p className="response-stat-value">{responseStats.max ?? 'N/A'}{responseStats.max !== null ? ' ms' : ''}</p>
                <p className="subtext">Maximum</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head split">
              <h2>Daily Status Calendar (Last + Current Month)</h2>
            </div>

            <div className="calendar-legend">
              <span><i className="legend-dot up" /> Up</span>
              <span><i className="legend-dot down" /> Down</span>
              <span><i className="legend-dot no-data" /> No data</span>
            </div>

            <div className="calendar-months-grid">
              {monthCalendars.map((monthCalendar) => (
                <div className="calendar-month-panel" key={monthCalendar.monthLabel}>
                  <p className="subtext calendar-month-title">{monthCalendar.monthLabel}</p>
                  <div className="calendar-grid">
                    {monthCalendar.cells.map((cell) => {
                      if (cell.type === 'empty') {
                        return <div key={cell.key} className="calendar-cell empty" />;
                      }

                      return (
                        <div key={cell.key} className={`calendar-cell ${cell.status}`} title={`Day ${cell.day}: ${cell.status}`}>
                          {cell.day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head split">
              <h2>Monitor Logs</h2>
              {monitor.canEdit && (
                <button type="button" className="btn danger" onClick={clearMonitorLogs}>Clear Logs</button>
              )}
            </div>

            <div className="logs-filter-row">
              <div className="form-row">
                <label htmlFor="fromDate">From Date</label>
                <input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="form-row">
                <label htmlFor="toDate">To Date</label>
                <input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="monitor-actions">
                <button type="button" className="btn primary" onClick={applyDateFilter}>Apply Filter</button>
                <button type="button" className="btn ghost" onClick={clearDateFilter}>Clear</button>
              </div>
            </div>

            {logs.length === 0 ? (
              <p className="subtext">No logs found for the selected range.</p>
            ) : (
              <div className="logs-table-wrap">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.checkedAt).toLocaleString()}</td>
                        <td>
                          <span className={`log-badge ${log.status === 'UP' ? 'up' : 'down'}`}>{log.status}</span>
                        </td>
                        <td>{log.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {monitor.canManageShares && (
            <section className="panel">
              <div className="panel-head split">
                <h2>Team Access</h2>
              </div>

              {shareError && <div className="alert error">{shareError}</div>}
              {shareMessage && <div className="alert success">{shareMessage}</div>}

              {owner && (
                <p className="subtext">
                  Owner: {owner.name || owner.email} ({owner.email})
                </p>
              )}

              <div className="logs-filter-row">
                <div className="form-row">
                  <label htmlFor="inviteEmail">Invite User (Email)</label>
                  <input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" />
                </div>
                <div className="form-row">
                  <label htmlFor="inviteRole">Role</label>
                  <select id="inviteRole" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="viewer">viewer</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="monitor-actions">
                  <button type="button" className="btn primary" onClick={inviteUser}>Invite</button>
                </div>
              </div>

              <div className="logs-table-wrap">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shares.length === 0 ? (
                      <tr>
                        <td colSpan="4">No shared users yet.</td>
                      </tr>
                    ) : (
                      shares.map((share) => (
                        <tr key={share.id}>
                          <td>{share.user?.name || '-'}</td>
                          <td>{share.user?.email || '-'}</td>
                          <td>
                            <select value={share.role} onChange={(e) => updateShareRole(share.id, e.target.value)}>
                              <option value="viewer">viewer</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td>
                            <button type="button" className="btn small danger" onClick={() => removeShare(share.id)}>Remove</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head split">
              <h2>Email Alert Status</h2>
            </div>

            {monitor.canManageShares && (
              <div className="logs-filter-row">
                <div className="form-row">
                  <label htmlFor="alertRecipientUserIds">Alert Recipient Users</label>
                  <select
                    id="alertRecipientUserIds"
                    multiple
                    value={alertRecipientUserIds}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions).map((option) => option.value);
                      setAlertRecipientUserIds(values);
                    }}
                  >
                    {recipientOptions.map((option) => (
                      <option key={`recipient-${option.id}`} value={String(option.id)}>{option.label}</option>
                    ))}
                  </select>
                  <p className="subtext">Hold Ctrl (or Cmd) to select multiple users.</p>
                </div>
                <div className="monitor-actions">
                  <button type="button" className="btn primary" onClick={saveAlertRecipient}>Save Recipient</button>
                </div>
              </div>
            )}

            <div className="log-meta-grid">
              <p className="subtext">Last transition: {monitor.lastStatusChangeFrom && monitor.lastStatusChangeTo ? `${monitor.lastStatusChangeFrom} -> ${monitor.lastStatusChangeTo}` : 'N/A'}</p>
              <p className="subtext">Transition time: {monitor.lastStatusChangeAt ? new Date(monitor.lastStatusChangeAt).toLocaleString() : 'N/A'}</p>
              <p className="subtext">Last alert sent: {monitor.lastAlertSentAt ? new Date(monitor.lastAlertSentAt).toLocaleString() : 'N/A'}</p>
              <p className="subtext">Last alert status: {monitor.lastAlertStatus || 'N/A'}</p>
            </div>
            {monitor.lastAlertError && (
              <div className="alert error" style={{ marginTop: 12 }}>
                Last alert error: {monitor.lastAlertError}
              </div>
            )}
          </section>

          {user?.role === 'admin' && (
            <section className="panel">
              <h2>Admin Quick Actions</h2>
              <p className="subtext">You can edit this monitor or manage users from the Users page.</p>
            </section>
          )}
          </>
        )}
      </main>
    </div>
  );
};

export default MonitorDetails;
