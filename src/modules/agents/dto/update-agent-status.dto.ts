import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateAgentStatusDto {
	@ApiProperty({
		description: "Whether the agent is active (for admin control)",
		example: true,
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;

	@ApiProperty({
		description: "When the agent was last seen online",
		example: "2024-03-20T10:00:00Z",
		required: false,
	})
	@IsOptional()
	lastSeen?: Date | null;
}
