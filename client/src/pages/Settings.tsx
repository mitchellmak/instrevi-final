import React from 'react';
import SettingsLayout from '../components/SettingsLayout';

const Settings: React.FC = () => {
  return (
    <SettingsLayout>
    <div className="settings-page settings-page--general">
      <h1 className="settings-page-title">Settings</h1>

      <div className="card settings-page-card">
        <h3 className="settings-card-title">Notification Settings</h3>
        
        <div className="settings-option-row">
          <label className="settings-toggle-row">
            <input type="checkbox" defaultChecked className="settings-toggle-input" />
            <span>Email notifications for new followers</span>
          </label>
        </div>

        <div className="settings-option-row">
          <label className="settings-toggle-row">
            <input type="checkbox" defaultChecked className="settings-toggle-input" />
            <span>Email notifications for likes and comments</span>
          </label>
        </div>

        <div className="settings-option-row">
          <label className="settings-toggle-row">
            <input type="checkbox" className="settings-toggle-input" />
            <span>Push notifications</span>
          </label>
        </div>
      </div>

      <div className="card settings-page-card">
        <h3 className="settings-card-title">Security</h3>
        
        <div className="settings-option-row">
          <label className="settings-toggle-row">
            <input type="checkbox" className="settings-toggle-input" />
            <span>Enable two-factor authentication</span>
          </label>
        </div>

        <div className="settings-option-row">
          <label className="settings-toggle-row">
            <input type="checkbox" className="settings-toggle-input" />
            <span>Login alerts for unrecognized devices</span>
          </label>
        </div>

        <button className="btn-primary settings-save-btn" type="button">Save Settings</button>
      </div>
    </div>
    </SettingsLayout>
  );
};

export default Settings;
