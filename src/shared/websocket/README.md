# WebSocket Implementation for IRES Backend

This document describes the WebSocket implementation for real-time communication in the IRES backend, including live chat functionality and online status tracking for users.

## Overview

The WebSocket implementation provides:

- Real-time chat functionality

- Online/offline status tracking for users
- Typing indicators
- Room-based communication
- Authentication and authorization
- Error handling and logging

## Architecture

### Core Components

1. **WebSocket Module** (`src/shared/websocket/module.ts`)
   - Central module that exports all WebSocket components
   - Configures JWT authentication

2. **Chat Gateway** (`src/shared/websocket/gateways/chat.gateway.ts`)
   - Main WebSocket gateway for general chat functionality
   - Handles authentication, messaging, and room management



5. **WebSocket Service** (`src/shared/websocket/services/websocket.service.ts`)
   - Utility service for common WebSocket operations
   - Manages connections, rooms, and broadcasting

6. **Authentication Guard** (`src/shared/websocket/guards/websocket-auth.guard.ts`)
   - JWT-based authentication for WebSocket connections
   - Validates tokens and attaches user data to socket

## Installation

The WebSocket dependencies are already included in the project. If you need to install them manually:

```bash
npm install @nestjs/websockets@10.4.19 @nestjs/platform-socket.io@10.4.19 socket.io@4.7.0
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
```

### WebSocket Configuration

The WebSocket configuration is centralized in `src/shared/websocket/config/websocket.config.ts`:

```typescript
export const defaultWebSocketConfig: WebSocketConfig = {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
};
```

## Usage

### Client-Side Connection

```javascript
import { io } from 'socket.io-client';

// Connect to main chat namespace
const chatSocket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token'
  }
});


```

### Authentication

```javascript
// Authenticate with the WebSocket server
chatSocket.emit('auth:login', {
  token: 'your-jwt-token',
  userType: 'user'
});

// Listen for authentication response
chatSocket.on('system:notification', (notification) => {
  console.log('Auth result:', notification);
});
```

### Chat Functionality

```javascript
// Send a message
chatSocket.emit('chat:message', {
  content: 'Hello, world!',
  roomId: 'room-123' // optional
});

// Listen for incoming messages
chatSocket.on('chat:message', (message) => {
  console.log('New message:', message);
});

// Create a chat room
chatSocket.emit('chat:room:create', {
  name: 'Support Room',
  participants: ['user1', 'user2']
});

// Join a room
chatSocket.emit('chat:room:join', 'room-123');

// Leave a room
chatSocket.emit('chat:room:leave', 'room-123');
```

### Status Updates

```javascript
// Update online status
chatSocket.emit('status:update', { isOnline: true });

// Listen for status updates
chatSocket.on('status:online', (status) => {
  console.log('User went online:', status);
});

chatSocket.on('status:offline', (status) => {
  console.log('User went offline:', status);
});

// Typing indicators
chatSocket.emit('status:typing', {
  roomId: 'room-123',
  isTyping: true
});

chatSocket.on('status:typing', (data) => {
  console.log('User is typing:', data);
});
```



## Event Reference

### Chat Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:message` | Bidirectional | Send/receive chat messages |
| `chat:room:create` | Client → Server | Create a new chat room |
| `chat:room:created` | Server → Client | Room created notification |
| `chat:room:join` | Client → Server | Join a chat room |
| `chat:room:joined` | Server → Client | Room joined notification |
| `chat:room:leave` | Client → Server | Leave a chat room |
| `chat:room:left` | Server → Client | Room left notification |

### Status Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `status:update` | Client → Server | Update online status |
| `status:online` | Server → Client | User went online |
| `status:offline` | Server → Client | User went offline |
| `status:typing` | Bidirectional | Typing indicator |

### Authentication Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `auth:login` | Client → Server | Authenticate with token |
| `auth:logout` | Client → Server | Logout and disconnect |



### System Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `system:notification` | Server → Client | General system notification |
| `system:error` | Server → Client | Error notification |

## Error Handling

The WebSocket implementation includes comprehensive error handling:

1. **Authentication Errors**: Invalid or missing JWT tokens
2. **Connection Errors**: Network issues and disconnections
3. **Validation Errors**: Invalid message formats
4. **Permission Errors**: Unauthorized access attempts

All errors are sent to clients via the `system:error` event:

```javascript
socket.on('system:error', (error) => {
  console.error('WebSocket error:', error.message, error.code);
});
```

## Security

### Authentication
- JWT-based authentication for all WebSocket connections
- Token validation on connection and for protected events
- Automatic user data attachment to socket instances

### Authorization
- Role-based access control for different namespaces
- User type validation (user)
- Room-based permissions

### Rate Limiting
- Built-in Socket.IO rate limiting
- Configurable limits for different event types

## Monitoring and Logging

The WebSocket implementation includes comprehensive logging:

- Connection/disconnection events
- Message routing
- Error tracking
- Performance metrics

Logs are integrated with the application's logging system and can be configured via the LoggerModule.

## Performance Considerations

1. **Connection Management**: Efficient handling of multiple concurrent connections
2. **Room Management**: Optimized room joining/leaving operations
3. **Message Broadcasting**: Selective broadcasting to relevant clients
4. **Memory Management**: Proper cleanup of disconnected clients

## Testing

To test the WebSocket functionality:

1. Start the application
2. Connect to the WebSocket endpoints using a client
3. Authenticate with a valid JWT token
4. Send test messages and verify responses

Example test script:

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');

  // Test authentication
  socket.emit('auth:login', { token: 'your-jwt-token', userType: 'user' });
});

socket.on('system:notification', (notification) => {
  console.log('Notification:', notification);
});

socket.on('chat:message', (message) => {
  console.log('Received message:', message);
});
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if the server is running and the port is correct
2. **Authentication Failed**: Verify JWT token is valid and not expired
3. **CORS Errors**: Ensure FRONTEND_URL is correctly configured
4. **Namespace Errors**: Verify you're connecting to the correct namespace

### Debug Mode

Enable debug logging by setting the environment variable:

```env
DEBUG=socket.io:*
```

## Future Enhancements

1. **Redis Adapter**: For horizontal scaling across multiple server instances
2. **Message Persistence**: Store chat messages in database
3. **File Sharing**: Support for file uploads in chat
4. **Voice/Video**: Integration with WebRTC for voice/video calls
5. **Push Notifications**: Mobile push notifications for offline users
