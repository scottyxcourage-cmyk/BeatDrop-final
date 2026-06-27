# BeatDrop YTS

Premium cyber-themed music downloader with lightning-fast search and high-quality downloads.

## Features

- Modern cyber-inspired UI with glassmorphism and neon effects
- Fast music search and MP3 download via Madrin API
- YouTube URL support
- Download history and favorites (saved locally)
- Responsive mobile-first design
- Collapsible sidebar navigation
- Customizable accent colors
- Keyboard shortcuts
- Toast notifications
- Skeleton loading placeholders
- Smooth page transitions and animations
- Secure Node.js + Express backend with rate limiting

## Tech Stack

- **Backend:** Node.js, Express, Helmet, CORS, express-rate-limit
- **Frontend:** Vanilla JavaScript (SPA), CSS3 with custom properties
- **Storage:** Browser LocalStorage
- **API:** Madrin ytmp3 API

## Quick Start

```bash
# Install dependencies
npm install

# Create .env (copy from example)
cp .env.example .env

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `API_BASE_URL` | https://api-madrin.zone.id | Madrin API base URL |
| `API_KEY` | test | Madrin API key |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

## Project Structure

```
beatdrop-yts/
├── public/
│   ├── css/
│   │   ├── styles.css        # Core styles
│   │   ├── animations.css    # Keyframes & transitions
│   │   └── components.css    # Component styles
│   ├── js/
│   │   ├── store.js          # LocalStorage manager
│   │   ├── utils.js          # Utility functions
│   │   ├── components.js     # Reusable UI components
│   │   ├── pages.js          # Page renderers
│   │   ├── router.js         # Client-side router
│   │   └── app.js            # Main application
│   └── index.html            # SPA entry point
├── src/
│   ├── config/
│   │   └── index.js          # Configuration
│   ├── middleware/
│   │   ├── errorHandler.js   # Error handling
│   │   └── rateLimiter.js    # Rate limiting
│   ├── routes/
│   │   └── api.js            # API routes
│   ├── utils/
│   │   └── apiClient.js      # HTTP client with retry
│   └── server.js             # Express server
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Deployment

Ready for deployment on Render, Railway, or any Node.js hosting platform.

1. Set environment variables in your hosting dashboard
2. Build command: `npm install`
3. Start command: `npm start`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Focus search |
| `Escape` | Close mobile sidebar |
| `1-7` | Navigate pages |

## License

MIT
