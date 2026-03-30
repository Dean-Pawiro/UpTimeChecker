import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LeftNav from '../components/LeftNav';
import './UptimeDark.css';

const API = import.meta.env.VITE_API_URL;

const MonitorsPage = ({ onBackDashboard, onOpenMonitor, editMonitorId, clearEditTarget, onMonitorSaved, onGoUsers, onGoSettings }) => {
  const { user, token, logout } = useAuth();
  const [monitors, setMonitors] = useState([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (token) {
      loadMonitors();
    }
  }, [token]);

  useEffect(() => {
    if (!editMonitorId || monitors.length === 0) return;
    const target = monitors.find((m) => m.id === editMonitorId);
    if (target) {
      setEditingId(target.id);
      setName(target.name || '');
      setUrl(target.url);
      setIntervalMinutes(target.intervalMinutes);
      setShowForm(true);
      clearEditTarget();
    }
  }, [editMonitorId, monitors, clearEditTarget]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monitors;
    return monitors.filter((m) => {
      const displayName = (m.name || '').toLowerCase();
      return displayName.includes(q) || m.url.toLowerCase().includes(q);
    });
  }, [monitors, query]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setUrl('');
    setIntervalMinutes(5);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setName('');
    setUrl('');
    setIntervalMinutes(5);
    setShowForm(true);
  };

  const saveMonitor = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = editingId ? `${API}/monitors/${editingId}` : `${API}/monitors`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, url, intervalMinutes: Number(intervalMinutes) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save monitor');
        return;
      }
      const savedMonitorId = data?.monitor?.id || editingId;
      resetForm();
      loadMonitors();
      if (typeof onMonitorSaved === 'function' && savedMonitorId) {
        onMonitorSaved(savedMonitorId);
      }
    } catch (_err) {
      setError('Failed to save monitor');
    }
  };

  const deleteMonitor = async (id) => {
    setError('');
    try {
      const response = await fetch(`${API}/monitors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to delete monitor');
        return;
      }
      if (editingId === id) {
        resetForm();
      }
      loadMonitors();
    } catch (_err) {
      setError('Failed to delete monitor');
    }
  };

  return (
    <div className="dark-bg app-shell">
      <LeftNav
        current="monitors"
        showUsers={user?.role === 'admin'}
        showSettings={user?.role === 'admin'}
        onGoDashboard={onBackDashboard}
        onGoMonitors={() => {}}
        onGoUsers={onGoUsers}
        onGoSettings={onGoSettings}
      />

      <main className="content-area uptime-page">
        <header className="topbar">
          <div>
            <h1>Monitors</h1>
            <p className="subtext">Manage websites and intervals</p>
          </div>
          <div className="topbar-actions">
            <button className="btn danger" onClick={logout}>Logout</button>
          </div>
        </header>

        <section className="panel">
        <div className="panel-head split">
          <h2>{editingId ? 'Edit Monitor' : 'Add Monitor'}</h2>
          {!showForm && (
            <button className="btn primary" type="button" onClick={openAddForm}>Add +</button>
          )}
        </div>
        {showForm && (
        <form className="monitor-form" onSubmit={saveMonitor}>
          <div className="form-row">
            <label htmlFor="name">Friendly Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Google Main" />
          </div>
          <div className="form-row">
            <label htmlFor="url">Website URL</label>
            <input id="url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="google.com" required />
          </div>
          <div className="form-row">
            <label htmlFor="interval">Interval (minutes)</label>
            <select id="interval" value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value))} required>
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="monitor-actions">
            <button className="btn primary" type="submit">{editingId ? 'Update' : 'Add Monitor'}</button>
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
        )}
        </section>

        <section className="panel">
        <div className="panel-head split">
          <h2>Website List ({filtered.length})</h2>
          <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or URL" />
        </div>

        {filtered.length === 0 ? (
          <p className="empty">No matching monitors.</p>
        ) : (
          <div className="monitor-table">
            {filtered.map((monitor) => {
              return (
                <div className="monitor-row" key={monitor.id}>
                <div className="monitor-main" onClick={() => onOpenMonitor(monitor.id)} role="button" tabIndex={0}>
                  <p className="monitor-title">{monitor.name || monitor.url}</p>
                  <p className="monitor-meta">{monitor.url}</p>
                  <p className="monitor-meta">Every {monitor.intervalMinutes} min • Status: {monitor.currentStatus}</p>
                  <p className="monitor-meta">Access: {monitor.accessRole || 'owner'}</p>
                  <div className="mini-24h-wrap">
                    <div className="mini-24h-bars">
                      {(monitor.stats24h?.bars || []).map((status, index) => (
                        <span
                          key={`${monitor.id}-${index}`}
                          className={`mini-bar ${status === 'UP' ? 'up' : status === 'DOWN' ? 'down' : 'none'}`}
                        />
                      ))}
                    </div>
                    <p className="mini-24h-text">
                      24h: {monitor.stats24h?.upCount || 0} up / {monitor.stats24h?.downCount || 0} down ({monitor.stats24h?.availability || 0}%)
                    </p>
                  </div>
                </div>
                <div className="monitor-actions">
                  <button className="btn small" type="button" onClick={() => onOpenMonitor(monitor.id)}>Stats</button>
                  {monitor.canDelete && (
                    <button className="btn small danger" type="button" onClick={() => deleteMonitor(monitor.id)}>Delete</button>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        )}
        </section>
      </main>
    </div>
  );
};

export default MonitorsPage;
