import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AgentLoginDto {
	@ApiProperty({
		description: "Agent ID",
		example: "AGT123456789",
	})
	@IsString()
	@IsNotEmpty()
	agentId: string;

	@ApiProperty({
		description: "Agent authentication token",
		example: "abc123def456",
	})
	@IsString()
	@IsNotEmpty()
	token: string;
}
