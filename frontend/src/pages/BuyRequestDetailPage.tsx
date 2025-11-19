import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { StepIndicator, getStepNumber } from '../components/buyRequest';
import { useBuyRequestWebSocket } from '../hooks/useBuyRequestWebSocket';

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
  // Search progress fields
  searchStep: string;
  searchMessage: string | null;
  matchedListingId: number | null;
  sellerAgentId: number | null;
  a2aEndpoint: string | null;
  searchError: string | null;
  negotiationRoomId: string | null;
}

export function BuyRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [buyRequest, setBuyRequest] = useState<BuyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle WebSocket progress updates
  const handleProgress = useCallback((progress: {
    buyRequestId: string;
    searchStep: string;
    searchMessage: string | null;
    matchedListingId: number | null;
    sellerAgentId: number | null;
    a2aEndpoint: string | null;
    searchError: string | null;
    negotiationRoomId: string | null;
  }) => {
    setBuyRequest(prev => prev ? {
      ...prev,
      searchStep: progress.searchStep,
      searchMessage: progress.searchMessage,
      matchedListingId: progress.matchedListingId,
      sellerAgentId: progress.sellerAgentId,
      a2aEndpoint: progress.a2aEndpoint,
      searchError: progress.searchError,
      negotiationRoomId: progress.negotiationRoomId,
    } : null);
  }, []);

  // Connect to WebSocket for real-time progress updates
  useBuyRequestWebSocket({
    buyRequestId: id,
    onProgress: handleProgress,
  });

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

        {/* Agent Search Progress Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h3 className="text-white font-semibold">Agent Auto-Search Progress</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Progress Steps */}
            <div className="space-y-4">
              <StepIndicator
                step={1}
                currentStep={getStepNumber(buyRequest.searchStep as any)}
                label="Search Listings"
                isError={buyRequest.searchStep === 'error' || buyRequest.searchStep === 'no_results'}
              />
              <StepIndicator
                step={2}
                currentStep={getStepNumber(buyRequest.searchStep as any)}
                label="Verify On-Chain"
                isError={buyRequest.searchStep === 'error' && getStepNumber(buyRequest.searchStep as any) === 2}
              />
              <StepIndicator
                step={3}
                currentStep={getStepNumber(buyRequest.searchStep as any)}
                label="Get A2A Endpoint"
                isError={buyRequest.searchStep === 'error' && getStepNumber(buyRequest.searchStep as any) === 3}
              />
              <StepIndicator
                step={4}
                currentStep={getStepNumber(buyRequest.searchStep as any)}
                label="Negotiate with Seller"
                isError={buyRequest.searchStep === 'error' && getStepNumber(buyRequest.searchStep as any) === 4}
              />
            </div>

            {/* Status Message */}
            {buyRequest.searchMessage && (
              <div className={`
                p-4 rounded-lg
                ${buyRequest.searchStep === 'error' ? 'bg-red-50 border border-red-200' : ''}
                ${buyRequest.searchStep === 'no_results' ? 'bg-yellow-50 border border-yellow-200' : ''}
                ${buyRequest.searchStep === 'complete' ? 'bg-green-50 border border-green-200' : ''}
                ${!['error', 'no_results', 'complete'].includes(buyRequest.searchStep) ? 'bg-blue-50 border border-blue-200' : ''}
              `}>
                <p className={`
                  text-sm font-medium
                  ${buyRequest.searchStep === 'error' ? 'text-red-700' : ''}
                  ${buyRequest.searchStep === 'no_results' ? 'text-yellow-700' : ''}
                  ${buyRequest.searchStep === 'complete' ? 'text-green-700' : ''}
                  ${!['error', 'no_results', 'complete'].includes(buyRequest.searchStep) ? 'text-blue-700' : ''}
                `}>
                  {buyRequest.searchMessage}
                </p>
                {buyRequest.searchError && (
                  <p className="text-sm text-red-600 mt-1">{buyRequest.searchError}</p>
                )}
              </div>
            )}

            {/* Matched Listing Info */}
            {buyRequest.matchedListingId && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Matched Listing</h4>
                <p className="text-sm text-gray-600">Listing #{buyRequest.matchedListingId}</p>
                {buyRequest.sellerAgentId && (
                  <p className="text-sm text-gray-600">Seller Agent #{buyRequest.sellerAgentId}</p>
                )}
              </div>
            )}

            {/* A2A Endpoint Info */}
            {buyRequest.a2aEndpoint && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Seller Agent A2A Endpoint</h4>
                <code className="block p-2 bg-gray-100 rounded text-xs text-gray-700 break-all">
                  {buyRequest.a2aEndpoint}
                </code>
              </div>
            )}

            {/* Action Button */}
            {buyRequest.searchStep === 'complete' && buyRequest.negotiationRoomId && (
              <button
                onClick={() => navigate(`/negotiation/${buyRequest.negotiationRoomId}`)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                Go to Negotiation Room
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
