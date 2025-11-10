import { Injectable, Logger } from "@nestjs/common";
import { PaystackService } from "./paystack.service";
import { SubscriptionsRepository } from "../repository/subscriptions.repository";
import { TransactionsRepository } from "../repository/transactions.repository";
import { TransactionStatus } from "../entities/transaction.entity";
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
		private readonly transactionsRepo: TransactionsRepository,
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
		const transactionReference = data.reference;
		const customerCode = data.customer?.customer_code;

		// Try to find subscription by subscription_code first (for renewals)
		let subscription = subscriptionCode
			? await this.subscriptionsRepo.findByPaystackCode(subscriptionCode)
			: null;

		// If not found and we have a reference, try finding by transaction reference (for first payments)
		if (!subscription && transactionReference) {
			subscription =
				await this.subscriptionsRepo.findByTransactionReference(
					transactionReference,
				);
		}

		// If still not found, try finding by customer code (for first payments before subscription.create)
		if (!subscription && customerCode) {
			subscription =
				await this.subscriptionsRepo.findByPaystackCustomerCode(
					customerCode,
				);
		}

		if (!subscription) {
			this.logger.warn(
				`Could not find subscription for charge.success event. Reference: ${transactionReference}, Subscription Code: ${subscriptionCode}, Customer Code: ${customerCode}`,
			);
			// Subscription not found - create transaction anyway (subscription.create will link it later)
			if (transactionReference && data.customer?.email) {
				const customerEmail = data.customer.email;
				const account =
					await this.accountsRepo.findByEmail(customerEmail);
				if (account) {
					this.logger.log(
						`Creating transaction ${transactionReference} without subscription link. Will be linked when subscription is created.`,
					);
					try {
						const existingTransaction =
							await this.transactionsRepo.findByReference(
								transactionReference,
							);
						if (!existingTransaction) {
							await this.transactionsRepo.createTransaction({
								accountId: account.id,
								subscriptionId: null, // Will be linked later
								planId: null, // Will be linked later
								transactionReference,
								status: TransactionStatus.SUCCESS,
								amount: data.amount || 0,
								currency: data.currency || "NGN",
								paymentMethod:
									data.authorization?.channel || "Paystack",
								paystackCustomerCode: customerCode,
								metadata: {
									paystackTransactionId: data.id,
									isRenewal: false,
									authorizationCode:
										data.authorization?.authorization_code,
									pendingSubscriptionLink: true,
								},
							});
							this.logger.log(
								`Transaction ${transactionReference} created successfully (pending subscription link)`,
							);
						}
					} catch (error: any) {
						this.logger.error(
							`Failed to create transaction without subscription: ${error.message || error}`,
						);
					}
				}
			}
			return;
		}

		this.logger.log(
			`Found subscription ${subscription.id} for charge.success event`,
		);

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

		// Create or update transaction record (for both first payments and renewals)
		if (transactionReference) {
			this.logger.log(
				`Creating/updating transaction for reference: ${transactionReference}`,
			);
			const existingTransaction =
				await this.transactionsRepo.findByReference(
					transactionReference,
				);
			if (!existingTransaction) {
				// Determine if this is a renewal or first payment
				const isRenewal = !!subscriptionCode;
				this.logger.log(
					`Creating new transaction ${transactionReference} (isRenewal: ${isRenewal})`,
				);
				await this.transactionsRepo.createTransaction({
					accountId: subscription.accountId,
					subscriptionId: subscription.id,
					planId: subscription.planId,
					transactionReference,
					status: TransactionStatus.SUCCESS,
					amount: data.amount || subscription.plan.amount,
					currency: data.currency || subscription.plan.currency,
					paymentMethod: data.authorization?.channel || "Paystack",
					paystackCustomerCode:
						subscription.paystackCustomerCode || customerCode,
					metadata: {
						paystackTransactionId: data.id,
						isRenewal,
						authorizationCode:
							data.authorization?.authorization_code,
					},
				});

				this.logger.log(
					`Transaction ${transactionReference} created successfully`,
				);

				// Update subscription metadata with transaction reference if not set
				if (!subscription.metadata?.transactionReference) {
					await this.subscriptionsRepo.updateSubscription(
						subscription.id,
						{
							metadata: {
								...subscription.metadata,
								transactionReference,
							},
						},
					);
				}
			} else {
				this.logger.log(
					`Transaction ${transactionReference} already exists, updating status`,
				);
				await this.transactionsRepo.updateTransactionStatus(
					transactionReference,
					TransactionStatus.SUCCESS,
				);
			}
		} else {
			this.logger.warn(
				`No transaction reference found in charge.success event for subscription ${subscription.id}`,
			);
		}

		this.logger.log(
			`Subscription ${subscription.id} payment processed successfully`,
		);
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

		// Create or update transaction record for failed payment
		const transactionReference = data.reference;
		if (transactionReference) {
			const existingTransaction =
				await this.transactionsRepo.findByReference(
					transactionReference,
				);
			if (!existingTransaction) {
				await this.transactionsRepo.createTransaction({
					accountId: subscription.accountId,
					subscriptionId: subscription.id,
					planId: subscription.planId,
					transactionReference,
					status: TransactionStatus.FAILED,
					amount: data.amount || subscription.plan.amount,
					currency: data.currency || subscription.plan.currency,
					paymentMethod: "Paystack",
					paystackCustomerCode: subscription.paystackCustomerCode,
					metadata: {
						paystackTransactionId: data.id,
						failureReason:
							data.gateway_response || "Payment failed",
					},
				});
			} else {
				await this.transactionsRepo.updateTransactionStatus(
					transactionReference,
					TransactionStatus.FAILED,
				);
			}
		}

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
			// Log the full webhook data for debugging
			this.logger.log(
				`Subscription.create webhook received. Full data: ${JSON.stringify(data, null, 2)}`,
			);

			const subscriptionCode = data.subscription_code || data.code;
			const emailToken = data.email_token;
			const customerCode = data.customer?.customer_code;
			const accountId = data.metadata?.accountId;

			this.logger.log(
				`Extracted values - subscriptionCode: ${subscriptionCode}, emailToken: ${emailToken}, customerCode: ${customerCode}, accountId: ${accountId}`,
			);

			if (!subscriptionCode) {
				this.logger.warn(
					"Subscription create event missing subscription_code",
				);
				return;
			}

			// Try to find subscription by subscription_code first (if already set)
			let subscription =
				await this.subscriptionsRepo.findByPaystackCode(
					subscriptionCode,
				);

			// If not found, try finding by customer_code (for first-time subscriptions)
			if (!subscription && customerCode) {
				subscription =
					await this.subscriptionsRepo.findByPaystackCustomerCode(
						customerCode,
					);
			}

			// If still not found, try finding by accountId from metadata (top-level)
			if (!subscription && data.metadata?.accountId) {
				subscription =
					await this.subscriptionsRepo.findActiveSubscriptionByAccountId(
						data.metadata.accountId,
					);
			}

			if (subscription) {
				this.logger.log(
					`Found subscription ${subscription.id} by ${subscription.paystackSubscriptionCode ? "subscription_code" : customerCode ? "customer_code" : "accountId"}`,
				);
				const updateData: Partial<Subscription> = {
					paystackSubscriptionCode: subscriptionCode,
				};
				if (emailToken) {
					updateData.paystackEmailToken = emailToken;
				}
				this.logger.log(
					`Updating subscription ${subscription.id} with: ${JSON.stringify(updateData)}`,
				);
				await this.subscriptionsRepo.updateSubscription(
					subscription.id,
					updateData,
				);
				this.logger.log(
					`Subscription ${subscription.id} updated successfully with code: ${subscriptionCode}, emailToken: ${emailToken}`,
				);
			} else {
				// Subscription doesn't exist - create it from webhook data
				this.logger.log(
					`Subscription not found, creating from webhook data. Code: ${subscriptionCode}, Customer: ${customerCode}`,
				);

				// Find account by customer email
				const customerEmail = data.customer?.email;
				if (!customerEmail) {
					this.logger.warn(
						"Cannot create subscription: customer email not found in webhook",
					);
					return;
				}

				const account =
					await this.accountsRepo.findByEmail(customerEmail);
				if (!account) {
					this.logger.warn(
						`Cannot create subscription: account not found for email ${customerEmail}`,
					);
					return;
				}

				// Find plan by plan_code
				const planCode = data.plan?.plan_code;
				if (!planCode) {
					this.logger.warn(
						"Cannot create subscription: plan_code not found in webhook",
					);
					return;
				}

				const plan =
					await this.subscriptionsRepo.findPlanByPaystackCode(
						planCode,
					);
				if (!plan) {
					this.logger.warn(
						`Cannot create subscription: plan not found for code ${planCode}`,
					);
					return;
				}

				// Calculate dates from next_payment_date
				const nextPaymentDate = data.next_payment_date
					? new Date(data.next_payment_date)
					: new Date();
				const now = new Date();
				const currentPeriodStart = now;

				// Create subscription
				const newSubscription =
					await this.subscriptionsRepo.createSubscription({
						accountId: account.id,
						planId: plan.id,
						paystackCustomerCode: customerCode,
						paystackSubscriptionCode: subscriptionCode,
						paystackEmailToken: emailToken,
						status: SubscriptionStatus.ACTIVE,
						currentPeriodStart,
						currentPeriodEnd: nextPaymentDate,
						nextBillingDate: nextPaymentDate,
						cancelAtPeriodEnd: false,
						cancelledAt: null,
						metadata: {
							createdFromWebhook: true,
							paymentMethod:
								data.authorization?.channel || "Paystack",
						},
					});

				// Get user name from profile
				let userName = account.email;
				if (
					account.role === "individual" &&
					account.individualProfile
				) {
					userName = `${account.individualProfile.firstName} ${account.individualProfile.lastName}`;
				} else if (
					account.role === "organization" &&
					account.organizationProfile
				) {
					userName = account.organizationProfile.organizationName;
				}

				// Send activation email
				await this.emailService.sendSubscriptionActivatedEmail(
					account.email,
					userName,
					plan.name,
					nextPaymentDate.toLocaleDateString(),
				);

				this.logger.log(
					`Subscription ${newSubscription.id} created successfully from webhook with code: ${subscriptionCode}`,
				);

				// Link any pending transactions for this account
				// This handles the case where charge.success arrived before subscription.create
				try {
					const pendingTransactions =
						await this.transactionsRepo.findByAccountId(account.id);
					const pendingTransaction = pendingTransactions.find(
						(t) =>
							t.metadata?.pendingSubscriptionLink === true &&
							!t.subscriptionId,
					);
					if (pendingTransaction) {
						this.logger.log(
							`Linking pending transaction ${pendingTransaction.transactionReference} to subscription ${newSubscription.id}`,
						);
						// Update the pending transaction with subscription and plan
						await this.transactionsRepo.updateTransaction(
							pendingTransaction.id,
							{
								subscriptionId: newSubscription.id,
								planId: plan.id,
								metadata: {
									...pendingTransaction.metadata,
									pendingSubscriptionLink: false,
								},
							},
						);
						// Update subscription metadata with transaction reference
						await this.subscriptionsRepo.updateSubscription(
							newSubscription.id,
							{
								metadata: {
									...newSubscription.metadata,
									transactionReference:
										pendingTransaction.transactionReference,
								},
							},
						);
					}
				} catch (error: any) {
					this.logger.error(
						`Failed to link pending transactions: ${error.message || error}`,
					);
				}

				// Try to create transaction if we have a reference from most_recent_invoice
				// Note: subscription.create webhook may not have transaction reference,
				// but charge.success will create it when it arrives
				const transactionReference =
					data.most_recent_invoice?.transaction?.reference ||
					data.metadata?.transactionReference;
				if (transactionReference) {
					try {
						const existingTransaction =
							await this.transactionsRepo.findByReference(
								transactionReference,
							);
						if (!existingTransaction) {
							await this.transactionsRepo.createTransaction({
								accountId: account.id,
								subscriptionId: newSubscription.id,
								planId: plan.id,
								transactionReference,
								status: TransactionStatus.SUCCESS,
								amount: data.amount || plan.amount,
								currency: data.currency || plan.currency,
								paymentMethod:
									data.authorization?.channel || "Paystack",
								paystackCustomerCode: customerCode,
								metadata: {
									paystackTransactionId: data.id,
									isRenewal: false,
									authorizationCode:
										data.authorization?.authorization_code,
								},
							});

							// Update subscription metadata with transaction reference
							await this.subscriptionsRepo.updateSubscription(
								newSubscription.id,
								{
									metadata: {
										...newSubscription.metadata,
										transactionReference,
									},
								},
							);

							this.logger.log(
								`Transaction ${transactionReference} created for subscription ${newSubscription.id}`,
							);
						}
					} catch (err) {
						this.logger.error(
							"Failed to create transaction in subscription.create",
							err,
						);
					}
				}
			}
		} catch (err) {
			this.logger.error(
				"Failed to persist subscription create data",
				err,
			);
		}
	}
}
