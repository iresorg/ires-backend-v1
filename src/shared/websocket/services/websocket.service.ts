import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import {
	ServerToClientEvents,
	ClientToServerEvents,
	InterServerEvents,
	SocketData,
	OnlineStatus,
	Message,
	User,
} from "../interfaces/websocket.interface";

@Injectable()
export class WebSocketService {
	private readonly logger = new Logger(WebSocketService.name);
	private server: Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>;

	setServer(
		server: Server<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		this.server = server;
	}

	// Connection management
	async handleConnection(
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		const user = client.data.user;
		if (user) {
			this.logger.log(`User ${user.userName} (${user.userId}) connected`);

			// Update online status
			this.updateOnlineStatus(user.userId, true, "user");

			// Join user to their personal room
			await client.join(`user:${user.userId}`);

			// Join user to their role-based room
			await client.join(`role:${user.role}`);

			// Broadcast online status to relevant users
			this.broadcastStatusUpdate({
				userId: user.userId,
				isOnline: true,
				lastSeen: new Date().toISOString(),
				userType: "user",
			});
		}
	}

	handleDisconnect(
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		const user = client.data.user;
		if (user) {
			this.logger.log(
				`User ${user.userName} (${user.userId}) disconnected`,
			);

			// Update online status
			this.updateOnlineStatus(user.userId, false, "user");

			// Broadcast offline status
			this.broadcastStatusUpdate({
				userId: user.userId,
				isOnline: false,
				lastSeen: new Date().toISOString(),
				userType: "user",
			});
		}
	}

	// Chat functionality
	sendMessage(message: Message, roomId?: string) {
		if (roomId) {
			// Send to specific room
			this.server.to(roomId).emit("chat:message", message);
		} else {
			// Broadcast to all connected clients
			this.server.emit("chat:message", message);
		}

		this.logger.log(
			`Message sent: ${message.content} from ${message.sender.userName}`,
		);
	}

	async joinRoom(client: Socket, roomId: string) {
		await client.join(roomId);
		this.logger.log(`User joined room: ${roomId}`);

		// Notify room members
		client.to(roomId).emit("chat:room:joined", {
			id: roomId,
			name: roomId,
			participants: [],
			createdAt: new Date().toISOString(),
		});
	}

	async leaveRoom(client: Socket, roomId: string) {
		await client.leave(roomId);
		this.logger.log(`User left room: ${roomId}`);

		// Notify room members
		client.to(roomId).emit("chat:room:left", roomId);
	}

	// Status management
	private updateOnlineStatus(
		userId: string,
		isOnline: boolean,
		userType: string,
	) {
		// This would typically update the database
		// For now, we'll just log it
		this.logger.log(
			`User ${userId} (${userType}) status updated to: ${isOnline ? "online" : "offline"}`,
		);
	}

	private broadcastStatusUpdate(status: OnlineStatus) {
		// Broadcast to all connected clients
		this.server.emit(
			status.isOnline ? "status:online" : "status:offline",
			status,
		);
	}

	// Utility methods
	sendToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
		this.server.to(`user:${userId}`).emit(event, data);
	}

	sendToRole(role: string, event: keyof ServerToClientEvents, data: any) {
		this.server.to(`role:${role}`).emit(event, data);
	}

	sendToRoom(roomId: string, event: keyof ServerToClientEvents, data: any) {
		this.server.to(roomId).emit(event, data);
	}

	broadcastToAll(event: keyof ServerToClientEvents, data: any) {
		this.server.emit(event, data);
	}

	// Get connected users
	getConnectedUsers(): User[] {
		const users: User[] = [];
		this.server.sockets.sockets.forEach((socket) => {
			if (socket.data.user) {
				users.push(socket.data.user);
			}
		});
		return users;
	}

	// Get users in a specific room
	getUsersInRoom(roomId: string): User[] {
		const users: User[] = [];
		const room = this.server.sockets.adapter.rooms.get(roomId);

		if (room) {
			room.forEach((socketId) => {
				const socket = this.server.sockets.sockets.get(socketId);
				if (socket?.data.user) {
					users.push(socket.data.user);
				}
			});
		}

		return users;
	}
}
