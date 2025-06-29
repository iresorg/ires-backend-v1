import {
	IsBoolean,
	IsDateString,
	IsEnum,
	IsString,
	IsOptional,
} from "class-validator";

export enum StatusType {
	ONLINE = "online",
	OFFLINE = "offline",
}

export class BaseStatusMessageDto {
	@IsOptional()
	@IsString()
	id?: string;

	@IsEnum(StatusType)
	status: StatusType;

	@IsDateString()
	timestamp: string;

	@IsOptional()
	@IsBoolean()
	isOnline?: boolean;

	@IsOptional()
	@IsDateString()
	lastStatusChangeAt?: string;
}

export class AgentStatusMessageDto extends BaseStatusMessageDto {
	@IsString()
	agentId: string;
}

export class ResponderStatusMessageDto extends BaseStatusMessageDto {
	@IsString()
	responderId: string;
}
