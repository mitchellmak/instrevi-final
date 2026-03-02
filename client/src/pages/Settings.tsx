import React from 'react';
import SettingsLayout from '../components/SettingsLayout';

const Settings: React.FC = () => {
  return (
    <SettingsLayout>
    <div>
      <h1 className="settings-page-title">Settings & Privacy</h1>
      
      <div className="card settings-page-card">
        <h3 style={{ marginBottom: '20px' }}>Privacy Settings</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '10px' }} />
            <span>Make my profile private</span>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '10px' }} />
            <span>Hide my email from other users</span>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '10px' }} />
            <span>Allow others to tag me in posts</span>
          </label>
        </div>
      </div>

      <div className="card settings-page-card">
        <h3 style={{ marginBottom: '20px' }}>Notification Settings</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: '10px' }} />
            <span>Email notifications for new followers</span>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: '10px' }} />
            <span>Email notifications for likes and comments</span>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '10px' }} />
            <span>Push notifications</span>
          </label>
        </div>
      </div>

      <div className="card settings-page-card">
        <h3 style={{ marginBottom: '20px' }}>Security</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '10px' }} />
            <span>Enable two-factor authentication</span>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '10px' }} />
            <span>Login alerts for unrecognized devices</span>
          </label>
        </div>

        <button className="btn-primary" style={{ marginTop: '10px' }}>Save Settings</button>
      </div>
    </div>
    </SettingsLayout>
  );
};

export default Settings;
