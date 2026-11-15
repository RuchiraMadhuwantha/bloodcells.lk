const RESET_KEY = 'bloodcells.browserReset';
const RESET_VERSION = '2026-11-15-database-cleared';

// One-time cleanup requested alongside the database reset. Later logins and
// preferences survive refresh once this browser has applied the reset.
export const resetBrowserData = () => {
  if (localStorage.getItem(RESET_KEY) !== RESET_VERSION) {
    localStorage.clear();
    localStorage.setItem(RESET_KEY, RESET_VERSION);
  }
  if (sessionStorage.getItem(RESET_KEY) !== RESET_VERSION) {
    sessionStorage.clear();
    sessionStorage.setItem(RESET_KEY, RESET_VERSION);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
};
