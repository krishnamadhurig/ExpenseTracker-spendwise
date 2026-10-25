const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

const TIMEOUT_MS = 10000;

async function request(path, { method = 'GET', body, raw = false } = {}) {
  const token = getToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    const err = new Error(
      e.name === 'AbortError'
        ? 'The server is taking too long to respond.'
        : 'Cannot reach the server. Is the backend running?'
    );
    err.status = 0; 
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) onUnauthorized();
    const err = new Error(data.error || 'Something went wrong');
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return raw ? res : res.json();
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),
  meta: () => request('/meta'),

  items: (params) => request('/items?' + new URLSearchParams(params)),
  summary: () => request('/items/summary'),
  addItem: (body) => request('/items', { method: 'POST', body }),
  updateItem: (id, body) => request('/items/' + id, { method: 'PUT', body }),
  deleteItem: (id) => request('/items/' + id, { method: 'DELETE' }),
  exportCsv: () => request('/items/export/csv', { raw: true }),

  leaderboard: () => request('/leaderboard'),

  plan: () => request('/premium/plan'),
  createOrder: () => request('/premium/order', { method: 'POST' }),
  verifyPayment: (body) => request('/premium/verify', { method: 'POST', body }),

  categorize: (name) => request('/ai/categorize', { method: 'POST', body: { name } }),
  parse: (text) => request('/ai/parse', { method: 'POST', body: { text } }),
  insights: () => request('/ai/insights')
};