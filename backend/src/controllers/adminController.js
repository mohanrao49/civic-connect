const Issue = require('../models/Issue');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

class AdminController {
  // Get admin dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const [
        issueStats,
        userStats,
        recentIssues,
        categoryStats,
        priorityStats
      ] = await Promise.all([
        Issue.getStats(),
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
              verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
              adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } }
            }
          }
        ]),
        Issue.find({ isPublic: true })
          .populate('reportedBy', 'name email')
          .populate('assignedTo', 'name email')
          .sort({ createdAt: -1 })
          .limit(10),
        Issue.aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          }
        ]),
        Issue.aggregate([
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          }
        ])
      ]);

      // Calculate SLA breaches (issues older than 5 days and not resolved)
      const slaBreaches = await Issue.countDocuments({
        status: { $in: ['reported', 'in-progress'] },
        createdAt: { $lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      });

      // Calculate average resolution time
      const resolvedIssues = await Issue.find({
        status: 'resolved',
        resolvedAt: { $exists: true }
      });

      let avgResolutionTime = 0;
      if (resolvedIssues.length > 0) {
        const totalDays = resolvedIssues.reduce((sum, issue) => {
          const resolutionTime = (issue.resolvedAt - issue.createdAt) / (1000 * 60 * 60 * 24);
          return sum + resolutionTime;
        }, 0);
        avgResolutionTime = Math.round(totalDays / resolvedIssues.length * 10) / 10;
      }

      res.json({
        success: true,
        data: {
          issues: issueStats[0] || {
            total: 0,
            reported: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0
          },
          users: userStats[0] || {
            totalUsers: 0,
            activeUsers: 0,
            verifiedUsers: 0,
            adminUsers: 0
          },
          slaBreaches,
          avgResolutionTime: `${avgResolutionTime} days`,
          recentIssues,
          categoryStats,
          priorityStats
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting dashboard statistics',
        error: error.message
      });
    }
  }

  // Get analytics data
  async getAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      let startDate;
      switch (period) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const [
        issueTrends,
        resolutionTrends,
        categoryDistribution,
        userActivity,
        topReporters
      ] = await Promise.all([
        // Issue creation trends
        Issue.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
          }
        ]),
        // Resolution trends
        Issue.aggregate([
          {
            $match: {
              status: 'resolved',
              resolvedAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$resolvedAt' },
                month: { $month: '$resolvedAt' },
                day: { $dayOfMonth: '$resolvedAt' }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
          }
        ]),
        // Category distribution
        Issue.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          }
        ]),
        // User activity
        User.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
          }
        ]),
        // Top reporters
        Issue.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: '$reportedBy',
              count: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: '$user'
          },
          {
            $project: {
              name: '$user.name',
              email: '$user.email',
              count: 1
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 10
          }
        ])
      ]);

      res.json({
        success: true,
        data: {
          period,
          issueTrends,
          resolutionTrends,
          categoryDistribution,
          userActivity,
          topReporters
        }
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting analytics',
        error: error.message
      });
    }
  }

  // Assign issue to user
  async assignIssue(req, res) {
    try {
      const { id } = req.params;
      const { assignedTo, reason } = req.body;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      let assignedUser = null;
      if (assignedTo) {
        assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
          return res.status(404).json({ success: false, message: 'Assigned user not found' });
        }
      } else {
        // Auto-assign by department based on issue category
        assignedUser = await User.findOne({ role: 'employee', isActive: true, department: issue.category }).sort({ loginCount: 1, lastLogin: -1 });
        if (!assignedUser) {
          // Optionally create a demo employee for this department in dev/demo mode
          const allowDemo = process.env.ALLOW_DEMO_EMPLOYEE !== 'false';
          if (allowDemo) {
            const empId = `employee-${(issue.category || 'dept').toLowerCase().replace(/[^a-z]+/g, '-')}`;
            const demo = new User({
              name: 'Auto Employee',
              employeeId: empId,
              role: 'employee',
              department: issue.category,
              password: 'emp123',
              isVerified: true,
              isActive: true
            });
            await demo.save();
            assignedUser = demo;
          } else {
            return res.status(400).json({ success: false, message: 'No active employee found for department' });
          }
        }
      }

      // Assign the issue
      await issue.assign(assignedUser._id, req.user._id);

      // Notify the assigned user
      await notificationService.notifyIssueAssignment(issue, assignedUser, req.user);

      res.json({
        success: true,
        message: 'Issue assigned successfully',
        data: { issue }
      });
    } catch (error) {
      console.error('Assign issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error assigning issue',
        error: error.message
      });
    }
  }

  // Update issue status
  async updateIssueStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      const oldStatus = issue.status;
      issue.status = status;

      if (status === 'resolved') {
        issue.resolvedAt = new Date();
        if (issue.createdAt) {
          issue.actualResolutionTime = Math.floor(
            (issue.resolvedAt - issue.createdAt) / (1000 * 60 * 60 * 24)
          );
        }
      }

      await issue.save();

      // Notify about status change
      await notificationService.notifyIssueStatusChange(issue, oldStatus, status, req.user);

      res.json({
        success: true,
        message: 'Issue status updated successfully',
        data: { issue }
      });
    } catch (error) {
      console.error('Update issue status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating issue status',
        error: error.message
      });
    }
  }

  // Get all users
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;

      const filter = {};
      if (role) filter.role = role;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await User.find(filter)
        .select('-password -otp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(filter);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting users',
        error: error.message
      });
    }
  }

  // Update user status
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive, role } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (isActive !== undefined) user.isActive = isActive;
      if (role) user.role = role;

      await user.save();

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: { user: user.getProfile() }
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating user status',
        error: error.message
      });
    }
  }

  // Get system notifications
  async getSystemNotifications(req, res) {
    try {
      const { page = 1, limit = 20, type } = req.query;

      const filter = {};
      if (type) filter.type = type;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const notifications = await Notification.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Notification.countDocuments(filter);

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get system notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting system notifications',
        error: error.message
      });
    }
  }

  // Send system announcement
  async sendAnnouncement(req, res) {
    try {
      const { title, message, targetUsers = 'all', priority = 'medium' } = req.body;

      let users;
      if (targetUsers === 'all') {
        users = await User.find({ isActive: true });
      } else if (targetUsers === 'citizens') {
        users = await User.find({ role: 'citizen', isActive: true });
      } else if (targetUsers === 'admins') {
        users = await User.find({ role: 'admin', isActive: true });
      }

      // Create notifications for all target users
      const notifications = users.map(user => ({
        user: user._id,
        type: 'system_announcement',
        title,
        message,
        priority,
        data: {
          metadata: {
            announcement: true
          }
        }
      }));

      await Notification.insertMany(notifications);

      res.json({
        success: true,
        message: 'Announcement sent successfully',
        data: {
          recipients: users.length
        }
      });
    } catch (error) {
      console.error('Send announcement error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error sending announcement',
        error: error.message
      });
    }
  }

  // Get issue reports
  async getIssueReports(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;

      const filter = {};
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const issues = await Issue.find(filter)
        .populate('reportedBy', 'name email mobile')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      if (format === 'csv') {
        // Generate CSV format
        const csvData = issues.map(issue => ({
          'Issue ID': issue._id,
          'Title': issue.title,
          'Category': issue.category,
          'Status': issue.status,
          'Priority': issue.priority,
          'Reporter': issue.reportedBy?.name || 'Anonymous',
          'Reporter Email': issue.reportedBy?.email || '',
          'Reporter Mobile': issue.reportedBy?.mobile || '',
          'Assigned To': issue.assignedTo?.name || 'Unassigned',
          'Location': issue.location.name,
          'Created At': issue.createdAt,
          'Resolved At': issue.resolvedAt || '',
          'Resolution Time (Days)': issue.actualResolutionTime || ''
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=issues-report.csv');
        
        // Simple CSV generation
        const headers = Object.keys(csvData[0] || {});
        const csvContent = [
          headers.join(','),
          ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        return res.send(csvContent);
      }

      res.json({
        success: true,
        data: { issues }
      });
    } catch (error) {
      console.error('Get issue reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting issue reports',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();
