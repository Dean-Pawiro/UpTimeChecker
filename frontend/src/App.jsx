import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import OverviewDashboard from './pages/OverviewDashboard';
import MonitorsPage from './pages/MonitorsPage';
import MonitorDetails from './pages/MonitorDetails';
import UserManagement from './pages/UserManagement';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  const { user, token } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard-overview');
  const [selectedMonitorId, setSelectedMonitorId] = useState(null);
  const [editMonitorId, setEditMonitorId] = useState(null);
  const [returnToDetailsAfterEdit, setReturnToDetailsAfterEdit] = useState(false);

  if (!token || !user) {
    return <Login />;
  }

  const openMonitorDetails = (monitorId) => {
    setSelectedMonitorId(monitorId);
    setCurrentPage('monitor-details');
  };

  const openMonitorEdit = (monitorId) => {
    setEditMonitorId(monitorId);
    setReturnToDetailsAfterEdit(true);
    setCurrentPage('monitors');
  };

  const handleMonitorSaved = (monitorId) => {
    if (returnToDetailsAfterEdit) {
      setSelectedMonitorId(monitorId);
      setCurrentPage('monitor-details');
      setReturnToDetailsAfterEdit(false);
      return;
    }

    setCurrentPage('monitors');
  };

  return (
    <>
      {currentPage === 'dashboard-overview' && (
        <OverviewDashboard
          onGoMonitors={() => setCurrentPage('monitors')}
          onOpenMonitor={openMonitorDetails}
          onGoUsers={() => setCurrentPage('users')}
          onGoSettings={() => setCurrentPage('settings')}
        />
      )}

      {currentPage === 'monitors' && (
        <MonitorsPage
          onBackDashboard={() => setCurrentPage('dashboard-overview')}
          onOpenMonitor={openMonitorDetails}
          editMonitorId={editMonitorId}
          clearEditTarget={() => setEditMonitorId(null)}
          onMonitorSaved={handleMonitorSaved}
          onGoUsers={() => setCurrentPage('users')}
          onGoSettings={() => setCurrentPage('settings')}
        />
      )}

      {currentPage === 'monitor-details' && (
        <MonitorDetails
          monitorId={selectedMonitorId}
          onBackMonitors={() => setCurrentPage('monitors')}
          onBackDashboard={() => setCurrentPage('dashboard-overview')}
          onEditMonitor={openMonitorEdit}
          onGoUsers={() => setCurrentPage('users')}
          onGoSettings={() => setCurrentPage('settings')}
        />
      )}

      {currentPage === 'users' && (
        <UserManagement
          onGoDashboard={() => setCurrentPage('dashboard-overview')}
          onGoMonitors={() => setCurrentPage('monitors')}
          onGoSettings={() => setCurrentPage('settings')}
        />
      )}

      {currentPage === 'settings' && (
        <SettingsPage
          onGoDashboard={() => setCurrentPage('dashboard-overview')}
          onGoMonitors={() => setCurrentPage('monitors')}
          onGoUsers={() => setCurrentPage('users')}
        />
      )}
    </>
  );
}

export default App;
