const rateLimit = require('express-rate-limit');
const config = require('../config');

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    status: 429,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const searchLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: {
    status: 429,
    error: 'Too many search requests. Please wait a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { globalLimiter, searchLimiter };
