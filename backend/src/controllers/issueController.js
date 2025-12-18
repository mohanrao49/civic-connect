const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

class IssueController {

  // ===============================
  // GET ALL ISSUES
  // ===============================
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

      const filter = { isPublic: true };

      if (status && status !== 'all') filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      if (assignedTo) filter.assignedTo = assignedTo;
      if (reportedBy) filter.reportedBy = reportedBy;

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'location.name': { $regex: search, $options: 'i' } }
        ];
      }

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

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const issues = await Issue.find(filter)
        .populate('reportedBy', 'name email profileImage')
        .populate('assignedTo', 'name email profileImage')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Issue.countDocuments(filter);

      res.json({
        success: true,
        data: {
          issues,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===============================
  // GET SINGLE ISSUE
  // ===============================
  async getIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id)
        .populate('reportedBy', 'name email profileImage')
        .populate('assignedTo', 'name email profileImage');

      if (!issue) {
        return res.status(404).json({ success: false, message: 'Issue not found' });
      }

      res.json({ success: true, data: { issue } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===============================
  // CREATE ISSUE (ML INTEGRATED)
  // ===============================
  async createIssue(req, res) {
    try {
      const {
        title,
        description,
        category,
        location,
        tags = [],
        isAnonymous = false
      } = req.body;

      // ---------- ML VALIDATION ----------
      const mlPayload = {
        report_id: uuidv4(),
        description,
        category,
        user_id: req.user._id.toString(),
        image_url: null,
        latitude: location?.coordinates?.[1] || null,
        longitude: location?.coordinates?.[0] || null
      };

      const mlResponse = await fetch(process.env.ML_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload)
      });

      if (!mlResponse.ok) {
        return res.status(502).json({ success: false, message: 'ML service unavailable' });
      }

      const mlResult = await mlResponse.json();

      if (mlResult.status === 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'Issue rejected by ML',
          reason: mlResult.reason
        });
      }

      // ---------- IMAGE NORMALIZATION ----------
      let images = [];
      try {
        const parsed = typeof req.body.images === 'string'
          ? JSON.parse(req.body.images)
          : req.body.images;

        if (Array.isArray(parsed)) {
          images = parsed
            .map(img => {
              if (typeof img === 'string') return { url: img };
              const url = img.url || img.secure_url;
              return url ? { url, caption: img.caption } : null;
            })
            .filter(Boolean);
        }
      } catch (_) {}

      if ((!images || images.length === 0) && req.files?.images) {
        images = req.files.images;
      }

      // ---------- SAVE ISSUE ----------
      const issue = new Issue({
        title,
        description,
        category,
        location,
        priority: mlResult.priority || 'normal',
        tags,
        isAnonymous,
        reportedBy: req.user._id,
        images,
        documents: req.files?.documents || []
      });

      await issue.save();
      await issue.populate('reportedBy', 'name email profileImage');

      await notificationService.notifyAdminsNewIssue(issue, req.user);

      res.status(201).json({
        success: true,
        message: 'Issue created successfully',
        data: { issue, ml: mlResult }
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===============================
  // UPDATE ISSUE
  // ===============================
  async updateIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      if (!issue) return res.status(404).json({ success: false });

      if (req.user.role !== 'admin' &&
          issue.reportedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false });
      }

      Object.assign(issue, req.body);
      await issue.save();

      res.json({ success: true, data: { issue } });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  // ===============================
  // DELETE ISSUE
  // ===============================
  async deleteIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      if (!issue) return res.status(404).json({ success: false });

      await issue.deleteOne();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  // ===============================
  // UPVOTE ISSUE
  // ===============================
  async upvoteIssue(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      await issue.upvote(req.user._id);
      res.json({ success: true, upvotes: issue.upvotes });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  async removeUpvote(req, res) {
    try {
      const issue = await Issue.findById(req.params.id);
      await issue.removeUpvote(req.user._id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  // ===============================
  // COMMENTS
  // ===============================
  async getIssueComments(req, res) {
    try {
      const comments = await Comment.getIssueComments(req.params.id);
      res.json({ success: true, data: comments });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }

  async addComment(req, res) {
    try {
      const comment = new Comment({
        issue: req.params.id,
        author: req.user._id,
        content: req.body.content
      });
      await comment.save();
      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }
}

module.exports = new IssueController();
