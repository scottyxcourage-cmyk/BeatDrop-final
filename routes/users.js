const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { adjustWalletBalance, getUserBalance } = require('../utils/wallet');

// GET /api/users/me
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

// PUT /api/users/me
router.put('/me', protect, asyncHandler(async (req, res) => {
  const { username, bio, avatar } = req.body;
  if (username) {
    const taken = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ? AND id != ?',
      args: [username, req.user.id]
    });
    if (taken.rows.length > 0)
      return res.status(400).json({ message: 'Username already taken' });
  }
  await db.execute({
    sql: `UPDATE users SET
            username = COALESCE(?, username),
            bio = COALESCE(?, bio),
            avatar = COALESCE(?, avatar)
          WHERE id = ?`,
    args: [username || null, bio !== undefined ? bio : null, avatar !== undefined ? avatar : null, req.user.id]
  });
  const result = await db.execute({
    sql: 'SELECT id, username, email, role, avatar, bio, wallet_balance, is_verified FROM users WHERE id = ?',
    args: [req.user.id]
  });
  res.json({ message: 'Profile updated', user: result.rows[0] });
}));

// PUT /api/users/me/password
router.put('/me/password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: 'Current and new password required' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });

  const result = await db.execute({
    sql: 'SELECT password FROM users WHERE id = ?',
    args: [req.user.id]
  });
  const user = result.rows[0];
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match)
    return res.status(400).json({ message: 'Current password is incorrect' });

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.execute({
    sql: 'UPDATE users SET password = ? WHERE id = ?',
    args: [hashed, req.user.id]
  });
  res.json({ message: 'Password changed successfully!' });
}));

// GET /api/users/wallet
router.get('/wallet', protect, asyncHandler(async (req, res) => {
  const balance = await getUserBalance(req.user.id);
  const txns = await db.execute({
    sql: 'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    args: [req.user.id]
  });
  res.json({ balance: balance || 0, transactions: txns.rows });
}));

// POST /api/users/wallet/spend
router.post('/wallet/spend', protect, asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  const result = await adjustWalletBalance(req.user.id, 'spend', amount, description);
  if (result.error) return res.status(result.status).json({ message: result.error });
  res.json({ message: 'Payment successful', balance: result.balance });
}));

// GET /api/users — admin only
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const result = await db.execute(
    'SELECT id, username, email, role, avatar, bio, wallet_balance, is_verified, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(result.rows);
}));

// DELETE /api/users/:id — admin only
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'User deleted' });
}));

module.exports = router;
