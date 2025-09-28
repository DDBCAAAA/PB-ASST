const { exchangeCodeForProfile } = require('../services/identityService');
const { createOrUpdateUserFromIdentity } = require('../models/userRepository');
const { signAuthToken } = require('../services/tokenService');

const buildAuthResponse = (user, provider) => ({
  token: signAuthToken({ sub: user.id, provider }),
  user,
});

const oauthLogin = async (req, res) => {
  try {
    const provider = (req.body.provider || 'wechat').toLowerCase();
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code.' });
    }

    const profile = await exchangeCodeForProfile(provider, code);

    const user = await createOrUpdateUserFromIdentity(profile);

    return res.status(200).json(buildAuthResponse(user, provider));
  } catch (error) {
    console.error('OAuth login failed', error);
    return res.status(500).json({ error: error.message });
  }
};

const wechatLogin = (req, res) => {
  req.body = req.body || {};
  req.body.provider = 'wechat';
  return oauthLogin(req, res);
};

module.exports = {
  oauthLogin,
  wechatLogin,
};
