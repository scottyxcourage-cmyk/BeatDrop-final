const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { sendOTP, sendVerification } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { generateOTP, generateToken, otpExpiry, ensureAdmin, validateEmail } = require('../utils/auth-helpers');
const { formatUserResponse } = require('../utils/formatters');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
router.post('/google', asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  const { email, name, picture } = payload;

  if (!email) return res.status(400).json({ message: 'Google account has no email' });

  const existing = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email.toLowerCase()]
  });

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    await ensureAdmin(email, user.id);
    const updated = await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [user.id] });
    const u = updated.rows[0];
    return res.json({ token: generateToken(u.id), user: formatUserResponse(u) });
  }

  const id = uuidv4();
  let baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 18) || 'user';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const username = `${baseUsername}${suffix}`;
  const placeholderHash = await bcrypt.hash(uuidv4(), 10);

  await db.execute({
    sql: `INSERT INTO users (id, username, email, password, avatar, is_verified) VALUES (?, ?, ?, ?, ?, 1)`,
    args: [id, username, email.toLowerCase(), placeholderHash, picture || '']
  });

  await ensureAdmin(email, id);
  const updated = await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [id] });
  const u = updated.rows[0];
  return res.status(201).json({ token: generateToken(id), user: formatUserResponse(u) });
}));

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  const emailOk = await validateEmail(email);
  if (!emailOk)
    return res.status(400).json({ message: 'Please use a valid, non-disposable email address.' });

  const exists = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ? OR username = ?',
    args: [email.toLowerCase(), username]
  });
  if (exists.rows.length > 0)
    return res.status(400).json({ message: 'Email or username already taken' });

  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOTP();

  await db.execute({
    sql: `INSERT INTO users (id, username, email, password, otp_code, otp_expires) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, username, email.toLowerCase(), hashedPassword, otp, otpExpiry()]
  });

  let emailSent = true;
  try {
    await sendVerification(email, username, otp);
  } catch (emailErr) {
    console.error('Email send failed:', emailErr.message);
    emailSent = false;
  }

  res.status(201).json({
    message: emailSent
      ? 'Registered! Check your email for the verification code.'
      : 'Registered! However, verification email could not be sent. Please try resending it from the login page.',
    userId: id
  });
}));

// POST /api/auth/verify
router.post('/verify', asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] });

  if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
  const user = result.rows[0];

  if (user.is_verified) return res.status(400).json({ message: 'Already verified' });
  if (!user.otp_code || user.otp_code !== otp || new Date() > new Date(user.otp_expires))
    return res.status(400).json({ message: 'Invalid or expired OTP' });

  await db.execute({
    sql: 'UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = ?',
    args: [userId]
  });

  await ensureAdmin(user.email, userId);
  const updated = await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [userId] });
  const u = updated.rows[0];
  res.json({
    message: 'Account verified!',
    token: generateToken(userId),
    user: formatUserResponse(u, { includeAvatar: false })
  });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email.toLowerCase()] });

  if (result.rows.length === 0)
    return res.status(401).json({ message: 'Invalid email or password' });

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid email or password' });

  if (!user.is_verified)
    return res.status(403).json({ message: 'Please verify your email first' });

  await ensureAdmin(email, user.id);
  const updated = await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [user.id] });
  const u = updated.rows[0];
  res.json({ token: generateToken(u.id), user: formatUserResponse(u) });
}));

// POST /api/auth/send-otp
router.post('/send-otp', asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email.toLowerCase()] });

  if (result.rows.length === 0)
    return res.status(404).json({ message: 'No account with that email' });

  const user = result.rows[0];
  const otp = generateOTP();

  await db.execute({
    sql: 'UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?',
    args: [otp, otpExpiry(), user.id]
  });

  let emailSent = true;
  try {
    await sendOTP(email, user.username, otp);
  } catch (emailErr) {
    console.error('OTP email failed:', emailErr.message);
    emailSent = false;
  }

  res.json({
    message: emailSent ? 'OTP sent!' : 'OTP generated but email failed to send. Check server SMTP config.',
    userId: user.id
  });
}));

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { userId, otp, newPassword } = req.body;
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] });

  if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
  const user = result.rows[0];

  if (!user.otp_code || user.otp_code !== otp || new Date() > new Date(user.otp_expires))
    return res.status(400).json({ message: 'Invalid or expired OTP' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.execute({
    sql: 'UPDATE users SET password = ?, otp_code = NULL, otp_expires = NULL WHERE id = ?',
    args: [hashedPassword, userId]
  });

  res.json({ message: 'Password reset successful!' });
}));

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;
