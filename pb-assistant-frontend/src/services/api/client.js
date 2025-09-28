const normalizeBaseUrl = (value) => {
  if (!value) {
    return value;
  }

  if (value.endsWith('/')) {
    return value.replace(/\/+$/, '');
  }

  return value;
};

const API_BASE_URL = (() => {
  const envUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    return '/api';
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
