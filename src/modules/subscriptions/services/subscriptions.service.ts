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
import { TransactionStatus } from "../entities/transaction.entity";
import { PlanPaymentType } from "../enums/plan-payment-type.enum";
import { IncidentCreditsRepository } from "../repository/incident-credits.repository";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tickets } from "@/modules/tickets/entities/ticket.entity";

@Injectable()
export class SubscriptionsService {
	constructor(
		private readonly repo: SubscriptionsRepository,
		private readonly transactionsRepo: TransactionsRepository,
		private readonly paystack: PaystackService,
		private readonly accountsRepo: AccountsRepository,
		private readonly emailService: EmailService,
		private readonly incidentCreditsRepo: IncidentCreditsRepository,
		@InjectRepository(Tickets)
		private readonly ticketsRepo: Repository<Tickets>,
	) {}

	async getPlans(
		accountType?: "individual" | "organization",
		paymentType?: PlanPaymentType | string,
	) {
		const plans = await this.repo.findAllPlans(accountType, paymentType);
		// Hide internal integration fields (e.g., paystackPlanCode)
		return plans.map((plan) => ({
			id: plan.id,
			name: plan.name,
			tier: plan.tier,
			accountType: plan.accountType,
			paymentType: plan.paymentType,
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

		if (plan.paymentType === PlanPaymentType.ONE_TIME) {
			throw new BadRequestException(
				"This is a pay-as-you-go product. Use POST /subscriptions/initialize-payg instead.",
			);
		}

		if (!plan.paystackPlanCode) {
			throw new BadRequestException(
				"Subscription plan is missing a Paystack plan code",
			);
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
				type: "subscription",
				paymentType: PlanPaymentType.SUBSCRIPTION,
			},
		});

		await this.transactionsRepo.createTransaction({
			accountId,
			subscriptionId: null,
			planId: plan.id,
			transactionReference: paystackResponse.data.reference,
			status: TransactionStatus.PENDING,
			amount: amountInKobo,
			currency: plan.currency,
			paymentMethod: "Paystack",
			paystackCustomerCode: null,
			metadata: {
				type: "subscription",
				paymentType: PlanPaymentType.SUBSCRIPTION,
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

	async initializePayg(accountId: string, dto: InitializeSubscriptionDto) {
		const plan = await this.repo.findPlanById(dto.planId);
		if (!plan) {
			throw new NotFoundException("Pay-as-you-go product not found");
		}

		if (plan.paymentType !== PlanPaymentType.ONE_TIME) {
			throw new BadRequestException(
				"Plan is not a pay-as-you-go product. Use POST /subscriptions/initialize for subscriptions.",
			);
		}

		if (!plan.active) {
			throw new BadRequestException("This product is not available");
		}

		const account = await this.accountsRepo.findById(accountId);
		if (!account) {
			throw new NotFoundException("Account not found");
		}

		const paystackResponse = await this.paystack.initializeTransaction({
			email: account.email,
			amount: plan.amount,
			callback_url: dto.callbackUrl,
			metadata: {
				type: "payg",
				paymentType: PlanPaymentType.ONE_TIME,
				accountId,
				planId: plan.id,
				planName: plan.name,
				incidentsGranted: plan.maxIncidents ?? 1,
			},
		});

		await this.transactionsRepo.createTransaction({
			accountId,
			subscriptionId: null,
			planId: plan.id,
			transactionReference: paystackResponse.data.reference,
			status: TransactionStatus.PENDING,
			amount: plan.amount,
			currency: plan.currency,
			paymentMethod: "Paystack",
			paystackCustomerCode: null,
			metadata: {
				type: "payg",
				paymentType: PlanPaymentType.ONE_TIME,
				planId: plan.id,
				incidentsGranted: plan.maxIncidents ?? 1,
			},
		});

		return {
			authorizationUrl: paystackResponse.data.authorization_url,
			reference: paystackResponse.data.reference,
			accessCode: paystackResponse.data.access_code,
		};
	}

	async getSubscriptionStatus(accountId: string) {
		const [subscription, paygCreditsAvailable] = await Promise.all([
			this.repo.findActiveSubscriptionByAccountId(accountId),
			this.incidentCreditsRepo.countAvailableByAccountId(accountId),
		]);

		const payg = {
			paymentType: PlanPaymentType.ONE_TIME as const,
			creditsAvailable: paygCreditsAvailable,
		};

		if (!subscription) {
			return {
				subscription: null,
				payg,
				entitlement: {
					hasAccess: paygCreditsAvailable > 0,
					sources: paygCreditsAvailable > 0
						? ([PlanPaymentType.ONE_TIME] as PlanPaymentType[])
						: ([] as PlanPaymentType[]),
				},
				message:
					paygCreditsAvailable > 0
						? "No active subscription; pay-as-you-go credits available"
						: "No active subscription",
			};
		}

		const usedIncidents = await this.ticketsRepo
			.createQueryBuilder("ticket")
			.where("ticket.created_for_account_id = :accountId", { accountId })
			.andWhere("ticket.created_at >= :periodStart", {
				periodStart: subscription.currentPeriodStart,
			})
			.andWhere("ticket.created_at < :periodEnd", {
				periodEnd: subscription.currentPeriodEnd,
			})
			.getCount();

		const maxIncidents = subscription.plan.maxIncidents;
		const remainingIncidents =
			maxIncidents === null
				? null
				: Math.max(maxIncidents - usedIncidents, 0);

		const sources: PlanPaymentType[] = [PlanPaymentType.SUBSCRIPTION];
		if (paygCreditsAvailable > 0) {
			sources.push(PlanPaymentType.ONE_TIME);
		}

		return {
			subscription: {
				id: subscription.id,
				status: subscription.status,
				cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
				plan: {
					id: subscription.plan.id,
					name: subscription.plan.name,
					tier: subscription.plan.tier,
					accountType: subscription.plan.accountType,
					paymentType: subscription.plan.paymentType,
					interval: subscription.plan.interval,
					amount: Number(subscription.plan.amount),
					currency: subscription.plan.currency,
					features: subscription.plan.features,
					maxIncidents,
				},
				usage: {
					usedIncidents,
					remainingIncidents,
					maxIncidents,
				},
				currentPeriodStart: subscription.currentPeriodStart,
				currentPeriodEnd: subscription.currentPeriodEnd,
				nextBillingDate: subscription.nextBillingDate,
			},
			payg,
			entitlement: {
				hasAccess:
					maxIncidents === null ||
					usedIncidents < maxIncidents ||
					paygCreditsAvailable > 0,
				sources,
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

	async getTransactionHistory(
		accountId: string,
		page?: number,
		limit?: number,
	) {
		if (page && limit) {
			const offset = (page - 1) * limit;
			const { transactions, total } =
				await this.transactionsRepo.findByAccountIdPaginated(
					accountId,
					limit,
					offset,
				);

			const data = transactions.map((transaction) => ({
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

			return { transactions: data, total };
		}

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
