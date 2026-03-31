import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LeftNav from '../components/LeftNav';
import './UptimeDark.css';

const UserManagement = ({ onGoDashboard, onGoMonitors, onGoSettings }) => {
  const { user, users, fetchAllUsers, updateUserRole, deleteUser, loading, logout } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const result = await fetchAllUsers();
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccess('');
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      setSuccess('User role updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setError('');
      setSuccess('');
      const result = await deleteUser(userId);
      if (result.success) {
        setSuccess('User deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="dark-bg app-shell">
        <LeftNav
          current="users"
          showUsers={false}
          showSettings={false}
          onGoDashboard={onGoDashboard}
          onGoMonitors={onGoMonitors}
          onGoUsers={() => {}}
          onGoSettings={onGoSettings}
        />
        <main className="content-area uptime-page">
          <div className="alert error">You do not have permission to access this page.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="dark-bg app-shell">
      <LeftNav
        current="users"
        showUsers
        showSettings={user?.role === 'admin'}
        onGoDashboard={onGoDashboard}
        onGoMonitors={onGoMonitors}
        onGoUsers={() => {}}
        onGoSettings={onGoSettings}
      />

      <main className="content-area uptime-page user-management">
        <header className="topbar">
          <div>
            <h1>User Management</h1>
            <p className="subtext">Manage platform users and admin access</p>
          </div>
          <div className="topbar-actions">
            <button className="btn danger" onClick={logout}>Logout</button>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="users-table-container panel">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-message">No users found</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className={u.id === user.id ? 'current-user' : ''}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="actions">
                      {u.email !== 'dean@bitdynamics.sr' ? (
                        <>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={loading}
                            className="role-select"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={loading}
                            className="btn-delete"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="protected-account">Protected Account</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default UserManagement;
