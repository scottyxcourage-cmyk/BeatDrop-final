const express = require('express');
const router = express.Router();
const { searchLimiter } = require('../middleware/rateLimiter');
const { fetchWithRetry, buildApiUrl } = require('../utils/apiClient');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Search/download music
router.get('/download', searchLimiter, async (req, res, next) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: 400,
        error: 'Missing required parameter: url'
      });
    }

    const apiUrl = buildApiUrl('/download/ytmp3', { url });
    const result = await fetchWithRetry(apiUrl);

    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

// Search music (proxy to avoid CORS issues on client)
router.get('/search', searchLimiter, async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: 400,
        error: 'Missing required parameter: q (search query)'
      });
    }

    const apiUrl = buildApiUrl('/download/ytmp3', { url: q });
    const result = await fetchWithRetry(apiUrl);

    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
