import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiService from '../services/api';
import { MapPin, ExternalLink, CheckCircle } from 'lucide-react';

const EmployeeDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const resp = await apiService.getEmployeeIssues({ page: 1, limit: 50 });
      const data = resp.data || resp;
      setIssues(data.issues || []);
    } catch (e) {
      toast.error(`Failed to load issues: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 20000);
    return () => clearInterval(interval);
  }, []);

  const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...issues]
    .filter(i => i.status !== 'resolved')
    .sort((a, b) => (priorityWeight[b.priority]||0) - (priorityWeight[a.priority]||0));

  const openMaps = (lat, lng) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="form-container">Loading...</div>;

  return (
    <div className="form-container" style={{ padding: '0' }}>
      <div style={{ background: 'white', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>My Department Issues</h2>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Department: {user?.department || '—'}</div>
        </div>
        <button className="btn-secondary" onClick={() => { localStorage.removeItem('civicconnect_token'); localStorage.removeItem('civicconnect_user'); window.location.href = '/'; }}>Logout</button>
      </div>

      <div style={{ padding: '1rem 1.5rem' }}>
        {sorted.length === 0 ? (
          <div style={{ color: '#64748b' }}>No issues assigned or in progress.</div>
        ) : (
          <div className="issues-grid" style={{ gridTemplateColumns: '1fr' }}>
            {sorted.map((issue) => (
              <div key={issue._id} className="issue-card">
                <div className="issue-header">
                  <div>
                    <h3 className="issue-title">{issue.title}</h3>
                    <div className="issue-location">
                      <MapPin size={12} style={{ marginRight: 4 }} />
                      {issue.location?.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Priority: {issue.priority} • Status: {issue.status}</div>
                  </div>
                </div>

                {issue.images?.[0]?.url && (
                  <div className="issue-image" style={{ height: 180, borderRadius: 8, overflow: 'hidden', background: '#f8fafc' }}>
                    <img src={issue.images[0].url} alt="issue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>#{(issue._id || '').toString().slice(-6)} • {issue.category}</div>
                  <button className="btn-secondary" onClick={() => openMaps(issue.location?.coordinates?.latitude, issue.location?.coordinates?.longitude)}>
                    <ExternalLink size={14} style={{ marginRight: 6 }} /> Navigate
                  </button>
                  <button className="btn-primary" onClick={() => navigate(`/employee/resolve/${issue._id}`)}>
                    <CheckCircle size={14} style={{ marginRight: 6 }} /> Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;


