import { Repository, MoreThan } from "typeorm";
import { Agent } from "../entities/agent.entity";
import { AgentToken } from "../entities/agent-token.entity";
import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	IAgentRepository,
	IAgentTokenRepository,
} from "../interfaces/agent-repo.interface";
import {
	IAgent,
	IAgentCreate,
	IAgentUpdate,
} from "../interfaces/agent.interface";
import { AgentNotFoundError } from "@/shared/errors/agent.errors";

@Injectable()
export class AgentRepository implements IAgentRepository {
	constructor(
		@InjectRepository(Agent)
		private repository: Repository<Agent>,
	) {}

	async create(data: IAgentCreate): Promise<IAgent> {
		const agent = this.repository.create(data);
		return this.repository.save(agent);
	}

	async findAll(): Promise<IAgent[]> {
		return this.repository.find();
	}

	async findActiveAgents(): Promise<IAgent[]> {
		return this.repository.find({ where: { isActive: true } });
	}

	async findById(agentId: string): Promise<IAgent | null> {
		return this.repository.findOne({ where: { agentId } });
	}

	async update(agentId: string, data: IAgentUpdate): Promise<IAgent> {
		const result = await this.repository.update({ agentId }, data);
		if (result.affected === 0) {
			throw new AgentNotFoundError(`Agent with id ${agentId} not found`);
		}
		const updatedAgent = await this.findById(agentId);
		if (!updatedAgent) {
			throw new AgentNotFoundError(
				`Agent with id ${agentId} not found after update`,
			);
		}
		return updatedAgent;
	}

	async delete(agentId: string): Promise<boolean> {
		const result = await this.repository.delete({ agentId });
		if (result.affected === 0)
			throw new AgentNotFoundError(`Agent with id ${agentId} not found.`);
		return true;
	}
}

@Injectable()
export class AgentTokenRepository implements IAgentTokenRepository {
	constructor(
		@InjectRepository(AgentToken)
		private repository: Repository<AgentToken>,
	) {}

	async create(data: {
		agentId: string;
		tokenHash: string;
		encryptedToken: string;
		expiresAt: Date;
	}): Promise<AgentToken> {
		try {
			const token = this.repository.create(data);
			return await this.repository.save(token);
		} catch (error: any) {
			// Handle database constraint violations
			if ((error as { code?: string })?.code === "23505") {
				// PostgreSQL unique constraint violation
				throw new ConflictException(
					"Token already exists for this agent. Please revoke existing token first.",
				);
			}
			if ((error as { code?: string })?.code === "23503") {
				// PostgreSQL foreign key constraint violation
				throw new ConflictException("Agent not found.");
			}
			// Re-throw other database errors
			throw error;
		}
	}

	async findActiveToken(agentId: string): Promise<AgentToken | null> {
		return this.repository.findOne({
			where: {
				agentId,
				isRevoked: false,
				expiresAt: MoreThan(new Date()),
			},
		});
	}

	async revokeToken(agentId: string): Promise<void> {
		await this.repository.delete({ agentId });
	}
}
