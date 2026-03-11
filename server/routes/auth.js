const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const router = express.Router();
const DEFAULT_FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://www.instrevi.com'
  : 'http://localhost:3000';
const PRODUCTION_ALLOWED_FRONTEND_HOSTS = new Set(['www.instrevi.com', 'instrevi.com']);

const resolveFrontendBaseUrl = () => {
  const configuredValue = typeof process.env.FRONTEND_URL === 'string'
    ? process.env.FRONTEND_URL.trim()
    : '';

  if (process.env.NODE_ENV === 'production') {
    if (!configuredValue) {
      console.warn('[auth] FRONTEND_URL is not set in production; using https://www.instrevi.com for email links.');
      return DEFAULT_FRONTEND_URL;
    }

    try {
      const parsed = new URL(configuredValue);
      const parsedHost = parsed.hostname.toLowerCase();
      const parsedPath = parsed.pathname.toLowerCase();
      const hasSupportedProtocol = parsed.protocol === 'https:';
      const isAllowedProductionHost = PRODUCTION_ALLOWED_FRONTEND_HOSTS.has(parsedHost);
      const isVercelDeployHook = parsedHost === 'api.vercel.com'
        && parsedPath.includes('/v1/integrations/deploy');
      const isVercelDashboardDeployLink = parsedHost === 'vercel.com'
        && parsedPath.includes('/integrations/deploy');

      if (!hasSupportedProtocol || !isAllowedProductionHost || isVercelDeployHook || isVercelDashboardDeployLink) {
        console.warn('[auth] FRONTEND_URL is invalid for production email links; forcing https://www.instrevi.com.');
      }
    } catch {
      console.warn('[auth] FRONTEND_URL is malformed in production; forcing https://www.instrevi.com.');
    }

    return DEFAULT_FRONTEND_URL;
  }

  if (!configuredValue) {
    return DEFAULT_FRONTEND_URL;
  }

  try {
    const parsed = new URL(configuredValue);
    const hasSupportedProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const parsedHost = parsed.hostname.toLowerCase();
    const parsedPath = parsed.pathname.toLowerCase();
    const isVercelDeployHook = parsedHost === 'api.vercel.com'
      && parsedPath.includes('/v1/integrations/deploy');
    const isVercelDashboardDeployLink = parsedHost === 'vercel.com'
      && parsedPath.includes('/integrations/deploy');
    const isInvalidProductionHost = process.env.NODE_ENV === 'production'
      && !PRODUCTION_ALLOWED_FRONTEND_HOSTS.has(parsedHost);

    if (!hasSupportedProtocol || isVercelDeployHook || isVercelDashboardDeployLink || isInvalidProductionHost) {
      console.warn('[auth] FRONTEND_URL is invalid for user-facing links; falling back to a safe default.');
      return DEFAULT_FRONTEND_URL;
    }

    return parsed.origin;
  } catch {
    console.warn('[auth] FRONTEND_URL is malformed; falling back to a safe default.');
    return DEFAULT_FRONTEND_URL;
  }
};

const frontendBaseUrl = resolveFrontendBaseUrl();
const createVerifyUrl = (token) => `${frontendBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
const smtpHost = typeof process.env.SMTP_HOST === 'string' ? process.env.SMTP_HOST.trim() : '';
const smtpUser = typeof process.env.SMTP_USER === 'string' ? process.env.SMTP_USER.trim() : '';
const smtpPass = typeof process.env.SMTP_PASS === 'string' ? process.env.SMTP_PASS : '';
const resendApiKey = typeof process.env.RESEND_API_KEY === 'string' ? process.env.RESEND_API_KEY.trim() : '';
const hasResendConfigured = Boolean(resendApiKey);
const resendApiUrl = 'https://api.resend.com/emails';
const useResendAsPrimary = hasResendConfigured && process.env.EMAIL_PROVIDER !== 'smtp';
const resendFromAddress = (() => {
  const configuredFrom = typeof process.env.RESEND_FROM === 'string' ? process.env.RESEND_FROM.trim() : '';
  if (configuredFrom) {
    return configuredFrom;
  }

  const smtpFrom = typeof process.env.SMTP_FROM === 'string' ? process.env.SMTP_FROM.trim() : '';
  return smtpFrom || smtpUser || 'no-reply@instrevi.com';
})();
const configuredSmtpPort = Number(process.env.SMTP_PORT) || 465;
const hasSmtpAuth = Boolean(smtpUser && smtpPass);
const hasPartialSmtpAuth = Boolean(smtpUser || smtpPass) && !hasSmtpAuth;
const isSmtpConfigured = Boolean(smtpHost);
const canSendSmtp = isSmtpConfigured && !hasPartialSmtpAuth;

const smtpHosts = (() => {
  if (!smtpHost) {
    return [];
  }

  const hosts = [smtpHost];
  const lowerHost = smtpHost.toLowerCase();

  if (lowerHost === 'smtp.office365.com') {
    hosts.push('smtp-mail.outlook.com');
  } else if (lowerHost === 'smtp-mail.outlook.com') {
    hosts.push('smtp.office365.com');
  }

  return Array.from(new Set(hosts));
})();

const smtpPorts = (() => {
  const ports = [configuredSmtpPort];

  if (configuredSmtpPort === 587) {
    ports.push(465);
  } else if (configuredSmtpPort === 465) {
    ports.push(587);
  }

  return Array.from(new Set(ports));
})();

const maskEmail = (value) => {
  const email = typeof value === 'string' ? value.trim() : '';
  if (!email || !email.includes('@')) return '(invalid-email)';

  const [localPart, domainPart] = email.split('@');
  const maskedLocalPart = localPart.length <= 2
    ? `${localPart.charAt(0) || '*'}*`
    : `${localPart.slice(0, 2)}***`;

  return `${maskedLocalPart}@${domainPart}`;
};

const createRandomToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createSmtpTransporter = (host, port) => {
  const secure = port === 465;

  return nodemailer.createTransport({
  host,
  port,
  secure,
  requireTLS: !secure,
  family: 4,
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
    servername: host
  }
  });
};

const smtpTransports = canSendSmtp
  ? smtpHosts.flatMap((host) => smtpPorts.map((port) => ({
    host,
    port,
    label: `${host}:${port}`,
    transporter: createSmtpTransporter(host, port)
  })))
  : [];
const isProductionEnv = process.env.NODE_ENV === 'production';
const isEmailTransportConfigured = () => smtpTransports.length > 0 || hasResendConfigured;

if (process.env.NODE_ENV !== 'test') {
  if (!isSmtpConfigured) {
    console.warn('[auth] SMTP disabled. Missing env vars: SMTP_HOST');
  } else if (hasPartialSmtpAuth) {
    console.warn('[auth] SMTP auth is partially configured. Set both SMTP_USER and SMTP_PASS, or neither for host-only SMTP.');
  } else if (smtpTransports.length === 0) {
    console.warn('[auth] SMTP has no usable transports configured.');
  } else if (useResendAsPrimary) {
    console.log(`[auth] SMTP config loaded. hosts=${smtpHosts.join(', ')} ports=${smtpPorts.join(', ')} auth=${hasSmtpAuth ? 'enabled' : 'disabled'}`);
    console.log('[auth] SMTP verification skipped because Resend is configured as primary transport.');
  } else {
    console.log(`[auth] SMTP config loaded. hosts=${smtpHosts.join(', ')} ports=${smtpPorts.join(', ')} auth=${hasSmtpAuth ? 'enabled' : 'disabled'}`);
    (async () => {
      let verified = false;

      for (const entry of smtpTransports) {
        try {
          await entry.transporter.verify();
          console.log(`[auth] SMTP connection verified via ${entry.label}`);
          verified = true;
          break;
        } catch (smtpError) {
          console.error(`[auth] SMTP verification failed via ${entry.label}:`, smtpError?.message || 'Unknown SMTP error');
        }
      }

      if (!verified) {
        console.error('[auth] SMTP verification failed for all configured hosts');
      }
    })();
  }

  if (hasResendConfigured) {
    console.log('[auth] Resend API fallback is enabled.');
    console.log(`[auth] Email transport priority: ${useResendAsPrimary ? 'Resend first, SMTP fallback' : 'SMTP first, Resend fallback'}`);
  } else {
    console.log('[auth] Resend API fallback is disabled.');
  }

  console.log(`[auth] Email link base URL: ${frontendBaseUrl}`);
}

async function sendViaResendApi(to, subject, text, html) {
  if (!hasResendConfigured) {
    throw new Error('Resend API is not configured');
  }

  const response = await fetch(resendApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFromAddress,
      to: [to],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API ${response.status}: ${errorText.slice(0, 200)}`);
  }
}

async function sendEmail(to, subject, text, html) {
  if (!smtpTransports.length && !hasResendConfigured) {
    console.warn(`[auth] SMTP not configured — skipping sendEmail to ${maskEmail(to)}`);
    return;
  }

  const fromAddress = process.env.SMTP_FROM || smtpUser || 'no-reply@instrevi.com';
  let lastError = null;

  const attemptResend = async () => {
    if (!hasResendConfigured) {
      return false;
    }

    try {
      console.log(`[auth] Attempting email send via Resend API to ${maskEmail(to)} | subject="${subject}"`);
      await sendViaResendApi(to, subject, text, html);
      console.log(`[auth] Email send accepted via Resend API for ${maskEmail(to)}`);
      return true;
    } catch (resendError) {
      lastError = resendError;
      console.error('[auth] Email send attempt failed via Resend API:', resendError?.message || resendError);
      return false;
    }
  };

  if (useResendAsPrimary) {
    const resendSucceeded = await attemptResend();
    if (resendSucceeded) {
      return;
    }
  }

  for (const entry of smtpTransports) {
    try {
      console.log(`[auth] Attempting email send via ${entry.label} to ${maskEmail(to)} | subject="${subject}"`);

      await entry.transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html
      });

      console.log(`[auth] Email send accepted via ${entry.label} for ${maskEmail(to)}`);
      return;
    } catch (smtpError) {
      lastError = smtpError;
      console.error(`[auth] Email send attempt failed via ${entry.label}:`, smtpError?.message || smtpError);
    }
  }

  if (!useResendAsPrimary) {
    const resendSucceeded = await attemptResend();
    if (resendSucceeded) {
      return;
    }
  }

  throw lastError || new Error('All SMTP send attempts failed');
}

async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return true; // skip verification when secret not provided

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const data = await res.json();
  return data.success === true;
}


// Register (now supports name fields and email verification token)
router.post('/register', async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : '';
    const middleName = typeof req.body?.middleName === 'string' ? req.body.middleName.trim() : '';
    const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : '';
    const termsAccepted = req.body?.termsAccepted === true;

    if (!username || !email || !password || !firstName || !middleName || !lastName) {
      return res.status(400).json({ message: 'All signup fields are required' });
    }

    if (!termsAccepted) {
      return res.status(400).json({ message: 'You must accept the Terms & Conditions' });
    }

    if (isProductionEnv && !isEmailTransportConfigured()) {
      return res.status(503).json({ message: 'Verification email service is temporarily unavailable. Please try again later.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // create email verification token (dev-friendly)
    const verificationToken = createRandomToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create user
    const user = new User({
      username,
      firstName,
      middleName,
      lastName,
      email,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpires: verificationExpires
    });

    await user.save();

    const verifyUrl = createVerifyUrl(verificationToken);

    let verificationEmailSent = false;

    // Send verification email (and return token/url in non-production for dev)
    try {
      await sendEmail(user.email, 'Verify your Instrevi account', `Visit ${verifyUrl} to verify your email.`, `<p>Click <a href=\"${verifyUrl}\">here</a> to verify your email for Instrevi.</p><p>If you did not sign up, ignore this email.</p>`);
      verificationEmailSent = true;
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    if (isProductionEnv && !verificationEmailSent) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (cleanupErr) {
        console.error('[auth] Failed to rollback user after verification email send failure:', cleanupErr?.message || cleanupErr);
      }

      return res.status(503).json({ message: 'Verification email service is temporarily unavailable. Please try again later.' });
    }

    const responsePayload = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified || false,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin || false,
        isBanned: user.isBanned || false
      }
    };

    const blockUnverifiedLogin = process.env.BLOCK_UNVERIFIED_LOGIN === 'true';
    const canIssueAuthToken = !blockUnverifiedLogin || user.emailVerified;

    if (canIssueAuthToken) {
      responsePayload.token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
      );
    } else {
      responsePayload.requiresEmailVerification = true;
    }

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.verificationToken = verificationToken;
      responsePayload.verifyUrl = verifyUrl;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerificationExpires: { $gt: new Date() },
      $or: [
        { emailVerificationToken: tokenHash },
        { emailVerificationToken: token }
      ]
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (isProductionEnv && !isEmailTransportConfigured()) {
      return res.status(503).json({ message: 'Verification email service is temporarily unavailable. Please try again later.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[auth] Resend verification skipped: user not found for ${maskEmail(email)}`);
      return res.status(200).json({ message: 'If that email exists, verification instructions were sent.' });
    }

    if (user.emailVerified) {
      console.log(`[auth] Resend verification skipped: already verified for ${maskEmail(email)}`);
      return res.status(200).json({ message: 'If that email exists, verification instructions were sent.' });
    }

    const verificationToken = createRandomToken();
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = createVerifyUrl(verificationToken);

    try {
      await sendEmail(
        email,
        'Verify your Instrevi account',
        `Visit ${verifyUrl} to verify your email.`,
        `<p>Click <a href=\"${verifyUrl}\">here</a> to verify your email for Instrevi.</p><p>If you did not sign up, ignore this email.</p>`
      );
    } catch (emailErr) {
      console.error(`[auth] Failed to send verification email to ${maskEmail(email)}:`, emailErr?.message || emailErr);
    }

    const resp = { message: 'If that email exists, verification instructions were sent.' };
    if (process.env.NODE_ENV !== 'production') {
      resp.verificationToken = verificationToken;
      resp.verifyUrl = verifyUrl;
    }

    return res.json(resp);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password - create reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[auth] Forgot password skipped: user not found for ${maskEmail(email)}`);
      return res.status(200).json({ message: 'If that email exists you will receive reset instructions' });
    }

    const resetToken = createRandomToken();
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email and (in dev) return token in response for convenience
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${resetToken}`;

    try {
      await sendEmail(email, 'Instrevi password reset', `Visit ${resetUrl} to reset your password.`, `<p>Click <a href=\"${resetUrl}\">here</a> to reset your password for Instrevi.</p>`);
    } catch (emailErr) {
      console.error(`[auth] Failed to send reset email to ${maskEmail(email)}:`, emailErr?.message || emailErr);
    }

    console.log(`Password reset token for ${email}: ${resetToken}`);
    const resp = { message: 'If that email exists you will receive reset instructions' };
    if (process.env.NODE_ENV !== 'production') {
      resp.resetToken = resetToken;
      resp.resetUrl = resetUrl;
    }
    res.json(resp);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      resetPasswordExpires: { $gt: new Date() },
      $or: [
        { resetPasswordToken: tokenHash },
        { resetPasswordToken: token }
      ]
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(password, 12);
    user.password = hashed;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const recaptchaToken = req.body?.recaptchaToken;
    const recaptchaRequired = process.env.RECAPTCHA_REQUIRED === 'true';

    if (!email || !password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // reCAPTCHA can be enforced with RECAPTCHA_REQUIRED=true.
    // If only RECAPTCHA_SECRET is set, verification is optional and only runs when token is provided.
    if (recaptchaRequired) {
      if (!recaptchaToken) return res.status(400).json({ message: 'Captcha token missing' });
      const ok = await verifyRecaptcha(recaptchaToken);
      if (!ok) return res.status(400).json({ message: 'Captcha verification failed' });
    } else if (process.env.RECAPTCHA_SECRET && recaptchaToken) {
      const ok = await verifyRecaptcha(recaptchaToken);
      if (!ok) return res.status(400).json({ message: 'Captcha verification failed' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Block login until email verified (configurable by env)
    if (process.env.BLOCK_UNVERIFIED_LOGIN === 'true' && !user.emailVerified) {
      return res.status(403).json({ message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        email: user.email,
        emailVerified: user.emailVerified || false,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin || false,
        isBanned: user.isBanned || false
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate active auth session
router.get('/session', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('username firstName middleName lastName email emailVerified profilePicture isAdmin isBanned followers following');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        email: user.email,
        emailVerified: user.emailVerified || false,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin || false,
        isBanned: user.isBanned || false,
        followers: user.followers || [],
        following: user.following || [],
        followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
        followingCount: Array.isArray(user.following) ? user.following.length : 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
