// Example usage of WebSocket service in your existing services

import { Injectable } from "@nestjs/common";
import { WebSocketService } from "../services/websocket.service";

@Injectable()
export class ChatService {
	constructor(private readonly webSocketService: WebSocketService) {}

	// Example: Notify all users about a new chat request
	notifyUsersAboutNewChat(chatRequest: any) {
		this.webSocketService.broadcastToAll("system:notification", {
			type: "new_chat_request",
			message: "New chat request available",
			data: {
				id: chatRequest.id,
				userId: chatRequest.userId,
				message: chatRequest.message,
				timestamp: new Date().toISOString(),
			},
		});
	}

	// Example: Notify specific user about chat assignment
	notifyUserAboutChatAssignment(userId: string, assignment: any) {
		this.webSocketService.sendToUser(userId, "system:notification", {
			type: "chat_assigned",
			message: `Your chat has been assigned to ${assignment.assigneeName}`,
			data: assignment,
		});
	}

	// Example: Broadcast system maintenance notification
	broadcastMaintenanceNotification(message: string) {
		this.webSocketService.broadcastToAll("system:notification", {
			type: "maintenance",
			message,
			timestamp: new Date().toISOString(),
		});
	}

	// Example: Get all online users
	getOnlineUsers() {
		return this.webSocketService.getConnectedUsers();
	}

	// Example: Get users in a specific chat room
	getUsersInChatRoom(roomId: string) {
		return this.webSocketService.getUsersInRoom(roomId);
	}
}

// Example: Using WebSocket in UsersService
@Injectable()
export class UsersService {
	constructor(private readonly webSocketService: WebSocketService) {}

	notifyUserAboutStatusChange(userId: string, status: string) {
		this.webSocketService.sendToUser(userId, "system:notification", {
			type: "status_change",
			message: `Your status has been updated to: ${status}`,
			data: { status, updatedAt: new Date().toISOString() },
		});
	}

	broadcastUserActivity(userId: string, activity: string) {
		this.webSocketService.broadcastToAll("system:notification", {
			type: "user_activity",
			message: `User ${userId} performed: ${activity}`,
			data: { userId, activity, timestamp: new Date().toISOString() },
		});
	}
}

// Example: Client-side usage (for reference)
/*
// Connect to chat namespace
const chatSocket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});

// Listen for events
chatSocket.on('chat:message', (message) => {
  console.log('New message:', message);
});

// Send events
chatSocket.emit('chat:message', {
  content: 'Hello, world!',
  roomId: 'room-123'
});
*/
