import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, IdCard, Lock } from 'lucide-react';
import apiService from '../services/api';

const Login = ({ setUser, setIsAdmin }) => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (aadhaar.length !== 12) {
      toast.warning('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    if (!password || password.length < 6) {
      toast.warning('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.loginWithAadhaar(aadhaar, password);
      const user = {
        id: response.data.user._id,
        name: response.data.user.name,
        phone: response.data.user.mobile || null,
        isGuest: false,
        token: response.data.token
      };
      setUser(user);
      localStorage.setItem('civicconnect_user', JSON.stringify(user));
      localStorage.setItem('civicconnect_token', response.data.token);
      // Ensure admin session is cleared so citizen routes are accessible
      try { localStorage.removeItem('civicconnect_admin'); } catch (_) {}
      if (typeof setIsAdmin === 'function') {
        setIsAdmin(false);
      }
      toast.success('Login successful');
      navigate('/citizen');
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Invalid credentials')) {
        toast.error('Invalid Aadhaar number or password. Please check your credentials.');
      } else {
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Guest login removed as requested

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
          <h1 className="login-title">{t('login')}</h1>
          <p className="login-subtitle">Enter your Aadhaar number to continue</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">
              <IdCard size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Aadhaar Number
            </label>
            <input
              type="tel"
              className="form-input"
              placeholder="Enter 12-digit Aadhaar number"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
              maxLength={12}
              pattern="[0-9]{12}"
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading || aadhaar.length !== 12 || !password}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Guest login removed */}

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <span>Don't have an account? </span>
          <Link to="/register" style={{ color: '#1e4359' }}>Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;