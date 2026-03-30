import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LeftNav from '../components/LeftNav';
import './UptimeDark.css';

const SettingsPage = ({ onGoDashboard, onGoMonitors, onGoUsers }) => {
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [smtpHost, setSmtpHost] = useState('');
  // Dark mode state (local only, could be lifted to context for global)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5002/settings/email', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to load settings');
        return;
      }

      const s = data.settings;
      setSmtpHost(s.smtpHost || '');
      setSmtpPort(s.smtpPort || 587);
      setSmtpUser(s.smtpUser || '');
      setSmtpFrom(s.smtpFrom || '');
      setSmtpSecure(Boolean(s.smtpSecure));
      setNotificationsEnabled(Boolean(s.notificationsEnabled));
      setHasPassword(Boolean(s.hasPassword));
      setTestRecipient(user?.email || s.smtpUser || '');
    } catch (_err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === 'admin') {
      loadSettings();
    }
  }, [token, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5002/settings/email', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpUser,
          smtpPassword,
          smtpFrom,
          smtpSecure,
          notificationsEnabled,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save settings');
        return;
      }

      setSuccess('Email settings saved successfully');
      if (smtpPassword.trim().length > 0) {
        setSmtpPassword('');
        setHasPassword(true);
      }
    } catch (_err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5002/settings/email/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: testRecipient }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to send test email');
        return;
      }

      setSuccess(data.message || 'Test email sent');
    } catch (_err) {
      setError('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="dark-bg app-shell">
        <LeftNav
          current="settings"
          showUsers={false}
          showSettings={false}
          onGoDashboard={onGoDashboard}
          onGoMonitors={onGoMonitors}
          onGoUsers={onGoUsers}
        />
        <main className="content-area uptime-page">
          <div className="alert error">Only admins can access Settings.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="dark-bg app-shell">
      <LeftNav
        current="settings"
        showUsers={user?.role === 'admin'}
        showSettings={user?.role === 'admin'}
        onGoDashboard={onGoDashboard}
        onGoMonitors={onGoMonitors}
        onGoUsers={onGoUsers}
      />

      <main className="content-area uptime-page">
        <header className="topbar">
          <div>
            <h1>Settings</h1>
            <p className="subtext">SMTP and notification configuration</p>
          </div>
          <div className="topbar-actions">
            <button className="btn danger" onClick={logout}>Logout</button>
          </div>
        </header>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}


        <section className="panel">
          <div className="panel-head split" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>Appearance</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={e => setDarkMode(e.target.checked)}
                style={{ accentColor: '#2b61ff', width: 18, height: 18 }}
              />
              <span style={{ color: '#b8caec', fontSize: 15 }}>Dark Mode</span>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Email Notifications</h2>
          </div>

          {loading ? (
            <p className="subtext">Loading settings...</p>
          ) : (
            <form className="monitor-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label htmlFor="smtpHost">SMTP Host</label>
                <input id="smtpHost" type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="mail.bitdynamics.sr" />
              </div>

              <div className="form-row">
                <label htmlFor="smtpPort">SMTP Port</label>
                <input id="smtpPort" type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} min="1" max="65535" />
              </div>

              <div className="form-row">
                <label htmlFor="smtpUser">SMTP Username</label>
                <input id="smtpUser" type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="mailer@bitdynamics.sr" />
              </div>

              <div className="form-row">
                <label htmlFor="smtpPassword">SMTP Password {hasPassword ? '(leave blank to keep existing)' : ''}</label>
                <input id="smtpPassword" type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={hasPassword ? '********' : ''} />
              </div>

              <div className="form-row">
                <label htmlFor="smtpFrom">From Email</label>
                <input id="smtpFrom" type="email" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="mailer@bitdynamics.sr" />
              </div>

              <div className="form-row checkbox-row">
                <label>
                  <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
                  Use TLS/SSL (secure)
                </label>
              </div>

              <div className="form-row checkbox-row">
                <label>
                  <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                  Enable status change email notifications
                </label>
              </div>

              <div className="monitor-actions">
                <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>

              <div className="panel-inline-divider" />

              <div className="form-row">
                <label htmlFor="testRecipient">Test Email Recipient</label>
                <input id="testRecipient" type="email" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="you@example.com" />
              </div>

              <div className="monitor-actions">
                <button className="btn ghost" type="button" onClick={handleSendTestEmail} disabled={sendingTest}>
                  {sendingTest ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
