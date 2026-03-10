import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokenParam) setToken(tokenParam);
  }, [tokenParam]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setStatus('idle');

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setStatus('error');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setMessage('Password reset successful — redirecting to login');
      setStatus('success');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Reset failed');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 58px)',
      backgroundColor: 'var(--brand-bg)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: "'Poppins', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        backgroundColor: '#fff',
        border: '1px solid var(--brand-border)',
        borderRadius: '14px',
        boxShadow: '0 4px 14px rgba(43,45,66,0.08)',
        padding: '28px 24px'
      }}>
        <h1 style={{ fontSize: '26px', color: 'var(--brand-accent)', marginBottom: '8px' }}>Reset Password</h1>
        <p style={{ color: 'var(--brand-primary)', fontSize: '14px', marginBottom: '18px', lineHeight: 1.6 }}>
          Set a new password for your account using your reset token.
        </p>

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
            Reset token
          </label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your reset token"
            className="form-input"
            required
          />

          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
            New password
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Enter new password"
            className="form-input"
            required
          />

          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
            Confirm new password
          </label>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirm new password"
            className="form-input"
            required
          />

          <button className="btn-dark btn-large" type="submit" disabled={loading}>
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: '14px',
            fontSize: '13px',
            borderRadius: '8px',
            padding: '10px 12px',
            border: status === 'error' ? '1px solid #ffcdd2' : '1px solid var(--brand-border)',
            backgroundColor: status === 'error' ? '#ffebee' : '#fff',
            color: status === 'error' ? '#b42318' : 'var(--brand-accent)'
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '13px', color: '#737373' }}>
          Back to{' '}
          <Link to="/login" style={{ color: 'var(--brand-pop)', textDecoration: 'none', fontWeight: 600 }}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
