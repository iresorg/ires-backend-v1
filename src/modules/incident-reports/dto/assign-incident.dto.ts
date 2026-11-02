import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignIncidentDto {
	@ApiProperty({ description: "Staff user id with role AGENT" })
	@IsUUID()
	agentId: string;
}
