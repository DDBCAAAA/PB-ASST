const { workoutRepository, trainingPlanRepository } = require('../models');

const ensureOwnership = async (workoutId, userId) => {
  const workout = await workoutRepository.getWorkoutById(workoutId);
  if (!workout) {
    return { workout: null, error: { status: 404, message: 'Workout not found.' } };
  }

  const plan = await trainingPlanRepository.getPlanById(workout.trainingPlanId);
  if (!plan || plan.userId !== userId) {
    return { workout: null, error: { status: 403, message: 'Forbidden.' } };
  }

  return { workout, plan };
};

const toIntegerOrNull = (value) => {
  if (value === null || typeof value === 'undefined') {
    return undefined;
  }
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
};

const checkinWorkout = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const workoutId = req.params.id;
  const { error } = await ensureOwnership(workoutId, req.user.id);
  if (error) {
    return res.status(error.status).json({ error: error.message });
  }

  try {
    const update = {
      preRunSleepQuality: toIntegerOrNull(req.body?.sleepQuality),
      preRunBodyFeel: toIntegerOrNull(req.body?.bodyFeel),
    };

    if (req.body?.status) {
      update.status = req.body.status;
    }

    const updatedWorkout = await workoutRepository.updateWorkoutFields(workoutId, update);
    return res.status(200).json({ workout: updatedWorkout });
  } catch (err) {
    console.error('Failed to record workout check-in', err);
    return res.status(500).json({ error: 'Failed to record workout check-in.' });
  }
};

const logWorkout = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const workoutId = req.params.id;
  const { error } = await ensureOwnership(workoutId, req.user.id);
  if (error) {
    return res.status(error.status).json({ error: error.message });
  }

  try {
    const update = {
      userFeedbackDifficulty: toIntegerOrNull(req.body?.difficulty),
      userFeedbackNotes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
    };

    if (req.body?.status) {
      update.status = req.body.status;
    }

    const updatedWorkout = await workoutRepository.updateWorkoutFields(workoutId, update);
    return res.status(200).json({ workout: updatedWorkout });
  } catch (err) {
    console.error('Failed to record workout log', err);
    return res.status(500).json({ error: 'Failed to record workout log.' });
  }
};

module.exports = {
  checkinWorkout,
  logWorkout,
};
