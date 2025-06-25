import { ApiProperty } from "@nestjs/swagger";
import { IAgent } from "../interfaces/agent.interface";

export class AgentResponseDto {
	@ApiProperty({
		description: "The unique identifier of the agent",
		example: "agent-123",
	})
	agentId: string;

	@ApiProperty({
		description: "Whether the agent is currently active",
		example: true,
	})
	isActive: boolean;

	@ApiProperty({
		description: "The date when the agent was last seen",
		example: "2024-03-20T10:00:00Z",
	})
	lastSeen: Date | null;

	@ApiProperty({
		description: "Whether the agent is online",
		example: true,
	})
	isOnline: boolean;

	@ApiProperty({
		description: "The date when the agent was created",
		example: "2024-03-20T10:00:00Z",
	})
	createdAt: Date;

	@ApiProperty({
		description: "The date when the agent was last updated",
		example: "2024-03-20T10:00:00Z",
	})
	updatedAt: Date;

	constructor(agent: IAgent) {
		this.agentId = agent.agentId;
		this.isActive = agent.isActive;
		this.lastSeen = agent.lastSeen;
		// Consider agent online if they were seen in the last 30 seconds
		this.isOnline =
			agent.isActive && agent.lastSeen
				? new Date().getTime() - agent.lastSeen.getTime() <= 30000
				: false;
		this.createdAt = agent.createdAt;
		this.updatedAt = agent.updatedAt;
	}

	static fromAgent(agent: IAgent): AgentResponseDto {
		return new AgentResponseDto(agent);
	}

	static fromAgents(agents: IAgent[]): AgentResponseDto[] {
		return agents.map((agent) => this.fromAgent(agent));
	}
}
