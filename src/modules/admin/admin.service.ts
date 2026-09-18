import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { AccountsRepository } from "../accounts/repository/accounts.repository";
import {
	Subscription,
	SubscriptionStatus,
} from "../subscriptions/entities/subscription.entity";
import {
	IncidentCredit,
	IncidentCreditStatus,
} from "../subscriptions/entities/incident-credit.entity";
import { UsersQueryDto } from "./dto/users-query.dto";
import { SubscribersQueryDto } from "./dto/subscribers-query.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { SubscriberResponseDto } from "./dto/subscriber-response.dto";
import {
	OverviewResponseDto,
	createEmptyStatusCounts,
	formatRoleLabel,
	formatTicketAction,
	getLastMonths,
} from "./dto/overview-response.dto";
import {
	CreateSubscriptionPlanDto,
	UpdateSubscriptionPlanDto,
} from "./dto/subscription-plan.dto";
import { User } from "../users/entities/user.entity";
import { Account } from "../accounts/entities/account.entity";
import { Tickets } from "../tickets/entities/ticket.entity";
import { TicketLifecycle } from "../tickets/entities/ticket-lifecycle.entity";
import { Role } from "../users/enums/role.enum";
import { TicketStatus } from "../tickets/interfaces/ticket.interface";
import { SubscriptionsRepository } from "../subscriptions/repository/subscriptions.repository";
import { TransactionsRepository } from "../subscriptions/repository/transactions.repository";
import { PaystackService } from "../subscriptions/services/paystack.service";
import { PlanPaymentType } from "../subscriptions/enums/plan-payment-type.enum";
import {
	SubscriptionTransaction,
	TransactionStatus,
} from "../subscriptions/entities/transaction.entity";
import {
	FinancialsOverviewQueryDto,
	FinancialsTransactionsQueryDto,
	PaystackSettlementsQueryDto,
} from "./dto/financials-query.dto";

@Injectable()
export class AdminService {
	constructor(
		private readonly accountsRepo: AccountsRepository,
		@InjectRepository(Subscription)
		private readonly subscriptions: Repository<Subscription>,
		@InjectRepository(IncidentCredit)
		private readonly incidentCredits: Repository<IncidentCredit>,
		@InjectRepository(User)
		private readonly users: Repository<User>,
		@InjectRepository(Account)
		private readonly accounts: Repository<Account>,
		@InjectRepository(Tickets)
		private readonly tickets: Repository<Tickets>,
		@InjectRepository(TicketLifecycle)
		private readonly ticketLifecycle: Repository<TicketLifecycle>,
		@InjectRepository(SubscriptionTransaction)
		private readonly transactions: Repository<SubscriptionTransaction>,
		private readonly subscriptionsRepo: SubscriptionsRepository,
		private readonly transactionsRepo: TransactionsRepository,
		private readonly paystack: PaystackService,
	) {}

	async getUsers(query: UsersQueryDto): Promise<{
		users: UserResponseDto[];
		total: number;
	}> {
		const {
			search,
			role,
			emailVerified,
			joinedDateFrom,
			joinedDateTo,
			page,
			limit,
		} = query;

		const offset = page && limit ? (page - 1) * limit : undefined;

		const { accounts, total } = await this.accountsRepo.findAllWithFilters({
			search,
			role,
			emailVerified,
			joinedDateFrom: joinedDateFrom
				? new Date(joinedDateFrom)
				: undefined,
			joinedDateTo: joinedDateTo ? new Date(joinedDateTo) : undefined,
			limit,
			offset,
		});

		return {
			users: UserResponseDto.fromAccounts(accounts),
			total,
		};
	}

	async getSubscribers(query: SubscribersQueryDto): Promise<{
		subscribers: SubscriberResponseDto[];
		total: number;
	}> {
		if (query.paymentType === PlanPaymentType.ONE_TIME) {
			return this.getPaygSubscribers(query);
		}

		if (query.paymentType === PlanPaymentType.SUBSCRIPTION) {
			return this.getRecurringSubscribers(query);
		}

		// No paymentType → recurring + PAYG in one list
		const unpaged = { ...query, page: undefined, limit: undefined };
		const [recurring, payg] = await Promise.all([
			this.getRecurringSubscribers(unpaged),
			this.getPaygSubscribers(unpaged),
		]);

		const merged = [...recurring.subscribers, ...payg.subscribers].sort(
			(a, b) => {
				const aTime = a.startDate
					? new Date(a.startDate).getTime()
					: 0;
				const bTime = b.startDate
					? new Date(b.startDate).getTime()
					: 0;
				return bTime - aTime;
			},
		);

		const total = merged.length;
		const { page, limit } = query;
		if (page && limit) {
			const offset = (page - 1) * limit;
			return {
				subscribers: merged.slice(offset, offset + limit),
				total,
			};
		}

		return { subscribers: merged, total };
	}

	private async getRecurringSubscribers(query: SubscribersQueryDto): Promise<{
		subscribers: SubscriberResponseDto[];
		total: number;
	}> {
		const { search, status, planId, page, limit } = query;
		const offset = page && limit ? (page - 1) * limit : undefined;

		const queryBuilder = this.subscriptions
			.createQueryBuilder("subscription")
			.leftJoinAndSelect("subscription.account", "account")
			.leftJoinAndSelect("account.individualProfile", "individualProfile")
			.leftJoinAndSelect(
				"account.organizationProfile",
				"organizationProfile",
			)
			.leftJoinAndSelect("subscription.plan", "plan")
			.andWhere(
				"(plan.payment_type = :paymentType OR plan.payment_type IS NULL)",
				{ paymentType: PlanPaymentType.SUBSCRIPTION },
			);

		if (search) {
			const searchTerm = `%${search.toLowerCase()}%`;
			queryBuilder.andWhere(
				"(LOWER(account.email) LIKE :search OR LOWER(individualProfile.first_name) LIKE :search OR LOWER(individualProfile.last_name) LIKE :search OR LOWER(organizationProfile.organization_name) LIKE :search)",
				{ search: searchTerm },
			);
		}

		if (status) {
			queryBuilder.andWhere("subscription.status = :status", { status });
		}

		if (planId) {
			queryBuilder.andWhere("subscription.planId = :planId", { planId });
		}

		const total = await queryBuilder.getCount();

		if (limit !== undefined) {
			queryBuilder.take(limit);
		}
		if (offset !== undefined) {
			queryBuilder.skip(offset);
		}

		queryBuilder.orderBy("subscription.createdAt", "DESC");

		const subscriptions = await queryBuilder.getMany();
		const subscribersData = subscriptions.map((subscription) => ({
			account: subscription.account,
			subscription,
		}));

		return {
			subscribers:
				SubscriberResponseDto.fromAccountsWithSubscriptions(
					subscribersData,
				),
			total,
		};
	}

	private async getPaygSubscribers(query: SubscribersQueryDto): Promise<{
		subscribers: SubscriberResponseDto[];
		total: number;
	}> {
		const { search, planId, page, limit } = query;
		const offset = page && limit ? (page - 1) * limit : undefined;

		const qb = this.incidentCredits
			.createQueryBuilder("credit")
			.innerJoinAndSelect("credit.account", "account")
			.leftJoinAndSelect("account.individualProfile", "individualProfile")
			.leftJoinAndSelect(
				"account.organizationProfile",
				"organizationProfile",
			)
			.leftJoinAndSelect("credit.plan", "plan")
			.distinctOn(["credit.account_id"])
			.orderBy("credit.account_id")
			.addOrderBy("credit.createdAt", "DESC");

		if (search) {
			const searchTerm = `%${search.toLowerCase()}%`;
			qb.andWhere(
				"(LOWER(account.email) LIKE :search OR LOWER(individualProfile.first_name) LIKE :search OR LOWER(individualProfile.last_name) LIKE :search OR LOWER(organizationProfile.organization_name) LIKE :search)",
				{ search: searchTerm },
			);
		}

		if (planId) {
			qb.andWhere("credit.plan_id = :planId", { planId });
		}

		const allMatching = await qb.getMany();
		const total = allMatching.length;
		const pageRows =
			limit !== undefined
				? allMatching.slice(offset ?? 0, (offset ?? 0) + limit)
				: allMatching;

		const accountIds = pageRows.map((c) => c.accountId);
		const availableCounts =
			accountIds.length === 0
				? []
				: await this.incidentCredits
						.createQueryBuilder("credit")
						.select("credit.account_id", "accountId")
						.addSelect("COUNT(*)", "count")
						.where("credit.account_id IN (:...accountIds)", {
							accountIds,
						})
						.andWhere("credit.status = :status", {
							status: IncidentCreditStatus.AVAILABLE,
						})
						.groupBy("credit.account_id")
						.getRawMany<{ accountId: string; count: string }>();

		const availableMap = new Map(
			availableCounts.map((row) => [row.accountId, Number(row.count)]),
		);

		return {
			subscribers: pageRows.map((credit) =>
				SubscriberResponseDto.fromAccountWithPaygCredit({
					account: credit.account,
					plan: credit.plan,
					credit,
					creditsAvailable: availableMap.get(credit.accountId) ?? 0,
				}),
			),
			total,
		};
	}

	async getOverview(): Promise<OverviewResponseDto> {
		const [
			totalUsers,
			totalAgents,
			totalResponders,
			totalActiveTickets,
			totalExternalUsers,
			totalSubscribers,
			userRoleCounts,
			ticketStatusRows,
			recentLifecycleEvents,
		] = await Promise.all([
			this.users.count(),
			this.users.count({ where: { role: Role.AGENT } }),
			this.users.count({
				where: {
					role: In([Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2]),
				},
			}),
			this.tickets.count({
				where: {
					status: Not(
						In([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
					),
				},
			}),
			this.accounts.count(),
			this.subscriptions.count({
				where: { status: SubscriptionStatus.ACTIVE },
			}),
			this.users
				.createQueryBuilder("user")
				.select("user.role", "role")
				.addSelect("COUNT(*)", "count")
				.groupBy("user.role")
				.getRawMany<{ role: Role; count: string }>(),
			this.getTicketStatusChartRows(),
			this.ticketLifecycle.find({
				relations: ["performedBy"],
				order: { createdAt: "DESC" },
				take: 10,
			}),
		]);

		const months = getLastMonths(3);
		const ticketStatusChart = months.map(({ key, label }) => {
			const statuses = createEmptyStatusCounts();

			for (const row of ticketStatusRows) {
				if (row.month !== key) {
					continue;
				}

				const chartStatus = this.mapTicketStatusForChart(row.status);
				if (chartStatus in statuses) {
					statuses[chartStatus] += Number(row.count);
				}
			}

			return { month: key, label, statuses };
		});

		return {
			summary: {
				totalUsers,
				totalActiveTickets,
				totalAgents,
				totalResponders,
				totalExternalUsers,
				totalSubscribers,
			},
			ticketStatusChart,
			userRolesChart: userRoleCounts
				.filter((row) => Number(row.count) > 0)
				.map((row) => ({
					role: row.role,
					label: formatRoleLabel(row.role),
					count: Number(row.count),
				})),
			recentActivity: recentLifecycleEvents.map((event) => ({
				user: event.performedBy
					? `${event.performedBy.firstName} ${event.performedBy.lastName}`.trim()
					: "System",
				role: event.performedBy
					? formatRoleLabel(event.performedBy.role)
					: "System",
				activity: formatTicketAction(event.action),
				timestamp: event.createdAt,
			})),
		};
	}

	private async getTicketStatusChartRows(): Promise<
		{ month: string; status: TicketStatus; count: string }[]
	> {
		const startDate = new Date();
		startDate.setDate(1);
		startDate.setHours(0, 0, 0, 0);
		startDate.setMonth(startDate.getMonth() - 2);

		return this.tickets
			.createQueryBuilder("ticket")
			.select("TO_CHAR(ticket.created_at, 'YYYY-MM')", "month")
			.addSelect("ticket.status", "status")
			.addSelect("COUNT(*)", "count")
			.where("ticket.created_at >= :startDate", { startDate })
			.groupBy("month")
			.addGroupBy("ticket.status")
			.orderBy("month", "ASC")
			.getRawMany();
	}

	private mapTicketStatusForChart(status: TicketStatus): TicketStatus {
		if (status === TicketStatus.CREATED) {
			return TicketStatus.PENDING;
		}

		if (status === TicketStatus.REASSIGNED) {
			return TicketStatus.ASSIGNED;
		}

		return status;
	}

	async getSubscriptionPlans(filters?: {
		accountType?: "individual" | "organization";
		paymentType?: string;
	}) {
		return await this.subscriptionsRepo.findAllPlansForAdmin(filters);
	}

	async createSubscriptionPlan(dto: CreateSubscriptionPlanDto) {
		const isPayg = dto.paymentType === PlanPaymentType.ONE_TIME;
		const interval = isPayg ? null : (dto.interval ?? "monthly");

		let paystackPlanCode = dto.paystackPlanCode ?? null;

		if (isPayg) {
			// One-time products must not create a Paystack subscription plan
			paystackPlanCode = null;
		} else if (paystackPlanCode) {
			const existing =
				await this.subscriptionsRepo.findPlanByPaystackCode(
					paystackPlanCode,
				);
			if (existing) {
				throw new ConflictException(
					"A plan with this Paystack code already exists",
				);
			}
		} else {
			const paystackPlan = await this.paystack.createPlan({
				name: dto.name,
				interval: interval ?? "monthly",
				amount: dto.amount,
				currency: dto.currency ?? "NGN",
				description: dto.description,
			});
			paystackPlanCode = paystackPlan?.data?.plan_code;
			if (!paystackPlanCode) {
				throw new BadRequestException(
					"Paystack did not return a plan code",
				);
			}
		}

		return await this.subscriptionsRepo.createPlan({
			name: dto.name,
			tier: dto.tier,
			accountType: dto.accountType,
			paymentType: dto.paymentType,
			amount: dto.amount,
			currency: dto.currency ?? "NGN",
			interval,
			paystackPlanCode,
			description: dto.description,
			features: dto.features,
			maxIncidents: dto.maxIncidents ?? (isPayg ? 1 : null),
			active: dto.active ?? true,
		});
	}

	private isValidPaystackPlanCode(code: string | null | undefined): boolean {
		if (!code) return false;
		// Paystack plan codes look like PLN_xxxxx — reject UUIDs / junk stored by mistake
		return /^PLN_[A-Za-z0-9]+$/i.test(code.trim());
	}

	async updateSubscriptionPlan(id: string, dto: UpdateSubscriptionPlanDto) {
		const plan = await this.subscriptionsRepo.findPlanById(id);
		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		const nextPaymentType = dto.paymentType ?? plan.paymentType;
		const isPayg = nextPaymentType === PlanPaymentType.ONE_TIME;

		if (
			dto.paystackPlanCode &&
			dto.paystackPlanCode !== plan.paystackPlanCode
		) {
			if (isPayg) {
				throw new BadRequestException(
					"Pay-as-you-go products cannot have a Paystack plan code",
				);
			}
			if (!this.isValidPaystackPlanCode(dto.paystackPlanCode)) {
				throw new BadRequestException(
					"paystackPlanCode must be a valid Paystack plan code (e.g. PLN_xxxxx)",
				);
			}
			const existing =
				await this.subscriptionsRepo.findPlanByPaystackCode(
					dto.paystackPlanCode,
				);
			if (existing) {
				throw new ConflictException(
					"A plan with this Paystack code already exists",
				);
			}
		}

		const nextAmount = dto.amount ?? Number(plan.amount);
		const nextName = dto.name ?? plan.name;
		const nextInterval = isPayg
			? null
			: (dto.interval ?? plan.interval ?? "monthly");
		const nextCurrency = dto.currency ?? plan.currency;
		const nextDescription = dto.description ?? plan.description;
		let resolvedPaystackCode: string | null = isPayg
			? null
			: (dto.paystackPlanCode ?? plan.paystackPlanCode);

		const pricingChanged =
			dto.amount !== undefined ||
			dto.name !== undefined ||
			dto.interval !== undefined ||
			dto.description !== undefined;

		// Recurring plans need a live Paystack plan. Sync updates; recreate if code is missing/stale.
		if (!isPayg && (pricingChanged || !resolvedPaystackCode)) {
			try {
				if (this.isValidPaystackPlanCode(resolvedPaystackCode)) {
					await this.paystack.updatePlan(resolvedPaystackCode!, {
						name: nextName,
						interval: nextInterval ?? "monthly",
						amount: nextAmount,
						currency: nextCurrency,
						description: nextDescription,
						update_existing_subscriptions: false,
					});
				} else {
					const created = await this.paystack.createPlan({
						name: nextName,
						interval: nextInterval ?? "monthly",
						amount: nextAmount,
						currency: nextCurrency,
						description: nextDescription,
					});
					resolvedPaystackCode = created?.data?.plan_code ?? null;
					if (!resolvedPaystackCode) {
						throw new BadRequestException(
							"Paystack did not return a plan code",
						);
					}
				}
			} catch (error: any) {
				const message =
					typeof error?.message === "string"
						? error.message
						: "Paystack plan sync failed";
				const isInvalidRemote =
					/plan id\/code specified is invalid/i.test(message) ||
					/invalid plan/i.test(message);

				if (
					isInvalidRemote &&
					this.isValidPaystackPlanCode(resolvedPaystackCode)
				) {
					// Stored code no longer exists on Paystack (env switch / deleted) — recreate
					try {
						const created = await this.paystack.createPlan({
							name: nextName,
							interval: nextInterval ?? "monthly",
							amount: nextAmount,
							currency: nextCurrency,
							description: nextDescription,
						});
						resolvedPaystackCode =
							created?.data?.plan_code ?? null;
						if (!resolvedPaystackCode) {
							throw new BadRequestException(
								"Paystack did not return a plan code after recreate",
							);
						}
					} catch (recreateError: any) {
						throw new BadRequestException(
							recreateError?.message ||
								"Failed to recreate Paystack plan",
						);
					}
				} else if (error instanceof BadRequestException) {
					throw error;
				} else {
					throw new BadRequestException(message);
				}
			}
		}

		await this.subscriptionsRepo.updatePlan(id, {
			...(dto.name !== undefined && { name: dto.name }),
			...(dto.tier !== undefined && { tier: dto.tier }),
			...(dto.accountType !== undefined && {
				accountType: dto.accountType,
			}),
			...(dto.paymentType !== undefined && {
				paymentType: dto.paymentType,
			}),
			...(dto.amount !== undefined && { amount: dto.amount }),
			...(dto.currency !== undefined && { currency: dto.currency }),
			...(dto.interval !== undefined || isPayg
				? { interval: nextInterval }
				: {}),
			...(isPayg
				? { paystackPlanCode: null }
				: {
						paystackPlanCode: resolvedPaystackCode,
					}),
			...(dto.description !== undefined && {
				description: dto.description,
			}),
			...(dto.features !== undefined && { features: dto.features }),
			...(dto.maxIncidents !== undefined && {
				maxIncidents: dto.maxIncidents,
			}),
			...(dto.active !== undefined && { active: dto.active }),
		});

		return await this.subscriptionsRepo.findPlanById(id);
	}

	async deleteSubscriptionPlan(id: string) {
		const plan = await this.subscriptionsRepo.findPlanById(id);
		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		const [subscriberCount, transactionCount, creditCount] =
			await Promise.all([
				this.subscriptionsRepo.countSubscriptionsByPlanId(id),
				this.transactionsRepo.countByPlanId(id),
				this.incidentCredits.count({ where: { planId: id } }),
			]);

		if (subscriberCount > 0 || transactionCount > 0 || creditCount > 0) {
			await this.subscriptionsRepo.updatePlan(id, { active: false });
			return {
				message:
					"Plan has linked subscribers, payments, or credits, so it was deactivated instead of deleted",
				id,
				active: false,
				linked: {
					subscribers: subscriberCount,
					transactions: transactionCount,
					credits: creditCount,
				},
			};
		}

		await this.subscriptionsRepo.deletePlan(id);
		return { message: "Subscription plan deleted", id };
	}

	async getFinancialsOverview(query: FinancialsOverviewQueryDto) {
		const { from, to } = this.resolveDateRange(query.from, query.to);
		const months = Math.min(Math.max(query.months ?? 6, 1), 24);

		const local = await this.computeLocalFinancials(from, to, months);
		const [mrrData, paygCreditsAvailable] = await Promise.all([
			this.computeMrr(),
			this.incidentCredits.count({
				where: { status: IncidentCreditStatus.AVAILABLE },
			}),
		]);

		let paystackPeriod: Awaited<
			ReturnType<AdminService["fetchPaystackPeriodStats"]>
		> | null = null;
		let paystackError: string | null = null;

		try {
			paystackPeriod = await this.fetchPaystackPeriodStats(from, to);
		} catch (error: any) {
			paystackError =
				error?.message || "Failed to fetch Paystack transactions";
		}

		return {
			currency: "NGN",
			range: { from, to },
			revenueSource: "local",
			note: "Revenue cards use the local payment ledger (source of truth). Paystack period totals are for reconciliation only. Wallet balance is separate from period revenue. Run POST /admin/financials/sync-paystack to backfill missing local rows.",
			summary: {
				revenueTotal: local.revenueTotal,
				revenueSubscription: local.revenueSubscription,
				revenuePayg: local.revenuePayg,
				successCount: local.successCount,
				failedCount: local.failedCount,
				pendingCount: local.pendingCount,
				mrr: mrrData.mrr,
				activeSubscribers: mrrData.activeSubscribers,
				paygCreditsAvailable,
			},
			local: {
				revenueTotal: local.revenueTotal,
				revenueSubscription: local.revenueSubscription,
				revenuePayg: local.revenuePayg,
				successCount: local.successCount,
				failedCount: local.failedCount,
				pendingCount: local.pendingCount,
			},
			paystackPeriod: paystackPeriod
				? {
						revenueTotal: paystackPeriod.revenueTotal,
						revenueSubscription: paystackPeriod.revenueSubscription,
						revenuePayg: paystackPeriod.revenuePayg,
						successCount: paystackPeriod.successCount,
						failedCount: paystackPeriod.failedCount,
						pendingCount: paystackPeriod.pendingCount,
						gapVsLocal:
							paystackPeriod.revenueTotal - local.revenueTotal,
					}
				: null,
			paystackError,
			revenueByMonth: local.revenueByMonth,
			recentTransactions: local.recentTransactions,
		};
	}

	async syncPaystackTransactions(query: {
		from?: string;
		to?: string;
	}) {
		const { from, to } = this.resolveDateRange(query.from, query.to);
		const fromStr = this.formatPaystackDate(from);
		const toStr = this.formatPaystackDate(to);

		let imported = 0;
		let updated = 0;
		let skipped = 0;
		const errors: string[] = [];

		let page = 1;
		const maxPages = 50;

		while (page <= maxPages) {
			const response = await this.paystack.listTransactions({
				page,
				perPage: 100,
				from: fromStr,
				to: toStr,
			});
			const rows: any[] = Array.isArray(response?.data)
				? response.data
				: [];
			if (!rows.length) break;

			for (const row of rows) {
				const reference = row.reference;
				if (!reference) {
					skipped += 1;
					continue;
				}

				const status = String(row.status || "").toLowerCase();
				const mappedStatus =
					status === "success"
						? TransactionStatus.SUCCESS
						: status === "failed"
							? TransactionStatus.FAILED
							: TransactionStatus.PENDING;

				try {
					const account = await this.resolveAccountForPaystackRow(row);
					if (!account) {
						skipped += 1;
						errors.push(
							`No local account for ${reference} (${row.customer?.email || "no email"})`,
						);
						continue;
					}

					const paymentType = this.resolvePaystackPaymentType(row);
					const meta = row.metadata || {};
					const { created } =
						await this.transactionsRepo.upsertByReference({
							accountId: account.id,
							subscriptionId: null,
							planId: meta.planId || null,
							transactionReference: reference,
							status: mappedStatus,
							amount: this.toNumber(row.amount),
							currency: row.currency || "NGN",
							paymentMethod:
								row.authorization?.channel || "Paystack",
							paystackCustomerCode:
								row.customer?.customer_code || null,
							metadata: {
								type:
									paymentType === PlanPaymentType.ONE_TIME
										? "payg"
										: "subscription",
								paymentType,
								paystackTransactionId: row.id,
								paidAt: row.paid_at || null,
								syncedFromPaystack: true,
								syncedAt: new Date().toISOString(),
							},
						});

					if (created) imported += 1;
					else updated += 1;
				} catch (error: any) {
					skipped += 1;
					errors.push(
						`${reference}: ${error?.message || "upsert failed"}`,
					);
				}
			}

			const pageCount = response?.meta?.pageCount;
			if (pageCount && page >= pageCount) break;
			if (rows.length < 100) break;
			page += 1;
		}

		return {
			from,
			to,
			imported,
			updated,
			skipped,
			errors: errors.slice(0, 50),
			message:
				"Local ledger synced from Paystack. Refresh financials overview — revenue now uses local rows.",
		};
	}

	private async resolveAccountForPaystackRow(row: any) {
		const meta = row?.metadata || {};
		if (meta.accountId) {
			const byId = await this.accountsRepo.findById(meta.accountId);
			if (byId) return byId;
		}
		const email = row?.customer?.email;
		if (email) {
			return this.accountsRepo.findByEmail(email);
		}
		return null;
	}

	private async computeLocalFinancials(
		from: Date,
		to: Date,
		months: number,
	) {
		const qb = this.transactions
			.createQueryBuilder("tx")
			.leftJoinAndSelect("tx.plan", "plan")
			.where("tx.created_at >= :from", { from })
			.andWhere("tx.created_at <= :to", { to });

		const txs = await qb.getMany();

		let revenueTotal = 0;
		let revenueSubscription = 0;
		let revenuePayg = 0;
		let successCount = 0;
		let failedCount = 0;
		let pendingCount = 0;

		const byMonth = new Map<
			string,
			{ subscription: number; payg: number; total: number }
		>();

		for (const tx of txs) {
			const amount = this.toNumber(tx.amount);
			const paymentType = this.resolveTxPaymentType(tx);

			if (tx.status === TransactionStatus.SUCCESS) {
				successCount += 1;
				revenueTotal += amount;
				if (paymentType === PlanPaymentType.ONE_TIME) {
					revenuePayg += amount;
				} else {
					revenueSubscription += amount;
				}

				const key = this.monthKey(tx.createdAt);
				const bucket = byMonth.get(key) ?? {
					subscription: 0,
					payg: 0,
					total: 0,
				};
				if (paymentType === PlanPaymentType.ONE_TIME) {
					bucket.payg += amount;
				} else {
					bucket.subscription += amount;
				}
				bucket.total += amount;
				byMonth.set(key, bucket);
			} else if (tx.status === TransactionStatus.FAILED) {
				failedCount += 1;
			} else {
				pendingCount += 1;
			}
		}

		const revenueByMonth = this.buildMonthSeries(months).map((month) => {
			const bucket = byMonth.get(month) ?? {
				subscription: 0,
				payg: 0,
				total: 0,
			};
			return { month, ...bucket };
		});

		const recent = await this.transactions.find({
			relations: {
				account: {
					individualProfile: true,
					organizationProfile: true,
				},
				plan: true,
			},
			order: { createdAt: "DESC" },
			take: 10,
		});

		return {
			revenueTotal,
			revenueSubscription,
			revenuePayg,
			successCount,
			failedCount,
			pendingCount,
			revenueByMonth,
			recentTransactions: recent.map((tx) => this.mapTransaction(tx)),
		};
	}

	private async fetchPaystackPeriodStats(from: Date, to: Date) {
		const fromStr = this.formatPaystackDate(from);
		const toStr = this.formatPaystackDate(to);

		let revenueTotal = 0;
		let revenueSubscription = 0;
		let revenuePayg = 0;
		let successCount = 0;
		let failedCount = 0;
		let pendingCount = 0;
		const byMonth = new Map<
			string,
			{ subscription: number; payg: number; total: number }
		>();
		const recent: Array<Record<string, unknown>> = [];

		let page = 1;
		const maxPages = 25;

		while (page <= maxPages) {
			const response = await this.paystack.listTransactions({
				page,
				perPage: 100,
				from: fromStr,
				to: toStr,
			});
			const rows: any[] = Array.isArray(response?.data)
				? response.data
				: [];
			if (!rows.length) break;

			for (const row of rows) {
				const amount = this.toNumber(row.amount);
				const status = String(row.status || "").toLowerCase();
				const paymentType = this.resolvePaystackPaymentType(row);
				const when = new Date(
					row.paid_at || row.created_at || Date.now(),
				);

				if (status === "success") {
					successCount += 1;
					revenueTotal += amount;
					if (paymentType === PlanPaymentType.ONE_TIME) {
						revenuePayg += amount;
					} else {
						revenueSubscription += amount;
					}

					const key = this.monthKey(when);
					const bucket = byMonth.get(key) ?? {
						subscription: 0,
						payg: 0,
						total: 0,
					};
					if (paymentType === PlanPaymentType.ONE_TIME) {
						bucket.payg += amount;
					} else {
						bucket.subscription += amount;
					}
					bucket.total += amount;
					byMonth.set(key, bucket);

					if (recent.length < 10) {
						recent.push({
							id: String(row.id),
							reference: row.reference,
							status: "success",
							amount,
							amountNaira: amount / 100,
							currency: row.currency || "NGN",
							paymentType,
							paymentMethod:
								row.authorization?.channel || "Paystack",
							accountId: null,
							accountEmail: row.customer?.email ?? null,
							accountName:
								[row.customer?.first_name, row.customer?.last_name]
									.filter(Boolean)
									.join(" ") || null,
							planId: null,
							planName: null,
							subscriptionId: null,
							createdAt: when,
							source: "paystack",
						});
					}
				} else if (status === "failed") {
					failedCount += 1;
				} else if (
					status === "abandoned" ||
					status === "ongoing" ||
					status === "pending" ||
					status === "processing"
				) {
					pendingCount += 1;
				}
			}

			const pageCount = response?.meta?.pageCount;
			if (pageCount && page >= pageCount) break;
			if (rows.length < 100) break;
			page += 1;
		}

		return {
			revenueTotal,
			revenueSubscription,
			revenuePayg,
			successCount,
			failedCount,
			pendingCount,
			byMonth,
			recent,
		};
	}

	private resolvePaystackPaymentType(row: any): PlanPaymentType {
		const meta = row?.metadata || {};
		const metaType = meta.type ?? meta.paymentType;
		if (
			metaType === "payg" ||
			metaType === "one_time" ||
			metaType === PlanPaymentType.ONE_TIME
		) {
			return PlanPaymentType.ONE_TIME;
		}
		return PlanPaymentType.SUBSCRIPTION;
	}

	private formatPaystackDate(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	async getFinancialsTransactions(query: FinancialsTransactionsQueryDto) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 10;
		const offset = (page - 1) * limit;

		const qb = this.transactions
			.createQueryBuilder("tx")
			.leftJoinAndSelect("tx.account", "account")
			.leftJoinAndSelect("account.individualProfile", "individualProfile")
			.leftJoinAndSelect(
				"account.organizationProfile",
				"organizationProfile",
			)
			.leftJoinAndSelect("tx.plan", "plan")
			.orderBy("tx.createdAt", "DESC");

		if (query.status) {
			qb.andWhere("tx.status = :status", { status: query.status });
		}

		if (query.from) {
			qb.andWhere("tx.created_at >= :from", {
				from: new Date(query.from),
			});
		}

		if (query.to) {
			const to = new Date(query.to);
			to.setHours(23, 59, 59, 999);
			qb.andWhere("tx.created_at <= :to", { to });
		}

		if (query.search?.trim()) {
			const search = `%${query.search.toLowerCase().trim()}%`;
			qb.andWhere(
				"(LOWER(account.email) LIKE :search OR LOWER(tx.transaction_reference) LIKE :search OR LOWER(individualProfile.first_name) LIKE :search OR LOWER(individualProfile.last_name) LIKE :search OR LOWER(organizationProfile.organization_name) LIKE :search)",
				{ search },
			);
		}

		if (query.paymentType === PlanPaymentType.ONE_TIME) {
			qb.andWhere(
				`(
					tx.metadata->>'type' = 'payg'
					OR tx.metadata->>'paymentType' IN ('payg', 'one_time')
					OR plan.payment_type = :oneTime
					OR (tx.subscription_id IS NULL AND (plan.id IS NULL OR plan.payment_type = :oneTime))
				)`,
				{ oneTime: PlanPaymentType.ONE_TIME },
			);
		} else if (query.paymentType === PlanPaymentType.SUBSCRIPTION) {
			qb.andWhere(
				`(
					COALESCE(tx.metadata->>'type', '') <> 'payg'
					AND COALESCE(tx.metadata->>'paymentType', '') NOT IN ('payg', 'one_time')
					AND (
						plan.payment_type = :subscription
						OR (tx.subscription_id IS NOT NULL AND (plan.id IS NULL OR plan.payment_type IS DISTINCT FROM :oneTime))
					)
				)`,
				{
					subscription: PlanPaymentType.SUBSCRIPTION,
					oneTime: PlanPaymentType.ONE_TIME,
				},
			);
		}

		const [rows, total] = await qb.skip(offset).take(limit).getManyAndCount();

		return {
			transactions: rows.map((tx) => this.mapTransaction(tx)),
			total,
		};
	}

	async getPaystackBalance() {
		const response = await this.paystack.getBalance();
		const balances = Array.isArray(response?.data) ? response.data : [];
		return {
			source: "paystack",
			balances: balances.map((row: any) => ({
				currency: row.currency,
				balance: row.balance,
				balanceNaira: this.toNumber(row.balance) / 100,
			})),
		};
	}

	async getPaystackSettlements(query: PaystackSettlementsQueryDto) {
		const response = await this.paystack.listSettlements({
			page: query.page ?? 1,
			perPage: query.perPage ?? 20,
			from: query.from,
			to: query.to,
		});

		const settlements = Array.isArray(response?.data) ? response.data : [];
		return {
			source: "paystack",
			settlements: settlements.map((row: any) => ({
				id: row.id,
				status: row.status,
				currency: row.currency,
				totalAmount: row.total_amount,
				totalAmountNaira: this.toNumber(row.total_amount) / 100,
				effectiveAmount: row.effective_amount,
				settlementDate: row.settlement_date,
				deductedAmount: row.deducted_amount,
				settlementFee: row.settlement_fees ?? row.fee,
			})),
			meta: response?.meta ?? null,
		};
	}

	private async computeMrr(): Promise<{
		mrr: number;
		activeSubscribers: number;
	}> {
		const active = await this.subscriptions.find({
			where: { status: SubscriptionStatus.ACTIVE },
			relations: ["plan"],
		});

		const recurring = active.filter(
			(sub) =>
				sub.plan?.paymentType !== PlanPaymentType.ONE_TIME &&
				sub.plan?.interval != null,
		);

		const mrr = recurring.reduce(
			(sum, sub) => sum + this.toNumber(sub.plan?.amount ?? 0),
			0,
		);

		return { mrr, activeSubscribers: recurring.length };
	}

	private resolveTxPaymentType(
		tx: SubscriptionTransaction,
	): PlanPaymentType {
		const metaType = tx.metadata?.type ?? tx.metadata?.paymentType;
		if (
			metaType === "payg" ||
			metaType === PlanPaymentType.ONE_TIME ||
			metaType === "one_time"
		) {
			return PlanPaymentType.ONE_TIME;
		}
		if (tx.plan?.paymentType === PlanPaymentType.ONE_TIME) {
			return PlanPaymentType.ONE_TIME;
		}
		if (tx.plan?.paymentType === PlanPaymentType.SUBSCRIPTION) {
			return PlanPaymentType.SUBSCRIPTION;
		}
		if (!tx.subscriptionId) {
			return PlanPaymentType.ONE_TIME;
		}
		return PlanPaymentType.SUBSCRIPTION;
	}

	private mapTransaction(tx: SubscriptionTransaction) {
		const paymentType = this.resolveTxPaymentType(tx);
		const amount = this.toNumber(tx.amount);
		return {
			id: tx.id,
			reference: tx.transactionReference,
			status: tx.status,
			amount,
			amountNaira: amount / 100,
			currency: tx.currency,
			paymentType,
			paymentMethod: tx.paymentMethod,
			accountId: tx.accountId,
			accountEmail: tx.account?.email ?? null,
			accountName: tx.account
				? this.accountDisplayName(tx.account)
				: null,
			planId: tx.planId,
			planName: tx.plan?.name ?? null,
			subscriptionId: tx.subscriptionId,
			createdAt: tx.createdAt,
		};
	}

	private accountDisplayName(account: Account): string {
		if (account.individualProfile?.firstName) {
			const last = account.individualProfile.lastName?.trim();
			return last
				? `${account.individualProfile.firstName} ${last}`
				: account.individualProfile.firstName;
		}
		if (account.organizationProfile?.organizationName) {
			return account.organizationProfile.organizationName;
		}
		return account.email;
	}

	private resolveDateRange(from?: string, to?: string): {
		from: Date;
		to: Date;
	} {
		const end = to ? new Date(to) : new Date();
		end.setHours(23, 59, 59, 999);
		const start = from
			? new Date(from)
			: new Date(end.getFullYear(), end.getMonth() - 5, 1);
		start.setHours(0, 0, 0, 0);
		return { from: start, to: end };
	}

	private monthKey(date: Date): string {
		const d = new Date(date);
		const month = `${d.getMonth() + 1}`.padStart(2, "0");
		return `${d.getFullYear()}-${month}`;
	}

	private buildMonthSeries(months: number): string[] {
		const keys: string[] = [];
		const now = new Date();
		for (let i = months - 1; i >= 0; i -= 1) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			keys.push(this.monthKey(d));
		}
		return keys;
	}

	private toNumber(value: number | string | null | undefined): number {
		if (value === null || value === undefined) return 0;
		const n = typeof value === "string" ? Number(value) : value;
		return Number.isFinite(n) ? n : 0;
	}
}
