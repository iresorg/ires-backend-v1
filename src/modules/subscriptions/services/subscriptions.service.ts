import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { SubscriptionsRepository } from "../repository/subscriptions.repository";
import { PaystackService } from "./paystack.service";
import { InitializeSubscriptionDto } from "../dto/initialize-subscription.dto";
import { VerifyPaymentDto } from "../dto/verify-payment.dto";
import { SubscriptionStatus } from "../entities/subscription.entity";
import { AccountsRepository } from "@/modules/accounts/repository/accounts.repository";
import { EmailService } from "@/shared/email/service";

@Injectable()
export class SubscriptionsService {
	constructor(
		private readonly repo: SubscriptionsRepository,
		private readonly paystack: PaystackService,
		private readonly accountsRepo: AccountsRepository,
		private readonly emailService: EmailService,
	) {}

	async getPlans(accountType?: "individual" | "organization") {
		const plans = await this.repo.findAllPlans(accountType);
		// Hide internal integration fields (e.g., paystackPlanCode)
		return plans.map((plan) => ({
			id: plan.id,
			name: plan.name,
			tier: plan.tier,
			accountType: plan.accountType,
			amount: plan.amount,
			currency: plan.currency,
			interval: plan.interval,
			description: plan.description,
			features: plan.features,
			maxIncidents: plan.maxIncidents,
			active: plan.active,
			createdAt: plan.createdAt,
			updatedAt: plan.updatedAt,
		}));
	}

	async initializeSubscription(
		accountId: string,
		dto: InitializeSubscriptionDto,
	) {
		// Check if user already has active subscription
		const existingSubscription =
			await this.repo.findActiveSubscriptionByAccountId(accountId);
		if (existingSubscription) {
			throw new ConflictException(
				"User already has an active subscription",
			);
		}

		// Get plan details
		const plan = await this.repo.findPlanById(dto.planId);
		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		// Get account details
		const account = await this.accountsRepo.findById(accountId);
		if (!account) {
			throw new NotFoundException("Account not found");
		}

		// Calculate amounts
		const amountInKobo = plan.amount;

		// Initialize transaction with Paystack
		const paystackResponse = await this.paystack.initializeTransaction({
			email: account.email,
			amount: amountInKobo,
			plan: plan.paystackPlanCode,
			callback_url: dto.callbackUrl,
			metadata: {
				accountId,
				planId: plan.id,
				planName: plan.name,
			},
		});

		return {
			authorizationUrl: paystackResponse.data.authorization_url,
			reference: paystackResponse.data.reference,
			accessCode: paystackResponse.data.access_code,
		};
	}

	async verifyPayment(accountId: string, dto: VerifyPaymentDto) {
		// Verify with Paystack
		const paystackResponse = await this.paystack.verifyTransaction(
			dto.reference,
		);

		if (paystackResponse.data.status !== "success") {
			throw new BadRequestException("Payment not successful");
		}

		const transaction = paystackResponse.data;

		// Get account
		const account = await this.accountsRepo.findById(accountId);
		if (!account) {
			throw new NotFoundException("Account not found");
		}

		// Extract metadata
		const metadata = transaction.metadata || {};
		const planId = metadata.planId || transaction.authorization.plan;

		const plan = await this.repo.findPlanById(planId);
		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		// Calculate subscription dates (1 month)
		const now = new Date();
		const nextMonth = new Date(now);
		nextMonth.setMonth(nextMonth.getMonth() + 1);

		// Create subscription record
		const subscription = await this.repo.createSubscription({
			accountId,
			planId: plan.id,
			// Paystack verify payload: customer.customer_code (preferred) or customer.code (fallback)
			paystackCustomerCode:
				transaction.customer?.customer_code ||
				transaction.customer?.code ||
				null,
			// Verify endpoint may not include subscription data; keep null and let webhook update it if missing
			paystackSubscriptionCode:
				transaction.subscription?.subscription_code || null,
			paystackEmailToken: transaction.subscription?.email_token || null,
			status: SubscriptionStatus.ACTIVE,
			currentPeriodStart: now,
			currentPeriodEnd: nextMonth,
			nextBillingDate: nextMonth,
			cancelAtPeriodEnd: false,
			cancelledAt: null,
			metadata: {
				transactionReference: dto.reference,
				paymentMethod: transaction.authorization.channel,
			},
		});

		// Send activation email
		await this.emailService.sendSubscriptionActivatedEmail(
			account.email,
			account.email, // TODO: Get actual user name from profile
			plan.name,
			nextMonth.toLocaleDateString(),
		);

		return {
			status: "active",
			subscription: {
				id: subscription.id,
				plan: {
					name: plan.name,
					tier: plan.tier,
				},
				startDate: now,
				endDate: nextMonth,
				nextBillingDate: nextMonth,
			},
		};
	}

	async getSubscriptionStatus(accountId: string) {
		const subscription =
			await this.repo.findActiveSubscriptionByAccountId(accountId);

		if (!subscription) {
			return {
				subscription: null,
				message: "No active subscription",
			};
		}

		return {
			subscription: {
				id: subscription.id,
				status: subscription.status,
				plan: {
					name: subscription.plan.name,
					tier: subscription.plan.tier,
					features: subscription.plan.features,
					maxIncidents: subscription.plan.maxIncidents,
				},
				currentPeriodStart: subscription.currentPeriodStart,
				currentPeriodEnd: subscription.currentPeriodEnd,
				nextBillingDate: subscription.nextBillingDate,
			},
		};
	}

	async cancelSubscription(accountId: string) {
		const subscription =
			await this.repo.findActiveSubscriptionByAccountId(accountId);

		if (!subscription) {
			throw new NotFoundException("No active subscription found");
		}

		// Cancel at period end
		await this.repo.cancelSubscriptionAtPeriodEnd(subscription.id);

		// Disable in Paystack if subscription code exists
		if (
			subscription.paystackSubscriptionCode &&
			subscription.paystackEmailToken
		) {
			try {
				await this.paystack.disableSubscription(
					subscription.paystackSubscriptionCode,
					subscription.paystackEmailToken,
				);
			} catch (error) {
				console.error("Error disabling Paystack subscription:", error);
			}
		}

		// Get account and send cancellation email
		const account = await this.accountsRepo.findById(accountId);
		if (account) {
			const subscriptionData = await this.repo.findById(subscription.id);
			if (subscriptionData) {
				await this.emailService.sendSubscriptionCancelledEmail(
					account.email,
					account.email,
					subscriptionData.plan.name,
					subscriptionData.currentPeriodEnd.toLocaleDateString(),
				);
			}
		}

		return {
			message: "Subscription will be cancelled at period end",
			subscription: {
				status: subscription.status,
				cancelledAt: subscription.cancelledAt,
				cancelAtPeriodEnd: true,
			},
		};
	}

	async resumeSubscription(accountId: string) {
		const subscription = await this.repo.findById(accountId);

		if (!subscription) {
			throw new NotFoundException("Subscription not found");
		}

		if (subscription.status !== SubscriptionStatus.ACTIVE) {
			throw new BadRequestException(
				"Only active subscriptions can be resumed",
			);
		}

		// Resume subscription
		await this.repo.resumeSubscription(subscription.id);

		// Enable in Paystack if subscription code exists
		if (
			subscription.paystackSubscriptionCode &&
			subscription.paystackEmailToken
		) {
			try {
				await this.paystack.enableSubscription(
					subscription.paystackSubscriptionCode,
					subscription.paystackEmailToken,
				);
			} catch (error) {
				console.error("Error enabling Paystack subscription:", error);
			}
		}

		return {
			message: "Subscription resumed successfully",
			subscription: {
				cancelAtPeriodEnd: false,
			},
		};
	}
}
