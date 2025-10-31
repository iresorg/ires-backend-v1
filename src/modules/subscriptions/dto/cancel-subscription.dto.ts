import { ApiProperty } from "@nestjs/swagger";

export class CancelSubscriptionResponseDto {
	@ApiProperty({
		description: "Success message",
		example: "Subscription will be cancelled at period end",
	})
	message: string;

	@ApiProperty({
		description: "Subscription details",
		example: {
			status: "active",
			cancelledAt: null,
			cancelAtPeriodEnd: true,
		},
	})
	subscription: {
		status: string;
		cancelledAt: Date | null;
		cancelAtPeriodEnd: boolean;
	};
}
