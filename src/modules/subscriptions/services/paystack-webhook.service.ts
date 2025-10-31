import { Injectable, Logger } from "@nestjs/common";
import { PaystackService } from "./paystack.service";
import { SubscriptionsRepository } from "../repository/subscriptions.repository";
import { EmailService } from "@/shared/email/service";
import { AccountsRepository } from "@/modules/accounts/repository/accounts.repository";
import {
	Subscription,
	SubscriptionStatus,
} from "../entities/subscription.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import { PaystackEvent } from "../entities/paystack-event.entity";

@Injectable()
export class PaystackWebhookService {
	private readonly logger = new Logger(PaystackWebhookService.name);

	constructor(
		private readonly paystack: PaystackService,
		private readonly subscriptionsRepo: SubscriptionsRepository,
		private readonly accountsRepo: AccountsRepository,
		private readonly emailService: EmailService,
		@InjectRepository(PaystackEvent)
		private readonly paystackEventRepo: Repository<PaystackEvent>,
	) {}

	async handleWebhook(body: any, signature: string, rawPayload?: string) {
		// Verify webhook signature against the raw payload string
		const isValid = this.paystack.verifyWebhookSignature(
			rawPayload ?? JSON.stringify(body),
			signature,
		);

		if (!isValid) {
			this.logger.error("Invalid webhook signature");
			throw new Error("Invalid webhook signature");
		}

		const event = body.event;
		const data = body.data;

		// Log the event (use signature as stable id fallback)
		await this.logWebhookEvent(event, data, signature);

		// Handle different event types
		switch (event) {
			case "charge.success":
				await this.handleChargeSuccess(data);
				break;

			case "invoice.payment_failed":
				await this.handlePaymentFailed(data);
				break;

			case "subscription.disable":
				await this.handleSubscriptionDisable(data);
				break;

			case "subscription.enable":
				await this.handleSubscriptionEnable(data);
				break;

			case "subscription.create":
				await this.handleSubscriptionCreate(data);
				break;

			default:
				this.logger.log(`Unhandled event: ${event}`);
		}

		return { status: "success" };
	}

	private async logWebhookEvent(
		eventType: string,
		data: any,
		paystackEventId?: string,
	) {
		try {
			const eventId =
				paystackEventId ||
				data.reference ||
				data.subscription_code ||
				randomUUID();
			await this.paystackEventRepo.save({
				eventType,
				reference: data.reference || data.subscription_code || null,
				paystackEventId: eventId,
				data,
				processed: false,
			});
		} catch (error) {
			this.logger.error("Failed to log webhook event", error);
		}
	}

	private async handleChargeSuccess(data: any) {
		// Successful payment - extend subscription
		const subscriptionCode = data.subscription?.subscription_code;
		if (!subscriptionCode) return;

		const subscription =
			await this.subscriptionsRepo.findByPaystackCode(subscriptionCode);
		if (!subscription) return;

		// Update billing dates
		const now = new Date();
		const nextMonth = new Date(now);
		nextMonth.setMonth(nextMonth.getMonth() + 1);

		// Update billing dates and, if present, persist Paystack subscription identifiers
		const updateData: Partial<Subscription> = {
			currentPeriodStart: now,
			currentPeriodEnd: nextMonth,
			nextBillingDate: nextMonth,
			status: SubscriptionStatus.ACTIVE,
			cancelAtPeriodEnd: false,
			cancelledAt: null,
		};

		if (
			data.subscription?.subscription_code &&
			!subscription.paystackSubscriptionCode
		) {
			updateData.paystackSubscriptionCode =
				data.subscription.subscription_code;
		}

		if (
			data.subscription?.email_token &&
			!subscription.paystackEmailToken
		) {
			updateData.paystackEmailToken = data.subscription.email_token;
		}

		await this.subscriptionsRepo.updateSubscription(
			subscription.id,
			updateData,
		);

		this.logger.log(`Subscription ${subscription.id} renewed successfully`);
	}

	private async handlePaymentFailed(data: any) {
		// Payment failed - mark as past_due
		const subscriptionCode = data.subscription?.subscription_code;
		if (!subscriptionCode) return;

		const subscription =
			await this.subscriptionsRepo.findByPaystackCode(subscriptionCode);
		if (!subscription) return;

		await this.subscriptionsRepo.updateSubscription(subscription.id, {
			status: SubscriptionStatus.PAST_DUE,
		});

		// Send payment failed email
		const account = await this.accountsRepo.findById(
			subscription.accountId,
		);
		if (account) {
			await this.emailService.sendPaymentFailedEmail(
				account.email,
				account.email,
				subscription.plan.name,
			);
		}

		this.logger.log(`Payment failed for subscription ${subscription.id}`);
	}

	private async handleSubscriptionDisable(data: any) {
		// Subscription disabled/expired
		const subscriptionCode = data.subscription_code || data.code;
		if (!subscriptionCode) return;

		const subscription =
			await this.subscriptionsRepo.findByPaystackCode(subscriptionCode);
		if (!subscription) return;

		await this.subscriptionsRepo.updateSubscription(subscription.id, {
			status: SubscriptionStatus.EXPIRED,
		});

		// Send subscription ended email
		const account = await this.accountsRepo.findById(
			subscription.accountId,
		);
		if (account) {
			await this.emailService.sendSubscriptionEndedEmail(
				account.email,
				account.email,
				subscription.plan.name,
			);
		}

		this.logger.log(`Subscription ${subscription.id} expired`);
	}

	private async handleSubscriptionEnable(data: any) {
		// Subscription re-enabled
		const subscriptionCode = data.subscription_code || data.code;
		if (!subscriptionCode) return;

		const subscription =
			await this.subscriptionsRepo.findByPaystackCode(subscriptionCode);
		if (!subscription) return;

		await this.subscriptionsRepo.updateSubscription(subscription.id, {
			status: SubscriptionStatus.ACTIVE,
		});

		this.logger.log(`Subscription ${subscription.id} re-enabled`);
	}

	private async handleSubscriptionCreate(data: any) {
		// Persist identifiers when a subscription is created and log
		try {
			const subscriptionCode = data.subscription_code || data.code;
			if (subscriptionCode) {
				const subscription =
					await this.subscriptionsRepo.findByPaystackCode(
						subscriptionCode,
					);
				if (subscription) {
					const updateData: Partial<Subscription> = {
						paystackSubscriptionCode: subscriptionCode,
					};
					if (data.email_token) {
						updateData.paystackEmailToken = data.email_token;
					}
					await this.subscriptionsRepo.updateSubscription(
						subscription.id,
						updateData,
					);
				}
			}
			this.logger.log(
				`Subscription created: ${subscriptionCode ?? "unknown"}`,
			);
		} catch (err) {
			this.logger.error(
				"Failed to persist subscription create data",
				err,
			);
		}
	}
}
