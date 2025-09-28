const { randomUUID } = require('crypto');
const { getPoolOrNull, getPool } = require('../config/database');

const memoryWorkoutsByPlan = new Map();
const memoryWorkoutsById = new Map();

const parseJsonColumn = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse workout JSON column', error);
    return null;
  }
};

const mapRowToWorkout = (row) => ({
  id: row.id,
  trainingPlanId: row.training_plan_id,
  scheduledDate: row.scheduled_date,
  workoutType: row.workout_type,
  distanceKm: row.distance_km,
  targetPace: row.target_pace,
  status: row.status,
  preRunSleepQuality: row.pre_run_sleep_quality,
  preRunBodyFeel: row.pre_run_body_feel,
  userFeedbackDifficulty: row.user_feedback_difficulty,
  userFeedbackNotes: row.user_feedback_notes,
  additionalPayload: parseJsonColumn(row.additional_payload),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMemoryWorkout = (workout) => ({
  ...workout,
  additionalPayload: workout.additionalPayload
    ? JSON.parse(JSON.stringify(workout.additionalPayload))
    : null,
});

const useMemoryStore = () => !getPoolOrNull();

const listWorkoutsForPlan = async (planId) => {
  if (!planId) return [];

  if (useMemoryStore()) {
    const workouts = memoryWorkoutsByPlan.get(planId);
    if (!workouts) return [];
    return workouts.map(mapMemoryWorkout).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM workouts WHERE training_plan_id = $1 ORDER BY scheduled_date ASC`,
    [planId],
  );

  return rows.map(mapRowToWorkout);
};

const replacePlanWorkouts = async (planId, workouts = []) => {
  if (!planId) {
    throw new Error('planId is required to store workouts.');
  }

  if (useMemoryStore()) {
    const now = new Date().toISOString();
    const normalized = workouts.map((workout) => ({
      id: workout.id || `mem-workout-${randomUUID()}`,
      trainingPlanId: planId,
      scheduledDate: workout.scheduledDate,
      workoutType: workout.workoutType,
      distanceKm: workout.distanceKm ?? null,
      targetPace: workout.targetPace ?? null,
      status: workout.status || 'scheduled',
      preRunSleepQuality: workout.preRunSleepQuality ?? null,
      preRunBodyFeel: workout.preRunBodyFeel ?? null,
      userFeedbackDifficulty: workout.userFeedbackDifficulty ?? null,
      userFeedbackNotes: workout.userFeedbackNotes ?? null,
      additionalPayload: workout.additionalPayload || null,
      createdAt: workout.createdAt || now,
      updatedAt: now,
    }));
    memoryWorkoutsByPlan.set(planId, normalized);
    normalized.forEach((workout) => {
      memoryWorkoutsById.set(workout.id, workout);
    });
    return normalized.map(mapMemoryWorkout);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM workouts WHERE training_plan_id = $1', [planId]);

    for (const workout of workouts) {
      await client.query(
        `INSERT INTO workouts (
          id,
          training_plan_id,
          scheduled_date,
          workout_type,
          distance_km,
          target_pace,
          status,
          pre_run_sleep_quality,
          pre_run_body_feel,
          user_feedback_difficulty,
          user_feedback_notes,
          additional_payload
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
        [
          planId,
          workout.scheduledDate,
          workout.workoutType,
          workout.distanceKm ?? null,
          workout.targetPace ?? null,
          workout.status || 'scheduled',
          workout.preRunSleepQuality ?? null,
          workout.preRunBodyFeel ?? null,
          workout.userFeedbackDifficulty ?? null,
          workout.userFeedbackNotes ?? null,
          workout.additionalPayload ? JSON.stringify(workout.additionalPayload) : null,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return listWorkoutsForPlan(planId);
};

const getWorkoutById = async (workoutId) => {
  if (!workoutId) return null;

  if (useMemoryStore()) {
    return memoryWorkoutsById.has(workoutId)
      ? mapMemoryWorkout(memoryWorkoutsById.get(workoutId))
      : null;
  }

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM workouts WHERE id = $1', [workoutId]);
  return rows.length ? mapRowToWorkout(rows[0]) : null;
};

const updateWorkoutFields = async (workoutId, updates = {}) => {
  if (!workoutId) {
    throw new Error('workoutId is required to update a workout.');
  }

  if (useMemoryStore()) {
    const existing = memoryWorkoutsById.get(workoutId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    memoryWorkoutsById.set(workoutId, updated);
    const planWorkouts = memoryWorkoutsByPlan.get(existing.trainingPlanId) || [];
    const replaced = planWorkouts.map((workout) => (workout.id === workoutId ? updated : workout));
    memoryWorkoutsByPlan.set(existing.trainingPlanId, replaced);

    return mapMemoryWorkout(updated);
  }

  const pool = getPool();
  const matrix = {
    status: updates.status,
    pre_run_sleep_quality: updates.preRunSleepQuality,
    pre_run_body_feel: updates.preRunBodyFeel,
    user_feedback_difficulty: updates.userFeedbackDifficulty,
    user_feedback_notes: updates.userFeedbackNotes,
  };

  const entries = Object.entries(matrix).filter(([, value]) => typeof value !== 'undefined');

  if (!entries.length) {
    return getWorkoutById(workoutId);
  }

  const setClauses = entries.map(([column], idx) => `${column} = $${idx + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(workoutId);

  const { rows } = await pool.query(
    `UPDATE workouts
     SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );

  return rows.length ? mapRowToWorkout(rows[0]) : null;
};

module.exports = {
  listWorkoutsForPlan,
  replacePlanWorkouts,
  getWorkoutById,
  updateWorkoutFields,
};
