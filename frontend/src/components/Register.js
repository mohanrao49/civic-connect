import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, Phone, Key, Lock, MapPin } from 'lucide-react';
import apiService from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);

  // Step management
  const [step, setStep] = useState(1); // 1: Mobile, 2: Verify OTP, 3: Details + Password + Register

  // Form data
  const [name, setName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Step 1: Send OTP to mobile number
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      toast.warning('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      // Send OTP for mobile verification (registration flow)
      await apiService.sendOtpToMobileForRegistration(mobile);
      setIsOtpSent(true);
      setStep(2); // Move to OTP verification step
      
      // OTP is sent via SMS - never displayed on screen
      toast.success(`OTP sent to ${mobile}. Please check your phone for the OTP.`);
    } catch (error) {
      toast.error(`Error sending OTP: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP sent to mobile
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.warning('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP for mobile number
      await apiService.verifyOtpForRegistration(mobile, otp);
      setIsMobileVerified(true);
      toast.success('Mobile number verified successfully');
      setStep(3); // Move to details step
    } catch (error) {
      toast.error(`OTP verification failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Collect all details and register
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast.warning('Please enter your name');
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
      // Register user (OTP already verified in step 2)
      const result = await apiService.registerUserWithPassword({ 
        name, 
        aadhaarNumber: aadhaarNumber || undefined, 
        mobile, 
        address,
        coordinates,
        password
        // No OTP needed - already verified
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
        <div className="login-header">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : navigate('/login')}
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
            <h1 className="login-title">{t('register')}</h1>
          </div>
          <p className="login-subtitle">
            {step === 1 && 'Enter your mobile number'}
            {step === 2 && 'Verify OTP sent to your mobile'}
            {step === 3 && 'Enter your details and create password'}
          </p>
        </div>

        {/* Step 1: Enter Mobile Number */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <Phone size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Mobile Number *
              </label>
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
              <small style={{ color: '#666', fontSize: '0.8rem' }}>
                We'll send an OTP to verify your mobile number
              </small>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || mobile.length !== 10}
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <Key size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Enter OTP *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                required
              />
              <small style={{ color: '#666', fontSize: '0.8rem' }}>
                OTP sent to {mobile}. Please check your phone.
              </small>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {/* Step 3: Enter Details and Register */}
        {step === 3 && (
          <form onSubmit={handleCompleteRegistration} className="login-form">
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
              <label className="form-label">
                <Phone size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Mobile Number
              </label>
              <input
                type="tel"
                className="form-input"
                value={mobile}
                disabled
              />
              <small style={{ color: '#10b981', fontSize: '0.8rem' }}>
                ✓ Mobile number verified
              </small>
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
              {isSubmitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;