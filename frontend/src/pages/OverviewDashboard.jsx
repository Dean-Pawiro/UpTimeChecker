import React, { useEffect, useMemo, useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL;
import { useAuth } from '../context/AuthContext';
import LeftNav from '../components/LeftNav';
import './UptimeDark.css';

const OverviewDashboard = ({ onGoMonitors, onOpenMonitor, onGoUsers, onGoSettings }) => {
  const { user, token, logout } = useAuth();
  const [monitors, setMonitors] = useState([]);
  const [error, setError] = useState('');
  // Notification state: { id, monitorId, monitorName, status, time }
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef();

  const loadMonitors = async () => {
    try {
      const response = await fetch(`${API}/monitors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setMonitors(data.monitors || []);
      } else {
        setError(data.error || 'Failed to load monitors');
      }
    } catch (_err) {
      setError('Failed to load monitors');
    }
  };

  // Listen for clicks outside notification dropdown
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  useEffect(() => {
    if (token) {
      loadMonitors();
    }
  }, [token]);

  // Simulate polling for status changes (replace with real API in production)
  useEffect(() => {
    const interval = setInterval(() => {
      // Find monitors with status DOWN
      const down = monitors.filter(m => m.currentStatus === 'DOWN');
      // Add notification for each DOWN monitor if not already present
      setNotifications(prev => {
        let changed = false;
        let next = [...prev];
        down.forEach(m => {
          if (!prev.some(n => n.monitorId === m.id && n.status === 'DOWN')) {
            next = [
              { id: Date.now() + Math.random(), monitorId: m.id, monitorName: m.name || m.url, status: 'DOWN', time: new Date().toISOString() },
              ...next
            ];
            changed = true;
          }
        });
        if (changed) localStorage.setItem('notifications', JSON.stringify(next));
        return next;
      });
    }, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [monitors]);

  const summary = useMemo(() => {
    const total = monitors.length;
    const avgInterval = total
      ? Math.round(monitors.reduce((sum, m) => sum + m.intervalMinutes, 0) / total)
      : 0;
    const up = total;
    const paused = 0;
    return { total, avgInterval, up, paused };
  }, [monitors]);

  const recent = monitors.slice(0, 5);

  // Notification handlers
  const handleNotifClick = (notif) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== notif.id);
      localStorage.setItem('notifications', JSON.stringify(next));
      return next;
    });
    setTimeout(() => {
      setNotifOpen(false);
      onOpenMonitor(notif.monitorId);
    }, 0);
  };
  const handleClearAll = () => {
    setNotifications([]);
    localStorage.setItem('notifications', '[]');
  };

  return (
    <div className="dark-bg app-shell">
      <LeftNav
        current="dashboard"
        showUsers={user?.role === 'admin'}
        showSettings={user?.role === 'admin'}
        onGoDashboard={() => {}}
        onGoMonitors={onGoMonitors}
        onGoUsers={onGoUsers}
        onGoSettings={onGoSettings}
      />

      <main className="content-area uptime-page">
        <header className="topbar">
          <div>
            <h1>Dashboard Overview</h1>
            <p className="subtext">Welcome back, {user?.name}</p>
          </div>
          <div className="topbar-actions" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              className="notif-bell"
              style={{ background: 'none', border: 'none', position: 'relative', cursor: 'pointer', marginRight: 8 }}
              onClick={() => setNotifOpen(v => !v)}
              aria-label="Notifications"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e8f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: '#d32f2f', color: '#fff', borderRadius: '50%', fontSize: 12, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', border: '2px solid #1a2743', fontWeight: 700 }}>
                  {notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div ref={notifRef} style={{ position: 'absolute', top: 38, right: 0, background: '#1a2743', color: '#e8f0ff', border: '1px solid #27385d', borderRadius: 10, minWidth: 260, zIndex: 10, boxShadow: '0 4px 16px #0008', padding: 0 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #27385d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>Notifications</span>
                  <button className="btn small" style={{ background: '#27385d', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }} onClick={handleClearAll}>Clear All</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: 18, color: '#b8caec', textAlign: 'center' }}>No new notifications</div>
                ) : notifications.map(notif => (
                  <div key={notif.id} style={{ padding: '12px 14px', borderBottom: '1px solid #27385d', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: notif.status === 'DOWN' ? '#2a1a1a' : 'inherit' }} onClick={() => handleNotifClick(notif)}>
                    <span style={{ color: notif.status === 'DOWN' ? '#ff6b7d' : '#39de8f', fontWeight: 700, fontSize: 16 }}>●</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{notif.monitorName}</div>
                      <div style={{ fontSize: 13, color: '#b8caec' }}>{notif.status === 'DOWN' ? 'Status: DOWN' : notif.status}</div>
                      <div style={{ fontSize: 11, color: '#93acd8' }}>{new Date(notif.time).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn danger" onClick={logout}>Logout</button>
          </div>
        </header>

      {error && <div className="alert error">{error}</div>}

        <section className="stats-grid">
        <article className="stat-card">
          <h3>Total Monitors</h3>
          <p className="stat-number">{summary.total}</p>
        </article>
        <article className="stat-card">
          <h3>Currently Up</h3>
          <p className="stat-number good">{summary.up}</p>
        </article>
        <article className="stat-card">
          <h3>Paused</h3>
          <p className="stat-number">{summary.paused}</p>
        </article>
        <article className="stat-card">
          <h3>Avg Check Interval</h3>
          <p className="stat-number">{summary.avgInterval || 0} min</p>
        </article>
        </section>

        <section className="panel">
        <div className="panel-head">
          <h2>Recent Monitors</h2>
          <button className="btn primary" onClick={onGoMonitors}>Manage All</button>
        </div>

        {recent.length === 0 ? (
          <p className="empty">No monitors yet. Add your first monitor on the Monitors page.</p>
        ) : (
          <div className="monitor-table">
            {recent.map((monitor) => (
              <div key={monitor.id} className="monitor-row">
                <div className="monitor-main" onClick={() => onOpenMonitor(monitor.id)} role="button" tabIndex={0}>
                  <p className="monitor-title">{monitor.name || monitor.url}</p>
                  <p className="monitor-meta">{monitor.url}</p>
                  <p className="monitor-meta">Check every {monitor.intervalMinutes} min</p>
                </div>
                <div className="monitor-actions">
                  <button className="btn small" onClick={() => onOpenMonitor(monitor.id)}>View</button>
                </div>
              </div>
            ))}
          </div>
        )}
        </section>
      </main>
    </div>
  );
};

export default OverviewDashboard;
