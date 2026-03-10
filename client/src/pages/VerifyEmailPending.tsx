import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

type PendingState = {
  email?: string;
  verificationToken?: string | null;
  verifyUrl?: string | null;
};

const VerifyEmailPending: React.FC = () => {
  const location = useLocation();
  const state = (location.state as PendingState) || {};

  const [email, setEmail] = useState(state.email || '');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState(state.verificationToken || '');
  const [devVerifyUrl, setDevVerifyUrl] = useState(state.verifyUrl || '');

  const resendVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setStatus('error');
      setMessage('Please enter your email address to resend verification.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await apiFetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Could not resend verification email');
      }

      setStatus('success');
      setMessage(data?.message || 'Verification email sent. Please check your inbox.');
      setDevToken(data?.verificationToken || '');
      setDevVerifyUrl(data?.verifyUrl || '');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err?.message || 'Could not resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 58px)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: 'var(--brand-bg)',
      fontFamily: "'Poppins', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        borderRadius: '14px',
        border: '1px solid var(--brand-border)',
        backgroundColor: '#fff',
        boxShadow: '0 4px 14px rgba(43,45,66,0.08)',
        padding: '28px 24px'
      }}>
        <h1 style={{ margin: 0, marginBottom: '10px', color: 'var(--brand-accent)', fontSize: '26px' }}>
          Pending Email Verification
        </h1>
        <p style={{ margin: 0, marginBottom: '16px', color: 'var(--brand-primary)', fontSize: '14px', lineHeight: 1.6 }}>
          Verify your email to complete your account setup. Use the link sent to your inbox.
        </p>

        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="you@example.com"
          required
        />

        <button
          type="button"
          className="btn-dark btn-large"
          onClick={resendVerification}
          disabled={loading}
          style={{ marginTop: '8px' }}
        >
          {loading ? 'Sending email...' : 'Resend verification email'}
        </button>

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

        {(devVerifyUrl || devToken) && (
          <div style={{ marginTop: '14px', fontSize: '13px', backgroundColor: 'var(--brand-bg)', border: '1px dashed var(--brand-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--brand-accent)' }}>
            <strong>Local/Dev quick verify:</strong>
            {devVerifyUrl && (
              <div style={{ marginTop: '6px' }}>
                <a href={devVerifyUrl} style={{ color: 'var(--brand-pop)', textDecoration: 'none', wordBreak: 'break-all' }}>
                  Open verification link
                </a>
              </div>
            )}
            {devToken && (
              <div style={{ marginTop: '6px', wordBreak: 'break-all' }}>
                Token: <strong>{devToken}</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
          <Link to="/login" style={{ color: 'var(--brand-pop)', textDecoration: 'none', fontWeight: 600 }}>
            Back to login
          </Link>
          <Link to="/verify-email" style={{ color: 'var(--brand-pop)', textDecoration: 'none', fontWeight: 600 }}>
            Verify with token instead
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPending;
