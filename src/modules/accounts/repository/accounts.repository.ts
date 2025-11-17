import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Account } from "../entities/account.entity";
import { IndividualProfile } from "../entities/individual-profile.entity";
import { OrganizationProfile } from "../entities/organization-profile.entity";
import { AccountEmailVerification } from "../entities/email-verification.entity";
import { AccountPasswordReset } from "../entities/password-reset.entity";

@Injectable()
export class AccountsRepository {
	constructor(
		@InjectRepository(Account)
		private readonly accounts: Repository<Account>,
		@InjectRepository(IndividualProfile)
		private readonly individualProfiles: Repository<IndividualProfile>,
		@InjectRepository(OrganizationProfile)
		private readonly organizationProfiles: Repository<OrganizationProfile>,
		@InjectRepository(AccountEmailVerification)
		private readonly emailVerifications: Repository<AccountEmailVerification>,
		@InjectRepository(AccountPasswordReset)
		private readonly passwordResets: Repository<AccountPasswordReset>,
	) {}

	async findByEmail(email: string): Promise<Account | null> {
		return await this.accounts.findOne({ where: { email } });
	}

	async findById(id: string): Promise<Account | null> {
		return await this.accounts.findOne({
			where: { id },
			relations: ["individualProfile", "organizationProfile"],
		});
	}

	async createAccount(input: Partial<Account>): Promise<Account> {
		const entity = this.accounts.create(input);
		return await this.accounts.save(entity);
	}

	async updateLastLogin(id: string, when: Date): Promise<void> {
		await this.accounts.update({ id }, { lastLogin: when });
	}

	async createIndividualProfile(
		input: Partial<IndividualProfile>,
	): Promise<IndividualProfile> {
		const entity = this.individualProfiles.create(input);
		return await this.individualProfiles.save(entity);
	}

	async createOrganizationProfile(
		input: Partial<OrganizationProfile>,
	): Promise<OrganizationProfile> {
		const entity = this.organizationProfiles.create(input);
		return await this.organizationProfiles.save(entity);
	}

	async createEmailVerification(input: Partial<AccountEmailVerification>) {
		const entity = this.emailVerifications.create(input);
		return await this.emailVerifications.save(entity);
	}

	async findValidEmailVerification(
		accountId: string,
		email: string,
		otp: string,
	) {
		return await this.emailVerifications.findOne({
			where: { account: { id: accountId }, email, otp, used: false },
		});
	}

	async markEmailVerificationUsed(id: string) {
		await this.emailVerifications.update({ id }, { used: true });
	}

	async createPasswordReset(input: Partial<AccountPasswordReset>) {
		const entity = this.passwordResets.create(input);
		return await this.passwordResets.save(entity);
	}

	async findValidPasswordReset(email: string, token: string) {
		return await this.passwordResets.findOne({
			where: { email, token, used: false },
		});
	}

	async markPasswordResetUsed(id: string) {
		await this.passwordResets.update({ id }, { used: true });
	}

	async updatePassword(accountId: string, passwordHash: string) {
		await this.accounts.update({ id: accountId }, { passwordHash });
	}

	async updateIndividualProfile(
		accountId: string,
		data: Partial<IndividualProfile>,
	) {
		await this.individualProfiles.update(
			{ account: { id: accountId } },
			data,
		);
	}

	async updateOrganizationProfile(
		accountId: string,
		data: Partial<OrganizationProfile>,
	) {
		await this.organizationProfiles.update(
			{ account: { id: accountId } },
			data,
		);
	}

	async findAllWithFilters(options: {
		search?: string;
		role?: "individual" | "organization";
		emailVerified?: "verified" | "not_verified";
		joinedDateFrom?: Date;
		joinedDateTo?: Date;
		limit?: number;
		offset?: number;
	}): Promise<{ accounts: Account[]; total: number }> {
		const queryBuilder = this.accounts
			.createQueryBuilder("account")
			.leftJoinAndSelect("account.individualProfile", "individualProfile")
			.leftJoinAndSelect(
				"account.organizationProfile",
				"organizationProfile",
			);

		// Search by name or email
		if (options.search) {
			const searchTerm = `%${options.search.toLowerCase()}%`;
			queryBuilder.where(
				"(LOWER(account.email) LIKE :search OR LOWER(individualProfile.first_name) LIKE :search OR LOWER(individualProfile.last_name) LIKE :search OR LOWER(organizationProfile.organization_name) LIKE :search)",
				{ search: searchTerm },
			);
		}

		// Filter by role
		if (options.role) {
			if (options.search) {
				queryBuilder.andWhere("account.role = :role", {
					role: options.role,
				});
			} else {
				queryBuilder.where("account.role = :role", {
					role: options.role,
				});
			}
		}

		// Filter by email verification
		if (options.emailVerified === "verified") {
			if (options.search || options.role) {
				queryBuilder.andWhere("account.email_verified_at IS NOT NULL");
			} else {
				queryBuilder.where("account.email_verified_at IS NOT NULL");
			}
		} else if (options.emailVerified === "not_verified") {
			if (options.search || options.role) {
				queryBuilder.andWhere("account.email_verified_at IS NULL");
			} else {
				queryBuilder.where("account.email_verified_at IS NULL");
			}
		}

		// Filter by joined date range
		if (options.joinedDateFrom) {
			if (options.search || options.role || options.emailVerified) {
				queryBuilder.andWhere("account.created_at >= :joinedDateFrom", {
					joinedDateFrom: options.joinedDateFrom,
				});
			} else {
				queryBuilder.where("account.created_at >= :joinedDateFrom", {
					joinedDateFrom: options.joinedDateFrom,
				});
			}
		}

		if (options.joinedDateTo) {
			if (
				options.search ||
				options.role ||
				options.emailVerified ||
				options.joinedDateFrom
			) {
				queryBuilder.andWhere("account.created_at <= :joinedDateTo", {
					joinedDateTo: options.joinedDateTo,
				});
			} else {
				queryBuilder.where("account.created_at <= :joinedDateTo", {
					joinedDateTo: options.joinedDateTo,
				});
			}
		}

		// Get total count before applying pagination
		const total = await queryBuilder.getCount();

		// Apply pagination
		if (options.limit !== undefined) {
			queryBuilder.take(options.limit);
		}
		if (options.offset !== undefined) {
			queryBuilder.skip(options.offset);
		}

		// Order by createdAt (property name, not column name)
		queryBuilder.orderBy("account.createdAt", "DESC");

		const accounts = await queryBuilder.getMany();

		return { accounts, total };
	}

	async findSubscribersWithFilters(options: {
		search?: string;
		status?: string;
		planId?: string;
		limit?: number;
		offset?: number;
	}): Promise<{ accounts: Account[]; total: number }> {
		const queryBuilder = this.accounts
			.createQueryBuilder("account")
			.leftJoinAndSelect("account.individualProfile", "individualProfile")
			.leftJoinAndSelect(
				"account.organizationProfile",
				"organizationProfile",
			)
			.innerJoin(
				"subscriptions",
				"subscription",
				"subscription.account_id = account.id",
			)
			.leftJoin("subscription.plan", "plan");

		// Search by name or email
		if (options.search) {
			const searchTerm = `%${options.search.toLowerCase()}%`;
			queryBuilder.where(
				"(LOWER(account.email) LIKE :search OR LOWER(individualProfile.first_name) LIKE :search OR LOWER(individualProfile.last_name) LIKE :search OR LOWER(organizationProfile.organization_name) LIKE :search)",
				{ search: searchTerm },
			);
		}

		// Filter by subscription status
		if (options.status) {
			if (options.search) {
				queryBuilder.andWhere("subscription.status = :status", {
					status: options.status,
				});
			} else {
				queryBuilder.where("subscription.status = :status", {
					status: options.status,
				});
			}
		}

		// Filter by plan
		if (options.planId) {
			if (options.search || options.status) {
				queryBuilder.andWhere("subscription.plan_id = :planId", {
					planId: options.planId,
				});
			} else {
				queryBuilder.where("subscription.plan_id = :planId", {
					planId: options.planId,
				});
			}
		}

		// Get total count before applying pagination
		const total = await queryBuilder.getCount();

		// Apply pagination
		if (options.limit !== undefined) {
			queryBuilder.take(options.limit);
		}
		if (options.offset !== undefined) {
			queryBuilder.skip(options.offset);
		}

		// Order by createdAt (property name, not column name)
		queryBuilder.orderBy("subscription.createdAt", "DESC");

		const accounts = await queryBuilder.getMany();

		return { accounts, total };
	}
}
