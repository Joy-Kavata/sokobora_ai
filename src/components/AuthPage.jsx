import React, { useState } from 'react';
import api from '../api';

const initialFormData = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  county: '',
  role: 'FARMER',
  businessName: '',
  latitude: '',
  longitude: ''
};

const AuthPage = ({ onAuthenticated }) => {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState(initialFormData);
  const [locationStatus, setLocationStatus] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegistering = mode === 'register';
  const hasLocation = formData.latitude !== '' && formData.longitude !== '';

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setLoadingLocation(true);
    setLocationStatus('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setFormData((previous) => ({ ...previous, latitude, longitude }));
        setLoadingLocation(false);
        setLocationStatus(`Location captured successfully! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
    if (
      isRegistering &&
      (
        formData.latitude === '' || formData.longitude === '' ||
        !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180
      )
    ) {
      setError('Please detect your current location before creating an account.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const payload = isRegistering
        ? { ...formData, latitude, longitude }
        : { email: formData.email, password: formData.password };
      const response = await api.post(endpoint, payload);
      onAuthenticated(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to access your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isRegistering ? 'login' : 'register');
    setError('');
    setLocationStatus('');
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        <section className="flex flex-col justify-between bg-green-800 p-8 text-white md:p-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-200">SokoBora AI</p>
            <h1 className="mt-12 text-4xl font-bold leading-tight md:text-5xl">A better market for every harvest.</h1>
            <p className="mt-5 max-w-md text-green-100">
              Sign in or create an account to connect with Kenya&apos;s regional produce exchange.
            </p>
          </div>
          <p className="mt-12 text-sm text-green-200">Fair trade. Fresh produce. Stronger communities.</p>
        </section>

        <section className="p-8 md:p-12">
          <div className="mb-8">
            <p className="text-sm font-semibold text-green-700">{isRegistering ? 'JOIN THE EXCHANGE' : 'WELCOME BACK'}</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {isRegistering ? 'Create your account' : 'Sign in'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isRegistering
                ? 'Your account takes you straight to the commodity exchange.'
                : 'Sign in to continue to the commodity exchange.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  County
                  <input
                    name="county"
                    type="text"
                    autoComplete="address-level1"
                    value={formData.county}
                    onChange={handleChange}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Account type
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="FARMER">Farmer / producer</option>
                    <option value="BUYER">Buyer / distributor</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Business name <span className="font-normal text-slate-400">(optional)</span>
                  <input
                    name="businessName"
                    type="text"
                    autoComplete="organization"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </label>
                <div className="border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700">Exchange Location (Required)</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={loadingLocation}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingLocation ? 'Detecting...' : '📍 Detect My Current Location Automatically'}
                  </button>
                  {locationStatus && (
                    <p role="status" className={`mt-2 text-xs ${hasLocation ? 'text-green-600' : 'text-orange-600'}`}>
                      {locationStatus}
                    </p>
                  )}
                </div>
              </>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                name="password"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                minLength={isRegistering ? 8 : undefined}
                maxLength={128}
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
              {isRegistering && <span className="mt-1 block text-xs font-normal text-slate-500">Use at least 8 characters.</span>}
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? 'Please wait...' : isRegistering ? 'Create account and enter exchange' : 'Sign in to exchange'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isRegistering ? 'Already have an account?' : 'New to SokoBora AI?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-green-700 hover:text-green-900"
            >
              {isRegistering ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
};

export default AuthPage;
