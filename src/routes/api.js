const express = require('express');
const router = express.Router();
const { searchLimiter } = require('../middleware/rateLimiter');
const { searchYouTube, getDownloadInfo } = require('../utils/apiClient');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Download audio from a YouTube URL
router.get('/download', searchLimiter, async (req, res, next) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: 400,
        error: 'Missing required parameter: url'
      });
    }

    const result = await getDownloadInfo(url);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Search YouTube for music
router.get('/search', searchLimiter, async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        status: 400,
        error: 'Missing required parameter: q (search query)'
      });
    }

    const results = await searchYouTube(q, parseInt(limit) || 6);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
