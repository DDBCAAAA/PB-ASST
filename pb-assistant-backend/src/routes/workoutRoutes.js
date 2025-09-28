const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const workoutController = require('../controllers/workoutController');

const router = Router();

router.post('/:id/checkin', authMiddleware, workoutController.checkinWorkout);
router.post('/:id/log', authMiddleware, workoutController.logWorkout);

module.exports = router;
