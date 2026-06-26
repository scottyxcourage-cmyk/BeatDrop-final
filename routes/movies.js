const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');

const KEY  = process.env.RAPIDAPI_KEY || '53375c26aemsh8bbd4d3b6338c66p15a84ejsna06fbbb10ec2';
const BASE = 'https://moviesdatabase.p.rapidapi.com';
const HEADERS = { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'moviesdatabase.p.rapidapi.com', 'Content-Type': 'application/json' };

const rapidApiFetch = async (url, res, label) => {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) return res.status(r.status).json({ error: `RapidAPI error ${r.status}` });
  const d = await r.json();
  res.json(d);
};

// GET /api/movies/trending
router.get('/trending', asyncHandler(async (req, res) => {
  await rapidApiFetch(`${BASE}/titles?list=top_rated_english_250&limit=24&info=base_info`, res, 'trending');
}, 500, 'Movies API unavailable'));

// GET /api/movies/search?q=...
router.get('/search', asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Query required' });
  await rapidApiFetch(`${BASE}/titles/search/title/${encodeURIComponent(q)}?exact=false&info=base_info&limit=24`, res, 'search');
}, 500, 'Movies API unavailable'));

// GET /api/movies/:id/actors
router.get('/:id/actors', asyncHandler(async (req, res) => {
  await rapidApiFetch(`${BASE}/titles/${req.params.id}/main_actors`, res, 'actors');
}, 500, 'Movies API unavailable'));

// GET /api/movies/:id
router.get('/:id', asyncHandler(async (req, res) => {
  await rapidApiFetch(`${BASE}/titles/${req.params.id}?info=base_info`, res, 'detail');
}, 500, 'Movies API unavailable'));

module.exports = router;
