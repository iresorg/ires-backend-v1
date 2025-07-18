export interface User {
	userId: string;
	userName: string;
	role: string;
}

export interface Message {
	id: string;
	sender: User;
	content: string;
	timestamp: string;
	roomId?: string;
}

export interface ChatRoom {
	id: string;
	name: string;
	participants: User[];
	lastMessage?: Message;
	createdAt: string;
}

export interface OnlineStatus {
	userId: string;
	isOnline: boolean;
	lastSeen: string;
	userType: "user";
}

// Server to Client Events
export interface ServerToClientEvents {
	// Chat events
	"chat:message": (message: Message) => void;
	"chat:room:created": (room: ChatRoom) => void;
	"chat:room:joined": (room: ChatRoom) => void;
	"chat:room:left": (roomId: string) => void;

	// Status events
	"status:online": (status: OnlineStatus) => void;
	"status:offline": (status: OnlineStatus) => void;
	"status:typing": (data: {
		userId: string;
		roomId: string;
		isTyping: boolean;
	}) => void;

	// System events
	"system:notification": (notification: {
		type: string;
		message: string;
		data?: any;
	}) => void;
	"system:error": (error: { message: string; code?: string }) => void;
}

// Client to Server Events
export interface ClientToServerEvents {
	// Chat events
	"chat:message": (data: { content: string; roomId?: string }) => void;
	"chat:room:create": (data: {
		name: string;
		participants?: string[];
	}) => void;
	"chat:room:join": (roomId: string) => void;
	"chat:room:leave": (roomId: string) => void;

	// Status events
	"status:update": (data: { isOnline: boolean }) => void;
	"status:typing": (data: { roomId: string; isTyping: boolean }) => void;

	// Authentication
	"auth:login": (data: { token: string; userType: string }) => void;
	"auth:logout": () => void;
}

// Inter-server events (for Redis pub/sub)
export interface InterServerEvents {
	"status:update": (data: OnlineStatus) => void;
	"chat:message": (message: Message) => void;
	"user:disconnect": (userId: string) => void;
}

// Socket data interface
export interface SocketData {
	user?: User;
	userType?: "user";
	rooms?: string[];
}
