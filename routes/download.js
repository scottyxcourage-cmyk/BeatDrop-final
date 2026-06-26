const express = require('express');
const router = express.Router();

const MADRIN_BASE = 'https://api-madrin.zone.id/download/ytmp3';
const MADRIN_KEY  = process.env.MADRIN_API_KEY || 'test';

// Public Cobalt instances (fallback for video/non-audio downloads)
const COBALT_INSTANCES = [
  'https://cobalt.malvage.com',
  'https://cobalt.api.timelessnesses.me',
  'https://dwnld.nichindi.com',
  'https://cobalt.tools',
];

// Try the Madrin ytmp3 API for audio downloads
async function tryMadrinDownload(url) {
  const apiUrl = `${MADRIN_BASE}?apikey=${encodeURIComponent(MADRIN_KEY)}&url=${encodeURIComponent(url)}`;
  const r = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) {
    throw new Error(`Madrin API HTTP ${r.status}`);
  }
  const data = await r.json();
  if (!data.status) {
    throw new Error(data.error || 'Madrin API returned unsuccessful status');
  }
  return data;
}

// Try Cobalt instances as fallback
async function tryCobaltDownload(url, mode) {
  const payload = JSON.stringify({
    url,
    videoQuality:  '720',
    audioFormat:   'mp3',
    downloadMode:  mode === 'audio' ? 'audio' : 'auto',
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
      try { data = JSON.parse(text); } catch (parseErr) {
        console.warn(`Download instance ${instance}: non-JSON response`);
        continue;
      }
      if (data && data.status && data.status !== 'error') {
        return data;
      }
    } catch (e) {
      console.warn(`Download instance ${instance} failed:`, e.message);
    }
  }
  return null;
}

// POST /api/download
// Body: { url, mode }  mode = "audio" | "auto"
router.post('/', async (req, res) => {
  const { url, mode } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // For audio mode, try the Madrin ytmp3 API first
  if (mode === 'audio') {
    try {
      const data = await tryMadrinDownload(url);
      return res.json(data);
    } catch (e) {
      console.warn('Madrin download failed, falling back to Cobalt:', e.message);
    }
  }

  // Fallback to Cobalt instances for video or if Madrin failed
  const cobaltResult = await tryCobaltDownload(url, mode);
  if (cobaltResult) {
    return res.json(cobaltResult);
  }

  res.status(502).json({ error: 'All download services are currently unavailable. Try again shortly.' });
});

module.exports = router;
