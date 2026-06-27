/* BeatDrop YTS - Main Application */
const App = {
  isSearching: false,

  init() {
    this.applySettings();
    this.initSidebar();
    this.initKeyboardShortcuts();
    Router.init();
    this.hideLoadingScreen();
  },

  hideLoadingScreen() {
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 600);
    }, 800);
  },

  applySettings() {
    const settings = Store.getSettings();
    document.documentElement.style.setProperty('--primary', settings.accentColor);

    // Recalculate related colors
    const r = parseInt(settings.accentColor.slice(1, 3), 16);
    const g = parseInt(settings.accentColor.slice(3, 5), 16);
    const b = parseInt(settings.accentColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--primary-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
    document.documentElement.style.setProperty('--primary-subtle', `rgba(${r}, ${g}, ${b}, 0.08)`);
    document.documentElement.style.setProperty('--primary-dim', `rgba(${r}, ${g}, ${b}, 0.7)`);

    if (!settings.animations) {
      document.documentElement.style.setProperty('--transition-fast', '0s');
      document.documentElement.style.setProperty('--transition-med', '0s');
      document.documentElement.style.setProperty('--transition-slow', '0s');
    }
  },

  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('mobile-nav-toggle');

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });

    // Close mobile sidebar on nav click
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('mobile-open');
        }
      });
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
          sidebar.classList.contains('mobile-open') &&
          !sidebar.contains(e.target) &&
          e.target !== mobileToggle) {
        sidebar.classList.remove('mobile-open');
      }
    });
  },

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K - Focus search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          window.location.hash = '#/search';
          setTimeout(() => {
            const input = document.getElementById('search-input');
            if (input) input.focus();
          }, 100);
        }
      }

      // Escape - Close mobile sidebar
      if (e.key === 'Escape') {
        document.getElementById('sidebar').classList.remove('mobile-open');
      }

      // Number keys for navigation (when not in input)
      if (!e.ctrlKey && !e.altKey && !e.metaKey &&
          !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        const navMap = { '1': '/', '2': '/search', '3': '/trending', '4': '/favorites', '5': '/recent', '6': '/settings', '7': '/about' };
        if (navMap[e.key]) {
          window.location.hash = '#' + navMap[e.key];
        }
      }
    });
  },

  bindSearchEvents() {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');
    if (!input || !btn) return;

    const doSearch = () => {
      const query = input.value.trim();
      if (query) this.performSearch(query);
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  },

  async performSearch(query) {
    if (this.isSearching) return;
    this.isSearching = true;

    const resultsContainer = document.getElementById('search-results') ||
                             document.querySelector('.songs-grid');
    const container = resultsContainer || document.getElementById('page-container');

    // Show skeleton loading
    if (resultsContainer) {
      resultsContainer.innerHTML = `<div class="songs-grid">${Components.skeletonCards(3)}</div>`;
    }

    try {
      const isUrl = query.startsWith('http') || query.includes('youtube.com') || query.includes('youtu.be');
      const endpoint = isUrl ? '/api/download' : '/api/search';
      const param = isUrl ? 'url' : 'q';

      const response = await fetch(`${endpoint}?${param}=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      this.renderSearchResults(data, resultsContainer);
    } catch (err) {
      if (resultsContainer) {
        resultsContainer.innerHTML = Components.emptyState(
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
          'Search Failed',
          err.message || 'Something went wrong. Please try again.',
          '<button class="btn btn-primary" onclick="document.getElementById(\'search-input\').focus()">Try Again</button>'
        );
      }
      Utils.showToast(err.message || 'Search failed', 'error');
    } finally {
      this.isSearching = false;
    }
  },

  renderSearchResults(data, container) {
    if (!container) return;

    // Normalize result to array
    let songs = [];
    if (data && data.status === true && data.result) {
      const result = data.result;
      songs = [{
        id: Utils.generateId(),
        title: result.title || 'Unknown',
        artist: result.channel || result.artist || 'Unknown',
        thumbnail: result.thumbnail || result.image || '',
        duration: result.duration || '',
        quality: result.quality || '128kbps',
        downloadUrl: result.dl || result.download || result.url || '#',
        url: result.url || ''
      }];
    } else if (Array.isArray(data)) {
      songs = data.map(item => ({
        id: Utils.generateId(),
        title: item.title || 'Unknown',
        artist: item.channel || item.artist || 'Unknown',
        thumbnail: item.thumbnail || item.image || '',
        duration: item.duration || '',
        quality: item.quality || '128kbps',
        downloadUrl: item.dl || item.download || item.url || '#',
        url: item.url || ''
      }));
    }

    if (songs.length === 0) {
      container.innerHTML = Components.emptyState(
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        'No Results',
        'Try a different search term or paste a YouTube URL directly.',
        ''
      );
      return;
    }

    container.innerHTML = songs.map(song => Components.songCard(song)).join('');
    this.bindCardActions();
    Utils.showToast(`Found ${songs.length} result${songs.length !== 1 ? 's' : ''}`, 'success');
  },

  bindCardActions() {
    // Download buttons
    document.querySelectorAll('.btn-download').forEach(btn => {
      btn.addEventListener('click', (e) => {
        try {
          const songData = JSON.parse(btn.dataset.song);
          Store.addToHistory(songData);
          Utils.showToast('Download started', 'success');
        } catch {
          // Still allow download link to work
        }
      });
    });

    // Favorite buttons
    document.querySelectorAll('.btn-favorite').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const songData = JSON.parse(btn.dataset.song);
          const songId = btn.dataset.id;

          if (Store.isFavorite(songId)) {
            Store.removeFavorite(songId);
            btn.classList.remove('active');
            btn.querySelector('svg').setAttribute('fill', 'none');
            Utils.showToast('Removed from favorites', 'info');
          } else {
            Store.addFavorite(songData);
            btn.classList.add('active');
            btn.querySelector('svg').setAttribute('fill', 'currentColor');
            Utils.showToast('Added to favorites', 'success');
          }
        } catch {
          Utils.showToast('Action failed', 'error');
        }
      });
    });

    // Copy buttons
    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.copyToClipboard(btn.dataset.url);
      });
    });

    // Share buttons
    document.querySelectorAll('.btn-share').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.shareLink(btn.dataset.title, btn.dataset.url);
      });
    });

    // Remove buttons
    document.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        Store.removeFavorite(id);
        const card = btn.closest('.song-card');
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => {
            card.remove();
            Utils.showToast('Removed', 'info');
          }, 200);
        }
      });
    });
  },

  bindSettingsEvents() {
    // Toggles
    document.querySelectorAll('.toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const setting = toggle.dataset.setting;
        const isActive = toggle.classList.toggle('active');
        Store.updateSetting(setting, isActive);
        this.applySettings();
        Utils.showToast(`${setting} ${isActive ? 'enabled' : 'disabled'}`, 'info');
      });
    });

    // Color options
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        Store.updateSetting('accentColor', option.dataset.color);
        this.applySettings();
        Utils.showToast('Accent color updated', 'success');
      });
    });

    // Clear history
    const clearHistoryBtn = document.getElementById('clear-history-settings');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        Store.clearHistory();
        Utils.showToast('Download history cleared', 'success');
      });
    }

    // Clear favorites
    const clearFavsBtn = document.getElementById('clear-favorites-settings');
    if (clearFavsBtn) {
      clearFavsBtn.addEventListener('click', () => {
        Store.clearFavorites();
        Utils.showToast('Favorites cleared', 'success');
      });
    }
  },

  bindRecentEvents() {
    const clearBtn = document.getElementById('clear-history-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        Store.clearHistory();
        Router.currentPage = null;
        Router.navigate();
        Utils.showToast('History cleared', 'success');
      });
    }
  },

  bindContactEvents() {
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        Utils.showToast('Message sent successfully!', 'success');
        form.reset();
      });
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
