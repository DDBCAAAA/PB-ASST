const normalizeBaseUrl = (value) => {
  if (!value) {
    return value;
  }

  if (value.endsWith('/')) {
    return value.replace(/\/+$/, '');
  }

  if (!value.startsWith('http') && !value.startsWith('/')) {
    return `/${value}`;
  }

  return value;
};

const API_BASE_URL = (() => {
  const envUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser) {
    if (envUrl) {
      try {
        const resolved = new URL(envUrl, window.location.origin);
        if (resolved.origin === window.location.origin) {
          const browserPath = normalizeBaseUrl(resolved.pathname);
          return browserPath || '/api';
        }
      } catch (_err) {
        // If the env URL cannot be parsed in the browser, fall back to relative fetches.
      }
    }
    return '/api';
  }

  if (envUrl) {
    return envUrl;
  }

  return 'http://localhost:3000/api';
})();

const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Lightweight wrapper over fetch that injects auth headers and stringifies JSON bodies.
export const request = async (path, options = {}) => {
  const { token, body, headers = {}, method = 'GET', ...rest } = options;

  const finalHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let finalBody = body;
  const upperMethod = method.toUpperCase();

  if (body && upperMethod !== 'GET' && upperMethod !== 'HEAD' && !(body instanceof FormData)) {
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
    method: upperMethod,
    headers: finalHeaders,
    body: upperMethod === 'GET' || upperMethod === 'HEAD' ? undefined : finalBody,
    ...rest,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`API error ${response.status}: ${errorBody}`);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

export default { request };
