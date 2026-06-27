/* BeatDrop YTS - Local Storage Manager */
const Store = {
  KEYS: {
    FAVORITES: 'beatdrop_favorites',
    HISTORY: 'beatdrop_history',
    SETTINGS: 'beatdrop_settings'
  },

  getDefaults() {
    return {
      animations: true,
      soundEffects: false,
      accentColor: '#00f0ff',
      downloadFolder: 'Downloads'
    };
  },

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  getFavorites() {
    return this.get(this.KEYS.FAVORITES) || [];
  },

  addFavorite(song) {
    const favorites = this.getFavorites();
    const exists = favorites.find(f => f.id === song.id);
    if (!exists) {
      favorites.unshift({ ...song, addedAt: Date.now() });
      this.set(this.KEYS.FAVORITES, favorites);
    }
    return !exists;
  },

  removeFavorite(songId) {
    const favorites = this.getFavorites().filter(f => f.id !== songId);
    this.set(this.KEYS.FAVORITES, favorites);
  },

  isFavorite(songId) {
    return this.getFavorites().some(f => f.id === songId);
  },

  getHistory() {
    return this.get(this.KEYS.HISTORY) || [];
  },

  addToHistory(song) {
    const history = this.getHistory();
    const filtered = history.filter(h => h.id !== song.id);
    filtered.unshift({ ...song, downloadedAt: Date.now() });
    if (filtered.length > 100) filtered.pop();
    this.set(this.KEYS.HISTORY, filtered);
  },

  clearHistory() {
    this.set(this.KEYS.HISTORY, []);
  },

  clearFavorites() {
    this.set(this.KEYS.FAVORITES, []);
  },

  getSettings() {
    return { ...this.getDefaults(), ...this.get(this.KEYS.SETTINGS) };
  },

  updateSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    this.set(this.KEYS.SETTINGS, settings);
    return settings;
  }
};
