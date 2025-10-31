import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";

@Entity({ name: "paystack_events" })
export class PaystackEvent extends BaseEntity {
	@Index()
	@Column({ type: "varchar", name: "event_type" })
	eventType: string;

	@Index()
	@Column({ type: "varchar", nullable: true })
	reference: string | null;

	@Index()
	@Column({ type: "varchar", name: "paystack_event_id" })
	paystackEventId: string;

	@Column({ type: "jsonb" })
	data: Record<string, any>;

	@Index()
	@Column({ type: "boolean", default: false })
	processed: boolean;

	@Column({ type: "timestamptz", name: "processed_at", nullable: true })
	processedAt: Date | null;
}
