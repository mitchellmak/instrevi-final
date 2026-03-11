import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import SettingsLayout from '../components/SettingsLayout';
import { apiFetch } from '../utils/apiFetch';

const Account: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = React.useState<'none' | 'password' | 'email' | 'delete'>('none');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [nextEmail, setNextEmail] = React.useState(user?.email || '');
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    setNextEmail(user?.email || '');
  }, [user?.email]);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const parseApiMessage = async (response: Response) => {
    const text = await response.text();
    if (!text) return '';

    try {
      const parsed = JSON.parse(text);
      return parsed?.message || text;
    } catch {
      return text;
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setBusy(true);

    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const message = await parseApiMessage(response);

      if (!response.ok) {
        throw new Error(message || 'Failed to change password');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(message || 'Password changed successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    const trimmedEmail = nextEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter an email address.');
      return;
    }

    if (trimmedEmail === (user?.email || '').trim().toLowerCase()) {
      setError('That email is already on your account.');
      return;
    }

    setBusy(true);

    try {
      const formData = new FormData();
      formData.append('email', trimmedEmail);
      await updateProfile(formData);
      setSuccess('Email updated successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update email');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!deletePassword) {
      setError('Please enter your password.');
      return;
    }

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm account deletion.');
      return;
    }

    setBusy(true);

    try {
      const response = await apiFetch('/api/users/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: deletePassword,
          confirmText: deleteConfirmText
        })
      });

      const message = await parseApiMessage(response);

      if (!response.ok) {
        throw new Error(message || 'Failed to delete account');
      }

      logout();
      navigate('/register', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsLayout>
    <div>
      <h1 className="settings-page-title">Account</h1>
      
      <div className="card settings-page-card">
        <h3 style={{ marginBottom: '20px' }}>Account Information</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Username</label>
          <p>{user?.username}</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Email</label>
          <p>{user?.email}</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Full Name</label>
          <p>{`${user?.firstName || ''} ${user?.middleName || ''} ${user?.lastName || ''}`.trim() || 'Not provided'}</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Email Verification Status</label>
          <p>{user?.emailVerified ? '✓ Verified' : '⚠ Not verified'}</p>
        </div>
      </div>

      <div className="card settings-page-card">
        <h3 style={{ marginBottom: '20px' }}>Account Actions</h3>
        <div className="settings-actions">
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setActiveAction('password');
              resetMessages();
            }}
          >
            Change Password
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setActiveAction('email');
              resetMessages();
            }}
          >
            Update Email
          </button>
          <button
            className="btn-primary"
            type="button"
            style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
            onClick={() => {
              setActiveAction('delete');
              resetMessages();
            }}
          >
            Delete Account
          </button>
        </div>

        {(error || success) && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--brand-border)',
              color: error ? '#b42318' : '#0f7a37',
              background: '#ffffff',
              fontSize: '13px'
            }}
          >
            {error || success}
          </div>
        )}

        {activeAction === 'password' && (
          <form onSubmit={handleChangePassword} style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>Current Password</label>
              <input
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={busy}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={busy}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={busy}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save Password'}
            </button>
          </form>
        )}

        {activeAction === 'email' && (
          <form onSubmit={handleUpdateEmail} style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>New Email</label>
              <input
                type="email"
                className="form-input"
                value={nextEmail}
                onChange={(event) => setNextEmail(event.target.value)}
                disabled={busy}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save Email'}
            </button>
          </form>
        )}

        {activeAction === 'delete' && (
          <form onSubmit={handleDeleteAccount} style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '13px', color: '#b42318', marginBottom: '8px' }}>
              This permanently deletes your account and posts. This cannot be undone.
            </p>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>Password</label>
              <input
                type="password"
                className="form-input"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                disabled={busy}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>Type DELETE to confirm</label>
              <input
                type="text"
                className="form-input"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                disabled={busy}
              />
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={busy}
              style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
            >
              {busy ? 'Deleting...' : 'Delete My Account'}
            </button>
          </form>
        )}
      </div>
    </div>
    </SettingsLayout>
  );
};

export default Account;
