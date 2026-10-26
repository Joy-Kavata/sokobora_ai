import React, { useState } from 'react';
import api from '../api';

export default function RegisterForm({ onAuthenticated }) {

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'BUYER', // Default role option
    businessName: '',
    county: '',
    subCounty: '',
    latitude: '',
    longitude: ''
  });

  const [locationStatus, setLocationStatus] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState('');

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
    try {
      const response = await api.post('/auth/register', formData);
      onAuthenticated(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-slate-800">Create an Account</h2>
      
      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      {/* Standard fields like Name, Email, Password, Role Dropdown */}
      <div>
        <label className="block text-sm font-medium text-slate-700">Full Name</label>
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
        <label className="block text-sm font-medium text-slate-700">Email Address</label>
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
          className="mt-1 w-full rounded border border-slate-300 p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Register As</label>
        <select 
          name="role" 
          value={formData.role} 
          onChange={handleChange} 
          className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
        >
          <option value="BUYER">Buyer</option>
          <option value="FARMER">Farmer / Seller</option>
        </select>
      </div>

      {/* 3. Location Detection Widget Integration */}
      <div className="border-t border-slate-200 pt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Your Delivery / Farm Location</label>
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={loadingLocation}
          className="w-full rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
        >
          {loadingLocation ? 'Detecting...' : '📍 Detect My Current Location Automatically'}
        </button>
        {locationStatus && (
          <p className={`mt-2 text-xs ${formData.latitude ? 'text-green-600' : 'text-orange-600'}`}>
            {locationStatus}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 transition-colors"
      >
        Register
      </button>
    </form>
  );
}