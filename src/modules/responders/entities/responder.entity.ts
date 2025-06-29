import { Column, CreateDateColumn, Entity, UpdateDateColumn } from "typeorm";
import { ResponderType } from "../enums/responder-type.enum";

@Entity("responders")
export class Responder {
	@Column({ primary: true, type: "varchar", unique: true })
	responderId: string;

	@Column({
		type: "varchar",
		enum: ResponderType,
		default: ResponderType.TIER1,
	})
	type: ResponderType;

	@Column({ default: true })
	isActive: boolean;

	@Column({ default: false })
	isOnline: boolean;

	@Column({ nullable: true, type: "timestamp" })
	lastSeen: Date | null;

	@Column({ nullable: true, type: "timestamp" })
	lastStatusChangeAt: Date | null;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
