import { Column, CreateDateColumn, Entity, UpdateDateColumn } from "typeorm";

@Entity("agents")
export class Agent {
	@Column({ primary: true })
	agentId: string;

	@Column({ default: true })
	isActive: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
