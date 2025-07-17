import { BaseEntity } from "@/shared/entity/base.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { TicketCategory } from "./ticket-category.entity";

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
}
