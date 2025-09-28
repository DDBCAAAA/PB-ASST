import { request } from './client';

export const checkInWorkout = async (token, workoutId, payload) =>
  request(`/workouts/${workoutId}/checkin`, {
    method: 'POST',
    token,
    body: payload,
  });

export const logWorkout = async (token, workoutId, payload) =>
  request(`/workouts/${workoutId}/log`, {
    method: 'POST',
    token,
    body: payload,
  });

export default {
  checkInWorkout,
  logWorkout,
};
