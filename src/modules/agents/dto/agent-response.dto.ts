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
		description: "The date when the agent was created",
		example: "2024-03-20T10:00:00Z",
	})
	createdAt: Date;

	@ApiProperty({
		description: "The date when the agent was last updated",
		example: "2024-03-20T10:00:00Z",
	})
	updatedAt: Date;

	static fromAgent(agent: IAgent): AgentResponseDto {
		const dto = new AgentResponseDto();
		dto.agentId = agent.agentId;
		dto.isActive = agent.isActive;
		dto.createdAt = agent.createdAt;
		dto.updatedAt = agent.updatedAt;
		return dto;
	}

	static fromAgents(agents: IAgent[]): AgentResponseDto[] {
		return agents.map((agent) => this.fromAgent(agent));
	}
}
