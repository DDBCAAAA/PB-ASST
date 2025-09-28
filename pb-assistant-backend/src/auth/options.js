const CredentialsProvider = require('@auth/core/providers/credentials').default;
const { exchangeCodeForProfile } = require('../services/identityService');
const { createOrUpdateUserFromIdentity } = require('../models/userRepository');
const { signAuthToken } = require('../services/tokenService');

const buildSessionUser = (user, provider) => ({
  id: user.id,
  provider,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  gender: user.gender,
  timezone: user.timezone,
});

const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.JWT_SECRET || 'development-secret',
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'PB Credentials',
      credentials: {
        provider: { label: 'Provider', type: 'text', placeholder: 'wechat' },
        code: { label: 'Authorization Code', type: 'text' },
      },
      async authorize(credentials) {
        try {
          const provider = (credentials?.provider || 'wechat').toLowerCase();
          const code = credentials?.code;

          if (!code) {
            throw new Error('Missing authorization code.');
          }

          const profile = await exchangeCodeForProfile(provider, code);
          const user = await createOrUpdateUserFromIdentity(profile);

          if (!user) {
            throw new Error('Unable to resolve user profile.');
          }

          return {
            id: user.id,
            provider,
            name: user.displayName,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            gender: user.gender,
            timezone: user.timezone,
          };
        } catch (error) {
          console.error('Auth.js authorize error', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const sessionUser = buildSessionUser(user, user.provider || token?.pbUser?.provider);
        token.pbUser = sessionUser;
        token.pbToken = signAuthToken({ sub: sessionUser.id, provider: sessionUser.provider });
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.pbToken) {
        session.pbToken = token.pbToken;
      }
      if (token?.pbUser) {
        session.user = token.pbUser;
      }
      return session;
    },
  },
};

module.exports = {
  authConfig,
};
