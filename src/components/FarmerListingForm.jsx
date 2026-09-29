import React, { useState } from 'react';
import api from '../api';

const FarmerListingForm = () => {
  const [formData, setFormData] = useState({
    farmerId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Example pre-seeded farmer UUID
    cropType: 'Tomatoes',
    quantityKg: '',
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
      const response = await api.post('/listings', formData);
      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit produce listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">List Commercial Stock</h2>
      <p className="text-gray-600 mb-6 text-sm">Publish available volume and pricing for regional buyers and distributors.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Product</label>
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Available Volume (kg)</label>
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">County / Region</label>
            <input
              type="text"
              name="county"
              value={formData.county}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trading Area</label>
            <input
              type="text"
              name="subCounty"
              value={formData.subCounty}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Asking Price (KES/kg)</label>
          <input
            type="number"
            name="startingPricePerKg"
            min="0"
            step="0.01"
            value={formData.startingPricePerKg}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-md transition duration-200 text-sm"
        >
          {loading ? 'Publishing stock...' : 'Publish Stock Listing'}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50 border-gray-200">
          <h3 className="text-base font-bold text-gray-800 mb-2">Stock published</h3>
          <p className="text-sm text-gray-600">{result.quantityKg} kg of {result.cropType} is available to regional buyers at KES {result.startingPricePerKg}/kg.</p>
        </div>
      )}
    </div>
  );
};

export default FarmerListingForm;