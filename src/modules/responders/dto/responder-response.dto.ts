import { ApiProperty } from "@nestjs/swagger";
import { IResponder } from "../interfaces/responder.interface";
import { ResponderType } from "../enums/responder-type.enum";

export class ResponderResponseDto {
	@ApiProperty({
		description: "The unique identifier of the responder",
		example: "RESP123A",
	})
	responderId: string;

	@ApiProperty({
		description: "The type of responder (TIER1 or TIER2)",
		enum: ResponderType,
		example: ResponderType.TIER1,
	})
	type: ResponderType;

	@ApiProperty({
		description: "Whether the responder is currently active",
		example: true,
	})
	isActive: boolean;

	@ApiProperty({
		description: "The date when the responder was last seen",
		example: "2024-03-20T10:00:00Z",
	})
	lastSeen: Date | null;

	@ApiProperty({
		description:
			"Whether the responder is currently online (seen in the last 30 seconds)",
		example: true,
	})
	isOnline: boolean;

	@ApiProperty({
		description: "The date when the responder was created",
		example: "2024-03-20T10:00:00Z",
	})
	createdAt: Date;

	@ApiProperty({
		description: "The date when the responder was last updated",
		example: "2024-03-20T10:00:00Z",
	})
	updatedAt: Date;

	@ApiProperty({
		description: "Human-readable status combining active and online states",
		example: "Active & Online",
		enum: ["Active & Online", "Active & Offline", "Inactive"],
	})
	status: string;

	constructor(responder: IResponder) {
		this.responderId = responder.responderId;
		this.type = responder.type;
		this.isActive = responder.isActive;
		this.lastSeen = responder.lastSeen;
		this.createdAt = responder.createdAt;
		this.updatedAt = responder.updatedAt;

		// Compute online status (seen in last 30 seconds)
		this.isOnline =
			responder.isActive && responder.lastSeen
				? new Date().getTime() - responder.lastSeen.getTime() <= 30000
				: false;

		// Generate human-readable status
		this.status = this.isActive
			? this.isOnline
				? "Active & Online"
				: "Active & Offline"
			: "Inactive";
	}

	static fromResponder(responder: IResponder): ResponderResponseDto {
		return new ResponderResponseDto(responder);
	}

	static fromResponders(responders: IResponder[]): ResponderResponseDto[] {
		return responders.map((responder) => this.fromResponder(responder));
	}
}
