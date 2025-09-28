const { randomUUID } = require('crypto');
const { getPoolOrNull, getPool } = require('../config/database');

const memoryPlans = new Map();
const memoryPlansByUser = new Map();

const parseJsonColumn = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse JSON column', error);
    return null;
  }
};

const mapRowToPlan = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    goalRaceDistance: row.goal_race_distance,
    goalRaceDate: row.goal_race_date,
    goalFinishTime: row.goal_finish_time,
    goalTargetTimeSeconds: row.goal_target_time_seconds,
    goalNotes: row.goal_notes,
    status: row.status,
    aiModel: row.ai_model,
    promptContext: parseJsonColumn(row.prompt_context),
    planPayload: parseJsonColumn(row.plan_payload),
    generationNotes: row.generation_notes,
    confidenceScore: row.confidence_score,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapMemoryPlan = (plan) => ({
  ...plan,
  promptContext: plan.promptContext ? JSON.parse(JSON.stringify(plan.promptContext)) : null,
  planPayload: plan.planPayload ? JSON.parse(JSON.stringify(plan.planPayload)) : null,
});

const useMemoryStore = () => !getPoolOrNull();

const storePlanInMemory = (plan) => {
  memoryPlans.set(plan.id, plan);
  if (!memoryPlansByUser.has(plan.userId)) {
    memoryPlansByUser.set(plan.userId, new Map());
  }
  memoryPlansByUser.get(plan.userId).set(plan.id, plan);

  return mapMemoryPlan(plan);
};

const createPlanDraft = async ({
  userId,
  goalRaceDistance,
  goalRaceDate,
  goalTargetTimeSeconds = null,
  goalNotes = null,
  status = 'draft',
  aiModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  promptContext = null,
}) => {
  if (!userId) {
    throw new Error('userId is required to create a plan.');
  }

  if (!goalRaceDistance || !goalRaceDate) {
    throw new Error('Both goal race distance and date are required.');
  }

  if (useMemoryStore()) {
    const plan = {
      id: `mem-plan-${randomUUID()}`,
      userId,
      goalRaceDistance,
      goalRaceDate,
      goalTargetTimeSeconds,
      goalNotes,
      status,
      aiModel,
      promptContext,
      planPayload: null,
      generationNotes: null,
      confidenceScore: null,
      generatedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return storePlanInMemory(plan);
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO training_plans (
      user_id,
      goal_race_distance,
      goal_race_date,
      goal_target_time_seconds,
      goal_notes,
      status,
      ai_model,
      prompt_context
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    RETURNING *`,
    [
      userId,
      goalRaceDistance,
      goalRaceDate,
      goalTargetTimeSeconds,
      goalNotes,
      status,
      aiModel,
      promptContext ? JSON.stringify(promptContext) : null,
    ],
  );

  return mapRowToPlan(rows[0]);
};

const updatePlanRecord = async (planId, updates = {}) => {
  if (!planId) {
    throw new Error('planId is required to update a plan.');
  }

  if (useMemoryStore()) {
    const existing = memoryPlans.get(planId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.promptContext) {
      updated.promptContext = updates.promptContext;
    }
    if (updates.planPayload) {
      updated.planPayload = updates.planPayload;
    }

    return storePlanInMemory(updated);
  }

  const pool = getPool();
  const matrix = {
    status: updates.status,
    ai_model: updates.aiModel,
    prompt_context: updates.promptContext ? JSON.stringify(updates.promptContext) : undefined,
    plan_payload: updates.planPayload ? JSON.stringify(updates.planPayload) : undefined,
    generation_notes: updates.generationNotes,
    confidence_score: updates.confidenceScore,
    generated_at: updates.generatedAt,
    goal_target_time_seconds: updates.goalTargetTimeSeconds,
    goal_notes: updates.goalNotes,
  };

  const entries = Object.entries(matrix).filter(([, value]) => typeof value !== 'undefined');

  if (!entries.length) {
    const { rows } = await pool.query('SELECT * FROM training_plans WHERE id = $1', [planId]);
    return rows.length ? mapRowToPlan(rows[0]) : null;
  }

  const setClauses = entries.map(([column], idx) => `${column} = $${idx + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(planId);

  const { rows } = await pool.query(
    `UPDATE training_plans
     SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );

  return rows.length ? mapRowToPlan(rows[0]) : null;
};

const getPlanById = async (planId) => {
  if (!planId) return null;

  if (useMemoryStore()) {
    return memoryPlans.has(planId) ? mapMemoryPlan(memoryPlans.get(planId)) : null;
  }

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM training_plans WHERE id = $1', [planId]);
  return rows.length ? mapRowToPlan(rows[0]) : null;
};

const listPlansForUser = async (userId, { status } = {}) => {
  if (!userId) return [];

  if (useMemoryStore()) {
    const plans = memoryPlansByUser.get(userId);
    if (!plans) return [];
    let result = Array.from(plans.values()).map(mapMemoryPlan);
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      result = result.filter((plan) => statuses.includes(plan.status));
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const pool = getPool();
  const clauses = ['user_id = $1'];
  const values = [userId];

  if (status) {
    if (Array.isArray(status)) {
      clauses.push(`status = ANY($${values.length + 1})`);
      values.push(status);
    } else {
      clauses.push(`status = $${values.length + 1}`);
      values.push(status);
    }
  }

  const { rows } = await pool.query(
    `SELECT * FROM training_plans
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC`,
    values,
  );

  return rows.map(mapRowToPlan);
};

module.exports = {
  createPlanDraft,
  updatePlanRecord,
  getPlanById,
  listPlansForUser,
};
