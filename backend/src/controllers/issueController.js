const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

class IssueController {
  // Get all issues with filters
  async getIssues(req, res) {
    try {
      const {
        status,
        category,
        priority,
        assignedTo,
        reportedBy,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        search,
        latitude,
        longitude,
        radius = 5000
      } = req.query;

      // Build filter object
      const filter = { isPublic: true };

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (category) {
        filter.category = category;
      }

      if (priority) {
        filter.priority = priority;
      }

      if (assignedTo) {
        filter.assignedTo = assignedTo;
      }

      if (reportedBy) {
        filter.reportedBy = reportedBy;
      }

      // Search functionality
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'location.name': { $regex: search, $options: 'i' } }
        ];
      }

      // Location-based filtering
      if (latitude && longitude) {
        filter['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(radius)
          }
        };
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const issues = await Issue.find(filter)
        .populate('reportedBy', 'name email profileImage')
        .populate('assignedTo', 'name email profileImage')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Issue.countDocuments(filter);

      res.json({
        success: true,
        data: {
          issues,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get issues error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting issues',
        error: error.message
      });
    }
  }

  // Get single issue
  async getIssue(req, res) {
    try {
      const { id } = req.params;

      const issue = await Issue.findById(id)
        .populate('reportedBy', 'name email profileImage')
        .populate('assignedTo', 'name email profileImage')
        .populate('assignedBy', 'name email profileImage');

      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      res.json({
        success: true,
        data: { issue }
      });
    } catch (error) {
      console.error('Get issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting issue',
        error: error.message
      });
    }
  }

  // Create new issue
  async createIssue(req, res) {
    try {
      const {
        title,
        description,
        category,
        location,
        priority = 'medium',
        tags = [],
        isAnonymous = false
      } = req.body;

      // Normalize images coming from JSON body (frontend uploads to Cloudinary first)
      let images = [];
      try {
        const bodyImages = req.body.images;
        if (bodyImages) {
          const parsed = typeof bodyImages === 'string' ? JSON.parse(bodyImages) : bodyImages;
          if (Array.isArray(parsed)) {
            images = parsed
              .map((img) => {
                if (typeof img === 'string') {
                  return { url: img };
                }
                const url = img.url || img.secure_url || img.secureUrl || null;
                const publicId = img.publicId || img.public_id || null;
                if (!url) return null;
                return { url, publicId, caption: img.caption };
              })
              .filter((i) => i && i.url);
          }
        }
      } catch (_) { /* ignore malformed images */ }

      // Fallback to files-based uploads if provided
      if ((!images || images.length === 0) && req.files?.images) {
        images = req.files.images;
      }

      const issue = new Issue({
        title,
        description,
        category,
        location,
        priority,
        tags,
        isAnonymous,
        reportedBy: req.user._id,
        images: images || [],
        documents: req.files?.documents || []
      });

      await issue.save();

      // Populate the issue with user data
      await issue.populate('reportedBy', 'name email profileImage');

      // Notify admins about new issue
      await notificationService.notifyAdminsNewIssue(issue, req.user);

      res.status(201).json({
        success: true,
        message: 'Issue created successfully',
        data: { issue }
      });
    } catch (error) {
      console.error('Create issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating issue',
        error: error.message
      });
    }
  }

  // Update issue
  async updateIssue(req, res) {
    try {
      const { id } = req.params;
      const { title, description, category, priority, tags } = req.body;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin' && issue.reportedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this issue'
        });
      }

      // Update fields
      if (title) issue.title = title;
      if (description) issue.description = description;
      if (category) issue.category = category;
      if (priority) issue.priority = priority;
      if (tags) issue.tags = tags;

      await issue.save();

      // If status changed to resolved, notify reporter and admins
      if (issue.status === 'resolved') {
        await notificationService.notifyIssueResolved(issue, req.user);
      }

      res.json({
        success: true,
        message: 'Issue updated successfully',
        data: { issue }
      });
    } catch (error) {
      console.error('Update issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating issue',
        error: error.message
      });
    }
  }

  // Upvote issue
  async upvoteIssue(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      // Check if user already upvoted
      if (issue.upvotedBy.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: 'You have already upvoted this issue'
        });
      }

      // Add upvote
      await issue.upvote(userId);

      // Notify the reporter about upvote
      await notificationService.notifyUpvoteReceived(issue, req.user);

      res.json({
        success: true,
        message: 'Issue upvoted successfully',
        data: {
          upvotes: issue.upvotes,
          upvoted: true
        }
      });
    } catch (error) {
      console.error('Upvote issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error upvoting issue',
        error: error.message
      });
    }
  }

  // Remove upvote
  async removeUpvote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      // Remove upvote
      await issue.removeUpvote(userId);

      res.json({
        success: true,
        message: 'Upvote removed successfully',
        data: {
          upvotes: issue.upvotes,
          upvoted: false
        }
      });
    } catch (error) {
      console.error('Remove upvote error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error removing upvote',
        error: error.message
      });
    }
  }

  // Get issue comments
  async getIssueComments(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const comments = await Comment.getIssueComments(id, page, limit);
      const stats = await Comment.getStats(id);

      res.json({
        success: true,
        data: {
          comments,
          stats: stats[0] || {
            totalComments: 0,
            totalLikes: 0,
            adminComments: 0,
            citizenComments: 0
          },
          pagination: {
            currentPage: parseInt(page),
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get issue comments error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting comments',
        error: error.message
      });
    }
  }

  // Add comment to issue
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { content, isInternal = false } = req.body;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      const comment = new Comment({
        issue: id,
        author: req.user._id,
        content,
        isInternal,
        isAdmin: req.user.role === 'admin'
      });

      await comment.save();
      await comment.populate('author', 'name email profileImage role');

      // Notify about new comment
      await notificationService.notifyNewComment(issue, comment, req.user);

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: { comment }
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error adding comment',
        error: error.message
      });
    }
  }

  // Get nearby issues
  async getNearbyIssues(req, res) {
    try {
      const { latitude, longitude, radius = 5000, limit = 20 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const issues = await Issue.findNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        parseInt(radius)
      )
      .populate('reportedBy', 'name email profileImage')
      .populate('assignedTo', 'name email profileImage')
      .limit(parseInt(limit));

      res.json({
        success: true,
        data: { issues }
      });
    } catch (error) {
      console.error('Get nearby issues error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting nearby issues',
        error: error.message
      });
    }
  }

  // Get user's issues
  async getUserIssues(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      // Check permissions
      if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these issues'
        });
      }

      const filter = { reportedBy: userId };
      if (status && status !== 'all') {
        filter.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const issues = await Issue.find(filter)
        .populate('assignedTo', 'name email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Issue.countDocuments(filter);

      res.json({
        success: true,
        data: {
          issues,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get user issues error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting user issues',
        error: error.message
      });
    }
  }

  // Delete issue
  async deleteIssue(req, res) {
    try {
      const { id } = req.params;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      // Check permissions
      if (req.user.role !== 'admin' && issue.reportedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this issue'
        });
      }

      await Issue.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Issue deleted successfully'
      });
    } catch (error) {
      console.error('Delete issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting issue',
        error: error.message
      });
    }
  }

  // Get issue statistics
  async getIssueStats(req, res) {
    try {
      const stats = await Issue.getStats();
      const categoryStats = await Issue.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          overall: stats[0] || {
            total: 0,
            reported: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
            avgResolutionTime: 0
          },
          byCategory: categoryStats
        }
      });
    } catch (error) {
      console.error('Get issue stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting issue statistics',
        error: error.message
      });
    }
  }
}

module.exports = new IssueController();
