import React from 'react';
import TermsContent from '../components/TermsContent';
import { useTermsDocument } from '../hooks/useTermsDocument';

const Terms: React.FC = () => {
  const terms = useTermsDocument();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: "'Poppins', sans-serif" }}>
      <div className="card settings-page-card" style={{ marginBottom: 0 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: 'var(--brand-accent)' }}>
          Instrevi – Terms & Conditions
        </h1>
        <TermsContent
          includeContactSection={false}
          contentText={terms?.publicContent}
          lastUpdatedLabel={terms?.lastUpdatedLabel}
        />

      </div>
    </div>
  );
};

export default Terms;
