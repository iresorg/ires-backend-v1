import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LinkIncidentTicketDto {
	@ApiProperty({ example: "iRS-..." })
	@IsString()
	@IsNotEmpty()
	ticketId: string;
}
