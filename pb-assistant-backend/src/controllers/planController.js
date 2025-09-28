const { buildPlanPrompt } = require('../services/planPromptBuilder');
const { invokeDeepseek, isMockMode } = require('../services/deepseekClient');
const {
  userRepository,
  trainingPlanRepository,
  workoutRepository,
} = require('../models');

const parsePlanPayload = (content) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Failed to parse AI response as JSON.');
  }
};

const flattenWorkouts = (planPayload = {}) => {
  const weeks = planPayload.weeks || [];
  const workouts = [];

  weeks.forEach((week) => {
    (week.workouts || []).forEach((workout) => {
      workouts.push({
        scheduledDate: workout.day,
        workoutType: workout.workoutType || workout.type || 'Workout',
        description: workout.description,
        distanceKm: workout.distanceKm ?? workout.distance_km ?? null,
        targetPace: workout.targetPace ?? workout.pace ?? null,
        status: 'scheduled',
        additionalPayload: {
          effort: workout.effort,
          notes: workout.notes,
          weekNumber: week.weekNumber,
          microcycleFocus: week.microcycleFocus,
        },
      });
    });
  });

  return workouts;
};

const createPlan = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const fullUser = await userRepository.getUserById(user.id);
    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      raceDate,
      raceDistance,
      targetFinishTimeSeconds,
      goalNotes,
      weeklyTrainingDays,
      longRunDay,
      availableEquipment,
    } = req.body || {};

    if (!raceDate || !raceDistance) {
      return res.status(400).json({ error: 'raceDate and raceDistance are required.' });
    }

    const promptPayload = buildPlanPrompt({
      user: fullUser,
      goal: {
        raceDate,
        raceDistance,
        targetFinishTimeSeconds,
        description: goalNotes,
        weeklyTrainingDays,
        longRunDay,
        availableEquipment,
      },
    });

    const draftPlan = await trainingPlanRepository.createPlanDraft({
      userId: fullUser.id,
      goalRaceDistance: raceDistance,
      goalRaceDate: raceDate,
      goalTargetTimeSeconds: targetFinishTimeSeconds ?? null,
      goalNotes: goalNotes ?? null,
      status: 'pending',
      aiModel: promptPayload.model,
      promptContext: promptPayload.promptContext,
    });

    let responseContent;
    let rawResponse = null;

    try {
      const aiResponse = await invokeDeepseek(promptPayload);
      responseContent = aiResponse.content;
      rawResponse = aiResponse.raw;
    } catch (error) {
      await trainingPlanRepository.updatePlanRecord(draftPlan.id, {
        status: 'failed',
        generationNotes: error.message,
      });
      throw error;
    }

    const planPayload = parsePlanPayload(responseContent);
    const workouts = flattenWorkouts(planPayload);

    const confidenceScore =
      planPayload?.planSummary?.confidenceScore ?? planPayload?.planSummary?.confidence ?? null;

    const completedPlan = await trainingPlanRepository.updatePlanRecord(draftPlan.id, {
      status: 'completed',
      planPayload,
      confidenceScore,
      generationNotes: isMockMode()
        ? 'Plan generated using mock mode. No call to DeepSeek was made.'
        : undefined,
      generatedAt: planPayload?.metadata?.generatedAtIso || new Date().toISOString(),
    });

    const normalizedWorkouts = await workoutRepository.replacePlanWorkouts(draftPlan.id, workouts);

    return res.status(201).json({
      plan: completedPlan,
      workouts: normalizedWorkouts,
      rawResponse,
    });
  } catch (error) {
    console.error('Plan generation failed', error);
    return res.status(500).json({ error: error.message || 'Failed to generate training plan.' });
  }
};

module.exports = {
  createPlan,
  getLatestPlan: async (req, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const plans = await trainingPlanRepository.listPlansForUser(user.id, {
        status: ['completed'],
      });

      if (!plans.length) {
        return res.status(404).json({ plan: null, workouts: [] });
      }

      const latestPlan = plans[0];
      const workouts = await workoutRepository.listWorkoutsForPlan(latestPlan.id);

      return res.status(200).json({
        plan: latestPlan,
        workouts,
      });
    } catch (error) {
      console.error('Failed to load latest plan', error);
      return res.status(500).json({ error: 'Failed to load latest plan.' });
    }
  },
};
