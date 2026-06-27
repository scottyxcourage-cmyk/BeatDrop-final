/* BeatDrop YTS - Page Renderers */
const Pages = {
  home() {
    const history = Store.getHistory();
    const favorites = Store.getFavorites();

    return `
      <div class="hero">
        <h1><span class="gradient-text">BeatDrop</span> YTS</h1>
        <p>Premium music downloader with lightning-fast search and high-quality downloads</p>
        ${Components.searchBar()}
      </div>

      <div class="stats-grid">
        <div class="stat-card glass-card">
          <div class="stat-card-value">${history.length}</div>
          <div class="stat-card-label">Downloads</div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-card-value">${favorites.length}</div>
          <div class="stat-card-label">Favorites</div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-card-value">MP3</div>
          <div class="stat-card-label">Quality</div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-card-value">Free</div>
          <div class="stat-card-label">Forever</div>
        </div>
      </div>

      <div class="features-grid">
        <div class="feature-card glass-card stagger-item">
          <div class="feature-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
          </div>
          <h3>Lightning Fast</h3>
          <p>Get your music in seconds with our optimized download engine</p>
        </div>
        <div class="feature-card glass-card stagger-item">
          <div class="feature-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3>Secure & Private</h3>
          <p>No tracking, no ads. Your downloads stay private</p>
        </div>
        <div class="feature-card glass-card stagger-item">
          <div class="feature-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </div>
          <h3>Customizable</h3>
          <p>Personalize your experience with themes and settings</p>
        </div>
        <div class="feature-card glass-card stagger-item">
          <div class="feature-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <h3>All Devices</h3>
          <p>Works perfectly on phones, tablets, and desktops</p>
        </div>
      </div>
    `;
  },

  search() {
    return `
      ${Components.pageHeader('Search Music', 'Find and download your favorite songs')}
      ${Components.searchBar()}
      <div id="search-results" class="songs-grid"></div>
    `;
  },

  trending() {
    const history = Store.getHistory();
    const recent = history.slice(0, 12);

    if (recent.length === 0) {
      return `
        ${Components.pageHeader('Trending Songs', 'Popular downloads from the community')}
        ${Components.emptyState(
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>',
          'No trending songs yet',
          'Start searching and downloading music to see trending tracks here.',
          '<a href="#/search" class="btn btn-primary">Start Searching</a>'
        )}
      `;
    }

    return `
      ${Components.pageHeader('Trending Songs', 'Popular downloads from the community')}
      <div class="songs-grid">
        ${recent.map(song => Components.songCard(song)).join('')}
      </div>
    `;
  },

  favorites() {
    const favorites = Store.getFavorites();

    if (favorites.length === 0) {
      return `
        ${Components.pageHeader('Favorites', 'Your saved songs')}
        ${Components.emptyState(
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
          'No favorites yet',
          'Heart songs while browsing to save them here for quick access.',
          '<a href="#/search" class="btn btn-primary">Find Music</a>'
        )}
      `;
    }

    return `
      ${Components.pageHeader('Favorites', `${favorites.length} saved song${favorites.length !== 1 ? 's' : ''}`)}
      <div class="songs-grid">
        ${favorites.map(song => Components.songCard(song, { showRemove: true, showDate: true })).join('')}
      </div>
    `;
  },

  recent() {
    const history = Store.getHistory();

    if (history.length === 0) {
      return `
        ${Components.pageHeader('Recently Downloaded', 'Your download history')}
        ${Components.emptyState(
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
          'No downloads yet',
          'Your download history will appear here once you start downloading songs.',
          '<a href="#/search" class="btn btn-primary">Search Music</a>'
        )}
      `;
    }

    return `
      ${Components.pageHeader('Recently Downloaded', `${history.length} download${history.length !== 1 ? 's' : ''}`)}
      <div style="margin-bottom:16px;text-align:right;">
        <button class="btn btn-danger" id="clear-history-btn">Clear History</button>
      </div>
      <div class="songs-grid">
        ${history.map(song => Components.songCard(song, { showDate: true })).join('')}
      </div>
    `;
  },

  settings() {
    const settings = Store.getSettings();
    const colors = ['#00f0ff', '#ff4060', '#00e676', '#ffab00', '#a855f7', '#f43f5e'];

    return `
      ${Components.pageHeader('Settings', 'Customize your BeatDrop experience')}

      <div class="settings-section">
        <h2>Appearance</h2>
        <div class="setting-item">
          <div class="setting-item-info">
            <h3>Animations</h3>
            <p>Enable smooth transitions and animations</p>
          </div>
          <div class="toggle ${settings.animations ? 'active' : ''}" data-setting="animations"></div>
        </div>
        <div class="setting-item">
          <div class="setting-item-info">
            <h3>Accent Color</h3>
            <p>Choose your preferred accent color</p>
          </div>
          <div class="color-options">
            ${colors.map(color => `<div class="color-option ${settings.accentColor === color ? 'active' : ''}" data-color="${color}" style="background:${color}"></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Audio</h2>
        <div class="setting-item">
          <div class="setting-item-info">
            <h3>Sound Effects</h3>
            <p>Play sounds for actions like download complete</p>
          </div>
          <div class="toggle ${settings.soundEffects ? 'active' : ''}" data-setting="soundEffects"></div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Downloads</h2>
        <div class="setting-item">
          <div class="setting-item-info">
            <h3>Download Folder</h3>
            <p>Preferred download location (browser-controlled)</p>
          </div>
          <span style="color:var(--text-secondary);font-size:0.85rem;">${Utils.escapeHtml(settings.downloadFolder)}</span>
        </div>
      </div>

      <div class="settings-section">
        <h2>Data</h2>
        <div class="setting-item">
          <div class="setting-item-info">
            <h3>Clear Download History</h3>
            <p>Remove all download history records</p>
          </div>
          <button class="btn btn-danger" id="clear-history-settings">Clear</button>
        </div>
        <div class="setting-item">
          <div class="setting-item-info">
            <h3>Clear Favorites</h3>
            <p>Remove all saved favorite songs</p>
          </div>
          <button class="btn btn-danger" id="clear-favorites-settings">Clear</button>
        </div>
      </div>
    `;
  },

  about() {
    return `
      ${Components.pageHeader('About BeatDrop YTS')}
      <div class="about-content">
        <p>BeatDrop YTS is a premium music downloader built with a modern cyber aesthetic and powered by cutting-edge web technologies.</p>

        <h2>Features</h2>
        <ul>
          <li>Fast music search and download</li>
          <li>High-quality MP3 conversion</li>
          <li>YouTube URL support</li>
          <li>Download history tracking</li>
          <li>Favorites collection</li>
          <li>Responsive design for all devices</li>
          <li>Keyboard shortcuts for power users</li>
          <li>Customizable accent colors</li>
          <li>No ads, no tracking</li>
        </ul>

        <h2>Keyboard Shortcuts</h2>
        <ul>
          <li><kbd>Ctrl</kbd> + <kbd>K</kbd> — Focus search</li>
          <li><kbd>Escape</kbd> — Close sidebar (mobile)</li>
          <li><kbd>1</kbd>-<kbd>7</kbd> — Navigate pages (when not in input)</li>
        </ul>

        <h2>Technology</h2>
        <ul>
          <li>Node.js + Express backend</li>
          <li>Vanilla JavaScript frontend (no frameworks)</li>
          <li>CSS Grid & Flexbox layouts</li>
          <li>LocalStorage for data persistence</li>
          <li>Madrin API for music downloads</li>
        </ul>

        <h2>Version</h2>
        <p>BeatDrop YTS v1.0.0</p>
      </div>
    `;
  },

  contact() {
    return `
      ${Components.pageHeader('Contact Us', 'Get in touch with the BeatDrop team')}
      <div class="contact-form">
        <div class="glass-card">
          <form id="contact-form">
            <div class="form-group">
              <label for="contact-name">Name</label>
              <input type="text" id="contact-name" class="form-input" placeholder="Your name" required>
            </div>
            <div class="form-group">
              <label for="contact-email">Email</label>
              <input type="email" id="contact-email" class="form-input" placeholder="your@email.com" required>
            </div>
            <div class="form-group">
              <label for="contact-subject">Subject</label>
              <input type="text" id="contact-subject" class="form-input" placeholder="What's this about?">
            </div>
            <div class="form-group">
              <label for="contact-message">Message</label>
              <textarea id="contact-message" class="form-input" placeholder="Your message..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
              Send Message
            </button>
          </form>
        </div>
      </div>
    `;
  },

  notFound() {
    return `
      <div class="error-page">
        <div class="error-code">404</div>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="#/" class="btn btn-primary">Go Home</a>
      </div>
    `;
  }
};
