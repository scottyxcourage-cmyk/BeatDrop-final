const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');

const INSTANCES = [
  'https://cobalt.malvage.com',
  'https://cobalt.api.timelessnesses.me',
  'https://dwnld.nichindi.com',
  'https://cobalt.tools',
];

// POST /api/download
router.post('/', asyncHandler(async (req, res) => {
  const { url, mode } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const payload = JSON.stringify({
    url,
    videoQuality:  '720',
    audioFormat:   'mp3',
    downloadMode:  mode === 'audio' ? 'audio' : 'auto',
    filenameStyle: 'pretty',
  });

  for (const instance of INSTANCES) {
    try {
      const r = await fetch(`${instance}/`, {
        method:  'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body:    payload,
        signal:  AbortSignal.timeout(12000),
      });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { continue; }
      if (data && data.status && data.status !== 'error') {
        return res.json(data);
      }
    } catch (e) {
      // Try next instance
    }
  }

  res.status(502).json({ error: 'All download instances are currently unavailable. Try again shortly.' });
}));

module.exports = router;
