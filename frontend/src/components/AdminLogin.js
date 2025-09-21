import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, User, Lock, Shield } from 'lucide-react';

const AdminLogin = ({ setUser, setIsAdmin }) => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Simple mock admin credentials
    if (username === 'admin' && password === 'admin123') {
      setIsLoading(true);
      
      setTimeout(() => {
        const adminUser = {
          id: 'admin',
          name: 'Admin User',
          username: username,
          role: 'administrator'
        };
        
        setUser(adminUser);
        setIsAdmin(true);
        localStorage.setItem('civicconnect_admin', JSON.stringify(adminUser));
        navigate('/admin');
      }, 1000);
    } else {
      alert('Invalid credentials. Use username: admin, password: admin123');
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
            color: '#667eea', 
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Shield size={30} color="white" />
          </div>
          <h1 className="login-title">{t('adminLogin')}</h1>
          <p className="login-subtitle">Access admin dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">
              <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Username
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
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
          Username: admin<br />
          Password: admin123
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;