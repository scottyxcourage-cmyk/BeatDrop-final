const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Public Cobalt instances that support the new v7+ API
const INSTANCES = [
  'https://cobalt.malvage.com',
  'https://cobalt.api.timelessnesses.me',
  'https://dwnld.nichindi.com',
  'https://cobalt.tools',
];

// Allowed URL patterns for download (prevent SSRF to internal networks)
function isAllowedUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    // Block internal/private network addresses
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false;
    if (host.endsWith('.local') || host.endsWith('.internal')) return false;
    return true;
  } catch {
    return false;
  }
}

// POST /api/download (auth required)
// Body: { url, mode }  mode = "audio" | "auto"
router.post('/', protect, async (req, res) => {
  const { url, mode } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!isAllowedUrl(url)) return res.status(400).json({ error: 'Invalid or disallowed URL' });

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
      // Accept any non-error response
      if (data && data.status && data.status !== 'error') {
        return res.json(data);
      }
    } catch (e) {
      // Try next instance
    }
  }

  res.status(502).json({ error: 'All download instances are currently unavailable. Try again shortly.' });
});

module.exports = router;
