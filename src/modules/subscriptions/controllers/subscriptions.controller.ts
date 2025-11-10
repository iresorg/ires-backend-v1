import {
	Controller,
	Get,
	Post,
	Query,
	Body,
	Req,
	UseGuards,
	HttpCode,
	HttpStatus,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBody,
	ApiQuery,
} from "@nestjs/swagger";
import { SubscriptionsService } from "../services/subscriptions.service";
import { InitializeSubscriptionDto } from "../dto/initialize-subscription.dto";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";

@ApiTags("Subscriptions")
@Controller("subscriptions")
export class SubscriptionsController {
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

	@Get("plans")
	@ApiOperation({
		summary: "Get available subscription plans",
		description:
			"Fetch all available subscription plans, optionally filtered by account type",
	})
	@ApiQuery({
		name: "accountType",
		required: false,
		enum: ["individual", "organization"],
		description: "Filter plans by account type",
	})
	@ApiResponse({
		status: 200,
		description: "Plans retrieved successfully",
	})
	async getPlans(
		@Query("accountType") accountType?: "individual" | "organization",
	) {
		return await this.subscriptionsService.getPlans(accountType);
	}

	@UseGuards(AccountsAuthGuard)
	@Post("initialize")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Initialize subscription payment",
		description:
			"Start the subscription process by initializing payment with Paystack",
	})
	@ApiBody({
		description: "Subscription initialization data",
		type: InitializeSubscriptionDto,
	})
	@ApiResponse({
		status: 200,
		description: "Payment initialized successfully",
		schema: {
			type: "object",
			properties: {
				authorizationUrl: {
					type: "string",
					example: "https://paystack.com/pay/xxxxx",
				},
				reference: { type: "string", example: "ref_xxxxx" },
				accessCode: { type: "string", example: "xxxxx" },
			},
		},
	})
	@ApiResponse({
		status: 409,
		description: "User already has an active subscription",
	})
	async initializeSubscription(
		@Body() dto: InitializeSubscriptionDto,
		@Req() req: any,
	) {
		return await this.subscriptionsService.initializeSubscription(
			req.user.id,
			dto,
		);
	}

	@UseGuards(AccountsAuthGuard)
	@Get("status")
	@ApiOperation({
		summary: "Get current subscription status",
		description: "Get the active subscription details for the current user",
	})
	@ApiResponse({
		status: 200,
		description: "Subscription status retrieved successfully",
		schema: {
			type: "object",
			properties: {
				subscription: {
					type: "object",
					properties: {
						id: { type: "string" },
						status: { type: "string", example: "active" },
						plan: {
							type: "object",
							properties: {
								name: { type: "string" },
								tier: { type: "number" },
								features: { type: "array" },
								maxIncidents: {
									type: "number",
									nullable: true,
								},
							},
						},
						currentPeriodStart: {
							type: "string",
							format: "date-time",
						},
						currentPeriodEnd: {
							type: "string",
							format: "date-time",
						},
						nextBillingDate: {
							type: "string",
							format: "date-time",
						},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: "No active subscription",
		schema: {
			type: "object",
			properties: {
				subscription: { type: "null" },
				message: { type: "string", example: "No active subscription" },
			},
		},
	})
	async getSubscriptionStatus(@Req() req: any) {
		return await this.subscriptionsService.getSubscriptionStatus(
			req.user.id,
		);
	}

	@UseGuards(AccountsAuthGuard)
	@Post("cancel")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Cancel subscription",
		description:
			"Cancel subscription at period end. User will retain access until the current billing period ends.",
	})
	@ApiResponse({
		status: 200,
		description: "Subscription cancelled successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Subscription will be cancelled at period end",
				},
				subscription: {
					type: "object",
					properties: {
						status: { type: "string", example: "active" },
						cancelledAt: {
							type: "string",
							format: "date-time",
							nullable: true,
						},
						cancelAtPeriodEnd: { type: "boolean", example: true },
					},
				},
			},
		},
	})
	async cancelSubscription(@Req() req: any) {
		return await this.subscriptionsService.cancelSubscription(req.user.id);
	}

	@UseGuards(AccountsAuthGuard)
	@Post("resume")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Resume cancelled subscription",
		description:
			"Resume a subscription that was previously cancelled before the period ends",
	})
	@ApiResponse({
		status: 200,
		description: "Subscription resumed successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Subscription resumed successfully",
				},
				subscription: {
					type: "object",
					properties: {
						cancelAtPeriodEnd: { type: "boolean", example: false },
					},
				},
			},
		},
	})
	async resumeSubscription(@Req() req: any) {
		return await this.subscriptionsService.resumeSubscription(req.user.id);
	}

	@UseGuards(AccountsAuthGuard)
	@Get("transactions")
	@ApiOperation({
		summary: "Get transaction history",
		description: "Get all payment transactions for the current user",
	})
	@ApiResponse({
		status: 200,
		description: "Transaction history retrieved successfully",
		schema: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							transactionReference: {
								type: "string",
								example: "tx_1234567890",
							},
							date: {
								type: "string",
								format: "date-time",
							},
							amount: { type: "number", example: 15000000 },
							currency: { type: "string", example: "NGN" },
							status: {
								type: "string",
								enum: ["success", "failed", "pending"],
								example: "success",
							},
							plan: {
								type: "object",
								nullable: true,
								properties: {
									name: {
										type: "string",
										example: "Essential Protection",
									},
									tier: { type: "number", example: 1 },
								},
							},
							paymentMethod: {
								type: "string",
								example: "Paystack",
							},
						},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 401,
		description: "Unauthorized - Invalid or missing token",
	})
	async getTransactionHistory(@Req() req: any) {
		const transactions =
			await this.subscriptionsService.getTransactionHistory(req.user.id);
		return { data: transactions };
	}
}
