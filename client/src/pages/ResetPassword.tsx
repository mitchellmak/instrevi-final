import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokenParam) setToken(tokenParam);
  }, [tokenParam]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setMessage('Password reset successful — redirecting to login');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 20 }}>
      <h2>Reset password</h2>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Reset token" className="form-input" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="New password" className="form-input" required />
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset password'}</button>
      </form>
      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </div>
  );
};

export default ResetPassword;
