const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');

class NotificationService {
  // Create a new notification
  async createNotification(data) {
    try {
      const notification = await Notification.createNotification(data);
      
      // Send real-time notification if user is online
      this.sendRealtimeNotification(notification);
      
      // Send email notification if enabled
      if (data.sendEmail !== false) {
        this.sendEmailNotification(notification);
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send real-time notification via Socket.io
  sendRealtimeNotification(notification) {
    // This will be implemented when Socket.io is set up
    console.log('Real-time notification:', notification);
  }

  // Send email notification
  async sendEmailNotification(notification) {
    try {
      const user = await User.findById(notification.user);
      if (!user || !user.email) return;

      let emailResult;
      
      switch (notification.type) {
        case 'issue_created':
          emailResult = await emailService.sendWelcome(user.email, user.name);
          break;
          
        case 'issue_status_changed':
          emailResult = await emailService.sendIssueUpdate(
            user.email, 
            user.name, 
            notification.data.issueId?.title || 'Your Issue',
            notification.data.metadata?.status,
            notification.data.issueId
          );
          break;
          
        case 'comment_added':
          emailResult = await emailService.sendCommentNotification(
            user.email,
            user.name,
            notification.data.issueId?.title || 'Your Issue',
            notification.data.userId?.name || 'Someone',
            notification.data.metadata?.commentContent || '',
            notification.data.issueId
          );
          break;
          
        case 'issue_assigned':
          emailResult = await emailService.sendIssueUpdate(
            user.email,
            user.name,
            notification.data.issueId?.title || 'Your Issue',
            'assigned',
            notification.data.issueId
          );
          break;
          
        default:
          console.log('No email template for notification type:', notification.type);
      }

      if (emailResult.success) {
        await notification.markEmailSent();
      } else {
        await notification.markEmailSent(emailResult.error);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
      await notification.markEmailSent(error.message);
    }
  }

  // Notify issue status change
  async notifyIssueStatusChange(issue, oldStatus, newStatus, changedBy) {
    try {
      // Notify the reporter
      if (issue.reportedBy.toString() !== changedBy.toString()) {
        await this.createNotification({
          user: issue.reportedBy,
          type: 'issue_status_changed',
          title: 'Issue Status Updated',
          message: `Your issue "${issue.title}" status has been changed to ${newStatus}`,
          data: {
            issueId: issue._id,
            metadata: {
              oldStatus,
              newStatus,
              changedBy
            }
          },
          priority: newStatus === 'resolved' ? 'high' : 'medium'
        });
      }

      // Notify assigned user if different from reporter and changer
      if (issue.assignedTo && 
          issue.assignedTo.toString() !== issue.reportedBy.toString() && 
          issue.assignedTo.toString() !== changedBy.toString()) {
        await this.createNotification({
          user: issue.assignedTo,
          type: 'issue_status_changed',
          title: 'Assigned Issue Status Updated',
          message: `Issue "${issue.title}" status has been changed to ${newStatus}`,
          data: {
            issueId: issue._id,
            metadata: {
              oldStatus,
              newStatus,
              changedBy
            }
          },
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Error notifying issue status change:', error);
    }
  }

  // Notify new comment
  async notifyNewComment(issue, comment, commenter) {
    try {
      // Notify the reporter if they didn't make the comment
      if (issue.reportedBy.toString() !== commenter._id.toString()) {
        await this.createNotification({
          user: issue.reportedBy,
          type: 'comment_added',
          title: 'New Comment on Your Issue',
          message: `${commenter.name} commented on your issue "${issue.title}"`,
          data: {
            issueId: issue._id,
            commentId: comment._id,
            userId: commenter._id,
            metadata: {
              commentContent: comment.content,
              commenterName: commenter.name
            }
          },
          priority: 'medium'
        });
      }

      // Notify assigned user if different from reporter and commenter
      if (issue.assignedTo && 
          issue.assignedTo.toString() !== issue.reportedBy.toString() && 
          issue.assignedTo.toString() !== commenter._id.toString()) {
        await this.createNotification({
          user: issue.assignedTo,
          type: 'comment_added',
          title: 'New Comment on Assigned Issue',
          message: `${commenter.name} commented on issue "${issue.title}"`,
          data: {
            issueId: issue._id,
            commentId: comment._id,
            userId: commenter._id,
            metadata: {
              commentContent: comment.content,
              commenterName: commenter.name
            }
          },
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Error notifying new comment:', error);
    }
  }

  // Notify issue assignment
  async notifyIssueAssignment(issue, assignedTo, assignedBy) {
    try {
      await this.createNotification({
        user: assignedTo._id || assignedTo,
        type: 'issue_assigned',
        title: 'Issue Assigned to You',
        message: `You have been assigned to issue "${issue.title}"`,
        data: {
          issueId: issue._id,
          userId: assignedBy._id || assignedBy,
          metadata: {
            assignedBy: assignedBy.name || 'Admin'
          }
        },
        priority: 'high'
      });

      // Notify reporter that issue is now in progress
      if (issue.reportedBy) {
        await this.createNotification({
          user: issue.reportedBy,
          type: 'issue_status_changed',
          title: 'Your Issue Is In Progress',
          message: `Your issue "${issue.title}" is now being worked on`,
          data: {
            issueId: issue._id,
            metadata: { status: 'in-progress' }
          },
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Error notifying issue assignment:', error);
    }
  }

  // Notify issue resolved
  async notifyIssueResolved(issue, resolvedBy) {
    try {
      // Notify reporter
      if (issue.reportedBy) {
        await this.createNotification({
          user: issue.reportedBy,
          type: 'issue_resolved',
          title: 'Your Issue Has Been Resolved',
          message: `Your issue "${issue.title}" has been marked as resolved`,
          data: {
            issueId: issue._id,
            userId: resolvedBy?._id || resolvedBy,
            metadata: {
              resolvedAt: issue.resolvedAt
            }
          },
          priority: 'high'
        });
      }

      // Notify admins
      const admins = await User.find({ role: 'admin', isActive: true });
      for (const admin of admins) {
        await this.createNotification({
          user: admin._id,
          type: 'issue_resolved',
          title: 'Issue Resolved',
          message: `Issue "${issue.title}" has been resolved`,
          data: {
            issueId: issue._id,
            userId: resolvedBy?._id || resolvedBy
          },
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Error notifying issue resolved:', error);
    }
  }

  // Notify new issue to admins
  async notifyAdminsNewIssue(issue, reporter) {
    try {
      const admins = await User.find({ role: 'admin', isActive: true });
      
      for (const admin of admins) {
        await this.createNotification({
          user: admin._id,
          type: 'issue_created',
          title: 'New Issue Reported',
          message: `New issue "${issue.title}" reported by ${reporter.name}`,
          data: {
            issueId: issue._id,
            userId: reporter._id,
            metadata: {
              reporterName: reporter.name,
              category: issue.category,
              priority: issue.priority
            }
          },
          priority: issue.priority === 'urgent' ? 'urgent' : 'medium'
        });
      }
    } catch (error) {
      console.error('Error notifying admins of new issue:', error);
    }
  }

  // Notify upvote received
  async notifyUpvoteReceived(issue, upvoter) {
    try {
      // Only notify if the upvoter is not the reporter
      if (issue.reportedBy.toString() !== upvoter._id.toString()) {
        await this.createNotification({
          user: issue.reportedBy,
          type: 'upvote_received',
          title: 'Your Issue Received Support',
          message: `${upvoter.name} upvoted your issue "${issue.title}"`,
          data: {
            issueId: issue._id,
            userId: upvoter._id,
            metadata: {
              upvoterName: upvoter.name
            }
          },
          priority: 'low'
        });
      }
    } catch (error) {
      console.error('Error notifying upvote received:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId, page = 1, limit = 20, unreadOnly = false) {
    try {
      return await Notification.getUserNotifications(userId, page, limit, unreadOnly);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      return await notification.markAsRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      return await Notification.markAllAsRead(userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      return await Notification.getStats(userId);
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysOld = 30) {
    try {
      return await Notification.cleanup(daysOld);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
