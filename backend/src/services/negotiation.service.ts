/**
 * Negotiation Service
 * Handles negotiation room operations and A2A message logging
 */

import { PrismaClient } from "@prisma/client";
import { io } from "../socket";

const prisma = new PrismaClient();

/**
 * Get negotiation room by ID
 */
export async function getNegotiationRoom(roomId: string) {
  const room = await prisma.negotiationRoom.findUnique({
    where: { id: roomId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!room) {
    throw new Error(`NegotiationRoom ${roomId} not found`);
  }

  return room;
}

/**
 * Get negotiation room by listing ID
 */
export async function getNegotiationRoomByListing(listingId: number) {
  const room = await prisma.negotiationRoom.findUnique({
    where: { listingId: String(listingId) },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return room;
}

/**
 * Get all rooms for a specific agent (as seller or buyer)
 */
export async function getRoomsForAgent(agentId: number) {
  const rooms = await prisma.negotiationRoom.findMany({
    where: {
      OR: [
        { sellerAgentId: agentId },
        { buyerAgentId: agentId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  return rooms.map(room => ({
    id: room.id,
    listingId: room.listingId,
    sellerAgentId: room.sellerAgentId,
    buyerAgentId: room.buyerAgentId,
    status: room.status,
    role: room.sellerAgentId === agentId ? 'seller' : 'buyer',
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }));
}

/**
 * Get messages for a room
 */
export async function getMessages(roomId: string, limit = 100, offset = 0) {
  const messages = await prisma.negotiationMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    skip: offset,
    take: limit,
  });

  return messages.map(msg => ({
    id: msg.id,
    roomId: msg.roomId,
    sender: msg.sender,
    senderAgentId: msg.senderAgentId,
    content: msg.content,
    messageType: msg.messageType,
    metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
    createdAt: msg.createdAt.toISOString(),
  }));
}

/**
 * Send a message in a negotiation room
 */
export async function sendMessage(params: {
  roomId: string;
  senderAgentId: number;
  content: string;
  messageType?: string;
  metadata?: Record<string, any>;
}) {
  // Get room to determine sender role
  const room = await prisma.negotiationRoom.findUnique({
    where: { id: params.roomId },
  });

  if (!room) {
    throw new Error(`NegotiationRoom ${params.roomId} not found`);
  }

  // Determine sender role
  let sender: 'seller' | 'buyer';
  if (room.sellerAgentId === params.senderAgentId) {
    sender = 'seller';
  } else if (room.buyerAgentId === params.senderAgentId) {
    sender = 'buyer';
  } else {
    throw new Error(`Agent ${params.senderAgentId} is not a participant in room ${params.roomId}`);
  }

  // Create message
  const message = await prisma.negotiationMessage.create({
    data: {
      roomId: params.roomId,
      sender,
      senderAgentId: params.senderAgentId,
      content: params.content,
      messageType: params.messageType || 'text',
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });

  // Update room timestamp
  await prisma.negotiationRoom.update({
    where: { id: params.roomId },
    data: { updatedAt: new Date() },
  });

  const messageData = {
    id: message.id,
    roomId: message.roomId,
    sender: message.sender,
    senderAgentId: message.senderAgentId,
    content: message.content,
    messageType: message.messageType,
    metadata: params.metadata || null,
    createdAt: message.createdAt.toISOString(),
  };

  // Emit WebSocket event to room
  io.to(`negotiation:${params.roomId}`).emit('negotiation:message', messageData);

  return messageData;
}

/**
 * Update room status
 */
export async function updateRoomStatus(roomId: string, status: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED') {
  const room = await prisma.negotiationRoom.update({
    where: { id: roomId },
    data: { status },
  });

  // Emit WebSocket event
  io.to(`negotiation:${roomId}`).emit('negotiation:statusChanged', {
    roomId,
    status,
  });

  return room;
}
