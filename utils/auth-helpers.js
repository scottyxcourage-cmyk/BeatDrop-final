const jwt = require('jsonwebtoken');
const { db } = require('../db');

const ADMIN_EMAIL = 'maposacourage41@gmail.com';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const otpExpiry = () => new Date(Date.now() + 10 * 60 * 1000).toISOString();

const ensureAdmin = async (email, userId) => {
  if (email.toLowerCase() === ADMIN_EMAIL) {
    await db.execute({ sql: "UPDATE users SET role='admin' WHERE id=?", args: [userId] });
  }
};

const validateEmail = async (email) => {
  try {
    const res = await fetch(`https://rapid-email-verifier.fly.dev/verify?email=${encodeURIComponent(email)}`);
    if (!res.ok) return true;
    const data = await res.json();
    if (data.disposable === true) return false;
    if (data.valid === false) return false;
    return true;
  } catch {
    return true;
  }
};

module.exports = { ADMIN_EMAIL, generateOTP, generateToken, otpExpiry, ensureAdmin, validateEmail };
