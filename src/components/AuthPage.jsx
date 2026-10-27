import React, { useState } from 'react';
import api from '../api';

export default function AuthPage({ onAuthenticated }) {
  const [isLogin, setIsLogin] = useState(false); 
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    county: '',
    role: 'BUYER', // Default
    businessName: '',
    email: '',
    password: '',
    latitude: '',
    longitude: ''
  });

  const [locationStatus, setLocationStatus] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState('');
  const hasLocation = formData.latitude !== '' && formData.longitude !== '';

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setLoadingLocation(true);
    setLocationStatus('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon
        }));

        setLoadingLocation(false);
        setLocationStatus(`Location captured successfully! (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
      },
      (geoError) => {
        setLoadingLocation(false);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setLocationStatus('Permission denied. Please allow location access.');
            break;
          case geoError.POSITION_UNAVAILABLE:
            setLocationStatus('Location information unavailable.');
            break;
          case geoError.TIMEOUT:
            setLocationStatus('Location request timed out.');
            break;
          default:
            setLocationStatus('An unknown error occurred.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
    if (
      formData.latitude === '' || formData.longitude === '' ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
      setError('Please click "Detect My Current Location" to capture your coordinates before creating an account.');
      return;
    }

    try {
      const response = await api.post('/auth/register', { ...formData, latitude, longitude });
      onAuthenticated(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow mt-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">JOIN THE EXCHANGE</h2>
      <p className="text-sm text-slate-600 mb-6">Your account takes you straight to the commodity exchange.</p>

      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Full name</label>
          <input 
            type="text" 
            name="fullName" 
            value={formData.fullName} 
            onChange={handleChange} 
            required 
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Phone number</label>
          <input 
            type="tel" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange} 
            required 
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">County</label>
          <input 
            type="text" 
            name="county" 
            value={formData.county} 
            onChange={handleChange} 
            required 
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Account type</label>
          <select 
            name="role" 
            value={formData.role} 
            onChange={handleChange} 
            required 
            className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
          >
            <option value="FARMER">Farmer / producer</option>
            <option value="BUYER">Buyer / distributor</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Business name (optional)</label>
          <input 
            type="text" 
            name="businessName" 
            value={formData.businessName} 
            onChange={handleChange} 
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Email address</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input 
            type="password" 
            name="password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
            placeholder="Use at least 8 characters."
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </div>

        {/* Geolocation Section Added Here */}
        <div className="border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Exchange Location (Required)</label>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={loadingLocation}
            className="w-full rounded bg-slate-100 border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {loadingLocation ? 'Detecting...' : '📍 Detect My Current Location Automatically'}
          </button>
          {locationStatus && (
            <p className={`mt-2 text-xs ${hasLocation ? 'text-green-600 font-medium' : 'text-orange-600'}`}>
              {locationStatus}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 transition-colors"
        >
          Create account and enter exchange
        </button>
      </form>
    </div>
  );
}