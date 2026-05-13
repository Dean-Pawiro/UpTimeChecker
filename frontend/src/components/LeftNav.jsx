import React from 'react';

const LeftNav = ({
  current,
  showUsers,
  showSettings,
  onGoDashboard,
  onGoMonitors,
  onGoUsers,
  onGoSettings,
  onGoService,
}) => {
  return (
    <aside className="left-nav">
      <div className="brand-block">
        <div className="brand-dot" />
        <h2>UpTimeChecker</h2>
      </div>

      <nav className="nav-links">
        <button
          type="button"
          className={`nav-link ${current === 'dashboard' ? 'active' : ''}`}
          onClick={onGoDashboard}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`nav-link ${current === 'monitors' ? 'active' : ''}`}
          onClick={onGoMonitors}
        >
          Monitors
        </button>
        {showUsers && (
          <button
            type="button"
            className={`nav-link ${current === 'users' ? 'active' : ''}`}
            onClick={onGoUsers}
          >
            Users
          </button>
        )}
        <button
          type="button"
          className={`nav-link ${current === 'service' ? 'active' : ''}`}
          onClick={onGoService}
        >
          Service
        </button>
        {showSettings && (
          <button
            type="button"
            className={`nav-link ${current === 'settings' ? 'active' : ''}`}
            onClick={onGoSettings}
          >
            Settings
          </button>
        )}
      </nav>
    </aside>
  );
};

export default LeftNav;
