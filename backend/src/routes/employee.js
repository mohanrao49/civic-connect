const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { uploadImage, validateFileType } = require('../middleware/upload');

// All employee routes require employee or admin
router.use(authenticate);
router.use(requireRoles(['employee', 'admin']));

// List issues for employee's department and assignments
router.get('/issues', validatePagination, employeeController.listAssignedIssues);

// Resolve an issue (upload image optional)
router.put('/issues/:id/resolve', validateObjectId('id'), uploadImage, validateFileType, employeeController.resolveIssue);

module.exports = router;


