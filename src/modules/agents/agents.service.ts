import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentToken } from './entities/agent-token.entity';
import { AgentRepository } from './repositories/agent.repository';
import { AgentTokenRepository } from './repositories/agent.repository';
import * as bcrypt from 'bcrypt';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentStatusDto } from './dto/update-agent-status.dto';
import { GenerateTokenDto } from './dto/generate-token.dto';

@Injectable()
export class AgentsService {
	constructor(
		@InjectRepository(AgentRepository)
		private agentRepository: AgentRepository,
		@InjectRepository(AgentTokenRepository)
		private agentTokenRepository: AgentTokenRepository,
	) {}

	async create(createAgentDto: CreateAgentDto): Promise<Agent> {
		const agent = this.agentRepository.create(createAgentDto);
		return this.agentRepository.save(agent);
	}

	async findAll(): Promise<Agent[]> {
		return this.agentRepository.find();
	}

	async findActiveAgents(): Promise<Agent[]> {
		return this.agentRepository.findActiveAgents();
	}

	async findOne(id: string): Promise<Agent> {
		const agent = await this.agentRepository.findOne({ where: { id } });
		if (!agent) {
			throw new NotFoundException(`Agent with ID ${id} not found`);
		}
		return agent;
	}

	async updateStatus(
		id: string,
		updateStatusDto: UpdateAgentStatusDto,
	): Promise<Agent> {
		const agent = await this.findOne(id);
		agent.isActive = updateStatusDto.isActive;
		return this.agentRepository.save(agent);
	}

	async generateToken(
		agentId: string,
		generateTokenDto: GenerateTokenDto,
	): Promise<string> {
		const agent = await this.findOne(agentId);

		// Generate a random token
		const token = Math.random().toString(36).substring(2, 15);
		const tokenHash = await bcrypt.hash(token, 10);

		// Create new token record
		const agentToken = this.agentTokenRepository.create({
			agent,
			tokenHash,
			expiresAt: generateTokenDto.expiresAt,
		});

		await this.agentTokenRepository.save(agentToken);
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
		await this.agentTokenRepository.revokeAllTokens(agentId);
	}
}
