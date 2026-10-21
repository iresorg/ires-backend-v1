import { Entity, Column } from "typeorm";
import { Status } from "../enums/status.enum";
import { Role } from "../enums/role.enum";
import { BaseEntity } from "@/shared/entity/base.entity";

@Entity("users")
export class User extends BaseEntity {
	@Column("varchar", { name: "first_name" })
	firstName: string;

	@Column("varchar", { name: "last_name" })
	lastName: string;

	@Column({ type: "varchar", unique: true })
	email: string;

	@Column("varchar")
	password: string;

	@Column({
		type: "varchar",
	})
	role: Role;

	@Column({
		type: "varchar",
		default: Status.ACTIVE,
	})
	status: Status;

	@Column({ type: "varchar", nullable: true, name: "last_login" })
	lastLogin: Date;

	/** Bumped on logout and password change so previously issued JWTs are rejected. */
	@Column({ type: "int", name: "token_version", default: 0 })
	tokenVersion: number;

	/** True when the user still has a temporary password from account creation. */
	@Column({ type: "boolean", name: "must_change_password", default: false })
	mustChangePassword: boolean;

	@Column({ nullable: true, type: "jsonb" })
	avatar: {
		publicId: string;
		url: string;
	};
}
