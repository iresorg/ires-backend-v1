import { Column, CreateDateColumn, Entity, UpdateDateColumn } from "typeorm";

@Entity("agents")
export class Agent {
	@Column({ primary: true, type: "varchar", unique: true })
	agentId: string;

	@Column({ default: true })
	isActive: boolean;

	@Column({ nullable: true, type: "timestamp" })
	lastSeen: Date | null;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
