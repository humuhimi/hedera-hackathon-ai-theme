import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNegotiationWebSocket } from '../hooks/useNegotiationWebSocket';

interface NegotiationRoom {
  id: string;
  listingId: number;
  sellerAgentId: number;
  buyerAgentId: number | null;
  sellerA2AEndpoint: string;
  buyerA2AEndpoint: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface NegotiationMessage {
  id: string;
  roomId: string;
  sender: 'seller' | 'buyer';
  senderAgentId: number;
  content: string;
  messageType: string;
  metadata: any;
  createdAt: string;
}

export function NegotiationPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<NegotiationRoom | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Handle new messages from WebSocket
  const handleMessage = useCallback((message: NegotiationMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Handle status changes
  const handleStatusChanged = useCallback((status: string) => {
    setRoom(prev => prev ? { ...prev, status } : null);
  }, []);

  // Connect to WebSocket
  const { isConnected } = useNegotiationWebSocket({
    roomId,
    onMessage: handleMessage,
    onStatusChanged: handleStatusChanged,
  });

  // Fetch room and messages on mount
  useEffect(() => {
    if (!roomId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch room details
        const roomResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/negotiation/rooms/${roomId}`
        );
        setRoom(roomResponse.data);

        // Fetch messages
        const messagesResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/negotiation/rooms/${roomId}/messages`
        );
        setMessages(messagesResponse.data.messages || []);
      } catch (err) {
        console.error('Failed to fetch negotiation data:', err);
        setError('Failed to load negotiation room');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !room || sending) return;

    setSending(true);
    try {
      // For now, assume we're the buyer (TODO: get from context)
      const senderAgentId = room.buyerAgentId || room.sellerAgentId;

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/negotiation/rooms/${roomId}/messages`,
        {
          senderAgentId,
          content: newMessage,
          messageType: 'text',
        }
      );

      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading negotiation room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Room not found'}</p>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm mb-1"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Negotiation Room
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                Listing #{room.listingId}
              </p>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                room.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                room.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                room.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                room.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {room.status}
              </span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Room Info */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Seller Agent:</span>
            <span className="ml-2 font-medium">#{room.sellerAgentId}</span>
          </div>
          <div>
            <span className="text-gray-500">Buyer Agent:</span>
            <span className="ml-2 font-medium">
              {room.buyerAgentId ? `#${room.buyerAgentId}` : 'Waiting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the negotiation!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-md px-4 py-3 rounded-lg
                  ${msg.sender === 'buyer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border shadow-sm'
                  }
                `}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${
                      msg.sender === 'buyer' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {msg.sender === 'buyer' ? 'Buyer' : 'Seller'} Agent #{msg.senderAgentId}
                    </span>
                    {msg.messageType !== 'text' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        msg.sender === 'buyer' ? 'bg-blue-500' : 'bg-gray-100'
                      }`}>
                        {msg.messageType}
                      </span>
                    )}
                  </div>
                  <p className={msg.sender === 'buyer' ? 'text-white' : 'text-gray-900'}>
                    {msg.content}
                  </p>
                  <p className={`text-xs mt-1 ${
                    msg.sender === 'buyer' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t px-4 py-3">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending || !isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
