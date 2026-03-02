import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

const VerifyEmail: React.FC = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const prefilled = (loc.state as any)?.verificationToken || '';
  const email = (loc.state as any)?.email || '';

  const [token, setToken] = useState(prefilled);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Verification failed');
      }
      setMessage('Email verified — you may now log in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 20 }}>
      <h2>Verify your email</h2>
      {email && <div style={{ marginBottom: 8, color: '#555' }}>Verification token for: <strong>{email}</strong> (for local/dev)</div>}
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter verification token" className="form-input" required />
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify'}</button>
      </form>
      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </div>
  );
};

export default VerifyEmail;
