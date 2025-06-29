import {
	Column,
	CreateDateColumn,
	Entity,
	OneToOne,
	PrimaryGeneratedColumn,
	JoinColumn,
	UpdateDateColumn,
} from "typeorm";
import { Responder } from "./responder.entity";

@Entity("responder_tokens")
export class ResponderToken {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", unique: true })
	responderId: string;

	@OneToOne(() => Responder)
	@JoinColumn({ name: "responderId" })
	responder: Responder;

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
