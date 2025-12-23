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

// Registration OTP endpoints (separate from login OTP)
router.post('/send-otp-for-registration', (req, res, next) => {
  // Only validate mobile format
  if (!req.body.mobile || !/^[0-9]{10}$/.test(req.body.mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit mobile number'
    });
  }
  next();
}, authController.sendOtpForRegistration);

router.post('/verify-otp-for-registration', (req, res, next) => {
  // Validate mobile and OTP format
  if (!req.body.mobile || !/^[0-9]{10}$/.test(req.body.mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit mobile number'
    });
  }
  if (!req.body.otp || !/^[0-9]{6}$/.test(req.body.otp)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 6-digit OTP'
    });
  }
  next();
}, authController.verifyOtpForRegistration);

// Login/other OTP endpoints (user must exist)
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
