import { Injectable, NotFoundException } from "@nestjs/common";
import { Agent } from "./entities/agent.entity";
import { AgentRepository } from "./repositories/agent.repository";
import { AgentTokenRepository } from "./repositories/agent.repository";
import * as bcrypt from "bcrypt";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";
import { GenerateTokenDto } from "./dto/generate-token.dto";

@Injectable()
export class AgentsService {
	constructor(
		private agentRepository: AgentRepository,
		private agentTokenRepository: AgentTokenRepository,
	) {}

	async create(createAgentDto: CreateAgentDto): Promise<Agent> {
		const agent = this.agentRepository.repository.create({
			agentId: createAgentDto.agentId,
		});
		return this.agentRepository.repository.save(agent);
	}

	async findAll(): Promise<Agent[]> {
		return this.agentRepository.repository.find();
	}

	async findActiveAgents(): Promise<Agent[]> {
		return this.agentRepository.findActiveAgents();
	}

	async findOne(agentId: string): Promise<Agent> {
		const agent = await this.agentRepository.repository.findOne({
			where: { agentId },
		});
		if (!agent) {
			throw new NotFoundException(`Agent with ID ${agentId} not found`);
		}
		return agent;
	}

	async updateStatus(
		agentId: string,
		updateStatusDto: UpdateAgentStatusDto,
	): Promise<Agent> {
		const agent = await this.findOne(agentId);
		agent.isActive = updateStatusDto.isActive;
		return this.agentRepository.repository.save(agent);
	}

	async generateToken(
		agentId: string,
		generateTokenDto: GenerateTokenDto,
	): Promise<string> {
		await this.findOne(agentId); // Verify agent exists

		// Generate a random token
		const token = Math.random().toString(36).substring(2, 15);
		const tokenHash = await bcrypt.hash(token, 10);

		// Revoke existing token if any
		await this.agentTokenRepository.revokeToken(agentId);

		// Create new token record
		const agentToken = this.agentTokenRepository.repository.create({
			agentId,
			tokenHash,
			expiresAt: generateTokenDto.expiresAt,
		});

		await this.agentTokenRepository.repository.save(agentToken);
		return token;
	}

	async validateToken(agentId: string, token: string): Promise<boolean> {
		const activeToken =
			await this.agentTokenRepository.findActiveToken(agentId);
		if (!activeToken) {
			return false;
		}

		return bcrypt.compare(token, activeToken.tokenHash);
	}

	async revokeToken(agentId: string): Promise<void> {
		await this.agentTokenRepository.revokeToken(agentId);
	}
}
