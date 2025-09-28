import { API_BASE_URL, request } from './client';

const encodeFormBody = (payload) => {
  const params = new URLSearchParams();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null) {
      return;
    }
    params.append(key, String(value));
  });
  return params.toString();
};

const postAuthForm = async (path, payload) => {
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeFormBody(payload),
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`Auth error ${response.status}: ${message}`);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const fetchSession = async () =>
  request('/auth/session', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

const fetchCsrfToken = async () => {
  const response = await request('/auth/csrf', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  return response?.csrfToken;
};

export const loginWithProvider = async ({ provider, code }) => {
  const csrfToken = await fetchCsrfToken();

  if (!csrfToken) {
    throw new Error('Unable to fetch CSRF token for authentication.');
  }

  await postAuthForm('/auth/callback/credentials?redirect=false', {
    provider,
    code,
    csrfToken,
    callbackUrl: '/',
  });

  const session = await fetchSession();

  if (!session?.pbToken) {
    throw new Error('Failed to establish an authenticated session.');
  }

  return {
    token: session.pbToken,
    user: session.user,
  };
};

export const loginWithWeChat = async (code) =>
  loginWithProvider({ provider: 'wechat', code });

export const logout = async () => {
  const csrfToken = await fetchCsrfToken();

  if (!csrfToken) {
    throw new Error('Unable to fetch CSRF token for sign out.');
  }

  await postAuthForm('/auth/signout?redirect=false', {
    callbackUrl: '/',
    csrfToken,
  });
};

export default {
  loginWithProvider,
  loginWithWeChat,
  logout,
};
