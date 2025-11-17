import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountsRepository } from "../accounts/repository/accounts.repository";
import { Subscription } from "../subscriptions/entities/subscription.entity";
import { UsersQueryDto } from "./dto/users-query.dto";
import { SubscribersQueryDto } from "./dto/subscribers-query.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { SubscriberResponseDto } from "./dto/subscriber-response.dto";

@Injectable()
export class AdminService {
	constructor(
		private readonly accountsRepo: AccountsRepository,
		@InjectRepository(Subscription)
		private readonly subscriptions: Repository<Subscription>,
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
}
