import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "./account.entity";

@Entity({ name: "organization_profiles" })
export class OrganizationProfile extends BaseEntity {
	@OneToOne(() => Account, (a) => a.organizationProfile, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "user_id" })
	account: Account;

	@Column({ type: "varchar", name: "organization_name" })
	organizationName: string;

	@Column({ type: "varchar", name: "logo_url", nullable: true })
	logoUrl?: string | null;

	@Column({ type: "varchar", name: "industry_type" })
	industryType: string;

	@Column({ type: "varchar", name: "company_size" })
	companySize: string;

	@Column({ type: "varchar", name: "business_address" })
	businessAddress: string;

	@Column({ type: "varchar" })
	city: string;

	@Column({ type: "varchar" })
	state: string;

	@Column({ type: "varchar" })
	country: string;

	@Column({ type: "varchar", name: "phone_number" })
	phoneNumber: string;

	// Primary contact person details
	@Column({ type: "varchar", name: "primary_contact_first_name" })
	primaryContactFirstName: string;

	@Column({ type: "varchar", name: "primary_contact_last_name" })
	primaryContactLastName: string;

	@Column({ type: "varchar", name: "primary_contact_job_title" })
	primaryContactJobTitle: string;

	@Index()
	@Column({ type: "varchar", name: "primary_contact_email" })
	primaryContactEmail: string;

	@Column({ type: "varchar", name: "primary_contact_phone_number" })
	primaryContactPhoneNumber: string;
}
