export interface WebSocketConfig {
	cors: {
		origin: string | string[];
		credentials: boolean;
	};
	namespace: string;
	transports: string[];
	pingTimeout: number;
	pingInterval: number;
	upgradeTimeout: number;
	maxHttpBufferSize: number;
}

export const defaultWebSocketConfig: WebSocketConfig = {
	cors: {
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
	},
	namespace: "/",
	transports: ["websocket", "polling"],
	pingTimeout: 60000,
	pingInterval: 25000,
	upgradeTimeout: 10000,
	maxHttpBufferSize: 1e6, // 1MB
};

export const chatWebSocketConfig: WebSocketConfig = {
	...defaultWebSocketConfig,
	namespace: "/chat",
};

// Room configuration
export const roomConfig = {
	// Chat room settings
	chat: {
		maxParticipants: 10,
		messageRetention: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
		typingTimeout: 3000, // 3 seconds
	},
};

// Event names for consistency
export const events = {
	// Chat events
	chat: {
		message: "chat:message",
		roomCreated: "chat:room:created",
		roomJoined: "chat:room:joined",
		roomLeft: "chat:room:left",
		typing: "status:typing",
	},
	// Status events
	status: {
		online: "status:online",
		offline: "status:offline",
		update: "status:update",
	},
	// Authentication events
	auth: {
		login: "auth:login",
		logout: "auth:logout",
	},
	// System events
	system: {
		notification: "system:notification",
		error: "system:error",
	},
};
