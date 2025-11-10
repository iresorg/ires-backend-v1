import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { SubscriptionsRepository } from "../repository/subscriptions.repository";
import { TransactionsRepository } from "../repository/transactions.repository";
import { PaystackService } from "./paystack.service";
import { InitializeSubscriptionDto } from "../dto/initialize-subscription.dto";
import { SubscriptionStatus } from "../entities/subscription.entity";
import { AccountsRepository } from "@/modules/accounts/repository/accounts.repository";
import { EmailService } from "@/shared/email/service";

@Injectable()
export class SubscriptionsService {
	constructor(
		private readonly repo: SubscriptionsRepository,
		private readonly transactionsRepo: TransactionsRepository,
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
		const subscription =
			await this.repo.findActiveSubscriptionByAccountId(accountId);

		if (!subscription) {
			throw new NotFoundException("No active subscription found");
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
				const paystackResponse = await this.paystack.enableSubscription(
					subscription.paystackSubscriptionCode,
					subscription.paystackEmailToken,
				);
				// Log success
				console.log(
					`Paystack subscription ${subscription.paystackSubscriptionCode} enabled successfully:`,
					paystackResponse,
				);
			} catch (error: any) {
				// Log detailed error
				console.error(
					`Error enabling Paystack subscription ${subscription.paystackSubscriptionCode}:`,
					error.message || error,
				);
				console.error("Error details:", error.response?.data || error);
				// Re-throw error so user knows it failed
				throw new BadRequestException(
					`Failed to resume subscription on Paystack: ${error.response?.data?.message || error.message || "Unknown error"}`,
				);
			}
		} else {
			// Log warning if subscription codes are missing
			console.warn(
				`Cannot enable Paystack subscription: missing subscription code or email token. Subscription ID: ${subscription.id}, Code: ${subscription.paystackSubscriptionCode}, Token: ${subscription.paystackEmailToken ? "exists" : "missing"}`,
			);
			throw new BadRequestException(
				"Cannot resume subscription: Paystack subscription code or email token is missing. Please contact support.",
			);
		}

		return {
			message: "Subscription resumed successfully",
			subscription: {
				cancelAtPeriodEnd: false,
			},
		};
	}

	async getTransactionHistory(accountId: string) {
		const transactions =
			await this.transactionsRepo.findByAccountId(accountId);

		return transactions.map((transaction) => ({
			id: transaction.id,
			transactionReference: transaction.transactionReference,
			date: transaction.createdAt,
			amount: transaction.amount,
			currency: transaction.currency,
			status: transaction.status,
			plan: transaction.plan
				? {
						name: transaction.plan.name,
						tier: transaction.plan.tier,
					}
				: null,
			paymentMethod: transaction.paymentMethod,
		}));
	}
}
