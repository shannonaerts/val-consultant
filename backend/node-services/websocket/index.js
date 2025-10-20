const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

// Create HTTP server
const server = http.createServer();
const PORT = process.env.WS_PORT || 3002;

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store active connections
const activeConnections = new Map();
const clientRooms = new Map();

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle user authentication and client association
  socket.on('authenticate', (data) => {
    const { userId, clientId, userRole } = data;

    // Store user info
    activeConnections.set(socket.id, {
      userId,
      clientId,
      userRole,
      connectedAt: new Date()
    });

    // Join client-specific room
    if (clientId) {
      socket.join(`client-${clientId}`);
      clientRooms.set(socket.id, clientId);

      // Notify others in the room
      socket.to(`client-${clientId}`).emit('user_joined', {
        userId,
        message: `${userRole} joined the session`
      });
    }

    // Send acknowledgment
    socket.emit('authenticated', {
      success: true,
      message: 'Successfully connected to VAL assistant'
    });

    // Send initial status
    socket.emit('status_update', {
      type: 'connection',
      status: 'active',
      message: 'VAL assistant is online and ready'
    });
  });

  // Handle chat messages
  socket.on('chat_message', async (data) => {
    const { message, clientId, userId } = data;
    const userConnection = activeConnections.get(socket.id);

    try {
      // Broadcast message to client room
      socket.to(`client-${clientId}`).emit('chat_message', {
        id: Date.now().toString(),
        userId,
        message,
        timestamp: new Date(),
        type: 'user'
      });

      // Simulate VAL response (in production, this would call the actual chat service)
      setTimeout(() => {
        const valResponse = generateVALResponse(message);
        socket.to(`client-${clientId}`).emit('chat_message', {
          id: (Date.now() + 1).toString(),
          userId: 'val-assistant',
          message: valResponse.message,
          sources: valResponse.sources,
          timestamp: new Date(),
          type: 'bot'
        });

        // Also send to the original sender
        socket.emit('chat_message', {
          id: (Date.now() + 1).toString(),
          userId: 'val-assistant',
          message: valResponse.message,
          sources: valResponse.sources,
          timestamp: new Date(),
          type: 'bot'
        });
      }, 1500);

    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('error', {
        type: 'chat_error',
        message: 'Failed to process message'
      });
    }
  });

  // Handle task updates
  socket.on('task_update', (data) => {
    const { taskId, status, clientId } = data;

    // Broadcast to client room
    socket.to(`client-${clientId}`).emit('task_update', {
      taskId,
      status,
      timestamp: new Date(),
      updatedBy: activeConnections.get(socket.id)?.userId
    });

    // Send task notification
    socket.to(`client-${clientId}`).emit('notification', {
      type: 'task_update',
      title: 'Task Updated',
      message: `Task ${taskId} marked as ${status}`,
      timestamp: new Date()
    });
  });

  // Handle meeting events
  socket.on('meeting_event', (data) => {
    const { event, meetingId, clientId, details } = data;

    socket.to(`client-${clientId}`).emit('meeting_event', {
      event,
      meetingId,
      details,
      timestamp: new Date()
    });
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { clientId, userId } = data;
    socket.to(`client-${clientId}`).emit('typing_start', { userId });
  });

  socket.on('typing_stop', (data) => {
    const { clientId, userId } = data;
    socket.to(`client-${clientId}`).emit('typing_stop', { userId });
  });

  // Handle reminder notifications
  socket.on('set_reminder', (data) => {
    const { taskId, dueDate, clientId } = data;

    // In production, this would set up actual reminders
    console.log(`Reminder set for task ${taskId} at ${dueDate}`);

    socket.emit('notification', {
      type: 'reminder_set',
      title: 'Reminder Set',
      message: `Reminder set for task ${taskId}`,
      timestamp: new Date()
    });
  });

  // Handle dashboard updates
  socket.on('dashboard_update', (data) => {
    const { clientId, metrics } = data;

    socket.to(`client-${clientId}`).emit('dashboard_update', {
      metrics,
      timestamp: new Date()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const connection = activeConnections.get(socket.id);
    const clientId = clientRooms.get(socket.id);

    if (connection) {
      console.log(`Client disconnected: ${socket.id} (${connection.userId})`);

      // Notify others in the room
      if (clientId) {
        socket.to(`client-${clientId}`).emit('user_left', {
          userId: connection.userId,
          message: `${connection.userRole} left the session`
        });
      }
    }

    // Clean up
    activeConnections.delete(socket.id);
    clientRooms.delete(socket.id);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Utility function to generate mock VAL responses
function generateVALResponse(message) {
  const responses = [
    {
      message: 'Based on the information I have access to, I can help you with that. Let me check the relevant data.',
      sources: [
        { type: 'meeting', name: 'Initial Discovery Call' },
        { type: 'research', name: 'Company Overview' }
      ]
    },
    {
      message: 'I\'ve reviewed our previous discussions and research data. Here\'s what I found...',
      sources: [
        { type: 'meeting', name: 'Technical Requirements Review' },
        { type: 'task', name: 'Related Action Items' }
      ]
    },
    {
      message: 'According to the client\'s information and our recent interactions, I can provide the following insights...',
      sources: [
        { type: 'research', name: 'Company Analysis' },
        { type: 'chat', name: 'Previous Conversations' }
      ]
    }
  ];

  // Check for specific keywords to provide more relevant responses
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('meeting') || lowerMessage.includes('discuss')) {
    return {
      message: 'I found several meetings with this client. The most recent one was the "Technical Requirements Review" on January 22nd. Would you like me to show you the transcript or key takeaways?',
      sources: [
        { type: 'meeting', name: 'Technical Requirements Review' },
        { type: 'meeting', name: 'Initial Discovery Call' }
      ]
    };
  }

  if (lowerMessage.includes('task') || lowerMessage.includes('todo') || lowerMessage.includes('pending')) {
    return {
      message: 'There are currently 5 pending tasks for this client. The high-priority item is "Prepare project proposal draft" due on January 20th. Two tasks have been completed this week.',
      sources: [
        { type: 'task', name: 'Task Management' }
      ]
    };
  }

  if (lowerMessage.includes('client') || lowerMessage.includes('company')) {
    return {
      message: 'This client is Acme Corporation, a technology company founded in 2010 with 1000-5000 employees. They\'re based in San Francisco and recently raised $50M in Series C funding.',
      sources: [
        { type: 'research', name: 'Company Overview' },
        { type: 'research', name: 'Financial Data' }
      ]
    };
  }

  return responses[Math.floor(Math.random() * responses.length)];
}

// Periodic status broadcasts
setInterval(() => {
  // Send status updates to all connected clients
  io.emit('heartbeat', {
    timestamp: new Date(),
    active_connections: activeConnections.size
  });
}, 30000); // Every 30 seconds

// Simulate reminder notifications
setInterval(() => {
  const reminders = [
    {
      type: 'task_reminder',
      title: 'Task Due Soon',
      message: 'Prepare project proposal draft is due tomorrow'
    },
    {
      type: 'meeting_reminder',
      title: 'Upcoming Meeting',
      message: 'Demo with stakeholders scheduled for tomorrow at 2 PM'
    },
    {
      type: 'follow_up',
      title: 'Follow-up Needed',
      message: 'Consider following up on the technical requirements discussion'
    }
  ];

  // Send random reminder to demonstrate functionality
  if (activeConnections.size > 0) {
    const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
    io.emit('notification', {
      ...randomReminder,
      timestamp: new Date()
    });
  }
}, 60000); // Every minute

// Start server
server.listen(PORT, () => {
  console.log(`VAL WebSocket service running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

module.exports = { io, server };