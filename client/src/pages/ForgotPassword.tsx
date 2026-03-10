import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setToken('');
    setResetUrl('');
    setStatus('idle');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');

      const nextToken = data.resetToken || '';
      const nextResetUrl = data.resetUrl || (nextToken ? `${window.location.origin}/reset-password?token=${nextToken}` : '');

      setToken(nextToken);
      setResetUrl(nextResetUrl);
      setMessage('If that email exists, reset instructions have been sent. Please check your inbox and spam folder.');
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Request failed');
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
        <h1 style={{ fontSize: '26px', color: 'var(--brand-accent)', marginBottom: '8px' }}>Forgot Password</h1>
        <p style={{ color: 'var(--brand-primary)', fontSize: '14px', marginBottom: '18px', lineHeight: 1.6 }}>
          Enter the email linked to your account and we will send a password reset link.
        </p>

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="form-input"
            required
          />

          <button className="btn-dark btn-large" type="submit" disabled={loading}>
            {loading ? 'Sending reset link...' : 'Send reset link'}
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

        {(token || resetUrl) && (
          <div style={{ marginTop: '12px', border: '1px dashed var(--brand-border)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--brand-primary)', marginBottom: '6px', fontWeight: 600 }}>
              Development reset details
            </div>
            {token && <div style={{ fontSize: '12px', wordBreak: 'break-all', color: 'var(--brand-accent)' }}>Token: {token}</div>}
            {resetUrl && (
              <a href={resetUrl} style={{ display: 'inline-block', marginTop: '8px', color: 'var(--brand-pop)', fontWeight: 600, textDecoration: 'none' }}>
                Open reset link
              </a>
            )}
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '13px', color: '#737373' }}>
          Remembered your password?{' '}
          <Link to="/login" style={{ color: 'var(--brand-pop)', textDecoration: 'none', fontWeight: 600 }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
