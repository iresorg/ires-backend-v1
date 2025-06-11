import { IsNotEmpty, IsString } from "class-validator";

export class CreateAgentDto {
	@IsNotEmpty()
	@IsString()
	agentId: string;
}
