import { Repository, MoreThan } from "typeorm";
import { Agent } from "../entities/agent.entity";
import { AgentToken } from "../entities/agent-token.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AgentRepository {
	constructor(
		@InjectRepository(Agent)
		public readonly repository: Repository<Agent>,
	) {}

	async findActiveAgents(): Promise<Agent[]> {
		return this.repository.find({
			where: { isActive: true },
			relations: ["token"],
		});
	}

	async findAgentWithToken(agentId: string): Promise<Agent> {
		return this.repository.findOne({
			where: { agentId },
			relations: ["token"],
		});
	}
}

@Injectable()
export class AgentTokenRepository {
	constructor(
		@InjectRepository(AgentToken)
		public readonly repository: Repository<AgentToken>,
	) {}

	async findActiveToken(agentId: string): Promise<AgentToken> {
		return this.repository.findOne({
			where: {
				agentId,
				isRevoked: false,
				expiresAt: MoreThan(new Date()),
			},
		});
	}

	async revokeToken(agentId: string): Promise<void> {
		await this.repository.update(
			{ agentId, isRevoked: false },
			{ isRevoked: true },
		);
	}
}
