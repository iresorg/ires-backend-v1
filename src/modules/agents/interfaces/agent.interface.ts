export interface IAgent {
	agentId: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface IAgentCreate {
	agentId: string;
}

export interface IAgentUpdate {
	isActive?: boolean;
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
	expiresAt: Date;
	encryptedToken: string;
}
