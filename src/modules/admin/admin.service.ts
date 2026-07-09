import { Injectable } from "@nestjs/common";
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
import { User } from "../users/entities/user.entity";
import { Account } from "../accounts/entities/account.entity";
import { Tickets } from "../tickets/entities/ticket.entity";
import { TicketLifecycle } from "../tickets/entities/ticket-lifecycle.entity";
import { Role } from "../users/enums/role.enum";
import { TicketStatus } from "../tickets/interfaces/ticket.interface";

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
}
