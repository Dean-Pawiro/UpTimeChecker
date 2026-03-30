import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LeftNav from '../components/LeftNav';
import './UptimeDark.css';

const OverviewDashboard = ({ onGoMonitors, onOpenMonitor, onGoUsers, onGoSettings }) => {
  const { user, token, logout } = useAuth();
  const [monitors, setMonitors] = useState([]);
  const [error, setError] = useState('');

  const loadMonitors = async () => {
    try {
      const response = await fetch('http://localhost:5002/monitors', {
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

  useEffect(() => {
    if (token) {
      loadMonitors();
    }
  }, [token]);

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
          <div className="topbar-actions">
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
