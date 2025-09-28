import { request } from './client';

export const createPlan = async (token, payload) =>
  request('/plans', {
    method: 'POST',
    token,
    body: payload,
  });

export const getLatestPlan = async (token) =>
  request('/plans/latest', {
    method: 'GET',
    token,
  });

export default {
  createPlan,
  getLatestPlan,
};
