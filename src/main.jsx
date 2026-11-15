import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import api from './api';
import AuthPage from './components/AuthPage';
import BuyerAuctionFeed from './components/BuyerAuctionFeed';
import FarmerListingForm from './components/FarmerListingForm';
import ImpactDashboard from './components/ImpactDashboard';
import AdminUserManagement from './components/AdminUserManagement';

const TAB_SESSION_KEY = 'sokobora_authenticated_tab';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [listingRefreshKey, setListingRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const handleSessionExpired = () => {
      window.sessionStorage.removeItem(TAB_SESSION_KEY);
      setUser(null);
    };
    window.addEventListener('sokobora:session-expired', handleSessionExpired);
    const hasTabSession = window.sessionStorage.getItem(TAB_SESSION_KEY) === 'true';
    const verifySession = hasTabSession ? api.get('/auth/me') : api.post('/auth/logout');

    verifySession
      .then((response) => {
        if (!active) return;
        if (hasTabSession) {
          setUser(response.data.data);
        } else {
          window.sessionStorage.removeItem(TAB_SESSION_KEY);
        }
      })
      .catch((error) => {
        if (!active) return;
        window.sessionStorage.removeItem(TAB_SESSION_KEY);
        if (error.response?.status !== 401) {
          setSessionError(error.response?.data?.message || 'Could not connect to SokoBora AI. Please try again.');
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
      window.removeEventListener('sokobora:session-expired', handleSessionExpired);
    };
  }, []);

  const handleAuthenticated = (authenticatedUser) => {
    window.sessionStorage.setItem(TAB_SESSION_KEY, 'true');
    setSessionError('');
    setUser(authenticatedUser);
  };

  const handleLogout = async () => {
    setSessionError('');
    try {
      await api.post('/auth/logout');
      window.sessionStorage.removeItem(TAB_SESSION_KEY);
      setUser(null);
    } catch (error) {
      setSessionError(error.response?.data?.message || 'Could not sign out. Please try again.');
    }
  };

  if (checkingSession) {
    return <main className="min-h-screen flex items-center justify-center text-slate-600">Checking your account...</main>;
  }

  if (!user) {
    if (sessionError) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center">
          <p role="alert" className="text-red-700">{sessionError}</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded bg-green-700 px-4 py-2 text-white">
            Try again
          </button>
        </main>
      );
    }
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-green-800">SokoBora AI</h1>
          <p className="mt-1 text-sm text-slate-600">Commercial produce trading for regional buyers and distributors.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{user.fullName}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>
      {sessionError && (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {sessionError}
        </div>
      )}
      {user.role === 'ADMIN' ? (
        <>
          <ImpactDashboard />
          <AdminUserManagement currentUserId={user.id} />
        </>
      ) : user.role === 'FARMER' ? (
        <>
          <FarmerListingForm
            user={user}
            onListingCreated={() => setListingRefreshKey((key) => key + 1)}
          />
          <BuyerAuctionFeed key={listingRefreshKey} user={user} />
        </>
      ) : user.role === 'BUYER' ? (
        <BuyerAuctionFeed user={user} />
      ) : (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          This account has an unsupported role. Please contact an administrator.
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);