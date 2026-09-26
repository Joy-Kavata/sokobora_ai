import React, { useState } from 'react';
import axios from 'axios';

const FarmerListingForm = () => {
  const [formData, setFormData] = useState({
    farmerId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Example pre-seeded farmer UUID
    cropType: 'Tomatoes',
    quantityKg: '',
    harvestDate: new Date().toISOString().split('T')[0],
    storageType: 'Ambient Shade',
    ambientTemp: '26',
    county: 'Kiambu',
    subCounty: 'Kabete',
    latitude: -1.242,
    longitude: 36.721,
    startingPricePerKg: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // POST to Express API endpoint
      const response = await axios.post('http://localhost:5000/api/listings', formData);
      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit produce listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">SokoBora AI - Produce Registration</h2>
      <p className="text-gray-600 mb-6 text-sm">Log fresh harvest to run AI shelf-life prediction and market matching.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Crop Type</label>
            <select
              name="cropType"
              value={formData.cropType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="Tomatoes">Tomatoes</option>
              <option value="Mangoes">Mangoes</option>
              <option value="Kales">Kales</option>
              <option value="Onions">Onions</option>
              <option value="Bananas">Bananas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity (Kg)</label>
            <input
              type="number"
              name="quantityKg"
              placeholder="e.g. 500"
              value={formData.quantityKg}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Harvest Date</label>
            <input
              type="date"
              name="harvestDate"
              value={formData.harvestDate}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Storage Condition</label>
            <select
              name="storageType"
              value={formData.storageType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="Direct Sun">Direct Sun</option>
              <option value="Ambient Shade">Ambient Shade</option>
              <option value="Ventilated Crates">Ventilated Crates</option>
              <option value="Cold Storage">Cold Storage</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ambient Temp (°C)</label>
            <input
              type="number"
              name="ambientTemp"
              value={formData.ambientTemp}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">County</label>
            <input
              type="text"
              name="county"
              value={formData.county}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-md transition duration-200 text-sm"
        >
          {loading ? 'Analyzing with AI Engine...' : 'Run AI Analysis & Register Listing'}
        </button>
      </form>

      {/* AI Output Result Card */}
      {result && result.aiLog && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50 border-gray-200">
          <h3 className="text-base font-bold text-gray-800 mb-3">SokoBora AI Analysis Result</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 bg-white rounded border border-gray-200">
              <p className="text-xs text-gray-500">Spoilage Risk Level</p>
              <span className={`inline-block mt-1 px-2.5 py-1 text-xs font-bold rounded ${
                result.aiLog.spoilageRisk === 'HIGH' || result.aiLog.spoilageRisk === 'CRITICAL'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}>
                {result.aiLog.spoilageRisk} RISK
              </span>
            </div>

            <div className="p-3 bg-white rounded border border-gray-200">
              <p className="text-xs text-gray-500">Recommended Fair Price</p>
              <p className="text-sm font-bold text-gray-800 mt-1">
                KES {result.aiLog.recommendedMinPrice} - {result.aiLog.recommendedMaxPrice} / kg
              </p>
            </div>
          </div>

          <div className="p-3 bg-white rounded border border-gray-200 text-xs text-gray-600">
            <p><strong>Estimated Shelf Life Remaining:</strong> ~{result.aiLog.estimatedShelfHours} hours</p>
            <p><strong>Listing Action:</strong> {result.status === 'FLASH_AUCTION' ? 'Triggered Flash Auction (High Urgency)' : 'Standard Marketplace Listing'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerListingForm;