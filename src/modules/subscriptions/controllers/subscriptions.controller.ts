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
	@Get("verify")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Verify payment and activate subscription",
		description:
			"Verify payment reference and activate subscription after successful payment",
	})
	@ApiQuery({
		name: "reference",
		required: true,
		type: String,
		description: "Payment reference from Paystack",
	})
	@ApiResponse({
		status: 200,
		description: "Payment verified and subscription activated",
		schema: {
			type: "object",
			properties: {
				status: { type: "string", example: "active" },
				subscription: {
					type: "object",
					properties: {
						id: { type: "string" },
						plan: {
							type: "object",
							properties: {
								name: { type: "string" },
								tier: { type: "number" },
							},
						},
						startDate: { type: "string", format: "date-time" },
						endDate: { type: "string", format: "date-time" },
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
		status: 400,
		description: "Payment not successful or verification failed",
	})
	async verifyPayment(
		@Query("reference") reference: string,
		@Req() req: any,
	) {
		return await this.subscriptionsService.verifyPayment(req.user.id, {
			reference,
		});
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
}
