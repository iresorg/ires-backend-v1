import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class EscalateTicketDto {
	@ApiProperty({
		description: "Reason for escalation",
		required: true,
	})
	@IsString()
	escalationReason: string;

	@ApiProperty({
		description: "User ID to whom ticket is escalated",
		required: false,
	})
	@IsOptional()
	@IsString()
	escalatedToUserId?: string;

	@ApiProperty({
		description: "Internal notes for escalation",
		required: false,
	})
	@IsOptional()
	@IsString()
	notes?: string;
}

export class AssignTicketDto {
	@ApiProperty({
		description: "Assigned responder ID",
		required: true,
	})
	@IsString()
	assignedResponderId: string;

	@ApiProperty({
		description: "Internal notes for assignment",
		required: false,
	})
	@IsOptional()
	@IsString()
	notes?: string;
}

export class StartAnalysisDto {
	@ApiProperty({
		description: "Internal notes for starting analysis",
		required: false,
	})
	@IsOptional()
	@IsString()
	notes?: string;
}

export class StartRespondingDto {
	@ApiProperty({
		description: "Internal notes for starting response",
		required: false,
	})
	@IsOptional()
	@IsString()
	notes?: string;
}

export class ResolveTicketDto {
	@ApiProperty({
		description: "Internal notes for resolving",
		required: false,
	})
	@IsOptional()
	@IsString()
	notes?: string;
}

export class CloseTicketDto {
	@ApiProperty({
		description: "Internal notes for closing",
		required: false,
	})
	@IsOptional()
	@IsString()
	notes?: string;
}
