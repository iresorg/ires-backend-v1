import { IsBoolean, IsOptional } from "class-validator";

export class UpdateAgentDto {
	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
}
