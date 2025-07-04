import {
	IsNotEmpty,
	IsString,
	IsOptional,
	IsArray,
	ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
	VictimInformation,
	ITicketCreate,
	ContactInformation,
} from "../interfaces/ticket.interface";
import { Type } from "class-transformer";

class VictimInformationDto implements VictimInformation {
	@ApiProperty({ description: "Victim's name" })
	@IsNotEmpty()
	@IsString()
	name: string;

	@ApiProperty({ description: "Victim's age" })
	@IsOptional()
	age: number;

	@ApiProperty({ description: "Victim's gender" })
	@IsOptional()
	@IsString()
	gender: string;

	@ApiProperty({ description: "Victim's phone number" })
	@IsNotEmpty()
	@IsString()
	phone: string;

	@ApiProperty({ description: "Victim's address" })
	@IsNotEmpty()
	@IsString()
	address: string;

	@ApiProperty({ description: "Victim's email address" })
	@IsNotEmpty()
	@IsString()
	email: string;
}

class ContactInformationDto implements ContactInformation {
	@ApiProperty({ description: "Contact's email address" })
	@IsNotEmpty()
	@IsString()
	email: string;

	@ApiProperty({ description: "Contact's phone number" })
	@IsNotEmpty()
	@IsString()
	phone: string;

	@ApiProperty({ description: "Contact's address" })
	@IsNotEmpty()
	@IsString()
	address: string;
}

export class CreateTicketDto
	implements
		Omit<
			ITicketCreate,
			"ticketId" | "performedBy" | "actorType" | "actorId" | "creatorRole"
		>
{
	@ApiProperty({ description: "Ticket title" })
	@IsNotEmpty()
	@IsString()
	title: string;

	@ApiProperty({
		description: "Ticket type",
		example: "Bank account compromised",
	})
	@IsNotEmpty()
	@IsString()
	type: string;

	@ApiProperty({ description: "Ticket description" })
	@IsNotEmpty()
	@IsString()
	description: string;

	@ApiProperty({ description: "Incident location" })
	@IsNotEmpty()
	@IsString()
	location: string;

	@ApiProperty({ description: "Reporter's name" })
	@IsNotEmpty()
	@IsString()
	reporterName: string;

	@ApiProperty({ description: "Contact information" })
	@IsOptional()
	@ValidateNested()
	@Type(() => ContactInformationDto)
	contactInformation: Partial<ContactInformationDto>;

	@ApiProperty({ description: "Internal notes", required: false })
	@IsOptional()
	@IsString()
	internalNotes?: string;

	@ApiProperty({
		description: "Victim information",
		required: false,
		type: VictimInformationDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => VictimInformationDto)
	victimInformation?: Partial<VictimInformationDto>;

	@ApiProperty({
		description: "File attachments",
		required: false,
		type: [String],
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	attachments?: string[];
}
