// Import necessary types and modules
import { NextApiResponseServerIo } from '@/lib/types';
import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { NextApiRequest } from 'next';

// Configure the API route to disable bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define the handler function for the API route
const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
  // Check if the socket server instance doesn't exist yet
  if (!res.socket.server.io) {
    // Define the path for the socket.io endpoint
    const path = '/api/socket/io';
    // Get the HTTP server instance from the response socket
    const httpServer: NetServer = res.socket.server as any;
    // Create a new socket.io server instance and pass the HTTP server instance to it
    const io = new ServerIO(httpServer, {
      path,  // Specify the path for the socket.io endpoint
      addTrailingSlash: false, // Ensure that trailing slashes are not added to the endpoint path
    });
    // Handle socket connection events
    io.on('connection', (s) => {
      // Handle 'create-room' event - join a room based on fileId
      s.on('create-room', (fileId) => {
        s.join(fileId);
      });
      // Handle 'send-changes' event - emit changes to clients in the same room
      s.on('send-changes', (deltas, fileId) => {
        console.log('CHANGE'); // Log a message to indicate that changes are being sent
        s.to(fileId).emit('receive-changes', deltas, fileId); // Emit changes to clients in the same room
      });
      // Handle 'send-cursor-move' event - emit cursor movement to clients in the same room
      s.on('send-cursor-move', (range, fileId, cursorId) => {
        s.to(fileId).emit('receive-cursor-move', range, fileId, cursorId); // Emit cursor movement to clients in the same room
      });
    });
    // Store the socket.io server instance in the HTTP server for later use
    res.socket.server.io = io;
  }
  // End the response
  res.end();
};

// Export the handler function as default
export default ioHandler;
