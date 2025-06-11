import {
	Column,
	CreateDateColumn,
	Entity,
	OneToOne,
	PrimaryGeneratedColumn,
	JoinColumn,
} from "typeorm";
import { Agent } from "@agents/entities/agent.entity";

@Entity("agent_tokens")
export class AgentToken {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ unique: true })
	agentId: string;

	@OneToOne(() => Agent, (agent) => agent.token)
	@JoinColumn({ name: "agentId" })
	agent: Agent;

	@Column()
	tokenHash: string;

	@CreateDateColumn()
	createdAt: Date;

	@Column()
	expiresAt: Date;

	@Column({ default: false })
	isRevoked: boolean;
}
