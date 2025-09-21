import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, Phone, Key } from 'lucide-react';

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    // Mock OTP sending
    setTimeout(() => {
      setIsOtpSent(true);
      setIsLoading(false);
      alert('OTP sent to your phone: 123456');
    }, 1500);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp !== '123456') {
      alert('Invalid OTP. Please enter 123456');
      return;
    }

    setIsLoading(true);
    // Mock user creation
    setTimeout(() => {
      const mockUser = {
        id: Date.now().toString(),
        name: `User ${phoneNumber.slice(-4)}`,
        phone: phoneNumber,
        isGuest: false
      };
      setUser(mockUser);
      localStorage.setItem('civicconnect_user', JSON.stringify(mockUser));
      navigate('/citizen');
    }, 1000);
  };

  const handleGuestLogin = () => {
    const guestUser = {
      id: 'guest',
      name: 'Guest User',
      phone: null,
      isGuest: true
    };
    setUser(guestUser);
    localStorage.setItem('civicconnect_user', JSON.stringify(guestUser));
    navigate('/citizen');
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
          <h1 className="login-title">{t('login')}</h1>
          <p className="login-subtitle">Enter your mobile number to continue</p>
        </div>

        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <Phone size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Mobile Number
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter 10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={10}
                pattern="[0-9]{10}"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || phoneNumber.length !== 10}
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
                OTP sent to +91 {phoneNumber}
              </small>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setIsOtpSent(false)}
            >
              Change Number
            </button>
          </form>
        )}

        <div className="login-options">
          <button 
            onClick={handleGuestLogin}
            className="guest-login"
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;