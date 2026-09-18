import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PlanPaymentType } from "@/modules/subscriptions/enums/plan-payment-type.enum";

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

	@ApiPropertyOptional({
		description: "Plan ID",
		nullable: true,
	})
	planId: string | null;

	@ApiProperty({
		description: "Plan name",
		example: "Premium Plan",
		nullable: true,
	})
	planSubscribedTo: string | null;

	@ApiProperty({
		description: "How the customer pays",
		enum: PlanPaymentType,
		example: PlanPaymentType.SUBSCRIPTION,
		nullable: true,
	})
	paymentType: PlanPaymentType | null;

	@ApiPropertyOptional({
		description: "Billing interval for subscriptions (null for one_time)",
		example: "monthly",
		nullable: true,
	})
	interval: string | null;

	@ApiProperty({
		description: "Subscription / product amount in kobo",
		example: 15000000,
		nullable: true,
	})
	amount: number | null;

	@ApiProperty({
		description: "Period or purchase start date",
		example: "2024-01-01T00:00:00.000Z",
		nullable: true,
	})
	startDate: Date | null;

	@ApiProperty({
		description: "Period end date (null for one_time credits)",
		example: "2024-02-01T00:00:00.000Z",
		nullable: true,
	})
	endDate: Date | null;

	@ApiProperty({
		description:
			"Subscription status, or credit status for PAYG (available | used | expired)",
		example: "active",
		nullable: true,
	})
	status: string | null;

	@ApiPropertyOptional({
		description: "Unused PAYG credits for this account (one_time rows)",
		nullable: true,
	})
	paygCreditsAvailable?: number | null;

	static resolveUserName(account: any): string {
		if (account.role === "individual" && account.individualProfile) {
			return `${account.individualProfile.firstName} ${account.individualProfile.lastName}`;
		}
		if (account.role === "organization" && account.organizationProfile) {
			return account.organizationProfile.organizationName;
		}
		return account.email;
	}

	static fromAccountWithSubscription(data: any): SubscriberResponseDto {
		const account = data.account;
		const subscription = data.subscription;
		const plan = subscription?.plan;

		return {
			id: account.id,
			userName: this.resolveUserName(account),
			email: account.email,
			role: account.role,
			planId: plan?.id || null,
			planSubscribedTo: plan?.name || null,
			paymentType: plan?.paymentType || PlanPaymentType.SUBSCRIPTION,
			interval: plan?.interval ?? null,
			amount:
				plan?.amount !== undefined && plan?.amount !== null
					? Number(plan.amount)
					: null,
			startDate: subscription?.currentPeriodStart || null,
			endDate: subscription?.currentPeriodEnd || null,
			status: subscription?.status || null,
			paygCreditsAvailable: null,
		};
	}

	static fromAccountWithPaygCredit(data: {
		account: any;
		plan?: any;
		credit?: any;
		creditsAvailable?: number;
	}): SubscriberResponseDto {
		const { account, plan, credit, creditsAvailable } = data;

		return {
			id: account.id,
			userName: this.resolveUserName(account),
			email: account.email,
			role: account.role,
			planId: plan?.id || credit?.planId || null,
			planSubscribedTo: plan?.name || null,
			paymentType: PlanPaymentType.ONE_TIME,
			interval: null,
			amount:
				plan?.amount !== undefined && plan?.amount !== null
					? Number(plan.amount)
					: null,
			startDate: credit?.createdAt || null,
			endDate: null,
			status: credit?.status || null,
			paygCreditsAvailable: creditsAvailable ?? null,
		};
	}

	static fromAccountsWithSubscriptions(
		data: any[],
	): SubscriberResponseDto[] {
		return data.map((item) => this.fromAccountWithSubscription(item));
	}
}
