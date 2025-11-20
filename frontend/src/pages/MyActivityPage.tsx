import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface ListingWithNegotiation {
  id: string;
  listingId: string;
  sellerAgentId: number;
  title: string;
  description: string;
  basePrice: number;
  expectedPrice: number;
  status: string;
  createdAt: string;
  negotiation?: {
    roomId: string;
    buyerAgentId: number | null;
    status: string;
    agreedPrice: number | null;
    negotiationUrl: string;
    createdAt: string;
  };
}

interface BuyRequestWithNegotiation {
  id: string;
  buyerAgentId: number;
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  status: string;
  searchStep: string;
  matchedListingId: number | null;
  createdAt: string;
  negotiation?: {
    roomId: string;
    sellerAgentId: number;
    listingId: string;
    status: string;
    agreedPrice: number | null;
    negotiationUrl: string;
    createdAt: string;
  };
}

interface UserActivity {
  listings: ListingWithNegotiation[];
  buyRequests: BuyRequestWithNegotiation[];
}

function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'WAITING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function MyActivityPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'purchases'>('listings');

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    if (!session?.token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/activity`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`
          }
        }
      );
      setActivity(response.data);
    } catch (err: any) {
      console.error('Failed to fetch user activity:', err);
      setError(err.response?.data?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your activity...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm mb-2"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Activity</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your listings and purchase requests
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('listings')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'listings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 My Listings ({activity?.listings.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'purchases'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🛒 My Purchases ({activity?.buyRequests.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {activity?.listings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">No listings yet</p>
              </div>
            ) : (
              activity?.listings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {listing.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-500">
                          Base: {listing.basePrice} HBAR
                        </span>
                        <span className="text-gray-500">
                          Expected: {listing.expectedPrice} HBAR
                        </span>
                        <span className="text-gray-500">
                          Agent #{listing.sellerAgentId}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          listing.status
                        )}`}
                      >
                        {listing.status}
                      </span>
                      {listing.negotiation && (
                        <button
                          onClick={() =>
                            window.open(listing.negotiation!.negotiationUrl, '_blank')
                          }
                          className="text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                          View Negotiation
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Negotiation Details */}
                  {listing.negotiation && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(
                              listing.negotiation.status
                            )}`}
                          >
                            {listing.negotiation.status}
                          </span>
                          {listing.negotiation.buyerAgentId && (
                            <span className="text-gray-600">
                              Buyer Agent #{listing.negotiation.buyerAgentId}
                            </span>
                          )}
                          {listing.negotiation.agreedPrice && (
                            <span className="text-green-600 font-semibold">
                              Agreed: {listing.negotiation.agreedPrice} HBAR
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-4">
            {activity?.buyRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">No purchase requests yet</p>
              </div>
            ) : (
              activity?.buyRequests.map((buyRequest) => (
                <div
                  key={buyRequest.id}
                  className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {buyRequest.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {buyRequest.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-500">
                          Budget: {buyRequest.minPrice}-{buyRequest.maxPrice} HBAR
                        </span>
                        <span className="text-gray-500">
                          Agent #{buyRequest.buyerAgentId}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          buyRequest.status
                        )}`}
                      >
                        {buyRequest.status}
                      </span>
                      {buyRequest.negotiation && (
                        <button
                          onClick={() =>
                            window.open(buyRequest.negotiation!.negotiationUrl, '_blank')
                          }
                          className="text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                          View Negotiation
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Negotiation Details */}
                  {buyRequest.negotiation && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(
                              buyRequest.negotiation.status
                            )}`}
                          >
                            {buyRequest.negotiation.status}
                          </span>
                          <span className="text-gray-600">
                            Seller Agent #{buyRequest.negotiation.sellerAgentId}
                          </span>
                          <span className="text-gray-600">
                            Listing #{buyRequest.negotiation.listingId}
                          </span>
                          {buyRequest.negotiation.agreedPrice && (
                            <span className="text-green-600 font-semibold">
                              Agreed: {buyRequest.negotiation.agreedPrice} HBAR
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
