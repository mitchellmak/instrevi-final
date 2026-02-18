import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setToken(data.resetToken || '');
      setMessage('If that email exists you will receive reset instructions (dev: token shown).');
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 20 }}>
      <h2>Forgot password</h2>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="form-input" required />
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
      </form>

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
      {token && (
        <div style={{ marginTop: 12 }}>
          <div><strong>Reset token (dev):</strong></div>
          <div style={{ wordBreak: 'break-all' }}>{token}</div>
          <div style={{ marginTop: 8 }}><a href={`/reset-password?token=${token}`}>Use token to reset password</a></div>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
