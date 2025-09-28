const { getAuthConfig } = require('./options');

let authModulePromise;

const loadAuthModule = async () => {
  if (!authModulePromise) {
    authModulePromise = import('@auth/core');
  }
  return authModulePromise;
};

const buildRequestFromExpress = (req) => {
  const protocol = req.protocol || (req.socket.encrypted ? 'https' : 'http');
  const host = req.get('host');
  const url = `${protocol}://${host}${req.originalUrl}`;

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (typeof value === 'undefined') return;
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else {
      headers.set(key, value);
    }
  });

  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (typeof req.body === 'string' || req.body instanceof Buffer) {
      body = req.body;
    } else if (req.body && typeof req.body === 'object') {
      const params = new URLSearchParams();
      Object.entries(req.body).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, `${item}`));
        } else if (value !== undefined && value !== null) {
          params.append(key, `${value}`);
        }
      });
      body = params.toString();
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/x-www-form-urlencoded');
      }
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body,
  });
};

const sendResponseFromFetch = async (res, response) => {
  const setCookie = response.headers.getSetCookie?.();

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }
    res.setHeader(key, value);
  });

  if (setCookie && setCookie.length) {
    res.setHeader('set-cookie', setCookie);
  }

  res.status(response.status);

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await response.json();
    res.json(json);
    return;
  }

  const text = await response.text();
  res.send(text);
};

const authHandler = async (req, res, next) => {
  try {
    const [{ Auth }, authConfig] = await Promise.all([loadAuthModule(), getAuthConfig()]);
    const request = buildRequestFromExpress(req);
    const response = await Auth(request, authConfig);
    await sendResponseFromFetch(res, response);
  } catch (error) {
    console.error('Auth.js handler error', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = authHandler;
