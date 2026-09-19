import React from 'react';
import SettingsLayout from '../components/SettingsLayout';

const Help: React.FC = () => {
  return (
    <SettingsLayout>
    <div className="settings-page settings-page--help">
      <h1 className="settings-page-title">Help & Support</h1>
      
      <div className="card settings-page-card">
        <h3 className="settings-card-title">Frequently Asked Questions</h3>
        
        <div className="settings-faq-item">
          <h4 className="settings-faq-question">How do I reset my password?</h4>
          <p>Click on "Forgot Password" on the login page and follow the instructions sent to your email.</p>
        </div>

        <div className="settings-faq-item">
          <h4 className="settings-faq-question">How do I verify my email?</h4>
          <p>Check your inbox for a verification email and click the link provided. If you didn't receive it, check your spam folder.</p>
        </div>

        <div className="settings-faq-item">
          <h4 className="settings-faq-question">How do I upload a post?</h4>
          <p>Navigate to the feed page and use the upload form at the top to select an image and add a caption.</p>
        </div>

        <div className="settings-faq-item">
          <h4 className="settings-faq-question">How do I delete my account?</h4>
          <p>Go to Account settings and click "Delete Account". This action is permanent and cannot be undone.</p>
        </div>
      </div>

      <div className="card settings-page-card">
        <h3 className="settings-card-title">Contact Support</h3>
        
        <form className="settings-help-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label className="settings-help-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Subject</label>
            <input type="text" className="form-input" placeholder="What do you need help with?" />
          </div>

          <div>
            <label className="settings-help-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Message</label>
            <textarea 
              className="form-input" 
              placeholder="Describe your issue in detail..." 
              rows={6}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <button className="btn-primary" type="submit">Submit Request</button>
        </form>
      </div>

      <div className="card settings-page-card">
        <h3 className="settings-card-title">Community Guidelines</h3>
        
        <p className="settings-guidelines-copy" style={{ marginBottom: '10px' }}>Please review our community guidelines to ensure a positive experience for all users:</p>
        <ul className="settings-guidelines-list" style={{ paddingLeft: '20px' }}>
          <li>Be respectful and kind to others</li>
          <li>No spam or misleading content</li>
          <li>Respect intellectual property rights</li>
          <li>No harassment or bullying</li>
          <li>Keep content appropriate for all ages</li>
        </ul>
      </div>
    </div>
    </SettingsLayout>
  );
};

export default Help;
