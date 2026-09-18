import { Module } from "@nestjs/common";
import { TicketsService } from "./service";
import { TicketsRepository } from "./repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tickets } from "./entities/ticket.entity";
import { TicketsController } from "./controller";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";
import { UsersModule } from "@/modules/users/users.module";
import { EmailModule } from "@/shared/email/module";
import { TicketLifecycleRepository } from "./ticket-lifecycle.repository";
import { DatabaseModule } from "@/shared/database/datasource";
import { FileUploadModule } from "../file-upload/module";
import { AccountsModule } from "../accounts/accounts.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Tickets, TicketLifecycle]),
		UsersModule,
		EmailModule,
		DatabaseModule,
		FileUploadModule,
		AccountsModule,
		SubscriptionsModule,
	],
	providers: [TicketsService, TicketsRepository, TicketLifecycleRepository],
	controllers: [TicketsController],
	exports: [TicketsService],
})
export class TicketsModule {}
