const express = require('express');
const router = express.Router();

const YTMP3_API = 'https://api-madrin.zone.id/download/ytmp3';
const YTMP3_KEY = 'test';

// Public Cobalt instances (fallback for video / TikTok downloads)
const COBALT_INSTANCES = [
  'https://cobalt.malvage.com',
  'https://cobalt.api.timelessnesses.me',
  'https://dwnld.nichindi.com',
  'https://cobalt.tools',
];

// POST /api/download
// Body: { url, mode }  mode = "audio" | "auto"
router.post('/', async (req, res) => {
  const { url, mode } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Use Madrin ytmp3 API for audio/song downloads from YouTube
  if (mode === 'audio') {
    try {
      const apiUrl = `${YTMP3_API}?apikey=${YTMP3_KEY}&url=${encodeURIComponent(url)}`;
      const r = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
      const data = await r.json();

      if (data && data.status === true && data.download_url) {
        return res.json({
          status:       'redirect',
          url:          data.download_url,
          title:        data.title || '',
          quality:      data.quality || '',
          source:       data.source || 'YouTube',
          downloadType: 'mp3',
        });
      }

      // ytmp3 API returned an error — surface it
      return res.status(502).json({
        error: data.error || 'Song download failed. The video may be unavailable or too long.',
      });
    } catch (e) {
      return res.status(502).json({ error: 'Song download service timed out. Please try again.' });
    }
  }

  // Fallback: Cobalt for video / TikTok downloads
  const payload = JSON.stringify({
    url,
    videoQuality:  '720',
    audioFormat:   'mp3',
    downloadMode:  'auto',
    filenameStyle: 'pretty',
  });

  for (const instance of COBALT_INSTANCES) {
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
});

module.exports = router;
