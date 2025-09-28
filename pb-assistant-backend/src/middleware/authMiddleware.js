const { verifyAuthToken } = require('../services/tokenService');
const { getUserById } = require('../models/userRepository');

const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ error: message });

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  const token = authHeader.substring('Bearer '.length);

  try {
    const payload = verifyAuthToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      return unauthorized(res, 'User not found');
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Auth middleware error', error);
    return unauthorized(res);
  }
};

module.exports = authMiddleware;
