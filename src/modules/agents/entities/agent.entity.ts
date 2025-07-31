import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { AgentToken } from '@agents/entities/agent-token.entity';

@Entity('agents')
export class Agent {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ nullable: true })
	userId: string;

	@Column({ default: true })
	isActive: boolean;

	@OneToMany(() => AgentToken, (token) => token.agent)
	tokens: AgentToken[];

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
