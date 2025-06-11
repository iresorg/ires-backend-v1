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

	@Column({ nullable: true, type: "varchar" })
	avatar: string;
}
