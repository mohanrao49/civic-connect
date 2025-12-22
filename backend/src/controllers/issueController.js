const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
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

      // Role-based filtering
      const user = req.user;
      if (user) {
        const employeeRoles = ['field-staff', 'supervisor', 'commissioner', 'employee'];
        if (employeeRoles.includes(user.role)) {
          // Field Staff: Only see complaints assigned to them in their department
          if (user.role === 'field-staff' || user.role === 'employee') {
            filter.assignedTo = user._id;
            // Filter by department
            const userDepartments = user.departments && user.departments.length > 0 
              ? user.departments 
              : (user.department ? [user.department] : []);
            
            if (!userDepartments.includes('All')) {
              filter.category = { $in: userDepartments };
            }
          }
          // Supervisor: See complaints assigned to them + escalated from field-staff
          else if (user.role === 'supervisor') {
            filter.$or = [
              { assignedTo: user._id },
              { 
                assignedRole: 'field-staff',
                status: 'escalated',
                category: { 
                  $in: user.departments && user.departments.length > 0 
                    ? (user.departments.includes('All') ? [] : user.departments)
                    : (user.department && user.department !== 'All' ? [user.department] : [])
                }
              }
            ];
            
            // Filter by department if not 'All'
            const userDepartments = user.departments && user.departments.length > 0 
              ? user.departments 
              : (user.department ? [user.department] : []);
            
            if (!userDepartments.includes('All') && userDepartments.length > 0) {
              if (filter.$or) {
                filter.$or = filter.$or.map(condition => {
                  if (condition.category) {
                    condition.category = { $in: userDepartments };
                  }
                  return condition;
                });
              } else {
                filter.category = { $in: userDepartments };
              }
            }
          }
          // Commissioner: See ALL complaints from ALL departments
          else if (user.role === 'commissioner') {
            // No additional filtering - can see everything
          }
        }
      }

      if (status && status !== 'all') filter.status = status;
      if (category && !filter.category) filter.category = category;
      if (priority) filter.priority = priority;
      if (assignedTo && !filter.assignedTo) filter.assignedTo = assignedTo;
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
  // GET ISSUES FOR A SPECIFIC USER
  // ===============================
  async getUserIssues(req, res) {
    try {
      const { userId } = req.params;
      const {
        status,
        page = 1,
        limit = 20
      } = req.query;

      // Only allow a user to see their own issues, or admins to see anyone's
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

      const skip = (page - 1) * limit;

      const issues = await Issue.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10));

      const total = await Issue.countDocuments(filter);

      return res.json({
        success: true,
        data: {
          issues,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: Number(limit)
          }
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
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
        location,
        tags = [],
        isAnonymous = false
      } = req.body;

      // ---------- ML VALIDATION (NON-BLOCKING - OPTIONAL FOR CATEGORY DETECTION) ----------
      let category = req.body.category || 'Other'; // Use provided category or default
      let priority = req.body.priority || 'medium'; // Use provided priority or default
      let mlResult = null;

      // ML validation is now optional - if it fails, we proceed with provided/default category
      if (process.env.ML_API_URL) {
        try {
          const coords = location?.coordinates;
          const latitude = Array.isArray(coords) ? coords[0] : coords?.latitude || null;
          const longitude = Array.isArray(coords) ? coords[1] : coords?.longitude || null;

          // Get image URL from request if available
          let imageUrl = null;
          if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
            imageUrl = req.body.images[0].url || null;
          }

          const mlPayload = {
            report_id: uuidv4(),
            description,
            user_id: req.user._id.toString(),
            image_url: imageUrl,
            latitude,
            longitude
          };

          // Set a timeout for ML validation (45 seconds) - increased for Render cold starts
          // Use Promise.race for compatibility
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('ML_TIMEOUT')), 45000)
          );

          try {
            const mlResponse = await Promise.race([
              fetch(process.env.ML_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mlPayload)
              }),
              timeoutPromise
            ]);

            if (mlResponse.ok) {
              const parsed = await mlResponse.json();
              mlResult = parsed;

              // Only reject if ML explicitly rejects the report
              if (mlResult && mlResult.accept === false && mlResult.status === 'rejected') {
                const reason = mlResult.reason || 'Report rejected by validator';
                return res.status(400).json({
                  success: false,
                  message: reason,
                  reason: reason
                });
              }

              // Use ML-detected category if available
              if (mlResult && mlResult.category) {
                category = mlResult.category;
              }

              // Use ML-detected priority if available
              if (mlResult && mlResult.priority) {
                priority = mlResult.priority === 'urgent' ? 'urgent' : 'medium';
              }
            } else {
              // ML service returned error - log but continue with default category
              console.warn('ML service returned error, using default category:', mlResponse.status);
            }
          } catch (fetchError) {
            // Timeout or network error - log but continue with default category
            if (fetchError.message === 'ML_TIMEOUT') {
              console.warn('ML validation timeout, using default category');
            } else {
              console.warn('ML validation network error, using default category:', fetchError.message);
            }
          }
        } catch (mlError) {
          // Any other ML error - log but continue with default category
          console.warn('ML validation error (non-blocking), using default category:', mlError.message);
        }
      } else {
        // ML_API_URL not configured - use default category (non-blocking)
        console.log('ML_API_URL not configured, using default category');
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
      // Map priority to valid enum values: ['low', 'medium', 'high', 'urgent']
      // Priority is already set above from ML result or default
      const priorityMap = {
        'normal': 'medium',
        'urgent': 'urgent',
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
      };
      const finalPriority = priorityMap[priority?.toLowerCase()] || 'medium';
      
      const issue = new Issue({
        title,
        description,
        category, // Use ML-detected category or provided/default
        location,
        priority: finalPriority,
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

