import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import apiService from '../services/api';
import { MapPin, Upload, CheckCircle, ArrowLeft, Camera } from 'lucide-react';

const ResolveIssue = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await apiService.getIssueById(id);
        setIssue((resp.data || resp).issue || resp.data || resp);
      } catch (e) {
        navigate('/employee');
      }
    };
    load();
  }, [id, navigate]);

  const openMaps = () => {
    if (!issue?.location?.coordinates) return;
    const { latitude: lat, longitude: lng } = issue.location.coordinates;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setLatitude(lat.toString());
          setLongitude(lng.toString());
          toast.success('Location captured successfully');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get location. Please enter manually.');
        }
      );
    } else {
      toast.error('Geolocation not supported. Please enter coordinates manually.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    // Reset the file input
    const fileInput = document.getElementById('resolveFileInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.resolveIssue(id, { imageFile, latitude, longitude });
      navigate('/employee');
    } catch (e) {
      toast.error(e.message || 'Failed to resolve issue');
      setSubmitting(false);
    }
  };

  if (!issue) return null;

  const photoUrl = issue.images?.[0]?.url;

  return (
    <div className="login-container">
      <div className="login-card">
        <button 
          onClick={() => navigate('/employee')}
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
          <h1 className="login-title">Resolve Issue</h1>
          <p className="login-subtitle">Upload proof and confirm location</p>
        </div>

        {/* Original Issue Image */}
        {photoUrl && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Original Issue Photo</h3>
            <div className="issue-image" style={{ height: 200, borderRadius: 8, overflow: 'hidden', background: '#f8fafc' }}>
              <img src={photoUrl} alt="issue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )}

        {/* Location Info */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MapPin size={16} />
            <span style={{ fontWeight: '600' }}>Issue Location</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>
            {issue.location?.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Lat: {issue.location?.coordinates?.latitude?.toFixed(6)} | Lng: {issue.location?.coordinates?.longitude?.toFixed(6)}
          </div>
          <button className="btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }} onClick={openMaps}>
            Open in Maps
          </button>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          {/* Photo Upload */}
          <div className="form-group">
            <label className="form-label">Upload Resolved Photo (Optional)</label>
            <div 
              className={`image-upload ${imageFile ? 'has-image' : ''}`}
              onClick={() => document.getElementById('resolveFileInput').click()}
            >
              <input
                id="resolveFileInput"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              
              {imageFile ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={URL.createObjectURL(imageFile)} 
                    alt="Preview"
                    className="uploaded-image"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <p className="upload-text">Click to change image</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Camera className="upload-icon" />
                  <p className="upload-text">Click to take photo or upload image</p>
                </div>
              )}
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="form-group">
            <label className="form-label">Resolved Location (Required - within 10m of original)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '120px' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  step="any"
                  required
                />
              </div>
              <div style={{ flex: '1', minWidth: '120px' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  step="any"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                className="btn-secondary"
                style={{ 
                  padding: '0.75rem 1rem',
                  minWidth: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                <MapPin size={16} />
                GPS
              </button>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={submitting}>
            <CheckCircle size={16} style={{ marginRight: 8 }} /> 
            {submitting ? 'Submitting...' : 'Mark as Resolved'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResolveIssue;


