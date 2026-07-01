const PAGE_LOADERS = {
  movies:        { text: 'Loading Movies...',         sk: () => skMoviePage()     },
  music:         { text: 'Loading Music...',          sk: () => skMusicPage()     },
  search:        { text: 'Loading Search...',         sk: () => ''                },
  profile:       { text: 'Loading Profile...',        sk: () => genericSkeleton() },
  'edit-profile':{ text: 'Loading Edit Profile...',   sk: () => genericSkeleton() },
  favorites:     { text: 'Loading Favorites...',      sk: () => genericSkeleton() },
  watchlist:     { text: 'Loading Watchlist...',      sk: () => genericSkeleton() },
  downloads:     { text: 'Loading Downloads...',      sk: () => genericSkeleton() },
  history:       { text: 'Loading History...',        sk: () => genericSkeleton() },
  notifications: { text: 'Loading Notifications...',  sk: () => genericSkeleton() },
  messages:      { text: 'Loading Messages...',       sk: () => genericSkeleton() },
  subscription:  { text: 'Loading Subscription...',   sk: () => genericSkeleton() },
  settings:      { text: 'Loading Settings...',       sk: () => genericSkeleton() },
};
const PAGE_RENDERERS = {
  movies:  renderMoviesPage,
  music:   renderMusicPage
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  STATE.currentPage = id;
  if (typeof updateSidebarActive === 'function') updateSidebarActive(id);
  // Scroll to top so content is always visible without needing to scroll
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function navigateTo(id) {
  closeUserMenu();
  if (STATE.navLocked || id === STATE.currentPage) return;
  STATE.navLocked = true;

  const loader  = document.getElementById('page-loader');
  const plText  = document.getElementById('pl-text');
  const plSkel  = document.getElementById('pl-skeleton');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === id));

  const cfg = PAGE_LOADERS[id];
  if (cfg) {
    plText.textContent = cfg.text;
    plSkel.innerHTML   = cfg.sk();
    loader.classList.add('visible');
    setTimeout(async () => {
      loader.classList.remove('visible');
      plSkel.innerHTML = '';
      showPage(id);
      const renderer = PAGE_RENDERERS[id];
      if (renderer) await renderer();
      STATE.navLocked = false;
    }, 1400);
  } else {
    showPage(id);
    STATE.navLocked = false;
  }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});
