const Issue = require('../models/Issue');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

class EmployeeController {
  async listAssignedIssues(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filter = {
        status: { $in: ['reported', 'in-progress'] },
        $or: [
          { assignedTo: req.user._id },
          { category: req.user.department }
        ]
      };

      const issues = await Issue.find(filter)
        .populate('reportedBy', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      res.json({ success: true, data: { issues } });
    } catch (error) {
      console.error('List assigned issues error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async resolveIssue(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      const issue = await Issue.findById(id);
      if (!issue) {
        return res.status(404).json({ success: false, message: 'Issue not found' });
      }

      // Authorization: allow if admin OR assigned to user OR same department
      const sameDepartment = issue.category === req.user.department;
      const isAssignedToUser = issue.assignedTo?.toString() === req.user._id.toString();
      if (req.user.role !== 'admin' && !isAssignedToUser && !sameDepartment) {
        return res.status(403).json({ success: false, message: 'Not authorized to resolve this issue' });
      }

      // If not assigned or assigned to another but same department, reassign to current employee for accountability
      if (!isAssignedToUser) {
        issue.assignedTo = req.user._id;
        issue.assignedBy = req.user._id;
        issue.assignedAt = new Date();
      }

      // Attach resolved photo if provided via upload middleware
      if (req.file) {
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const fileUrl = (process.env.CLOUDINARY_CLOUD_NAME)
          ? req.file.cloudinaryUrl // if upstream middleware sets
          : `${baseUrl}/uploads/${req.file.filename}`;

        issue.resolved = issue.resolved || {};
        issue.resolved.photo = {
          url: fileUrl,
          publicId: req.file.publicId || req.file.filename
        };
      }

      // Validate GPS coordinates are within 10 meters of original issue location
      if (latitude && longitude) {
        const originalLat = issue.location?.coordinates?.latitude;
        const originalLng = issue.location?.coordinates?.longitude;
        
        if (originalLat && originalLng) {
          // Calculate distance using Haversine formula (approximate)
          const R = 6371000; // Earth's radius in meters
          const dLat = (parseFloat(latitude) - originalLat) * Math.PI / 180;
          const dLng = (parseFloat(longitude) - originalLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(originalLat * Math.PI / 180) * Math.cos(parseFloat(latitude) * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c; // Distance in meters
          
          if (distance > 10) {
            return res.status(400).json({ 
              success: false, 
              message: `Resolved location must be within 10 meters of reported location. Current distance: ${Math.round(distance)}m` 
            });
          }
        }
        
        issue.resolved = issue.resolved || {};
        issue.resolved.location = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        };
      }

      issue.resolvedAt = new Date();
      issue.status = 'resolved';
      issue.resolved = issue.resolved || {};
      issue.resolved.resolvedBy = req.user._id;
      if (issue.createdAt) {
        issue.actualResolutionTime = Math.floor((issue.resolvedAt - issue.createdAt) / (1000 * 60 * 60 * 24));
      }

      await issue.save();

      await notificationService.notifyIssueResolved(issue, req.user);

      res.json({ success: true, message: 'Issue resolved', data: { issue } });
    } catch (error) {
      console.error('Resolve issue error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
}

module.exports = new EmployeeController();


