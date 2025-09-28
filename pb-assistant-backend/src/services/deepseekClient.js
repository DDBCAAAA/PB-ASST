const fetch = globalThis.fetch || require('node-fetch');

const DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

const isMockMode = () =>
  process.env.DEEPSEEK_MOCK_MODE === 'true' || !process.env.DEEPSEEK_API_KEY;

const invokeDeepseek = async (payload) => {
  if (isMockMode()) {
    return {
      mock: true,
      raw: null,
      content: JSON.stringify(buildMockPlan(payload.promptContext), null, 2),
    };
  }

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: payload.model,
      messages: payload.messages,
      response_format: payload.response_format,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek request failed with status ${response.status}: ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('DeepSeek response missing message content.');
  }

  return {
    mock: false,
    raw: data,
    content,
  };
};

const buildMockPlan = (context = {}) => {
  const today = new Date();
  const startDate = new Date(context?.goal?.raceDate || today);
  const weeks = 4;

  const workouts = Array.from({ length: weeks }, (_, weekIdx) => {
    const weekNumber = weekIdx + 1;
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() - (weeks - weekNumber) * 7);

    return {
      weekNumber,
      microcycleFocus: weekNumber === weeks ? 'Taper & sharpen' : 'Endurance + speed endurance',
      workouts: ['Monday', 'Wednesday', 'Friday', 'Sunday'].map((dayName, idx) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() - weekStart.getDay() + idx * 2);
        return {
          day: dayDate.toISOString().slice(0, 10),
          workoutType: idx === 3 ? 'Long Run' : idx === 1 ? 'Quality Session' : 'Easy Run',
          description:
            idx === 3
              ? 'Long aerobic run building endurance.'
              : idx === 1
              ? 'Threshold intervals to build speed endurance.'
              : 'Easy effort run for aerobic base.',
          distanceKm: idx === 3 ? 18 : idx === 1 ? 10 : 6,
          targetPace: idx === 1 ? '4:45 min/km' : '5:30-5:45 min/km',
          effort: idx === 1 ? 'Hard' : 'Easy',
          notes: idx === 3 ? 'Fuel well and prioritize recovery.' : undefined,
        };
      }),
    };
  });

  return {
    planSummary: {
      totalWeeks: weeks,
      weeklyMileageRangeKm: { min: 40, max: 55 },
      focusAreas: ['Aerobic base', 'Threshold', 'Race specificity'],
      confidenceScore: 0.72,
    },
    weeks: workouts,
    metadata: {
      modelVersion: process.env.DEEPSEEK_MODEL || 'mock-model',
      generatedAtIso: new Date().toISOString(),
      disclaimers: ['Mock plan generated without contacting DeepSeek.'],
    },
  };
};

module.exports = {
  invokeDeepseek,
  isMockMode,
};
