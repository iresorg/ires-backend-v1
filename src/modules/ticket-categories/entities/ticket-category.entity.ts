import { BaseEntity } from "@/shared/entity/base.entity";
import { Column, Entity, OneToMany } from "typeorm";
import { TicketSubCategory } from "./ticket-sub-category.entity";
import { Tickets } from "@/modules/tickets/entities/ticket.entity";

@Entity()
export class TicketCategory extends BaseEntity {
	@Column("varchar")
	name: string;

	@OneToMany(() => TicketSubCategory, (tsc) => tsc.category)
	subCategories: TicketSubCategory[];

	@OneToMany(() => Tickets, (t) => t.category)
	tickets: Tickets[];
}
