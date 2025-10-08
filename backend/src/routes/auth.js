const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validateOTPRequest,
  validateOTPVerification
} = require('../middleware/validation');

// Public routes
router.post('/register', validateUserRegistration, authController.register);
router.post('/login', validateUserLogin, authController.login);
router.post('/send-otp', validateOTPRequest, authController.sendOTP);
router.post('/verify-otp', validateOTPVerification, authController.verifyOTP);
router.post('/guest', authController.guestLogin);
router.post('/admin-login', authController.adminLogin);
router.post('/employee-login', authController.employeeLogin);

// Token refresh
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
