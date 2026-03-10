import React from 'react';
import SettingsLayout from '../components/SettingsLayout';
import TermsContent from '../components/TermsContent';
import { useTermsDocument } from '../hooks/useTermsDocument';

const TermsSettings: React.FC = () => {
  const terms = useTermsDocument();

  return (
    <SettingsLayout>
      <div>
        <h1 className="settings-page-title">Terms & Conditions</h1>

        <div className="card settings-page-card" style={{ marginBottom: 0 }}>
          <TermsContent
            includeContactSection
            helpLinkPath="/settings/help"
            contentText={terms?.settingsContent}
            lastUpdatedLabel={terms?.lastUpdatedLabel}
          />
        </div>
      </div>
    </SettingsLayout>
  );
};

export default TermsSettings;