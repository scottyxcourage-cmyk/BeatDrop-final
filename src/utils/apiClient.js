const https = require('https');
const http = require('http');
const config = require('../config');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', reject);
  });
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await makeRequest(url);
      if (result.status >= 200 && result.status < 500) {
        return result;
      }
      throw new Error(`Server returned ${result.status}`);
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

function buildApiUrl(endpoint, params = {}) {
  const url = new URL(endpoint, config.api.baseUrl);
  url.searchParams.set('apikey', config.api.key);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

module.exports = { fetchWithRetry, buildApiUrl };
