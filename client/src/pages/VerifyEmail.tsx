import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

const VerifyEmail: React.FC = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || '';
  const prefilled = (loc.state as any)?.verificationToken || tokenFromQuery || '';
  const email = (loc.state as any)?.email || '';

  const [token, setToken] = useState(prefilled);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);

  const verifyToken = useCallback(async (tokenValue: string) => {
    const normalizedToken = tokenValue.trim();
    if (!normalizedToken) return;

    setLoading(true);
    setMessage('');
    setStatus('idle');

    try {
      const res = await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: normalizedToken }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Verification failed');
      }

      setMessage('Email verified — redirecting to login.');
      setStatus('success');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Verification failed');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!tokenFromQuery || autoVerifyAttempted) return;
    setAutoVerifyAttempted(true);
    setToken(tokenFromQuery);
    verifyToken(tokenFromQuery);
  }, [tokenFromQuery, autoVerifyAttempted, verifyToken]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    verifyToken(token);
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
        <h1 style={{ fontSize: '26px', color: 'var(--brand-accent)', marginBottom: '8px' }}>Verify Email</h1>
        <p style={{ color: 'var(--brand-primary)', fontSize: '14px', marginBottom: '18px', lineHeight: 1.6 }}>
          If you arrived from the verification email link, verification happens automatically.
        </p>

        {email && (
          <div style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--brand-accent)' }}>
            Account email: <strong>{email}</strong>
          </div>
        )}

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
            Verification token
          </label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter verification token"
            className="form-input"
            required
          />
          <button className="btn-dark btn-large" type="submit" disabled={loading}>
            {loading ? 'Verifying email...' : 'Verify email'}
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
          Still waiting for email?{' '}
          <Link to="/verify-email/pending" style={{ color: 'var(--brand-pop)', textDecoration: 'none', fontWeight: 600 }}>
            Go to pending verification
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
