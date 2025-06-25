import {
	IAgent,
	IAgentCreate,
	IAgentToken,
	IAgentTokenCreate,
} from "./agent.interface";

export interface IAgentRepository {
	findById(agentId: string): Promise<IAgent | null>;
	findByEmail(email: string): Promise<IAgent | null>;
	findAll(): Promise<IAgent[]>;
	findActiveAgents(): Promise<IAgent[]>;
	/**
	 * @throws {AgentAlreadyExistsError}
	 */
	create(body: IAgentCreate): Promise<IAgent>;
	/**
	 * @throws {AgentNotFoundError}
	 */
	update(agentId: string, agent: Partial<IAgent>): Promise<IAgent>;
	/**
	 * @throws {AgentNotFoundError}
	 */
	delete(agentId: string): Promise<boolean>;
}

export interface IAgentTokenRepository {
	findActiveToken(agentId: string): Promise<IAgentToken | null>;
	/**
	 * @throws {AgentNotFoundError}
	 */
	create(body: IAgentTokenCreate): Promise<IAgentToken>;
	/**
	 * @throws {AgentNotFoundError}
	 */
	revokeToken(agentId: string): Promise<void>;
}
