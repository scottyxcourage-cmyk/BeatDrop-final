/* BeatDrop YTS - Client-Side Router */
const Router = {
  routes: {
    '/': 'home',
    '/search': 'search',
    '/trending': 'trending',
    '/favorites': 'favorites',
    '/recent': 'recent',
    '/settings': 'settings',
    '/about': 'about',
    '/contact': 'contact'
  },

  currentPage: null,

  init() {
    window.addEventListener('hashchange', () => this.navigate());
    this.navigate();
  },

  getPath() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
  },

  navigate() {
    const path = this.getPath();
    const pageName = this.routes[path];
    const container = document.getElementById('page-container');

    if (!pageName || !Pages[pageName]) {
      container.innerHTML = Pages.notFound();
      this.updateNav(null);
      return;
    }

    if (this.currentPage === pageName) return;
    this.currentPage = pageName;

    // Animate transition
    container.classList.remove('page-enter');
    container.innerHTML = Pages[pageName]();
    container.classList.add('page-enter');

    this.updateNav(pageName);
    this.bindPageEvents(pageName);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateNav(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });
  },

  bindPageEvents(pageName) {
    // Bind search on pages that have a search bar
    if (pageName === 'home' || pageName === 'search') {
      App.bindSearchEvents();
    }

    if (pageName === 'settings') {
      App.bindSettingsEvents();
    }

    if (pageName === 'recent') {
      App.bindRecentEvents();
    }

    if (pageName === 'contact') {
      App.bindContactEvents();
    }

    // Bind card actions on any page with song cards
    App.bindCardActions();
  }
};
