import {
	Column,
	CreateDateColumn,
	Entity,
	OneToOne,
	PrimaryGeneratedColumn,
	JoinColumn,
	UpdateDateColumn,
} from "typeorm";
import { Agent } from "@agents/entities/agent.entity";

@Entity("agent_tokens")
export class AgentToken {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", unique: true })
	agentId: string;

	@OneToOne(() => Agent)
	@JoinColumn({ name: "agentId" })
	agent: Agent;

	@Column()
	tokenHash: string;

	@Column()
	encryptedToken: string;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@Column()
	expiresAt: Date;

	@Column({ default: false })
	isRevoked: boolean;
}
