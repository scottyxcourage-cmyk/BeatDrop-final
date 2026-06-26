const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { adjustWalletBalance } = require('../utils/wallet');

router.use(protect, adminOnly);

// ── USERS ─────────────────────────────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const result = await db.execute(
    'SELECT id, username, email, role, avatar, bio, wallet_balance, is_verified, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ users: result.rows });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'User deleted' });
}));

router.put('/users/:id/role', asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  await db.execute({ sql: 'UPDATE users SET role = ? WHERE id = ?', args: [role, req.params.id] });
  res.json({ message: 'Role updated' });
}));

// ── WALLET ────────────────────────────────────────
router.post('/wallet/topup', asyncHandler(async (req, res) => {
  const { userId, amount, description } = req.body;
  if (!userId || !amount || isNaN(amount)) return res.status(400).json({ message: 'userId and amount required' });
  const result = await adjustWalletBalance(userId, 'topup', amount, description || 'Admin top-up');
  if (result.error) return res.status(result.status).json({ message: result.error });
  res.json({ message: 'Wallet topped up', balance: result.balance });
}));

router.post('/wallet/deduct', asyncHandler(async (req, res) => {
  const { userId, amount, description } = req.body;
  if (!userId || !amount || isNaN(amount)) return res.status(400).json({ message: 'userId and amount required' });
  const result = await adjustWalletBalance(userId, 'deduct', amount, description || 'Admin deduction');
  if (result.error) return res.status(result.status).json({ message: result.error });
  res.json({ message: 'Wallet deducted', balance: result.balance });
}));

// ── NEWS ──────────────────────────────────────────
router.get('/news', asyncHandler(async (req, res) => {
  const result = await db.execute('SELECT * FROM news ORDER BY created_at DESC');
  res.json({ news: result.rows });
}));

router.post('/news', asyncHandler(async (req, res) => {
  const { title, body, icon, color, category } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'title and body required' });
  const id = uuidv4();
  await db.execute({
    sql: 'INSERT INTO news (id, title, body, icon, color, category, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, title, body, icon || 'newspaper', color || '#00ffcc', category || 'general', req.user.id]
  });
  const result = await db.execute({ sql: 'SELECT * FROM news WHERE id = ?', args: [id] });
  res.status(201).json({ message: 'News created', news: result.rows[0] });
}));

router.put('/news/:id', asyncHandler(async (req, res) => {
  const { title, body, icon, color, category } = req.body;
  await db.execute({
    sql: 'UPDATE news SET title=COALESCE(?,title), body=COALESCE(?,body), icon=COALESCE(?,icon), color=COALESCE(?,color), category=COALESCE(?,category) WHERE id=?',
    args: [title||null, body||null, icon||null, color||null, category||null, req.params.id]
  });
  const result = await db.execute({ sql: 'SELECT * FROM news WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'News updated', news: result.rows[0] });
}));

router.delete('/news/:id', asyncHandler(async (req, res) => {
  await db.execute({ sql: 'DELETE FROM news WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'News deleted' });
}));

// ── POSTS ─────────────────────────────────────────
router.get('/posts', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: `SELECT p.id, p.content, p.media_url, p.created_at,
                 u.id as author_id, u.username as author_username
          FROM posts p JOIN users u ON p.author_id = u.id
          ORDER BY p.created_at DESC LIMIT 100`
  });
  res.json({ posts: result.rows });
}));

router.delete('/posts/:id', asyncHandler(async (req, res) => {
  await db.execute({ sql: 'DELETE FROM posts WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'Post deleted' });
}));

router.post('/posts', asyncHandler(async (req, res) => {
  const { content, mediaUrl } = req.body;
  if (!content) return res.status(400).json({ message: 'Content required' });
  const id = uuidv4();
  await db.execute({
    sql: 'INSERT INTO posts (id, author_id, content, media_url) VALUES (?, ?, ?, ?)',
    args: [id, req.user.id, content, mediaUrl || '']
  });
  res.status(201).json({ message: 'Post created', id });
}));

// ── STATS ─────────────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const users = await db.execute('SELECT COUNT(*) as total FROM users');
  const verified = await db.execute('SELECT COUNT(*) as total FROM users WHERE is_verified=1');
  const posts = await db.execute('SELECT COUNT(*) as total FROM posts');
  const news = await db.execute('SELECT COUNT(*) as total FROM news');
  const totalCops = await db.execute('SELECT COALESCE(SUM(wallet_balance),0) as total FROM users');
  res.json({
    totalUsers: users.rows[0].total,
    verifiedUsers: verified.rows[0].total,
    totalPosts: posts.rows[0].total,
    totalNews: news.rows[0].total,
    totalCopsInCirculation: totalCops.rows[0].total
  });
}));

// ── ANNOUNCEMENTS ─────────────────────────────────
router.post('/announce', asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Content required' });
  await db.execute({ sql: 'UPDATE posts SET pinned=0 WHERE pinned=1' });
  const id = uuidv4();
  await db.execute({
    sql: 'INSERT INTO posts (id, author_id, content, media_url, pinned) VALUES (?, ?, ?, ?, 1)',
    args: [id, req.user.id, content, '']
  });
  res.status(201).json({ message: 'Announcement posted', id });
}));

module.exports = router;
