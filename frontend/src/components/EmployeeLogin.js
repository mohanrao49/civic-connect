import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiService from '../services/api';
import { ArrowLeft, User, Lock, Briefcase } from 'lucide-react';

const EmployeeLogin = ({ setUser, setIsAdmin }) => {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('employee');
  const [password, setPassword] = useState('emp123');
  const [department, setDepartment] = useState('Road & Traffic');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await apiService.employeeLogin({ employeeId, password, department });
      const data = resp.data || resp;
      const { token, user } = data;
      localStorage.setItem('civicconnect_token', token);
      localStorage.setItem('civicconnect_user', JSON.stringify(user));
      setUser && setUser(user);
      setIsAdmin && setIsAdmin(false);
      toast.success('Logged in successfully');
      navigate('/employee');
    } catch (e) {
      toast.error(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button 
          onClick={() => navigate('/')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#1e4359', 
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div className="login-header">
          <div style={{ 
            width: '60px', 
            height: '60px', 
            background: 'linear-gradient(135deg, #1e4359 0%, #3f6177 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Briefcase size={30} color="white" />
          </div>
          <h1 className="login-title">Employee Login</h1>
          <p className="login-subtitle">Access your assigned issues</p>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">
              <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Employee ID
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Briefcase size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Department
            </label>
            <select className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {[
                'Road & Traffic',
                'Water & Drainage',
                'Electricity',
                'Garbage & Sanitation',
                'Street Lighting',
                'Public Safety',
                'Parks & Recreation',
                'Other'
              ].map((dep) => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>

        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          background: '#f8fafc', 
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#64748b'
        }}>
          <strong>Demo Credentials:</strong><br />
          Employee ID: employee<br />
          Password: emp123
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;


