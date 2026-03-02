import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SettingsLayout from '../components/SettingsLayout';

const Account: React.FC = () => {
  const { user } = useAuth();

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
          <button className="btn-primary">Change Password</button>
          <button className="btn-primary">Update Email</button>
          <button className="btn-primary" style={{ backgroundColor: '#dc3545' }}>Delete Account</button>
        </div>
      </div>
    </div>
    </SettingsLayout>
  );
};

export default Account;
