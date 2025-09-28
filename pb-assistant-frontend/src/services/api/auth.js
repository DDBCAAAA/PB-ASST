import { request } from './client';

export const loginWithProvider = async ({ provider, code }) =>
  request('/auth/oauth', {
    method: 'POST',
    body: { provider, code },
  });

export const loginWithWeChat = async (code) =>
  loginWithProvider({ provider: 'wechat', code });

export default {
  loginWithProvider,
  loginWithWeChat,
};
