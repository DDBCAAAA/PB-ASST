const { Router } = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const planRoutes = require('./planRoutes');
const workoutRoutes = require('./workoutRoutes');

const router = Router();

router.get('/health', healthController.healthCheck);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/plans', planRoutes);
router.use('/workouts', workoutRoutes);

module.exports = router;
