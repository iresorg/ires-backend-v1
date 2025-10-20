import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "./account.entity";

@Entity({ name: "account_password_resets" })
export class AccountPasswordReset extends BaseEntity {
	@ManyToOne(() => Account, { onDelete: "CASCADE" })
	account: Account;

	@Index()
	@Column({ type: "varchar" })
	email: string;

	@Index()
	@Column({ type: "varchar" })
	token: string;

	@Index()
	@Column({ type: "timestamptz", name: "expires_at" })
	expiresAt: Date;

	@Index()
	@Column({ type: "boolean", default: false })
	used: boolean;
}
