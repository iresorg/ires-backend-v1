import { ApiProperty } from "@nestjs/swagger";

export class SubscriberResponseDto {
	@ApiProperty({ description: "Subscriber account ID", example: "uuid-string" })
	id: string;

	@ApiProperty({ description: "Subscriber full name", example: "John Doe" })
	userName: string;

	@ApiProperty({ description: "Subscriber email", example: "john@example.com" })
	email: string;

	@ApiProperty({
		description: "Account role",
		enum: ["individual", "organization"],
		example: "individual",
	})
	role: string;

	@ApiProperty({
		description: "Plan name",
		example: "Premium Plan",
		nullable: true,
	})
	planSubscribedTo: string | null;

	@ApiProperty({
		description: "Subscription amount in kobo",
		example: 15000000,
		nullable: true,
	})
	amount: number | null;

	@ApiProperty({
		description: "Subscription start date",
		example: "2024-01-01T00:00:00.000Z",
		nullable: true,
	})
	startDate: Date | null;

	@ApiProperty({
		description: "Subscription end date",
		example: "2024-02-01T00:00:00.000Z",
		nullable: true,
	})
	endDate: Date | null;

	@ApiProperty({
		description: "Subscription status",
		enum: ["active", "expired", "cancelled", "past_due"],
		example: "active",
		nullable: true,
	})
	status: string | null;

	static fromAccountWithSubscription(data: any): SubscriberResponseDto {
		const account = data.account;
		const subscription = data.subscription;
		const plan = subscription?.plan;

		let userName = account.email;

		if (account.role === "individual" && account.individualProfile) {
			userName = `${account.individualProfile.firstName} ${account.individualProfile.lastName}`;
		} else if (
			account.role === "organization" &&
			account.organizationProfile
		) {
			userName = account.organizationProfile.organizationName;
		}

		return {
			id: account.id,
			userName,
			email: account.email,
			role: account.role,
			planSubscribedTo: plan?.name || null,
			amount: subscription?.plan?.amount || null,
			startDate: subscription?.currentPeriodStart || null,
			endDate: subscription?.currentPeriodEnd || null,
			status: subscription?.status || null,
		};
	}

	static fromAccountsWithSubscriptions(
		data: any[],
	): SubscriberResponseDto[] {
		return data.map((item) => this.fromAccountWithSubscription(item));
	}
}

