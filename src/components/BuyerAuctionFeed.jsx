import React, { useState, useEffect } from 'react';
import api from '../api';

const BuyerAuctionFeed = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [bidError, setBidError] = useState('');
  const [feedError, setFeedError] = useState('');
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [workflowBusy, setWorkflowBusy] = useState(false);
  
  // Example pre-seeded buyer UUID
  const buyerId = 'b18ac20c-48dd-4372-b567-0e02b2c3d980';

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await api.get('/listings');
      setListings(response.data.data || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setFeedError(err.response?.data?.message || err.message || 'Could not load regional stock listings.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBidModal = (listing) => {
    setSelectedListing(listing);
    setBidAmount(listing.currentHighestBid || listing.startingPricePerKg);
    setBidSuccess('');
    setBidError('');
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');

    try {
      const response = await api.post('/bids', {
        listingId: selectedListing.id,
        buyerId: buyerId,
        bidAmountPerKg: parseFloat(bidAmount)
      });

      setBidSuccess(response.data.message);
      fetchListings(); // Refresh feed to reflect new bid
      setTimeout(() => setSelectedListing(null), 1500);
    } catch (err) {
      setBidError(err.response?.data?.message || 'Failed to place bid');
    }
  };

  const acceptBid = async (bidId) => {
    setWorkflowBusy(true);
    setWorkflowError('');
    setWorkflowMessage('');
    try {
      const response = await api.post('/bids/accept', { bidId, farmerId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
      setWorkflowMessage(response.data.message);
      await fetchListings();
    } catch (err) {
      setWorkflowError(err.response?.data?.message || 'Could not accept this bid.');
    } finally {
      setWorkflowBusy(false);
    }
  };

  const advanceEscrow = async (transaction, action) => {
    setWorkflowBusy(true);
    setWorkflowError('');
    setWorkflowMessage('');
    try {
      const response = await api.post(`/escrow/${action}`, { transactionId: transaction.id });
      setWorkflowMessage(response.data.message);
      await fetchListings();
    } catch (err) {
      setWorkflowError(err.response?.data?.message || 'Could not update escrow status.');
    } finally {
      setWorkflowBusy(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading SokoBora AI marketplace feed...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Regional Stock Exchange</h2>
          <p className="text-sm text-gray-600">Available commercial volumes for buyers, wholesalers, and distributors.</p>
        </div>
        <button 
          onClick={fetchListings}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded"
        >
          Refresh Feed
        </button>
      </div>

      {feedError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {feedError}
        </div>
      )}

      {workflowError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{workflowError}</div>
      )}
      {workflowMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-md">{workflowMessage}</div>
      )}

      {listings.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg text-gray-500 border">
          No active produce listings available at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            return (
              <div 
                key={listing.id} 
                className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{listing.cropType}</h3>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-100 text-green-800">
                      {listing.status === 'LOCKED' ? 'ORDERED' : 'AVAILABLE'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-1">Trading area: {listing.subCounty}, {listing.county}</p>
                  <p className="text-xs text-gray-500 mb-3">Available volume: <span className="font-semibold text-gray-700">{listing.quantityKg.toLocaleString()} kg</span></p>

                  <div className="bg-gray-50 p-2.5 rounded border border-gray-100 mb-4 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Asking price:</span>
                      <span className="font-semibold">KES {listing.startingPricePerKg}/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Current Highest Bid:</span>
                      <span className="font-bold text-green-700">
                        {listing.currentHighestBid ? `KES ${listing.currentHighestBid}/kg` : 'No bids yet'}
                      </span>
                    </div>
                  </div>
                  {listing.transaction && (
                    <EscrowTracker
                      transaction={listing.transaction}
                      busy={workflowBusy}
                      onAdvance={advanceEscrow}
                    />
                  )}
                  {!listing.transaction && listing.bids?.some((bid) => bid.status === 'PENDING') && (
                    <div className="mb-4 border border-amber-200 bg-amber-50 p-3 rounded">
                      <p className="text-xs font-semibold text-amber-900 mb-2">Buyer bids awaiting acceptance</p>
                      {listing.bids.filter((bid) => bid.status === 'PENDING').map((bid) => (
                        <div key={bid.id} className="flex items-center justify-between gap-2 py-1">
                          <span className="text-xs text-gray-700">KES {bid.bidAmountPerKg}/kg</span>
                          <button
                            type="button"
                            onClick={() => acceptBid(bid.id)}
                            disabled={workflowBusy}
                            className="px-2.5 py-1.5 bg-amber-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                          >
                            Accept bid
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleOpenBidModal(listing)}
                  disabled={listing.status === 'LOCKED'}
                  className={`w-full py-2 text-xs font-bold rounded transition ${
                    listing.status === 'LOCKED'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {listing.status === 'LOCKED' ? 'Order Locked' : 'Place Bid Now'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Bidding Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Place Bid for {selectedListing.cropType}</h3>
            <p className="text-xs text-gray-500 mb-4">{selectedListing.quantityKg} kg available in {selectedListing.county}</p>

            {bidError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {bidError}
              </div>
            )}

            {bidSuccess && (
              <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-700 text-xs rounded">
                {bidSuccess}
              </div>
            )}

            <form onSubmit={handlePlaceBid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bid Amount Per Kg (KES)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Starting Price: KES {selectedListing.startingPricePerKg} / kg
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded border text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Total Order Value:</span>
                  <span className="font-bold text-gray-800">KES {(parseFloat(bidAmount || 0) * selectedListing.quantityKg).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="w-1/2 py-2 border text-gray-600 text-xs font-semibold rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                >
                  Confirm Bid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerAuctionFeed;

function EscrowTracker({ transaction, busy, onAdvance }) {
  const steps = [
    { key: 'PENDING_DEPOSIT', label: 'Deposit pending' },
    { key: 'FUNDS_HELD', label: 'Funds recorded as held' },
    { key: 'RELEASED', label: 'Release recorded' }
  ];
  const currentIndex = steps.findIndex((step) => step.key === transaction.escrowStatus);
  const nextAction = transaction.escrowStatus === 'PENDING_DEPOSIT'
    ? { path: 'deposit', label: 'Record deposit received' }
    : transaction.escrowStatus === 'FUNDS_HELD'
      ? { path: 'release', label: 'Record release' }
      : null;

  return (
    <section className="mb-4 p-3 border border-green-200 bg-green-50 rounded" aria-label="Escrow status tracker">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-xs font-bold text-green-950">NESCRO escrow workflow</h4>
        <span className="text-[10px] text-green-900">Status tracking only</span>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => {
          const complete = index <= currentIndex;
          return (
            <li key={step.key} className="flex items-center gap-2 text-xs">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${complete ? 'border-green-700 bg-green-700 text-white' : 'border-gray-300 bg-white text-gray-500'}`}>
                {complete ? '✓' : index + 1}
              </span>
              <span className={complete ? 'font-semibold text-green-950' : 'text-gray-600'}>{step.label}</span>
            </li>
          );
        })}
      </ol>
      {nextAction && (
        <button
          type="button"
          onClick={() => onAdvance(transaction, nextAction.path)}
          disabled={busy}
          className="mt-3 w-full rounded bg-green-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Updating status...' : nextAction.label}
        </button>
      )}
      <p className="mt-2 text-[10px] leading-4 text-gray-600">This prototype records escrow workflow states only. No payment or fund transfer is connected.</p>
    </section>
  );
}