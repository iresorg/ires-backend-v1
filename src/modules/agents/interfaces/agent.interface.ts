export interface IAgent {
	id: string;
	userId: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface IAgentToken {
	id: string;
	agent: IAgent;
	tokenHash: string;
	createdAt: Date;
	expiresAt: Date;
	isRevoked: boolean;
}
