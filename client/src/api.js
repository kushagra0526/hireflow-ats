const KEY = 'hireflow_token';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (token) => (token ? localStorage.setItem(KEY, token) : localStorage.removeItem(KEY));

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: body && JSON.stringify(body),
  });
  // expired or missing session: drop the token and show the login screen
  if (res.status === 401 && path !== '/auth/login') {
    setToken(null);
    location.reload();
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const daysSince = (date) => Math.floor((Date.now() - new Date(date)) / 86_400_000);
export const ago = (date) => {
  const d = daysSince(date);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};
export const shortDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const stamp = (date) => new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
