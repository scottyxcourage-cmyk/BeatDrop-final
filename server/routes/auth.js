'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { sendVerificationEmail, sendResetEmail } = require('../email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'insecure-dev-secret-change-me';
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000;        // 1h
const COOKIE_NAME = 'sh_session';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
});
router.use(authLimiter);

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    verified: !!row.verified,
    joined: new Date(row.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  };
}

function setSessionCookie(res, user) {
  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- middleware: requires a logged-in session ---
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
    if (!user) return res.status(401).json({ error: 'Session invalid.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

// ---------- SIGNUP ----------
router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) return res.status(400).json({ error: 'Please fill in all fields.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 11);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    // Create user as verified=1 so they can log in immediately
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, verified, verify_token, verify_expires, created_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run(name, email, hash, verifyToken, now + VERIFY_TTL_MS, now);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Log them in immediately
    setSessionCookie(res, user);

    // Send welcome/verification email in background — don't wait for it
    sendVerificationEmail(email, name, verifyToken).catch(err =>
      console.error('[email] welcome email failed:', err.message)
    );

    res.status(201).json({
      message: `Welcome, ${name}! A verification email has been sent to ${email}.`,
      user: publicUser(user)
    });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// ---------- VERIFY EMAIL ----------
router.get('/verify', (req, res) => {
  const token = String(req.query.token || '');
  if (!token) return res.status(400).json({ error: 'Missing verification token.' });

  const user = db.prepare('SELECT * FROM users WHERE verify_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or already-used verification link.' });
  if (user.verify_expires < Date.now()) return res.status(400).json({ error: 'This verification link has expired. Please request a new one.' });

  db.prepare('UPDATE users SET verified = 1, verify_token = NULL, verify_expires = NULL WHERE id = ?').run(user.id);
  res.json({ message: 'Email verified! You can now sign in.' });
});

// ---------- RESEND VERIFICATION ----------
router.post('/resend-verification', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Always respond the same way to avoid leaking which emails exist
  const genericMsg = { message: 'If that account exists and is unverified, a new verification email has been sent.' };
  if (!user || user.verified) return res.json(genericMsg);

  const verifyToken = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET verify_token = ?, verify_expires = ? WHERE id = ?')
    .run(verifyToken, Date.now() + VERIFY_TTL_MS, user.id);

  await sendVerificationEmail(user.email, user.name, verifyToken);
  res.json(genericMsg);
});

// ---------- LOGIN ----------
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Please fill in all fields.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'No account found. Create one first.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect password. Try again.' });

    setSessionCookie(res, user);
    res.json({ message: 'Welcome back!', user: publicUser(user) });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
});

// ---------- FORGOT PASSWORD ----------
router.post('/forgot', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const genericMsg = { message: 'If that account exists, a reset link has been sent.' };
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.json(genericMsg);

  const resetToken = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?')
    .run(resetToken, Date.now() + RESET_TTL_MS, user.id);

  await sendResetEmail(user.email, user.name, resetToken);
  res.json(genericMsg);
});

// ---------- RESET PASSWORD ----------
router.post('/reset', async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!token || !password) return res.status(400).json({ error: 'Missing token or password.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or already-used reset link.' });
  if (user.reset_expires < Date.now()) return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

  const hash = await bcrypt.hash(password, 11);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Password updated! You can now sign in.' });
});

// ---------- ME / LOGOUT ----------
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Signed out.' });
});

module.exports = { router, requireAuth };
