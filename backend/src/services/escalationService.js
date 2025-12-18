const Issue = require('../models/Issue');
const User = require('../models/User');
const notificationService = require('./notificationService');

/**
 * Escalation Service
 * Handles automatic escalation of complaints based on priority and time rules
 */

class EscalationService {
  /**
   * Check and escalate issues that have exceeded their time limits
   * This should be called periodically (e.g., every 15 minutes via cron job)
   */
  async checkAndEscalateIssues() {
    try {
      const now = new Date();
      
      // Find all issues that are in-progress or escalated and have exceeded their deadline
      const overdueIssues = await Issue.find({
        status: { $in: ['in-progress', 'escalated'] },
        escalationDeadline: { $lte: now },
        assignedRole: { $ne: 'commissioner' } // Don't escalate beyond commissioner
      }).populate('assignedTo', 'name employeeId role departments department');

      const escalationResults = [];

      for (const issue of overdueIssues) {
        try {
          const result = await this.escalateIssue(issue);
          if (result) {
            escalationResults.push({
              issueId: issue._id,
              title: issue.title,
              fromRole: issue.assignedRole,
              toRole: result.toRole,
              success: true
            });
          }
        } catch (error) {
          console.error(`Error escalating issue ${issue._id}:`, error);
          escalationResults.push({
            issueId: issue._id,
            title: issue.title,
            success: false,
            error: error.message
          });
        }
      }

      return {
        checked: overdueIssues.length,
        escalated: escalationResults.filter(r => r.success).length,
        failed: escalationResults.filter(r => !r.success).length,
        results: escalationResults
      };
    } catch (error) {
      console.error('Error in checkAndEscalateIssues:', error);
      throw error;
    }
  }

  /**
   * Escalate a single issue to the next level
   */
  async escalateIssue(issue) {
    if (!issue.assignedRole) {
      // If no role assigned, assign to field-staff first
      return await this.assignToFieldStaff(issue);
    }

    const currentRole = issue.assignedRole;
    let nextRole = null;

    // Determine next role in hierarchy
    if (currentRole === 'field-staff') {
      nextRole = 'supervisor';
    } else if (currentRole === 'supervisor') {
      nextRole = 'commissioner';
    } else if (currentRole === 'commissioner') {
      // Cannot escalate further
      return null;
    }

    if (!nextRole) {
      return null;
    }

    // Find appropriate user for next role
    const assignedUser = await this.findUserForRole(nextRole, issue.category);
    
    if (!assignedUser) {
      console.warn(`No ${nextRole} found for category ${issue.category}`);
      return null;
    }

    // Perform escalation
    await issue.escalate(nextRole, assignedUser._id, 'Auto-escalated: Time limit exceeded');

    // Update assignedTo
    issue.assignedTo = assignedUser._id;
    issue.assignedBy = assignedUser._id;
    await issue.save();

    // Notify the newly assigned user
    await notificationService.notifyIssueAssignment(issue, assignedUser, assignedUser);

    return {
      toRole: nextRole,
      assignedTo: assignedUser._id,
      assignedUser: assignedUser.getProfile()
    };
  }

  /**
   * Assign issue to field staff (initial assignment)
   */
  async assignToFieldStaff(issue) {
    const fieldStaff = await this.findUserForRole('field-staff', issue.category);
    
    if (!fieldStaff) {
      console.warn(`No field-staff found for category ${issue.category}`);
      return null;
    }

    const assignedRole = 'field-staff';
    await issue.assign(fieldStaff._id, fieldStaff._id, assignedRole);

    // Notify the assigned user
    await notificationService.notifyIssueAssignment(issue, fieldStaff, fieldStaff);

    return {
      toRole: assignedRole,
      assignedTo: fieldStaff._id,
      assignedUser: fieldStaff.getProfile()
    };
  }

  /**
   * Find appropriate user for a role and department
   */
  async findUserForRole(role, category) {
    // First, try to find user with matching department in departments array
    let user = await User.findOne({
      role,
      isActive: true,
      $or: [
        { departments: { $in: [category, 'All'] } },
        { department: { $in: [category, 'All'] } }
      ]
    }).sort({ loginCount: 1, lastLogin: -1 });

    // If not found, try without department filter (for 'All' departments)
    if (!user) {
      user = await User.findOne({
        role,
        isActive: true,
        $or: [
          { departments: 'All' },
          { department: 'All' }
        ]
      }).sort({ loginCount: 1, lastLogin: -1 });
    }

    // If still not found, get any active user with this role
    if (!user) {
      user = await User.findOne({
        role,
        isActive: true
      }).sort({ loginCount: 1, lastLogin: -1 });
    }

    return user;
  }

  /**
   * Get escalation timeline for an issue
   */
  async getEscalationTimeline(issueId) {
    const issue = await Issue.findById(issueId).populate('escalationHistory.escalatedBy', 'name employeeId role');
    
    if (!issue) {
      return null;
    }

    return {
      currentRole: issue.assignedRole,
      currentDeadline: issue.escalationDeadline,
      history: issue.escalationHistory,
      priority: issue.priority,
      status: issue.status
    };
  }

  /**
   * Manually escalate an issue (admin action)
   */
  async manualEscalate(issueId, toRole, escalatedBy, reason) {
    const issue = await Issue.findById(issueId);
    
    if (!issue) {
      throw new Error('Issue not found');
    }

    const assignedUser = await this.findUserForRole(toRole, issue.category);
    
    if (!assignedUser) {
      throw new Error(`No ${toRole} found for category ${issue.category}`);
    }

    await issue.escalate(toRole, escalatedBy, reason);
    issue.assignedTo = assignedUser._id;
    issue.assignedBy = escalatedBy;
    await issue.save();

    await notificationService.notifyIssueAssignment(issue, assignedUser, { _id: escalatedBy });

    return {
      issue,
      assignedUser: assignedUser.getProfile()
    };
  }
}

module.exports = new EscalationService();

