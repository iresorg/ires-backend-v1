import { Module } from "@nestjs/common";
import { TicketCategoriesService } from "./ticket-categories.service";
import { TicketCategoriesController } from "./ticket-categories.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TicketCategory } from "./entities/ticket-category.entity";
import { TicketSubCategory } from "./entities/ticket-sub-category.entity";
import { TicketCategoryRepository } from "./repository";
import { UsersModule } from "../users/users.module";
import { AgentsModule } from "../agents/agents.module";
import { RespondersModule } from "../responders/responders.module";
import { DatabaseModule } from "@/shared/database/datasource";

@Module({
	imports: [
		TypeOrmModule.forFeature([TicketCategory, TicketSubCategory]),
		UsersModule,
		AgentsModule,
		RespondersModule,
		DatabaseModule,
	],
	providers: [TicketCategoriesService, TicketCategoryRepository],
	controllers: [TicketCategoriesController],
})
export class TicketCategoriesModule {}
