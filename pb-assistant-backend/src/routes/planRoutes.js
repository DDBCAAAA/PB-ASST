const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const planController = require('../controllers/planController');

const router = Router();

router.post('/', authMiddleware, planController.createPlan);
router.get('/latest', authMiddleware, planController.getLatestPlan);

module.exports = router;
