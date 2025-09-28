const { randomUUID } = require('crypto');
const { getPoolOrNull } = require('../config/database');

const memoryUsersByIdentity = new Map();
const memoryUsersById = new Map();

const mapDbRowToUser = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    provider: row.provider,
    providerUserId: row.provider_user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    gender: row.gender,
    birthdate: row.birthdate,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    weeklyTrainingDays: row.weekly_training_days,
    bestRaceDistance: row.best_race_distance,
    bestRaceTimeSeconds: row.best_race_time_seconds,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
};

const mapMemoryUserToUser = (user) => ({
  id: user.id,
  provider: user.provider,
  providerUserId: user.providerUserId,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  gender: user.gender,
  birthdate: user.birthdate,
  heightCm: user.heightCm,
  weightKg: user.weightKg,
  weeklyTrainingDays: user.weeklyTrainingDays,
  bestRaceDistance: user.bestRaceDistance,
  bestRaceTimeSeconds: user.bestRaceTimeSeconds,
  timezone: user.timezone,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLoginAt: user.lastLoginAt,
});

const getIdentityKey = (provider, providerUserId) => `${provider}:${providerUserId}`;

const useMemoryStore = () => !getPoolOrNull();

const findByProviderUserId = async (provider, providerUserId) => {
  if (!provider || !providerUserId) return null;

  const pool = getPoolOrNull();
  if (!pool) {
    const key = getIdentityKey(provider, providerUserId);
    return memoryUsersByIdentity.has(key)
      ? mapMemoryUserToUser(memoryUsersByIdentity.get(key))
      : null;
  }

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE provider = $1 AND provider_user_id = $2',
    [provider, providerUserId],
  );
  return rows.length ? mapDbRowToUser(rows[0]) : null;
};

const createOrUpdateUserFromIdentity = async ({
  provider,
  providerUserId,
  displayName,
  avatarUrl,
}) => {
  if (!provider || !providerUserId) {
    throw new Error('Missing provider identity information.');
  }

  const now = new Date();

  if (useMemoryStore()) {
    const key = getIdentityKey(provider, providerUserId);
    const existing = memoryUsersByIdentity.get(key);
    const user = {
      id: existing?.id || `mem-${randomUUID()}`,
      provider,
      providerUserId,
      displayName: typeof displayName !== 'undefined' ? displayName : existing?.displayName,
      avatarUrl: typeof avatarUrl !== 'undefined' ? avatarUrl : existing?.avatarUrl,
      gender: existing?.gender,
      birthdate: existing?.birthdate,
      heightCm: existing?.heightCm,
      weightKg: existing?.weightKg,
      weeklyTrainingDays: existing?.weeklyTrainingDays,
      bestRaceDistance: existing?.bestRaceDistance,
      bestRaceTimeSeconds: existing?.bestRaceTimeSeconds,
      timezone: existing?.timezone,
      createdAt: existing?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
    };

    memoryUsersByIdentity.set(key, user);
    memoryUsersById.set(user.id, user);

    return mapMemoryUserToUser(user);
  }

  const pool = getPoolOrNull();
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_user_id, display_name, avatar_url, last_login_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider, provider_user_id) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, users.display_name),
       avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
       last_login_at = EXCLUDED.last_login_at
     RETURNING *`,
    [provider, providerUserId, displayName || null, avatarUrl || null, now],
  );

  return mapDbRowToUser(rows[0]);
};

const updateUserProfile = async (userId, payload) => {
  const now = new Date();

  if (useMemoryStore()) {
    const existing = memoryUsersById.get(userId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...payload,
      updatedAt: now.toISOString(),
    };

    const key = getIdentityKey(existing.provider, existing.providerUserId);
    memoryUsersById.set(userId, updated);
    memoryUsersByIdentity.set(key, updated);

    return mapMemoryUserToUser(updated);
  }

  const fields = [];
  const values = [];
  let index = 1;

  Object.entries({
    display_name: payload.displayName,
    avatar_url: payload.avatarUrl,
    gender: payload.gender,
    birthdate: payload.birthdate,
    height_cm: payload.heightCm,
    weight_kg: payload.weightKg,
    weekly_training_days: payload.weeklyTrainingDays,
    best_race_distance: payload.bestRaceDistance,
    best_race_time_seconds: payload.bestRaceTimeSeconds,
    timezone: payload.timezone,
  }).forEach(([column, value]) => {
    if (typeof value !== 'undefined') {
      fields.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }
  });

  const pool = getPoolOrNull();

  if (!fields.length) {
    return getUserById(userId);
  }

  values.push(now);
  values.push(userId);

  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = $${fields.length + 1}
     WHERE id = $${fields.length + 2}
     RETURNING *`,
    values,
  );

  return rows.length ? mapDbRowToUser(rows[0]) : null;
};

const getUserById = async (userId) => {
  if (!userId) return null;

  const pool = getPoolOrNull();
  if (!pool) {
    return memoryUsersById.has(userId)
      ? mapMemoryUserToUser(memoryUsersById.get(userId))
      : null;
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return rows.length ? mapDbRowToUser(rows[0]) : null;
};

module.exports = {
  findByProviderUserId,
  createOrUpdateUserFromIdentity,
  updateUserProfile,
  getUserById,
};
