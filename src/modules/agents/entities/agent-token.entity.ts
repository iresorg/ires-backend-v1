import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from '@agents/entities/agent.entity';

@Entity('agent_tokens')
export class AgentToken {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => Agent, (agent) => agent.tokens)
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
