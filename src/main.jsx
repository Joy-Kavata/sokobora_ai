import React from 'react';
import { createRoot } from 'react-dom/client';
import BuyerAuctionFeed from './components/BuyerAuctionFeed';
import FarmerListingForm from './components/FarmerListingForm';
import ImpactDashboard from './components/ImpactDashboard';

function App() {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <header>
        <h1>SokoBora AI</h1>
        <p>Fresh produce marketplace and post-harvest impact.</p>
      </header>
      <ImpactDashboard />
      <FarmerListingForm />
      <BuyerAuctionFeed />
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);