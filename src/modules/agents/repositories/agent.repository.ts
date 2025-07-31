import { EntityRepository, Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { AgentToken } from '../entities/agent-token.entity';
import { MoreThan } from 'typeorm';

@EntityRepository(Agent)
export class AgentRepository extends Repository<Agent> {
	async findActiveAgents(): Promise<Agent[]> {
		return this.find({
			where: { isActive: true },
			relations: ['tokens'],
		});
	}

	async findAgentWithActiveToken(agentId: string): Promise<Agent> {
		return this.findOne({
			where: { id: agentId },
			relations: ['tokens'],
		});
	}
}

@EntityRepository(AgentToken)
export class AgentTokenRepository extends Repository<AgentToken> {
	async findActiveToken(agentId: string): Promise<AgentToken> {
		return this.findOne({
			where: {
				agent: { id: agentId },
				isRevoked: false,
				expiresAt: MoreThan(new Date()),
			},
			order: { createdAt: 'DESC' },
		});
	}

	async revokeAllTokens(agentId: string): Promise<void> {
		await this.update(
			{ agent: { id: agentId }, isRevoked: false },
			{ isRevoked: true },
		);
	}
}
