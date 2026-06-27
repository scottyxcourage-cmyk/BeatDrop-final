/* BeatDrop YTS - Reusable Components */
const Components = {
  songCard(song, options = {}) {
    const { showRemove, showDate } = options;
    const isFav = Store.isFavorite(song.id);
    const thumbnail = song.thumbnail || song.image || '';
    const title = Utils.escapeHtml(song.title || 'Unknown Title');
    const artist = Utils.escapeHtml(song.artist || song.channel || 'Unknown Artist');
    const duration = song.duration || '';
    const quality = song.quality || '128kbps';
    const downloadUrl = song.downloadUrl || song.dl || song.download || '#';

    return `
      <div class="song-card stagger-item" data-id="${song.id}">
        <div class="song-card-thumbnail">
          ${thumbnail ? `<img src="${thumbnail}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : ''}
          ${duration ? `<span class="song-card-duration">${duration}</span>` : ''}
        </div>
        <div class="song-card-body">
          <h3 class="song-card-title">${title}</h3>
          <p class="song-card-artist">${artist}</p>
          ${quality ? `<span class="song-card-quality">${quality}</span>` : ''}
          ${showDate && song.downloadedAt ? `<p class="song-card-artist">${Utils.formatDate(song.downloadedAt)}</p>` : ''}
          ${showDate && song.addedAt ? `<p class="song-card-artist">${Utils.formatDate(song.addedAt)}</p>` : ''}
          <div class="song-card-actions">
            <a href="${downloadUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-download" data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}'>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>
            <button class="btn btn-ghost btn-favorite ${isFav ? 'active' : ''}" data-id="${song.id}" data-song='${JSON.stringify(song).replace(/'/g, "&#39;")}' title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
              <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            </button>
            <button class="btn btn-ghost btn-copy" data-url="${downloadUrl}" title="Copy link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
            <button class="btn btn-ghost btn-share" data-title="${title}" data-url="${downloadUrl}" title="Share">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            ${showRemove ? `<button class="btn btn-ghost btn-remove" data-id="${song.id}" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  skeletonCards(count = 6) {
    return Array(count).fill('').map(() => `
      <div class="skeleton-card stagger-item">
        <div class="skeleton skeleton-image"></div>
        <div style="padding: 16px;">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text short"></div>
          <div class="skeleton skeleton-text" style="width:30%;height:10px;margin-top:12px;"></div>
        </div>
      </div>
    `).join('');
  },

  emptyState(icon, title, message, actionHtml = '') {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${message}</p>
        ${actionHtml}
      </div>
    `;
  },

  searchBar(placeholder = 'Search for songs or paste a YouTube URL...') {
    return `
      <div class="search-container">
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="search-input" placeholder="${placeholder}" autocomplete="off" spellcheck="false">
          <button class="search-btn" id="search-btn">Search</button>
        </div>
      </div>
    `;
  },

  pageHeader(title, subtitle = '') {
    return `
      <div class="page-header">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
    `;
  }
};
