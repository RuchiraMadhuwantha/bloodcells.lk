import { resetBrowserData } from './resetBrowserData';

test('clears previous login, settings and route once, preserving later sessions', () => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('authToken', 'old-token');
  localStorage.setItem('authUser', '{}');
  localStorage.setItem('savedSetting', 'old');
  sessionStorage.setItem('currentRoute', 'bank-dashboard');
  window.history.replaceState({ appRoute: 'bank-dashboard' }, '');
  resetBrowserData();
  expect(localStorage.getItem('authToken')).toBeNull();
  expect(localStorage.getItem('authUser')).toBeNull();
  expect(localStorage.getItem('savedSetting')).toBeNull();
  expect(sessionStorage.getItem('currentRoute')).toBeNull();
  expect(window.history.state).toBeNull();
  localStorage.setItem('authToken', 'new-token');
  sessionStorage.setItem('currentRoute', 'donor-dashboard');
  resetBrowserData();
  expect(localStorage.getItem('authToken')).toBe('new-token');
  expect(sessionStorage.getItem('currentRoute')).toBe('donor-dashboard');
});
