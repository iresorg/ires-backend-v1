import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "./account.entity";

@Entity({ name: "individual_profiles" })
export class IndividualProfile extends BaseEntity {
	@Column({ type: "varchar", name: "first_name" })
	firstName: string;

	@Column({ type: "varchar", name: "last_name" })
	lastName: string;

	@Column({ type: "varchar", name: "phone_number" })
	phoneNumber: string;

	@Column({ type: "varchar", name: "profile_picture", nullable: true })
	profilePicture?: string | null;

	@OneToOne(() => Account, (a) => a.individualProfile, {
		onDelete: "CASCADE",
	})
	@JoinColumn({ name: "user_id" })
	account: Account;
}
