import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageContext } from '../App';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  ThumbsUp, 
  MessageCircle, 
  Camera,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings
} from 'lucide-react';
import IssueMap from './IssueMap';
import apiService from '../services/api';

const IssueDetail = ({ user, isAdmin }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useContext(LanguageContext);
  const [issue, setIssue] = useState(null);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIssueData();
  }, [id]);

  const fetchIssueData = async () => {
    setIsLoading(true);
    try {
      const issueResponse = await apiService.getIssueById(id);
      const rawIssue = issueResponse.data?.issue || issueResponse.issue || issueResponse;
      if (!rawIssue) throw new Error('Issue not found');

      const firstImage = Array.isArray(rawIssue.images) && rawIssue.images.length > 0 ? rawIssue.images[0] : null;
      const imageUrl = (firstImage && (firstImage.url || firstImage.secure_url || firstImage.secureUrl || (typeof firstImage === 'string' ? firstImage : null))) || rawIssue.image || rawIssue.imageUrl || null;

      const mappedIssue = {
        id: rawIssue._id || rawIssue.id,
        title: rawIssue.title,
        description: rawIssue.description,
        location: rawIssue.location?.name || 'Location not specified',
        coordinates: rawIssue.location?.coordinates ?
          [rawIssue.location.coordinates.latitude, rawIssue.location.coordinates.longitude] :
          [16.0716, 77.9053],
        status: rawIssue.status || 'reported',
        upvotes: rawIssue.upvotedBy?.length || rawIssue.upvotes || 0,
        category: rawIssue.category || 'General',
        priority: rawIssue.priority || 'medium',
        assignedTo: rawIssue.assignedTo || 'Unassigned',
        reportedBy: rawIssue.reportedBy?.name || rawIssue.reportedBy || 'Citizen',
        timestamp: rawIssue.createdAt || rawIssue.timestamp,
        image: imageUrl
      };

      setIssue(mappedIssue);

      try {
        const commentsResponse = await apiService.getComments(id);
        setComments(commentsResponse.data?.comments || commentsResponse.comments || []);
      } catch (commentsError) {
        console.warn('Comments fetch failed, continuing without comments:', commentsError);
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching issue data:', error);
      // Fallback to mock data
      try {
        const mockIssues = {
          '1': {
            id: '1',
            title: 'Broken Street Light',
            location: 'MG Road, Bhopal',
            coordinates: [23.2599, 77.4126],
            status: 'reported',
            upvotes: 15,
            description: 'Street light pole is broken and hanging dangerously. This has been causing safety concerns especially during night time. Multiple citizens have complained about this issue.',
            category: 'Street Lighting',
            priority: 'high',
            assignedTo: 'Unassigned',
            reportedBy: 'Citizen #1234',
            timestamp: '2025-01-18T10:30:00Z',
            image: null
          },
          '2': {
            id: '2',
            title: 'Pothole on Main Road',
            location: 'DB City Mall Road',
            coordinates: [23.2456, 77.4200],
            status: 'in-progress',
            upvotes: 28,
            description: 'Large pothole causing traffic issues and vehicle damage. The pothole is approximately 3 feet in diameter and 6 inches deep.',
            category: 'Road & Traffic',
            priority: 'medium',
            assignedTo: 'Ward Officer A',
            reportedBy: 'Citizen #5678',
            timestamp: '2025-01-15T14:20:00Z',
            image: null
          },
          'user_1': {
            id: 'user_1',
            title: 'Broken Street Light',
            location: 'Near my house, MG Road',
            coordinates: [23.2599, 77.4126],
            status: 'in-progress',
            upvotes: 12,
            description: 'Street light pole is broken and hanging dangerously',
            category: 'Street Lighting',
            priority: 'high',
            assignedTo: 'Electrical Department',
            reportedBy: user.name,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            image: null
          }
        };

        const foundIssue = mockIssues[id];
        if (foundIssue) {
          setIssue(foundIssue);
        }

        // Mock comments
        setComments([
          {
            id: 1,
            author: 'Citizen #5432',
            content: 'This is a serious safety hazard. Please prioritize this issue.',
            timestamp: '2025-01-18T14:30:00Z',
            isAdmin: false
          },
          {
            id: 2,
            author: 'Ward Officer',
            content: 'Issue has been acknowledged. We will dispatch a team tomorrow.',
            timestamp: '2025-01-18T16:45:00Z',
            isAdmin: true
          }
        ]);
      } catch (mockError) {
        console.error('Error loading mock data:', mockError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpvote = async () => {
    try {
      // Optimistic toggle
      const togglingToUpvoted = !isUpvoted;
      setIsUpvoted(togglingToUpvoted);
      setIssue(prev => ({ ...prev, upvotes: prev.upvotes + (togglingToUpvoted ? 1 : -1) }));

      // Call appropriate API
      if (togglingToUpvoted) {
        await apiService.upvoteIssue(id);
      } else {
        await apiService.removeUpvote(id);
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
      // Revert optimistic update
      setIsUpvoted(prev => !prev);
      setIssue(prev => ({ ...prev, upvotes: prev.upvotes + (isUpvoted ? 1 : -1) }));
      toast.error('Failed to update upvote. Please try again.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentData = {
        content: newComment,
        userId: user.id,
        author: isAdmin ? 'Admin User' : user.name,
        isAdmin: isAdmin
      };

      const response = await apiService.addComment(id, commentData);
      setComments(prev => [...prev, response]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    }
  };

  const handleStatusUpdate = (newStatus) => {
    setIssue(prev => ({ ...prev, status: newStatus }));
    toast.success(`Issue status updated to ${newStatus}`);
  };

  const handleAssign = () => {
    const officer = prompt('Assign to officer:');
    if (officer) {
      setIssue(prev => ({ ...prev, assignedTo: officer, status: 'in-progress' }));
      toast.success(`Issue assigned to ${officer}`);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'reported': { class: 'status-reported', text: 'Reported', icon: AlertTriangle },
      'in-progress': { class: 'status-in-progress', text: 'In Progress', icon: Clock },
      'resolved': { class: 'status-resolved', text: 'Resolved', icon: CheckCircle }
    };
    
    const config = statusConfig[status] || statusConfig['reported'];
    const IconComponent = config.icon;
    
    return (
      <span className={`status-badge ${config.class}`} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.3rem' 
      }}>
        <IconComponent size={12} />
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'urgent': { bg: '#fee2e2', color: '#dc2626', text: 'URGENT', fontWeight: '700' },
      'high': { bg: '#fef2f2', color: '#dc2626', text: 'High Priority' },
      'medium': { bg: '#fef3c7', color: '#d97706', text: 'Medium Priority' },
      'low': { bg: '#f0f9ff', color: '#2563eb', text: 'Low Priority' }
    };
    
    const config = priorityConfig[priority] || priorityConfig['medium'];
    return (
      <span style={{
        background: config.bg,
        color: config.color,
        padding: '0.3rem 0.8rem',
        borderRadius: '15px',
        fontSize: '0.8rem',
        fontWeight: config.fontWeight || '500'
      }}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return (
      <div className="form-container" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #123244 0%, #1e4359 28%, #3f6177 62%, #d8c7bd 100%)'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="form-container" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #123244 0%, #1e4359 28%, #3f6177 62%, #d8c7bd 100%)'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="form-container" style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ 
        background: 'white',
        padding: '1rem 2rem',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={() => navigate(isAdmin ? '/admin' : '/citizen')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#1e4359', 
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 style={{ 
              fontSize: '1.3rem', 
              fontWeight: '700', 
              color: '#1e293b',
              margin: 0
            }}>
              Issue Details
            </h1>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {issue.status === 'reported' && (
                <button 
                  className="btn-secondary"
                  onClick={handleAssign}
                  style={{ fontSize: '0.8rem' }}
                >
                  Assign Officer
                </button>
              )}
              {issue.status === 'in-progress' && (
                <button 
                  className="btn-primary"
                  onClick={() => handleStatusUpdate('resolved')}
                  style={{ fontSize: '0.8rem' }}
                >
                  Mark Resolved
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '2rem' }}>
        {/* Issue Header */}
        <div style={{ 
          background: 'white',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#1e293b',
                marginBottom: '1rem'
              }}>
                {issue.title}
              </h2>
              
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {getStatusBadge(issue.status)}
                {getPriorityBadge(issue.priority)}
              </div>

              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
                fontSize: '0.9rem',
                color: '#64748b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} />
                  <span>{issue.location?.name || 'Location not specified'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} />
                  <span>{formatDate(issue.timestamp)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} />
                  <span>Reported by: {issue.reportedBy?.name || 'Anonymous'}</span>
                </div>
                {issue.assignedTo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={16} />
                    <span>Assigned to: {issue.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ 
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <strong style={{ color: '#1e293b', fontSize: '0.9rem' }}>Category:</strong>
            <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>{issue.category}</span>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#1e293b',
              marginBottom: '0.8rem'
            }}>
              Description
            </h3>
            <p style={{ 
              color: '#64748b', 
              lineHeight: 1.6,
              fontSize: '1rem'
            }}>
              {issue.description}
            </p>
          </div>

          {/* Image if available */}
          {issue.image && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '0.8rem'
              }}>
                Evidence
              </h3>
              <div style={{ background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', maxWidth: '500px' }}>
                <img 
                  src={issue.image} 
                  alt="Issue evidence" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isAdmin && (
            <div style={{ 
              display: 'flex', 
              gap: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9'
            }}>
              <button 
                className={`upvote-btn ${isUpvoted ? 'upvoted' : ''}`}
                onClick={handleUpvote}
                style={{ fontSize: '0.9rem' }}
              >
                <ThumbsUp size={16} />
                {issue.upvotes} {isUpvoted ? 'Upvoted' : 'Upvote'}
              </button>
              
              <button className="upvote-btn" style={{ fontSize: '0.9rem' }}>
                <MessageCircle size={16} />
                Comment
              </button>
            </div>
          )}
        </div>

        {/* Location Map */}
        <div style={{ 
          background: 'white',
          padding: '1.5rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 0
        }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            color: '#1e293b',
            marginBottom: '1rem'
          }}>
            Location
          </h3>
          <div style={{ height: '300px', position: 'relative' }}>
            <IssueMap 
              issues={[issue]} 
              center={issue.coordinates}
              showCenterMarker={false}
              onMarkerClick={() => {}}
            />
          </div>
        </div>

        {/* Progress Timeline */}
        <div style={{ 
          background: 'white',
          padding: '1.5rem',
          borderRadius: '15px',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          position: 'relative',
          zIndex: 1
        }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            color: '#1e293b',
            marginBottom: '1rem'
          }}>
            Progress Timeline
          </h3>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '2rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem'
            }}>
              <div style={{ 
                width: '30px', 
                height: '30px', 
                borderRadius: '50%', 
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <AlertTriangle size={16} />
              </div>
              <span style={{ color: '#10b981', fontWeight: '500' }}>Reported</span>
            </div>
            
            <div style={{ 
              flex: 1,
              height: '3px', 
              background: issue.status === 'reported' ? '#e5e7eb' : '#10b981'
            }} />
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem'
            }}>
              <div style={{ 
                width: '30px', 
                height: '30px', 
                borderRadius: '50%', 
                background: issue.status === 'reported' ? '#e5e7eb' : '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Clock size={16} />
              </div>
              <span style={{ 
                color: issue.status === 'reported' ? '#9ca3af' : '#3b82f6', 
                fontWeight: '500' 
              }}>
                In Progress
              </span>
            </div>
            
            <div style={{ 
              flex: 1,
              height: '3px', 
              background: issue.status === 'resolved' ? '#10b981' : '#e5e7eb'
            }} />
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem'
            }}>
              <div style={{ 
                width: '30px', 
                height: '30px', 
                borderRadius: '50%', 
                background: issue.status === 'resolved' ? '#10b981' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <CheckCircle size={16} />
              </div>
              <span style={{ 
                color: issue.status === 'resolved' ? '#10b981' : '#9ca3af', 
                fontWeight: '500' 
              }}>
                Resolved
              </span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div style={{ 
          background: 'white',
          padding: '1.5rem',
          borderRadius: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            color: '#1e293b',
            marginBottom: '1rem'
          }}>
            Comments & Updates
          </h3>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} style={{ marginBottom: '1.5rem' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or update..."
              style={{
                width: '100%',
                padding: '1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                minHeight: '80px',
                resize: 'vertical',
                marginBottom: '0.8rem'
              }}
            />
            <button 
              type="submit" 
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
              disabled={!newComment.trim()}
            >
              Add Comment
            </button>
          </form>

          {/* Comments List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comments.map((comment) => (
              <div 
                key={comment.id}
                style={{ 
                  padding: '1rem',
                  background: comment.isAdmin ? '#f0f9ff' : '#f8fafc',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${comment.isAdmin ? '#3b82f6' : '#e2e8f0'}`
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ 
                      fontSize: '0.9rem', 
                      color: '#1e293b' 
                    }}>
                      {comment.author}
                    </strong>
                    {comment.isAdmin && (
                      <span style={{
                        background: '#3b82f6',
                        color: 'white',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: '500'
                      }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#94a3b8' 
                  }}>
                    {getTimeSince(comment.timestamp)}
                  </span>
                </div>
                <p style={{ 
                  color: '#64748b', 
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  margin: 0
                }}>
                  {comment.content}
                </p>
              </div>
            ))}
            
            {comments.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                color: '#94a3b8',
                fontSize: '0.9rem'
              }}>
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;