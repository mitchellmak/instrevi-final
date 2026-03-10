const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

const smtpHost = typeof process.env.SMTP_HOST === 'string' ? process.env.SMTP_HOST.trim() : '';
const smtpUser = typeof process.env.SMTP_USER === 'string' ? process.env.SMTP_USER.trim() : '';
const smtpPass = typeof process.env.SMTP_PASS === 'string' ? process.env.SMTP_PASS : '';
const hasSmtpAuth = Boolean(smtpUser && smtpPass);
const hasPartialSmtpAuth = Boolean(smtpUser || smtpPass) && !hasSmtpAuth;
const isSmtpConfigured = Boolean(smtpHost);

// Nodemailer transporter (uses SMTP_* env vars)
const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_PORT) === '465',
    ...(hasSmtpAuth ? {
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    } : {})
  })
  : null;

if (process.env.NODE_ENV !== 'test') {
  if (!isSmtpConfigured) {
    console.warn('[auth] SMTP disabled. Missing env vars: SMTP_HOST');
  } else if (hasPartialSmtpAuth) {
    console.warn('[auth] SMTP auth is partially configured. Set both SMTP_USER and SMTP_PASS, or neither for host-only SMTP.');
  } else {
    transporter.verify()
      .then(() => {
        console.log('[auth] SMTP connection verified');
      })
      .catch((smtpError) => {
        console.error('[auth] SMTP verification failed:', smtpError?.message || 'Unknown SMTP error');
      });
  }

  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    console.warn('[auth] FRONTEND_URL is not set in production; email links may point to localhost.');
  }
}

async function sendEmail(to, subject, text, html) {
  if (!transporter) {
    console.warn('SMTP not configured — skipping sendEmail');
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || smtpUser || 'no-reply@instrevi.com',
    to,
    subject,
    text,
    html
  });
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
    const verificationToken = require('crypto').randomBytes(20).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    // Create user
    const user = new User({
      username,
      firstName,
      middleName,
      lastName,
      email,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontend}/verify-email?token=${verificationToken}`;

    // Send verification email (and return token/url in non-production for dev)
    try {
      await sendEmail(user.email, 'Verify your Instrevi account', `Visit ${verifyUrl} to verify your email.`, `<p>Click <a href=\"${verifyUrl}\">here</a> to verify your email for Instrevi.</p><p>If you did not sign up, ignore this email.</p>`);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    const responsePayload = {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin || false,
        isBanned: user.isBanned || false
      }
    };

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
    const { token } = req.body;
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
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

    const user = await User.findOne({ email });

    if (!user || user.emailVerified) {
      return res.status(200).json({ message: 'If that email exists, verification instructions were sent.' });
    }

    const verificationToken = require('crypto').randomBytes(20).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontend}/verify-email?token=${verificationToken}`;

    try {
      await sendEmail(
        email,
        'Verify your Instrevi account',
        `Visit ${verifyUrl} to verify your email.`,
        `<p>Click <a href=\"${verifyUrl}\">here</a> to verify your email for Instrevi.</p><p>If you did not sign up, ignore this email.</p>`
      );
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
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
    if (!user) return res.status(200).json({ message: 'If that email exists you will receive reset instructions' });

    const resetToken = require('crypto').randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email and (in dev) return token in response for convenience
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontend}/reset-password?token=${resetToken}`;

    try {
      await sendEmail(email, 'Instrevi password reset', `Visit ${resetUrl} to reset your password.`, `<p>Click <a href=\"${resetUrl}\">here</a> to reset your password for Instrevi.</p>`);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
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
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
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
    const { email, password, recaptchaToken } = req.body;
    const recaptchaRequired = process.env.RECAPTCHA_REQUIRED === 'true';

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

    // Block login until email verified (configurable by env)
    if (process.env.BLOCK_UNVERIFIED_LOGIN === 'true' && !user.emailVerified) {
      return res.status(403).json({ message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
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
