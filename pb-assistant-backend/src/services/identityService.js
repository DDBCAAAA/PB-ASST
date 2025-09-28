const normalizeProvider = (provider) => provider.toLowerCase();

const createMockProfile = (provider, code) => ({
  provider,
  providerUserId: `${provider}-mock-${code}`,
  displayName:
    provider === 'apple'
      ? 'Apple User'
      : provider === 'google'
      ? 'Google User'
      : provider === 'guest'
      ? 'Guest Runner'
      : 'WeChat User',
  avatarUrl: 'https://placehold.co/128x128',
});

const exchangeCodeForProfile = async (providerInput, code) => {
  const provider = normalizeProvider(providerInput || 'wechat');

  if (!code) {
    throw new Error('Missing authorization code.');
  }

  const mockMode = process.env.AUTH_MOCK_MODE === 'true' || process.env.WECHAT_MOCK_MODE === 'true';
  const mockCodePrefixes = {
    wechat: 'wechat-mock',
    google: 'google-mock',
    apple: 'apple-mock',
  };

  const isImplicitMock = mockCodePrefixes[provider]
    ? String(code).toLowerCase().startsWith(mockCodePrefixes[provider])
    : false;

  if (mockMode || isImplicitMock) {
    return createMockProfile(provider, code);
  }

  if (provider === 'guest') {
    return {
      provider,
      providerUserId: code || `guest-${Date.now()}`,
      displayName: 'Guest Runner',
      avatarUrl: 'https://placehold.co/128x128',
    };
  }

  if (provider === 'wechat') {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('WeChat credentials are not configured. Enable AUTH_MOCK_MODE for local testing.');
    }

    throw new Error('Real WeChat integration not implemented.');
  }

  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured. Enable AUTH_MOCK_MODE for local testing.');
    }

    throw new Error('Real Google integration not implemented.');
  }

  if (provider === 'apple') {
    const keyId = process.env.APPLE_KEY_ID;
    const teamId = process.env.APPLE_TEAM_ID;
    const clientId = process.env.APPLE_CLIENT_ID;
    const privateKey = process.env.APPLE_PRIVATE_KEY;

    if (!keyId || !teamId || !clientId || !privateKey) {
      throw new Error('Apple Sign In credentials are not configured. Enable AUTH_MOCK_MODE for local testing.');
    }

    throw new Error('Real Apple integration not implemented.');
  }

  throw new Error(`Unsupported provider: ${provider}`);
};

module.exports = {
  exchangeCodeForProfile,
};
