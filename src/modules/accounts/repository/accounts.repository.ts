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
}
