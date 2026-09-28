const RAW_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_BASE = `${RAW_BASE.replace(/\/$/, '')}/api`;

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/** Error carrying the HTTP status so callers can branch on 401/403/404. */
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const onUnauthorized = () => {
  clearSession();
  // Let the app shell react to the expired/invalid session.
  window.dispatchEvent(new CustomEvent('auth:expired'));
};

const request = async (path, { method = 'GET', body, auth = true, signal } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Is the backend running?', 0, null);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(
      (data && data.message) || `Request failed (${res.status}).`,
      res.status,
      data
    );
  }
  return data;
};

export const apiGet = (path, opts) => request(path, { ...opts, method: 'GET' });
export const apiPost = (path, body, opts) => request(path, { ...opts, method: 'POST', body });
export const apiPut = (path, body, opts) => request(path, { ...opts, method: 'PUT', body });
export const apiDelete = (path, opts) => request(path, { ...opts, method: 'DELETE' });

export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  request,
};
