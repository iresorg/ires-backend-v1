import {
	Column,
	CreateDateColumn,
	Entity,
	OneToOne,
	UpdateDateColumn,
} from "typeorm";
import { AgentToken } from "@agents/entities/agent-token.entity";

@Entity("agents")
export class Agent {
	@Column({ primary: true })
	agentId: string;

	@Column({ default: true })
	isActive: boolean;

	@OneToOne(() => AgentToken, (token) => token.agent)
	token: AgentToken;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
