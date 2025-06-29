import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateResponderStatusDto {
	@ApiProperty({
		description: "Whether the responder is active (for admin control)",
		example: true,
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
