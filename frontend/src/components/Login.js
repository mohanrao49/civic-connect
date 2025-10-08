import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, IdCard, Key } from 'lucide-react';
import apiService from '../services/api';

const Login = ({ setUser, setIsAdmin }) => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (aadhaar.length !== 12) {
      toast.warning('Please enter a valid 12-digit Aadhaar number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.sendOtpByAadhaar(aadhaar);
      setIsOtpSent(true);
      
      // In development mode, show the OTP
      if (response.data && response.data.otp) {
        toast.success(`OTP sent. Dev OTP: ${response.data.otp}`);
      } else {
        toast.success('OTP sent to your phone');
      }
    } catch (error) {
      if (error.message.includes('Please register before proceeding')) {
        toast.error('This Aadhaar number is not registered. Please register first before logging in.');
        // Optionally redirect to registration page
        // navigate('/register');
      } else {
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.warning('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.verifyOtpByAadhaar(aadhaar, otp);
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
      navigate('/citizen');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
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

        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="login-form">
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

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || aadhaar.length !== 12}
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <Key size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Enter OTP
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
              <small style={{ color: '#666', fontSize: '0.8rem' }}>
                OTP sent to Aadhaar ending with {aadhaar.slice(-4)}
              </small>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>
        )}

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