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
import { PaystackService } from "../subscriptions/services/paystack.service";

@Injectable()
export class AdminService {
	constructor(
		private readonly accountsRepo: AccountsRepository,
		@InjectRepository(Subscription)
		private readonly subscriptions: Repository<Subscription>,
		@InjectRepository(User)
		private readonly users: Repository<User>,
		@InjectRepository(Account)
		private readonly accounts: Repository<Account>,
		@InjectRepository(Tickets)
		private readonly tickets: Repository<Tickets>,
		@InjectRepository(TicketLifecycle)
		private readonly ticketLifecycle: Repository<TicketLifecycle>,
		private readonly subscriptionsRepo: SubscriptionsRepository,
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
		const { search, status, planId, page, limit } = query;

		const offset = page && limit ? (page - 1) * limit : undefined;

		// Query subscriptions directly with account relations
		const queryBuilder = this.subscriptions
			.createQueryBuilder("subscription")
			.leftJoinAndSelect("subscription.account", "account")
			.leftJoinAndSelect("account.individualProfile", "individualProfile")
			.leftJoinAndSelect(
				"account.organizationProfile",
				"organizationProfile",
			)
			.leftJoinAndSelect("subscription.plan", "plan");

		// Search by name or email
		if (search) {
			const searchTerm = `%${search.toLowerCase()}%`;
			queryBuilder.where(
				"(LOWER(account.email) LIKE :search OR LOWER(individualProfile.first_name) LIKE :search OR LOWER(individualProfile.last_name) LIKE :search OR LOWER(organizationProfile.organization_name) LIKE :search)",
				{ search: searchTerm },
			);
		}

		// Filter by subscription status
		if (status) {
			if (search) {
				queryBuilder.andWhere("subscription.status = :status", {
					status,
				});
			} else {
				queryBuilder.where("subscription.status = :status", {
					status,
				});
			}
		}

		// Filter by plan
		if (planId) {
			if (search || status) {
				queryBuilder.andWhere("subscription.planId = :planId", {
					planId,
				});
			} else {
				queryBuilder.where("subscription.planId = :planId", {
					planId,
				});
			}
		}

		// Get total count before applying pagination
		const total = await queryBuilder.getCount();

		// Apply pagination
		if (limit !== undefined) {
			queryBuilder.take(limit);
		}
		if (offset !== undefined) {
			queryBuilder.skip(offset);
		}

		// Order by createdAt (property name, not column name)
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

	async getSubscriptionPlans() {
		return await this.subscriptionsRepo.findAllPlansForAdmin();
	}

	async createSubscriptionPlan(dto: CreateSubscriptionPlanDto) {
		let paystackPlanCode = dto.paystackPlanCode;
		if (paystackPlanCode) {
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
				interval: dto.interval ?? "monthly",
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
			amount: dto.amount,
			currency: dto.currency ?? "NGN",
			interval: dto.interval ?? "monthly",
			paystackPlanCode,
			description: dto.description,
			features: dto.features,
			maxIncidents: dto.maxIncidents ?? null,
			active: dto.active ?? true,
		});
	}

	async updateSubscriptionPlan(id: string, dto: UpdateSubscriptionPlanDto) {
		const plan = await this.subscriptionsRepo.findPlanById(id);
		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		if (
			dto.paystackPlanCode &&
			dto.paystackPlanCode !== plan.paystackPlanCode
		) {
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
		const nextInterval = dto.interval ?? plan.interval;
		const nextCurrency = dto.currency ?? plan.currency;
		const nextDescription = dto.description ?? plan.description;
		const paystackPlanCode =
			dto.paystackPlanCode ?? plan.paystackPlanCode;

		const shouldSyncPaystack =
			dto.amount !== undefined ||
			dto.name !== undefined ||
			dto.interval !== undefined ||
			dto.description !== undefined;

		if (shouldSyncPaystack && paystackPlanCode) {
			await this.paystack.updatePlan(paystackPlanCode, {
				name: nextName,
				interval: nextInterval,
				amount: nextAmount,
				currency: nextCurrency,
				description: nextDescription,
				update_existing_subscriptions: false,
			});
		}

		await this.subscriptionsRepo.updatePlan(id, {
			...(dto.name !== undefined && { name: dto.name }),
			...(dto.tier !== undefined && { tier: dto.tier }),
			...(dto.accountType !== undefined && {
				accountType: dto.accountType,
			}),
			...(dto.amount !== undefined && { amount: dto.amount }),
			...(dto.currency !== undefined && { currency: dto.currency }),
			...(dto.interval !== undefined && { interval: dto.interval }),
			...(dto.paystackPlanCode !== undefined && {
				paystackPlanCode: dto.paystackPlanCode,
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

		const subscriberCount =
			await this.subscriptionsRepo.countSubscriptionsByPlanId(id);
		if (subscriberCount > 0) {
			await this.subscriptionsRepo.updatePlan(id, { active: false });
			return {
				message:
					"Plan has existing subscribers, so it was deactivated instead of deleted",
				id,
				active: false,
			};
		}

		await this.subscriptionsRepo.deletePlan(id);
		return { message: "Subscription plan deleted", id };
	}
}
