import React from 'react';
import SettingsLayout from '../components/SettingsLayout';

const Help: React.FC = () => {
  return (
    <SettingsLayout>
    <div>
      <h1 className="settings-page-title">Help & Support</h1>
      
      <div className="card settings-page-card">
        <h3 style={{ marginBottom: '20px' }}>Frequently Asked Questions</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px' }}>How do I reset my password?</h4>
          <p>Click on "Forgot Password" on the login page and follow the instructions sent to your email.</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px' }}>How do I verify my email?</h4>
          <p>Check your inbox for a verification email and click the link provided. If you didn't receive it, check your spam folder.</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px' }}>How do I upload a post?</h4>
          <p>Navigate to the feed page and use the upload form at the top to select an image and add a caption.</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px' }}>How do I delete my account?</h4>
          <p>Go to Account settings and click "Delete Account". This action is permanent and cannot be undone.</p>
        </div>
      </div>

      <div className="card settings-page-card">
        <h3 style={{ marginBottom: '20px' }}>Contact Support</h3>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Subject</label>
            <input type="text" className="form-input" placeholder="What do you need help with?" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Message</label>
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
        <h3 style={{ marginBottom: '20px' }}>Community Guidelines</h3>
        
        <p style={{ marginBottom: '10px' }}>Please review our community guidelines to ensure a positive experience for all users:</p>
        <ul style={{ paddingLeft: '20px' }}>
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
