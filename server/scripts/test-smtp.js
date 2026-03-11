require('dotenv').config();
const nodemailer = require('nodemailer');

const normalizeSmtpCredential = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
    || (trimmedValue.startsWith('\'') && trimmedValue.endsWith('\''))
  ) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
};

const smtpHost = normalizeSmtpCredential(process.env.SMTP_HOST);
const smtpUser = normalizeSmtpCredential(process.env.SMTP_USER);
const smtpPass = normalizeSmtpCredential(process.env.SMTP_PASS);
const smtpFrom = typeof process.env.SMTP_FROM === 'string' && process.env.SMTP_FROM.trim()
  ? process.env.SMTP_FROM.trim()
  : (smtpUser || 'no-reply@instrevi.com');
const configuredPort = Number(process.env.SMTP_PORT) || 465;
const configuredSmtpDnsFamily = Number(process.env.SMTP_DNS_FAMILY);
const smtpDnsFamily = configuredSmtpDnsFamily === 4 || configuredSmtpDnsFamily === 6
  ? configuredSmtpDnsFamily
  : null;

const recipient = typeof process.argv[2] === 'string' ? process.argv[2].trim() : '';

const maskEmail = (value) => {
  const email = typeof value === 'string' ? value.trim() : '';
  if (!email || !email.includes('@')) return '(invalid-email)';

  const [localPart, domainPart] = email.split('@');
  const maskedLocalPart = localPart.length <= 2
    ? `${localPart.charAt(0) || '*'}*`
    : `${localPart.slice(0, 2)}***`;

  return `${maskedLocalPart}@${domainPart}`;
};

if (!smtpHost) {
  console.error('[smtp:test] Missing SMTP_HOST');
  process.exit(1);
}

const hasSmtpAuth = Boolean(smtpUser && smtpPass);
const hasPartialSmtpAuth = Boolean(smtpUser || smtpPass) && !hasSmtpAuth;

if (hasPartialSmtpAuth) {
  console.error('[smtp:test] SMTP auth is partially configured. Set both SMTP_USER and SMTP_PASS, or neither.');
  process.exit(1);
}

const ports = Array.from(new Set(
  configuredPort === 465 ? [465, 587] : configuredPort === 587 ? [587, 465] : [configuredPort]
));

const createTransport = (port) => {
  const secure = port === 465;
  return nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    requireTLS: !secure,
    ...(smtpDnsFamily ? { family: smtpDnsFamily } : {}),
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 8000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 8000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 15000,
    ...(hasSmtpAuth ? {
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    } : {}),
    tls: {
      minVersion: 'TLSv1.2',
      servername: smtpHost
    }
  });
};

(async () => {
  let lastError = null;

  console.log(`[smtp:test] host=${smtpHost} ports=${ports.join(',')} family=${smtpDnsFamily || 'auto'} auth=${hasSmtpAuth ? 'enabled' : 'disabled'}`);
  if (hasSmtpAuth) {
    console.log(`[smtp:test] user=${maskEmail(smtpUser)}`);
  }

  for (const port of ports) {
    const label = `${smtpHost}:${port}`;
    const transporter = createTransport(port);

    try {
      console.log(`[smtp:test] Verifying connection via ${label}`);
      await transporter.verify();
      console.log(`[smtp:test] Connection verified via ${label}`);

      if (recipient) {
        const subject = `Instrevi SMTP test (${new Date().toISOString()})`;
        const text = `This is a test message from Instrevi SMTP diagnostics via ${label}.`;
        const html = `<p>This is a test message from Instrevi SMTP diagnostics via <strong>${label}</strong>.</p>`;

        console.log(`[smtp:test] Sending test email to ${maskEmail(recipient)} via ${label}`);
        await transporter.sendMail({
          from: smtpFrom,
          to: recipient,
          subject,
          text,
          html
        });
        console.log(`[smtp:test] Test email accepted via ${label}`);
      } else {
        console.log('[smtp:test] No recipient provided. Verification-only mode succeeded.');
      }

      process.exit(0);
    } catch (error) {
      lastError = error;
      console.error(`[smtp:test] Failed via ${label}:`, error?.message || error);
    }
  }

  console.error('[smtp:test] All SMTP test attempts failed.');
  if (lastError) {
    console.error('[smtp:test] Last error:', lastError?.message || lastError);
  }
  process.exit(1);
})();
