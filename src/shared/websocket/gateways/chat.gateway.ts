import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	MessageBody,
	ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseFilters, UseGuards } from "@nestjs/common";
import {
	ServerToClientEvents,
	ClientToServerEvents,
	InterServerEvents,
	SocketData,
	Message,
	OnlineStatus,
} from "../interfaces/websocket.interface";
import { WebSocketService } from "../services/websocket.service";
import { WebSocketAuthGuard } from "../guards/websocket-auth.guard";
import { WebSocketExceptionFilter } from "../filters/websocket-exception.filter";

@WebSocketGateway({
	cors: {
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
	},
	namespace: "/chat",
})
@UseFilters(new WebSocketExceptionFilter())
export class ChatGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>;

	private readonly logger = new Logger(ChatGateway.name);

	constructor(private readonly webSocketService: WebSocketService) {}

	afterInit(
		server: Server<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		this.webSocketService.setServer(server);
		this.logger.log("Chat Gateway initialized");
	}

	handleConnection(
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		this.logger.log(`Client attempting to connect: ${client.id}`);

		// Authentication will be handled by the guard on specific events
		// For now, we'll allow the connection but require auth for specific actions
	}

	handleDisconnect(
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		this.webSocketService.handleDisconnect(client);
	}

	// Authentication
	@SubscribeMessage("auth:login")
	@UseGuards(WebSocketAuthGuard)
	async handleAuthLogin(
		@MessageBody() data: { token: string; userType: string },
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		// Auth is handled by the guard, user data is already attached to socket
		await this.webSocketService.handleConnection(client);

		return { success: true, message: "Authentication successful" };
	}

	@SubscribeMessage("auth:logout")
	handleAuthLogout(
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		this.webSocketService.handleDisconnect(client);
		client.disconnect();

		return { success: true, message: "Logged out successfully" };
	}

	// Chat functionality
	@SubscribeMessage("chat:message")
	@UseGuards(WebSocketAuthGuard)
	handleChatMessage(
		@MessageBody() data: { content: string; roomId?: string },
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		const user = client.data.user;
		if (!user) {
			throw new Error("User not authenticated");
		}

		const message: Message = {
			id: this.generateMessageId(),
			sender: user,
			content: data.content,
			timestamp: new Date().toISOString(),
			roomId: data.roomId,
		};

		this.webSocketService.sendMessage(message, data.roomId);
		return message;
	}

	@SubscribeMessage("chat:room:create")
	@UseGuards(WebSocketAuthGuard)
	async handleCreateRoom(
		@MessageBody() data: { name: string; participants?: string[] },
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		const roomId = this.generateRoomId();
		const user = client.data.user;

		// Join the creator to the room
		await this.webSocketService.joinRoom(client, roomId);

		// Join participants if specified
		if (data.participants) {
			for (const participantId of data.participants) {
				// This would typically fetch user details and join them
				this.logger.log(
					`Adding participant ${participantId} to room ${roomId}`,
				);
			}
		}

		const room = {
			id: roomId,
			name: data.name,
			participants: [user],
			createdAt: new Date().toISOString(),
		};

		// Notify room creation
		this.server.emit("chat:room:created", room);

		return room;
	}

	@SubscribeMessage("chat:room:join")
	@UseGuards(WebSocketAuthGuard)
	async handleJoinRoom(
		@MessageBody() roomId: string,
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		await this.webSocketService.joinRoom(client, roomId);
		return { success: true, roomId };
	}

	@SubscribeMessage("chat:room:leave")
	@UseGuards(WebSocketAuthGuard)
	async handleLeaveRoom(
		@MessageBody() roomId: string,
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		await this.webSocketService.leaveRoom(client, roomId);
		return { success: true, roomId };
	}

	// Status functionality
	@SubscribeMessage("status:update")
	@UseGuards(WebSocketAuthGuard)
	handleStatusUpdate(
		@MessageBody() data: { isOnline: boolean },
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		const user = client.data.user;
		if (!user) {
			throw new Error("User not authenticated");
		}

		const status: OnlineStatus = {
			userId: user.userId,
			isOnline: data.isOnline,
			lastSeen: new Date().toISOString(),
			userType: "user",
		};

		// Update status in database (this would be implemented)
		this.updateUserStatus(user.userId, data.isOnline, "user");

		// Broadcast status update
		this.server.emit(
			status.isOnline ? "status:online" : "status:offline",
			status,
		);

		return status;
	}

	@SubscribeMessage("status:typing")
	@UseGuards(WebSocketAuthGuard)
	handleTypingStatus(
		@MessageBody() data: { roomId: string; isTyping: boolean },
		@ConnectedSocket()
		client: Socket<
			ClientToServerEvents,
			ServerToClientEvents,
			InterServerEvents,
			SocketData
		>,
	) {
		const user = client.data.user;
		if (!user) {
			throw new Error("User not authenticated");
		}

		// Broadcast typing status to room members
		client.to(data.roomId).emit("status:typing", {
			userId: user.userId,
			roomId: data.roomId,
			isTyping: data.isTyping,
		});

		return { success: true };
	}

	// Utility methods
	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateRoomId(): string {
		return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private updateUserStatus(
		userId: string,
		isOnline: boolean,
		userType: string,
	): void {
		// This would update the database based on user type
		this.logger.log(
			`Updating ${userType} ${userId} status to ${isOnline ? "online" : "offline"}`,
		);

		// Example implementation:
		// await this.userService.updateStatus(userId, isOnline);
	}
}
