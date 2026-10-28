import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { User } from "@/modules/users/entities/user.entity";

@Entity({ name: "user_password_resets" })
export class UserPasswordReset extends BaseEntity {
	@ManyToOne(() => User, { onDelete: "CASCADE" })
	@JoinColumn({ name: "user_id" })
	user: User;

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
