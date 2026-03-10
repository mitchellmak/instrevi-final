import React from 'react';
import { Link } from 'react-router-dom';

type TermsContentProps = {
  includeContactSection?: boolean;
  helpLinkPath?: string;
  contentText?: string;
  lastUpdatedLabel?: string;
};

type ParsedTermsBlock =
  | { type: 'heading2'; text: string }
  | { type: 'heading3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  marginBottom: '10px',
  color: 'var(--brand-accent)'
};

const paragraphStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.65,
  color: '#262626',
  marginBottom: '10px'
};

const subsectionTitleStyle: React.CSSProperties = {
  ...paragraphStyle,
  fontWeight: 600,
  marginBottom: '4px'
};

const listStyle: React.CSSProperties = {
  paddingLeft: '20px',
  marginBottom: '10px',
  color: '#262626',
  lineHeight: 1.6,
  fontSize: '14px'
};

const sectionWrapStyle: React.CSSProperties = {
  marginBottom: '20px',
  borderBottom: '1px solid var(--brand-border)',
  paddingBottom: '16px'
};

const parseTermsText = (content: string): ParsedTermsBlock[] => {
  const blocks: ParsedTermsBlock[] = [];
  const lines = content.split(/\r?\n/);

  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: 'list', items: [...listItems] });
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading2', text: trimmed.slice(3).trim() });
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading3', text: trimmed.slice(4).trim() });
      return;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      listItems.push(trimmed.slice(2).trim());
      return;
    }

    flushList();
    paragraphLines.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks;
};

const renderTextWithBreaks = (text: string) => text.split('\n').map((line, index, allLines) => (
  <React.Fragment key={`${line}-${index}`}>
    {line}
    {index < allLines.length - 1 && <br />}
  </React.Fragment>
));

const DynamicTermsContent: React.FC<{ contentText: string }> = ({ contentText }) => {
  const blocks = React.useMemo(() => parseTermsText(contentText), [contentText]);

  return (
    <div>
      {blocks.map((block, index) => {
        if (block.type === 'heading2') {
          return (
            <h2
              key={`h2-${index}`}
              style={{
                ...sectionTitleStyle,
                marginTop: index === 0 ? 0 : '18px'
              }}
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === 'heading3') {
          return (
            <h3 key={`h3-${index}`} style={subsectionTitleStyle}>
              {block.text}
            </h3>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={`list-${index}`} style={listStyle}>
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${index}`} style={paragraphStyle}>
            {renderTextWithBreaks(block.text)}
          </p>
        );
      })}
    </div>
  );
};

const StaticTermsContent: React.FC<{
  includeContactSection: boolean;
  helpLinkPath: string;
}> = ({ includeContactSection, helpLinkPath }) => {
  return (
    <>
      <p style={paragraphStyle}>
        Welcome to Instrevi, a platform designed to help users share authentic unboxing experiences, reviews, and insights. By
        accessing or using Instrevi, you agree to these Terms & Conditions, our Privacy Policy, and applicable platform rules.
        If you do not agree, you must stop using the platform.
      </p>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>1. Acceptance of Terms</h2>
        <p style={paragraphStyle}>
          By creating an account, accessing, or using Instrevi, you agree to be bound by these Terms & Conditions, our Privacy
          Policy, and any additional guidelines or rules we may publish.
        </p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>2. Eligibility</h2>
        <ul style={listStyle}>
          <li>You must be at least 13 years old to use Instrevi.</li>
          <li>If you are under the legal age of majority in your region, you must have parental or guardian consent.</li>
          <li>You must provide accurate and complete information when creating an account.</li>
        </ul>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>3. User Accounts</h2>
        <ul style={listStyle}>
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>Instrevi may suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>4. User Content</h2>
        <h3 style={subsectionTitleStyle}>4.1 Ownership</h3>
        <p style={paragraphStyle}>You retain ownership of the content you create and share on Instrevi.</p>

        <h3 style={subsectionTitleStyle}>4.2 License to Instrevi</h3>
        <p style={paragraphStyle}>
          By posting content, you grant Instrevi a worldwide, non-exclusive, royalty-free license to use, display, reproduce,
          distribute, and modify your content for the purpose of operating, promoting, and improving the platform.
        </p>

        <h3 style={subsectionTitleStyle}>4.3 Content Guidelines</h3>
        <p style={paragraphStyle}>You agree not to post content that:</p>
        <ul style={listStyle}>
          <li>Violates any law or regulation</li>
          <li>Contains hate speech, harassment, or threats</li>
          <li>Includes explicit, violent, or harmful material</li>
          <li>Infringes on intellectual property rights</li>
          <li>Contains misleading or fraudulent information</li>
        </ul>
        <p style={paragraphStyle}>Instrevi may remove or restrict content that violates these guidelines.</p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>5. Prohibited Activities</h2>
        <p style={paragraphStyle}>You agree not to:</p>
        <ul style={listStyle}>
          <li>Use Instrevi for illegal or unauthorized purposes</li>
          <li>Attempt to hack, disrupt, or interfere with the platform</li>
          <li>Impersonate another person or entity</li>
          <li>Collect or harvest user data without consent</li>
          <li>Use automated tools (bots, scrapers, crawlers) without permission</li>
        </ul>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>6. Intellectual Property</h2>
        <p style={paragraphStyle}>
          All trademarks, logos, design elements, and platform features are the property of Instrevi. You may not copy, modify,
          or distribute any part of the platform without written permission.
        </p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>7. Third-Party Services</h2>
        <p style={paragraphStyle}>
          Instrevi may integrate with third-party tools or services. We are not responsible for the content, policies, or actions
          of these third parties.
        </p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>8. Privacy</h2>
        <p style={paragraphStyle}>
          Your use of Instrevi is also governed by our Privacy Policy, which explains how we collect, use, and protect your
          information.
        </p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>9. Platform Availability</h2>
        <p style={paragraphStyle}>
          Instrevi may update, modify, or discontinue features at any time. We do not guarantee uninterrupted or error-free
          service.
        </p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>10. Disclaimers</h2>
        <p style={paragraphStyle}>Instrevi is provided on an “as is” and “as available” basis. We make no warranties regarding:</p>
        <ul style={listStyle}>
          <li>Accuracy or reliability of content</li>
          <li>Availability or performance of the platform</li>
          <li>Safety or legality of products reviewed by users</li>
        </ul>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>11. Limitation of Liability</h2>
        <p style={paragraphStyle}>To the fullest extent permitted by law, Instrevi is not liable for:</p>
        <ul style={listStyle}>
          <li>Loss of data</li>
          <li>Damages resulting from user interactions</li>
          <li>Unauthorized access to your account</li>
          <li>Any indirect, incidental, or consequential damages</li>
        </ul>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>12. Termination</h2>
        <p style={paragraphStyle}>
          We may suspend or terminate your account if you violate these Terms or engage in harmful behavior. You may also stop
          using the platform at any time.
        </p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>13. Changes to Terms</h2>
        <p style={paragraphStyle}>
          Instrevi may update these Terms occasionally. Continued use of the platform after changes means you accept the updated
          Terms.
        </p>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>14. Authenticity & Disclosure Requirements</h2>
        <ul style={listStyle}>
          <li>Reviews and ratings should reflect your genuine experience.</li>
          <li>You must disclose material relationships (e.g., sponsorships, paid promotions, affiliate links).</li>
          <li>You must not post fake reviews, coordinated manipulation, or misleading rating activity.</li>
        </ul>
      </section>

      <section style={sectionWrapStyle}>
        <h2 style={sectionTitleStyle}>15. Reporting, Moderation, and Enforcement</h2>
        <p style={paragraphStyle}>
          Users may report content or accounts that may violate these Terms. Instrevi may review, remove content, limit
          visibility, or restrict account functionality while investigations are underway.
        </p>
        <p style={paragraphStyle}>
          Repeated or severe violations may result in permanent account restrictions.
        </p>
      </section>

      {includeContactSection && (
        <section style={{ marginBottom: '4px' }}>
          <h2 style={sectionTitleStyle}>16. Contact Us</h2>
          <p style={paragraphStyle}>
            For questions or concerns about these Terms & Conditions, please contact Instrevi support through the app or official
            website.
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            Thank you for using Instrevi and contributing to a transparent, community-driven review experience. You can also review
            help resources in <Link to={helpLinkPath} style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>Help & Support</Link>.
          </p>
        </section>
      )}
    </>
  );
};

const TermsContent: React.FC<TermsContentProps> = ({
  includeContactSection = true,
  helpLinkPath = '/settings/help',
  contentText,
  lastUpdatedLabel
}) => {
  const normalizedContent = typeof contentText === 'string' ? contentText.trim() : '';
  const normalizedLastUpdated = typeof lastUpdatedLabel === 'string' && lastUpdatedLabel.trim()
    ? lastUpdatedLabel.trim()
    : 'March 2026';

  return (
    <>
      <p style={{ ...paragraphStyle, color: 'var(--brand-primary)', marginBottom: '18px' }}>
        Last updated: {normalizedLastUpdated}
      </p>
      {normalizedContent
        ? <DynamicTermsContent contentText={normalizedContent} />
        : <StaticTermsContent includeContactSection={includeContactSection} helpLinkPath={helpLinkPath} />}
    </>
  );
};

export default TermsContent;