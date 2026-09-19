import React from 'react';
import SettingsLayout from '../components/SettingsLayout';

const Privacy: React.FC = () => {
  return (
    <SettingsLayout>
      <div className="settings-page settings-page--privacy">
        <h1 className="settings-page-title">Privacy</h1>

        <div className="card settings-page-card">
          <h3 className="settings-card-title">Privacy Preferences</h3>

          <div className="settings-option-row">
            <label className="settings-toggle-row">
              <input type="checkbox" className="settings-toggle-input" />
              <span>Make my profile private</span>
            </label>
          </div>

          <div className="settings-option-row">
            <label className="settings-toggle-row">
              <input type="checkbox" className="settings-toggle-input" />
              <span>Hide my email from other users</span>
            </label>
          </div>

          <div className="settings-option-row">
            <label className="settings-toggle-row">
              <input type="checkbox" className="settings-toggle-input" />
              <span>Allow others to tag me in posts</span>
            </label>
          </div>

          <button className="btn-primary settings-save-btn" type="button">Save Privacy</button>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default Privacy;
