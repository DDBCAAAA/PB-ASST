const { getUserById, updateUserProfile } = require('../models/userRepository');

const getCurrentUser = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Failed to fetch current user', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

const updateCurrentUser = async (req, res) => {
  try {
    const {
      displayName,
      avatarUrl,
      gender,
      birthdate,
      heightCm,
      weightKg,
      weeklyTrainingDays,
      bestRaceDistance,
      bestRaceTimeSeconds,
      timezone,
    } = req.body;

    const updated = await updateUserProfile(req.user.id, {
      displayName,
      avatarUrl,
      gender,
      birthdate,
      heightCm,
      weightKg,
      weeklyTrainingDays,
      bestRaceDistance,
      bestRaceTimeSeconds,
      timezone,
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Failed to update current user', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
};

module.exports = {
  getCurrentUser,
  updateCurrentUser,
};
