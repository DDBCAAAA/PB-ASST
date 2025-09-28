const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const PLAN_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['planSummary', 'weeks', 'metadata'],
  properties: {
    planSummary: {
      type: 'object',
      required: ['totalWeeks', 'weeklyMileageRangeKm', 'focusAreas'],
      properties: {
        totalWeeks: { type: 'integer', minimum: 1 },
        weeklyMileageRangeKm: {
          type: 'object',
          required: ['min', 'max'],
          properties: {
            min: { type: 'number', minimum: 0 },
            max: { type: 'number', minimum: 0 },
          },
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string' },
        },
        confidenceScore: {
          type: 'number',
          minimum: 0,
          maximum: 1,
        },
      },
    },
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['weekNumber', 'microcycleFocus', 'workouts'],
        properties: {
          weekNumber: { type: 'integer', minimum: 1 },
          microcycleFocus: { type: 'string' },
          workouts: {
            type: 'array',
            items: {
              type: 'object',
              required: ['day', 'workoutType', 'description'],
              properties: {
                day: { type: 'string', description: 'ISO-8601 date' },
                workoutType: { type: 'string' },
                description: { type: 'string' },
                distanceKm: { type: 'number', minimum: 0 },
                targetPace: { type: 'string' },
                effort: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
    },
    metadata: {
      type: 'object',
      required: ['modelVersion', 'generatedAtIso'],
      properties: {
        modelVersion: { type: 'string' },
        generatedAtIso: { type: 'string', description: 'ISO-8601 timestamp' },
        disclaimers: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

const summariseUserProfile = (user = {}) => ({
  id: user.id,
  displayName: user.displayName,
  gender: user.gender,
  age: user.birthdate ? calculateAge(user.birthdate) : null,
  heightCm: user.heightCm,
  weightKg: user.weightKg,
  weeklyTrainingDays: user.weeklyTrainingDays,
  timezone: user.timezone,
  bestRaceDistance: user.bestRaceDistance,
  bestRaceTimeSeconds: user.bestRaceTimeSeconds,
});

const calculateAge = (birthdate) => {
  try {
    const dob = new Date(birthdate);
    if (Number.isNaN(dob.getTime())) {
      return null;
    }
    const diffMs = Date.now() - dob.getTime();
    return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  } catch (error) {
    return null;
  }
};

const normaliseGoal = (goal = {}) => ({
  raceDate: goal.raceDate,
  raceDistance: goal.raceDistance,
  targetFinishTimeSeconds: goal.targetFinishTimeSeconds ?? goal.goalTargetTimeSeconds ?? null,
  description: goal.description,
  constraints: {
    weeklyTrainingDays: goal.weeklyTrainingDays,
    longRunDay: goal.longRunDay,
    availableEquipment: goal.availableEquipment,
  },
});

const buildPlanPrompt = ({ user, goal }) => {
  if (!user?.id) {
    throw new Error('User context is required to build the plan prompt.');
  }
  if (!goal?.raceDate || !goal?.raceDistance) {
    throw new Error('Goal race distance and date are required to build the plan prompt.');
  }

  const profile = summariseUserProfile(user);
  const goalContext = normaliseGoal({
    ...goal,
    weeklyTrainingDays: goal.weeklyTrainingDays ?? user.weeklyTrainingDays,
  });

  const userContent = {
    persona: 'You are PB Assistant, an elite running coach focused on helping athletes achieve a personal best.',
    instructions: [
      'Generate a periodised plan that balances intensity, recovery, and progressive overload.',
      'Respect the athlete\'s available training days and highlight key workouts each week.',
      'Return JSON matching the provided schema. Do not include markdown or additional prose.',
      'Populate the confidence score between 0 and 1 based on how realistic the target appears.',
      'Populate mileage values in kilometres. Include pace using min/km or perceived effort terms.',
    ],
    athleteProfile: profile,
    goal: goalContext,
    outputSchema: PLAN_OUTPUT_SCHEMA,
  };

  return {
    model: DEFAULT_MODEL,
    response_format: PLAN_OUTPUT_SCHEMA,
    messages: [
      {
        role: 'system',
        content:
          'You are PB Assistant, an expert running coach. Respond ONLY with JSON strictly matching the provided schema. Avoid commentary.',
      },
      {
        role: 'user',
        content: JSON.stringify(userContent, null, 2),
      },
    ],
    promptContext: {
      profile,
      goal: goalContext,
      schema: PLAN_OUTPUT_SCHEMA,
    },
  };
};

module.exports = {
  PLAN_OUTPUT_SCHEMA,
  buildPlanPrompt,
};
