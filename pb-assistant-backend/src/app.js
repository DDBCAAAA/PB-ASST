const express = require('express');
const apiRouter = require('./routes');
const authHandler = require('./auth/handler');
const authRouter = require('express').Router();

const app = express();

const parseAllowedOrigins = () => {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw || raw.trim() === '') {
    return ['*'];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowAll = allowedOrigins.includes('*');
  if (allowAll || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', allowAll ? '*' : origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (allowAll) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

authRouter.all('/', authHandler);
authRouter.all('/:path*', authHandler);
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
