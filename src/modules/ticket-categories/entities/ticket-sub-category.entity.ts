import { BaseEntity } from "@/shared/entity/base.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { TicketCategory } from "./ticket-category.entity";
import { Tickets } from "@/modules/tickets/entities/ticket.entity";

@Entity()
export class TicketSubCategory extends BaseEntity {
	@Column("varchar")
	name: string;

	@ManyToOne(() => TicketCategory, (tc) => tc.subCategories, {
		onDelete: "CASCADE",
	})
	@JoinColumn({
		name: "category_id",
		foreignKeyConstraintName: "fk_ticket_category_id",
	})
	category: TicketCategory;

	@OneToMany(() => Tickets, (t) => t.subCategory)
	tickets: Tickets[];
}
