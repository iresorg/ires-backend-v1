import { Entity, Column, Index, OneToOne } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { IndividualProfile } from "./individual-profile.entity";
import { OrganizationProfile } from "./organization-profile.entity";

@Entity({ name: "accounts" })
export class Account extends BaseEntity {
	@Index({ unique: true })
	@Column({ type: "varchar", unique: true })
	email: string;

	@Column({ type: "varchar", name: "password_hash" })
	passwordHash: string;

	// "individual" | "organization" stored as string for future flexibility
	@Index()
	@Column({ type: "varchar" })
	role: string;

	// e.g., "active" | "suspended"; stored as string
	@Index()
	@Column({ type: "varchar", default: "active" })
	status: string;

	@Column({ type: "timestamptz", name: "email_verified_at", nullable: true })
	emailVerifiedAt: Date | null;

	@Column({ type: "timestamptz", name: "last_login", nullable: true })
	lastLogin: Date | null;

	@OneToOne(() => IndividualProfile, (p) => p.account)
	individualProfile?: IndividualProfile;

	@OneToOne(() => OrganizationProfile, (p) => p.account)
	organizationProfile?: OrganizationProfile;
}
