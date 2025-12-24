import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, Lock, MapPin } from 'lucide-react';
import apiService from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);

  // Form data
  const [name, setName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setCoordinates([latitude, longitude]);
      try {
        // Try OpenStreetMap Nominatim reverse geocoding (no API key needed for light use)
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await resp.json();
        const line = data.display_name || `${data.address?.road || ''} ${data.address?.city || data.address?.town || data.address?.village || ''}`.trim();
        setAddress(line);
        toast.success('Location captured successfully');
      } catch (e) {
        setAddress(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
        toast.success('Location coordinates captured');
      }
    }, (err) => {
      toast.error('Unable to retrieve your location');
      console.error(err);
    });
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast.warning('Please enter your name');
      return;
    }
    if (mobile.length !== 10) {
      toast.warning('Please enter a valid 10-digit mobile number');
      return;
    }
    if (aadhaarNumber && aadhaarNumber.length !== 12) {
      toast.warning('Please enter a valid 12-digit Aadhaar number or leave it blank');
      return;
    }
    if (!address.trim()) {
      toast.warning('Please enter your address or use GPS location');
      return;
    }
    if (password.length < 6) {
      toast.warning('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.warning('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      // Register user directly (no OTP verification needed)
      const result = await apiService.register({ 
        name, 
        aadhaarNumber: aadhaarNumber || undefined, 
        mobile, 
        address,
        coordinates,
        password
      });
      toast.success('Registered successfully');
      
      // Store token/user if returned
      if (result.data && result.data.token && result.data.user) {
        localStorage.setItem('civicconnect_user', JSON.stringify({
          id: result.data.user._id,
          name: result.data.user.name,
          phone: result.data.user.mobile || null,
          isGuest: false,
          token: result.data.token
        }));
        localStorage.setItem('civicconnect_token', result.data.token);
        navigate('/citizen');
      } else {
        navigate('/login');
      }
    } catch (error) {
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button 
          onClick={() => navigate('/login')}
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
          <h1 className="login-title">{t('register')}</h1>
          <p className="login-subtitle">Enter your details to create an account</p>
        </div>

        <form onSubmit={handleRegister} className="login-form">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Aadhaar Number (Optional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="12-digit Aadhaar (optional)"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={12}
                pattern="[0-9]{12}"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                pattern="[0-9]{10}"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <MapPin size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Address *
              </label>
              <textarea
                className="form-input"
                placeholder="Your address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                required
              />
              <button type="button" className="btn-secondary" onClick={handleUseMyLocation}>
                Use GPS Location
              </button>
              {coordinates && (
                <small style={{ color: '#10b981', fontSize: '0.8rem', display: 'block', marginTop: '0.5rem' }}>
                  ✓ GPS Location captured: {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}
                </small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Create Password *
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Confirm Password *
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting || password.length < 6 || password !== confirmPassword}
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </form>
      </div>
    </div>
  );
};

export default Register;