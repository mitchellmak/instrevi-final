import React from 'react';
import SettingsLayout from '../components/SettingsLayout';

const Privacy: React.FC = () => {
  return (
    <SettingsLayout>
      <div>
        <h1 className="settings-page-title">Privacy</h1>

        <div className="card settings-page-card">
          <h3 style={{ marginBottom: '20px' }}>Privacy Preferences</h3>

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

          <button className="btn-primary" style={{ marginTop: '10px' }}>Save Privacy</button>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default Privacy;
