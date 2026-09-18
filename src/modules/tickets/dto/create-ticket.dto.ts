import {
	IsNotEmpty,
	IsString,
	IsOptional,
	IsArray,
	ValidateNested,
	IsUUID,
	IsNumber,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
	VictimInformation,
	ITicketCreate,
	ContactInformation,
} from "../interfaces/ticket.interface";
import { plainToInstance, Transform, Type } from "class-transformer";

function toNestedDto(Cls: new () => object) {
	return ({ value }: { value: unknown }) => {
		if (value === undefined || value === null || value === "") {
			return undefined;
		}

		let parsed: unknown = value;
		if (typeof value === "string") {
			try {
				parsed = JSON.parse(value);
			} catch {
				return value;
			}
		}

		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return parsed;
		}

		// class-validator forbidUnknownValues requires a real class instance
		return plainToInstance(Cls, parsed);
	};
}

class VictimInformationDto implements VictimInformation {
	@ApiProperty({ description: "Victim's name" })
	@IsNotEmpty()
	@IsString()
	name: string;

	@ApiProperty({ description: "Victim's age" })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
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
			| "ticketId"
			| "createdById"
			| "createdForAccountId"
			| "entitlementSource"
			| "incidentCreditId"
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

	@ApiProperty({
		description:
			"Contact information object: { email, phone, address }. Optional. Multipart: send JSON string.",
		required: false,
	})
	@IsOptional()
	@Transform(toNestedDto(ContactInformationDto))
	@ValidateNested()
	@Type(() => ContactInformationDto)
	contactInformation?: ContactInformationDto;

	@ApiProperty({ description: "Internal notes", required: false })
	@IsOptional()
	@IsString()
	internalNotes?: string;

	@ApiProperty({
		description:
			"Victim information object: { name, phone, address, email, age?, gender? }. Optional. Multipart: send JSON string.",
		required: false,
		type: VictimInformationDto,
	})
	@IsOptional()
	@Transform(toNestedDto(VictimInformationDto))
	@ValidateNested()
	@Type(() => VictimInformationDto)
	victimInformation?: VictimInformationDto;

	@ApiProperty({
		description: "File attachments",
		required: false,
		type: [String],
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	attachments?: string[];

	@IsString()
	@IsUUID()
	categoryId: string;

	@IsOptional()
	@IsString()
	subCategoryId?: string;

	@ApiProperty({
		description:
			"Customer account this ticket is created for (must have active subscription or unused PAYG credit)",
	})
	@IsUUID()
	accountId: string;
}
