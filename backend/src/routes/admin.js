const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  validateObjectId,
  validatePagination,
  validateAdminAssignment
} = require('../middleware/validation');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard and analytics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// Issue management
router.put('/issues/:id/assign', validateObjectId('id'), validateAdminAssignment, adminController.assignIssue);
router.put('/issues/:id/status', validateObjectId('id'), adminController.updateIssueStatus);

// User management
router.get('/users', validatePagination, adminController.getUsers);
router.put('/users/:userId/status', validateObjectId('userId'), adminController.updateUserStatus);

// Employee management
router.post('/employees', adminController.createEmployee);
router.get('/employees', validatePagination, adminController.getEmployees);
router.put('/employees/:employeeId', adminController.updateEmployee);
router.delete('/employees/:employeeId', adminController.deleteEmployee);

// Notifications
router.get('/notifications', validatePagination, adminController.getSystemNotifications);
router.post('/announcement', adminController.sendAnnouncement);

// Reports
router.get('/reports/issues', adminController.getIssueReports);

module.exports = router;
