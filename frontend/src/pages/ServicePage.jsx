import React, { useEffect, useState } from 'react';
const API = import.meta.env.VITE_API_URL;

const ServicePage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/service/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setClients(data.clients || []);
        } else {
          setError(data.error || 'Failed to load clients');
        }
      } catch (err) {
        setError('Failed to load clients');
      }
      setLoading(false);
    };
    fetchClients();
  }, []);

  return (
    <div className="content-area uptime-page">
      <header className="topbar">
        <h1>Service Clients</h1>
        <p className="subtext">Clients with contact info</p>
      </header>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="alert error">{error}</div>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Monitor</th>
              <th>Last Update Sent</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr><td colSpan="5">No clients found.</td></tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.email}</td>
                  <td>{client.Monitor?.name || client.Monitor?.url || '-'}</td>
                  <td></td>
                  <td><button className="btn primary">Send Update</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ServicePage;
