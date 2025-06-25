export interface IAgent {
	agentId: string;
	isActive: boolean;
	lastSeen: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface IAgentCreate {
	agentId: string;
	lastSeen?: Date | null;
}

export interface IAgentUpdate {
	isActive?: boolean;
	lastSeen?: Date | null;
}

export type IAgentFind = IAgent;

export interface IAgentToken {
	tokenHash: string;
	agentId: string;
	expiresAt: Date;
	isRevoked: boolean;
	createdAt: Date;
	updatedAt: Date;
	encryptedToken: string;
}

export interface IAgentTokenCreate {
	agentId: string;
	tokenHash: string;
	encryptedToken: string;
	expiresAt: Date;
}
