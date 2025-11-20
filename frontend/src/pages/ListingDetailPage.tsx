import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Listing {
  listingId: string;
  sellerAgentId: string;
  title: string;
  description: string;
  basePrice: number;
  expectedPrice: number;
  status: string;
  createdAt: string;
  transactionId: string;
  negotiationRoomId: string | null;
  negotiationRoomStatus: string | null;
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchListing = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/marketplace/listings/${id}`
        );
        setListing(response.data);
      } catch (err) {
        console.error('Failed to fetch listing:', err);
        setError('Failed to load listing details');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Listing not found'}</p>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Listing Details</h1>
        </div>

        {/* Listing Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Status Badge */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">
                Status: {listing.status}
              </span>
              <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
                Listing #{listing.listingId}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {listing.title}
            </h2>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Description
              </h3>
              <p className="text-gray-600">{listing.description}</p>
            </div>

            {/* Price Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Base Price</p>
                <p className="text-2xl font-bold text-blue-600">
                  {listing.basePrice} HBAR
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Expected Price</p>
                <p className="text-2xl font-bold text-purple-600">
                  {listing.expectedPrice} HBAR
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Seller Agent ID</span>
                <span className="text-sm font-medium text-gray-900">
                  #{listing.sellerAgentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(listing.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Transaction ID</span>
                <a
                  href={`https://hashscan.io/testnet/transaction/${listing.transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-blue-600 hover:text-blue-700 hover:underline max-w-xs truncate"
                  title={listing.transactionId}
                >
                  {listing.transactionId}
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate('/home')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
              <a
                href={`https://hashscan.io/testnet/transaction/${listing.transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                View on HashScan
              </a>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-2xl">✅</div>
            <div>
              <h3 className="text-green-900 font-semibold mb-1">
                Listing Created Successfully!
              </h3>
              <p className="text-green-700 text-sm">
                Your listing has been published on the Hedera blockchain and is
                now visible to potential buyers.
              </p>
            </div>
          </div>
        </div>

        {/* Negotiation Room Section */}
        {listing.negotiationRoomId && (
          <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <h3 className="text-white font-semibold">Negotiation Room</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Room Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    listing.negotiationRoomStatus === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : listing.negotiationRoomStatus === 'WAITING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {listing.negotiationRoomStatus === 'WAITING'
                      ? 'Waiting for Buyer'
                      : listing.negotiationRoomStatus}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Room ID: {listing.negotiationRoomId.slice(0, 8)}...
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {listing.negotiationRoomStatus === 'WAITING'
                  ? 'A negotiation room has been created for this listing. Once a buyer matches with your listing, negotiations can begin here.'
                  : 'A buyer has joined the negotiation room. Click below to start negotiating.'}
              </p>
              <button
                onClick={() => navigate(`/negotiation/${listing.negotiationRoomId}`)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Go to Negotiation Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
