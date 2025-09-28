import { request } from './client';

export const getCurrentUser = async (token) =>
  request('/user/me', {
    method: 'GET',
    token,
  });

export const updateCurrentUser = async (token, payload) =>
  request('/user/me', {
    method: 'PUT',
    token,
    body: payload,
  });

export default {
  getCurrentUser,
  updateCurrentUser,
};
