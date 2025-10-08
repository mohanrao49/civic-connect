import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  LogOut,
  Settings,
  Filter,
  Search,
  MapPin
} from 'lucide-react';
import IssueMap from './IssueMap';
import ResolutionCharts from './analytics/ResolutionCharts';
import apiService from '../services/api';

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortMode, setSortMode] = useState('priority'); // 'priority' | 'date'
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('civicconnect_admin');
    navigate('/');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const resp = await apiService.getAdminDashboard();
        setStats(resp.data || resp);
      } catch (e) {
        toast.error(`Failed to load dashboard: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const recentIssues = useMemo(() => {
    const list = stats?.recentIssues || [];
    const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
    const unresolved = list.filter(i => i.status !== 'resolved');
    const resolved = list.filter(i => i.status === 'resolved');
    const unresolvedSorted = [...unresolved].sort((a, b) => (weight[b.priority] || 0) - (weight[a.priority] || 0));
    const resolvedSorted = [...resolved].sort((a, b) => new Date(a.resolvedAt || a.updatedAt || a.createdAt) - new Date(b.resolvedAt || b.updatedAt || b.createdAt));
    return [...unresolvedSorted, ...resolvedSorted];
  }, [stats, sortMode]);

  const filteredIssues = recentIssues.filter(issue => {
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    const locName = (issue.location?.name || issue.location || '').toLowerCase();
    const matchesSearch = (issue.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         locName.includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (issue.category === categoryFilter);
    return matchesStatus && matchesSearch && matchesCategory;
  });

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <Icon size={20} color={color} />
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && (
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'urgent': { bg: '#fef2f2', color: '#dc2626', text: 'High' },
      'high': { bg: '#fef2f2', color: '#dc2626', text: 'High' },
      'medium': { bg: '#fef3c7', color: '#d97706', text: 'Medium' },
      'low': { bg: '#f0f9ff', color: '#2563eb', text: 'Low' }
    };
    
    const config = priorityConfig[priority] || priorityConfig['medium'];
    return (
      <span style={{
        background: config.bg,
        color: config.color,
        padding: '0.2rem 0.6rem',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'reported': { class: 'status-reported', text: 'Reported' },
      'in-progress': { class: 'status-in-progress', text: 'In Progress' },
      'resolved': { class: 'status-resolved', text: 'Resolved' }
    };
    
    const config = statusConfig[status] || statusConfig['reported'];
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  const handleAssignIssue = async (issueId, e) => {
    e.stopPropagation();
    try {
      await apiService.assignIssue(issueId, {});
      toast.success('Issue assigned');
      const fresh = await apiService.getAdminDashboard();
      setStats(fresh.data || fresh);
    } catch (err) {
      toast.error(`Assign failed: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (issueId, newStatus, e) => {
    e.stopPropagation();
    try {
      await apiService.updateIssueStatus(issueId, { status: newStatus });
      toast.success('Status updated');
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 className="admin-title">Admin Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Welcome, {user.name}
            </span>
            <button 
              onClick={() => setSelectedView(selectedView === 'settings' ? 'overview' : 'settings')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={handleLogout}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1rem'
        }}>
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'issues', label: 'Issues Management', icon: AlertTriangle },
            { key: 'map', label: 'Map View', icon: MapPin },
            { key: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key)}
              style={{
                background: selectedView === tab.key ? '#1e4359' : 'transparent',
                color: selectedView === tab.key ? 'white' : '#64748b',
                border: '1px solid #e2e8f0',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Stats */}
        {selectedView === 'overview' && (
          <>
            <div className="stats-grid">
              <StatCard 
                title="Total Issues" 
                value={stats?.issues?.total || 0}
                icon={AlertTriangle}
                color="#1e4359"
                subtitle="All time reports"
              />
              <StatCard 
                title="Reported" 
                value={stats?.issues?.reported || 0}
                icon={AlertTriangle}
                color="#f59e0b"
                subtitle="Awaiting assignment"
              />
              <StatCard 
                title="In Progress" 
                value={stats?.issues?.inProgress || 0}
                icon={Clock}
                color="#3b82f6"
                subtitle="Being resolved"
              />
              <StatCard 
                title="Resolved" 
                value={stats?.issues?.resolved || 0}
                icon={CheckCircle}
                color="#10b981"
                subtitle="Successfully completed"
              />
              <StatCard 
                title="SLA Breaches" 
                value={stats?.slaBreaches || 0}
                icon={AlertTriangle}
                color="#ef4444"
                subtitle="Overdue issues"
              />
              <StatCard 
                title="Avg Resolution Time" 
                value={stats?.avgResolutionTime || '0 days'}
                icon={TrendingUp}
                color="#8b5cf6"
                subtitle="Current performance"
              />
            </div>

            {/* Recent Issues */}
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Recent Issues
              </h3>
              <div className="issues-grid">
                {filteredIssues.slice(0, 3).map((issue) => (
                  <div 
                    key={issue._id || issue.id} 
                    className="issue-card"
                    onClick={() => navigate(`/issue/${issue._id || issue.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                          {issue.title}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem' }}>
                          📍 {issue.location?.name || issue.location}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Reported by: {issue.reportedBy?.name || 'Citizen'}
                        </div>
                    {issue.images && issue.images.length > 0 && (
                      <div style={{ marginBottom: '0.8rem', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                        <img
                          alt={issue.title}
                          src={issue.images[0].url || issue.images[0].secure_url || issue.images[0].secureUrl}
                          style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'end' }}>
                        {getStatusBadge(issue.status)}
                        {getPriorityBadge(issue.priority)}
                      </div>
                    </div>

                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {issue.description}
                    </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Assigned to: <strong>{issue.assignedTo?.name || 'Unassigned'}</strong>
                    {issue.resolved?.photo?.url && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#059669' }}>
                        ✓ Resolved with photo proof
                        <div style={{ marginTop: '0.3rem', height: 60, borderRadius: 4, overflow: 'hidden', background: '#f8fafc' }}>
                          <img 
                            src={issue.resolved.photo.url} 
                            alt="Resolution proof" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {issue.status === 'reported' && (
                          <button 
                            className="btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '0.3rem 0.8rem' }}
                            onClick={(e) => handleAssignIssue(issue._id || issue.id, e)}
                          >
                            Assign
                          </button>
                        )}
                        {issue.status === 'in-progress' && (
                          <button 
                            className="btn-primary"
                            style={{ fontSize: '0.7rem', padding: '0.3rem 0.8rem' }}
                            onClick={(e) => handleUpdateStatus(issue._id || issue.id, 'resolved', e)}
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Issues Management */}
        {selectedView === 'issues' && (
          <>
            {/* Filters and Search */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search 
                    size={16} 
                    style={{ 
                      position: 'absolute', 
                      left: '0.8rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#94a3b8'
                    }} 
                  />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '0.6rem 0.8rem 0.6rem 2.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      minWidth: '300px'
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="reported">Reported</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Categories</option>
                  <option>Road & Traffic</option>
                  <option>Water & Drainage</option>
                  <option>Electricity</option>
                  <option>Garbage & Sanitation</option>
                  <option>Street Lighting</option>
                  <option>Public Safety</option>
                  <option>Parks & Recreation</option>
                  <option>Other</option>
                </select>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="date">Sort by Date</option>
                </select>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Showing {filteredIssues.length} of {(stats?.recentIssues || []).length} issues
              </div>
            </div>

            {/* Issues Table */}
            <div style={{ 
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Issue</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Location</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Priority</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Assigned To</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((issue) => (
                    <tr 
                      key={issue._id || issue.id}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/issue/${issue._id || issue.id}`)}
                    >
                      <td style={{ padding: '1rem 0.8rem' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '0.2rem' }}>
                            {issue.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {issue.category}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.8rem', fontSize: '0.9rem', color: '#64748b' }}>
                        {issue.location?.name || ''}
                      </td>
                      <td style={{ padding: '1rem 0.8rem' }}>
                        {getStatusBadge(issue.status)}
                      </td>
                      <td style={{ padding: '1rem 0.8rem' }}>
                        {getPriorityBadge(issue.priority)}
                      </td>
                      <td style={{ padding: '1rem 0.8rem', fontSize: '0.9rem', color: '#64748b' }}>
                        {issue.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td style={{ padding: '1rem 0.8rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {issue.status === 'reported' && (
                            <button 
                              className="btn-secondary"
                              style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                              onClick={(e) => handleAssignIssue(issue._id || issue.id, e)}
                            >
                              Assign
                            </button>
                          )}
                          {issue.status === 'in-progress' && (
                            <button 
                              className="btn-primary"
                              style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                              onClick={(e) => handleUpdateStatus(issue._id || issue.id, 'resolved', e)}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Map View */}
        {selectedView === 'map' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
              Issues Map Overview
            </h3>
            <div style={{ 
              background: 'white',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                📍 Map shows your current location and nearby issues. Click on markers to view details.
              </p>
            </div>
            <div style={{ height: '600px' }}>
              <IssueMap 
                issues={filteredIssues.map((iss) => ({
                  id: iss._id || iss.id,
                  title: iss.title,
                  location: iss.location?.name || '',
                  coordinates: iss.location?.coordinates ? [
                    iss.location.coordinates.latitude,
                    iss.location.coordinates.longitude
                  ] : null,
                  status: iss.status,
                  upvotes: iss.upvotedBy?.length || iss.upvotes || 0,
                  description: iss.description
                })).filter(i => Array.isArray(i.coordinates) && i.coordinates.length === 2)}
                onMarkerClick={(issue) => navigate(`/issue/${issue.id}`)}
                showCenterMarker={true}
              />
            </div>
          </div>
        )}

        {/* Analytics */}
        {selectedView === 'analytics' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
              Analytics Dashboard
            </h3>
            
            <ResolutionCharts />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;