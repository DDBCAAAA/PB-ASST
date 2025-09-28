const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();

router.post('/wechat', authController.wechatLogin);
router.post('/oauth', authController.oauthLogin);

module.exports = router;
