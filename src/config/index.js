require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  ytdlp: {
    searchLimit: parseInt(process.env.SEARCH_LIMIT, 10) || 6,
    timeout: parseInt(process.env.YTDLP_TIMEOUT, 10) || 30000
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  }
};
