import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "./account.entity";

@Entity({ name: "account_email_verifications" })
export class AccountEmailVerification extends BaseEntity {
	@ManyToOne(() => Account, { onDelete: "CASCADE" })
	account: Account;

	@Index()
	@Column({ type: "varchar" })
	email: string;

	@Column({ type: "varchar" })
	otp: string;

	@Index()
	@Column({ type: "timestamptz", name: "expires_at" })
	expiresAt: Date;

	@Index()
	@Column({ type: "boolean", default: false })
	used: boolean;
}
