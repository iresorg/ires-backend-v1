import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignIncidentDto {
	@ApiProperty({
		description: "Staff user id with role AGENT or AGENT_ADMIN",
	})
	@IsUUID()
	agentId: string;
}
