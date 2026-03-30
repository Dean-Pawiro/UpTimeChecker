import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = ({ setCurrentPage }) => {
  const { user, token, logout } = useAuth();
  const [monitors, setMonitors] = useState([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [url, setUrl] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [error, setError] = useState('');

  const loadMonitors = async () => {
    setLoadingMonitors(true);
    try {
      const response = await fetch(`${API}/monitors`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMonitors(data.monitors || []);
      } else {
        setError(data.error || 'Failed to load monitors');
      }
    } catch (_err) {
      setError('Failed to load monitors');
    } finally {
      setLoadingMonitors(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadMonitors();
    }
  }, [token]);

  const resetForm = () => {
    setUrl('');
    setIntervalMinutes(5);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      url,
      intervalMinutes: Number(intervalMinutes),
    };

    const endpoint = isEditing
      ? `${API}/monitors/${editingId}`
      : `${API}/monitors`;

    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save monitor');
        return;
      }

      resetForm();
      loadMonitors();
    } catch (_err) {
      setError('Failed to save monitor');
    }
  };

  const startEdit = (monitor) => {
    setIsEditing(true);
    setEditingId(monitor.id);
    setUrl(monitor.url);
    setIntervalMinutes(monitor.intervalMinutes);
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      const response = await fetch(`${API}/monitors/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          {user?.role === 'admin' && (
            <button onClick={() => setCurrentPage('users')} className="btn-manage-users">
              Manage Users
            </button>
          )}
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {user?.name}!</h2>
          <p className="user-email">{user?.email}</p>
          <p className="user-role">Role: <span className={`role-badge role-${user?.role}`}>{user?.role}</span></p>
        </div>

        <div className="monitor-card">
          <h3>{isEditing ? 'Edit Monitor' : 'Add Monitor'}</h3>
          <form onSubmit={handleSubmit} className="monitor-form">
            <div className="form-row">
              <label htmlFor="url">Website URL</label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="google.com"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="interval">Check Interval (minutes)</label>
              <input
                id="interval"
                type="number"
                min="1"
                max="1440"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(e.target.value)}
                required
              />
            </div>
            {error && <p className="monitor-error">{error}</p>}
            <div className="monitor-actions">
              <button type="submit" className="btn-primary-action">
                {isEditing ? 'Update Monitor' : 'Add Monitor'}
              </button>
              {isEditing && (
                <button type="button" className="btn-secondary-action" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="monitor-card">
          <h3>Your Monitors ({monitors.length})</h3>
          {loadingMonitors ? (
            <p className="empty-state">Loading monitors...</p>
          ) : monitors.length === 0 ? (
            <p className="empty-state">No monitors yet. Add your first site above.</p>
          ) : (
            <div className="monitor-list">
              {monitors.map((monitor) => (
                <div className="monitor-item" key={monitor.id}>
                  <div className="monitor-details">
                    <p className="monitor-url">{monitor.url}</p>
                    <p className="monitor-meta">Check every {monitor.intervalMinutes} minute(s)</p>
                  </div>
                  <div className="monitor-item-actions">
                    <button type="button" className="btn-small-edit" onClick={() => startEdit(monitor)}>
                      Edit
                    </button>
                    <button type="button" className="btn-small-delete" onClick={() => handleDelete(monitor.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="info-cards">
          <div className="info-card">
            <h3>Monitors</h3>
            <p className="large-number">{monitors.length}</p>
            <p>Active monitoring endpoints</p>
          </div>
          <div className="info-card">
            <h3>Uptime</h3>
            <p className="large-number">99.9%</p>
            <p>Average uptime</p>
          </div>
          <div className="info-card">
            <h3>Alerts</h3>
            <p className="large-number">0</p>
            <p>Active alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
