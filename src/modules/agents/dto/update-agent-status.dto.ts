import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateAgentStatusDto {
	@IsNotEmpty()
	@IsBoolean()
	isActive: boolean;
}
