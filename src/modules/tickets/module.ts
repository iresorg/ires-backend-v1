import { Module } from "@nestjs/common";
import { TicketsService } from "./service";
import { TicketsRepository } from "./repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tickets } from "./entities/ticket.entity";
import { TicketsController } from "./controller";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";
import { UsersModule } from "@/modules/users/users.module";
import { AgentsModule } from "../agents/agents.module";
import { RespondersModule } from "../responders/responders.module";
import { EmailModule } from "@/shared/email/module";
import { TicketLifecycleRepository } from "./ticket-lifecycle.repository";
import { DatabaseModule } from "@/shared/database/datasource";

@Module({
	imports: [
		TypeOrmModule.forFeature([Tickets, TicketLifecycle]),
		UsersModule,
		AgentsModule,
		RespondersModule,
		EmailModule,
		DatabaseModule,
	],
	providers: [TicketsService, TicketsRepository, TicketLifecycleRepository],
	controllers: [TicketsController],
	exports: [TicketsService],
})
export class TicketsModule {}
