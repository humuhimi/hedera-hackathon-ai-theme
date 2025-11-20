/**
 * Socket.IO Instance
 * Separated to avoid circular dependencies
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

const app = express();
export const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL;

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

export { app };
