import { Module } from "@nestjs/common";
import { TicketsService } from "./service";
import { TicketsRepository } from "./repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tickets } from "./entities/ticket.entity";
import constants from "./constant";
import { TicketsController } from "./controller";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";
import { UsersModule } from "@/modules/users/users.module";
import { AgentsModule } from "../agents/agents.module";
import { RespondersModule } from "../responders/responders.module";
import { EmailModule } from "@/shared/email/module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Tickets, TicketLifecycle]),
		UsersModule,
		AgentsModule,
		RespondersModule,
		EmailModule,
	],
	providers: [
		TicketsService,
		{
			provide: constants.TICKET_REPOSITORY,
			useClass: TicketsRepository,
		},
	],
	controllers: [TicketsController],
	exports: [TicketsService],
})
export class TicketsModule {}
