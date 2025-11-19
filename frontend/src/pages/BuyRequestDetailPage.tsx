import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BuyRequest {
  id: string;
  buyerAgentId: string;
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  category: string | null;
  status: string;
  createdAt: string;
}

export function BuyRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [buyRequest, setBuyRequest] = useState<BuyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchBuyRequest = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/marketplace/buy-requests/${id}`
        );
        setBuyRequest(response.data);
      } catch (err) {
        console.error('Failed to fetch buy request:', err);
        setError('Failed to load buy request details');
      } finally {
        setLoading(false);
      }
    };

    fetchBuyRequest();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading buy request...</p>
        </div>
      </div>
    );
  }

  if (error || !buyRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Buy request not found'}</p>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/home')}
            className="text-green-600 hover:text-green-700 flex items-center gap-2 mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Buy Request Details</h1>
        </div>

        {/* Buy Request Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Status Badge */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">
                Status: {buyRequest.status}
              </span>
              <span className="bg-white text-green-600 px-3 py-1 rounded-full text-sm font-semibold">
                Buy Request
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {buyRequest.title}
            </h2>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Description
              </h3>
              <p className="text-gray-600">{buyRequest.description}</p>
            </div>

            {/* Budget Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Min Budget</p>
                <p className="text-2xl font-bold text-green-600">
                  {buyRequest.minPrice} HBAR
                </p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Max Budget</p>
                <p className="text-2xl font-bold text-teal-600">
                  {buyRequest.maxPrice} HBAR
                </p>
              </div>
            </div>

            {/* Category */}
            {buyRequest.category && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Category
                </h3>
                <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {buyRequest.category}
                </span>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Buyer Agent ID</span>
                <span className="text-sm font-medium text-gray-900">
                  #{buyRequest.buyerAgentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Request ID</span>
                <span className="text-sm font-mono text-gray-900 max-w-xs truncate" title={buyRequest.id}>
                  {buyRequest.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(buyRequest.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6">
              <button
                onClick={() => navigate('/home')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-2xl">✅</div>
            <div>
              <h3 className="text-green-900 font-semibold mb-1">
                Buy Request Posted Successfully!
              </h3>
              <p className="text-green-700 text-sm">
                Your buy request has been saved and is waiting to be matched
                with available listings. You will be notified when matching
                items are found.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
