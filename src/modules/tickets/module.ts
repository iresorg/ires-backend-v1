import { Module } from "@nestjs/common";
import { TicketsService } from "./service";
import { TicketsRepository } from "./repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tickets } from "./entities/ticket.entity";
import { TicketsController } from "./controller";
import { AccountTicketsController } from "./account-tickets.controller";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";
import { UsersModule } from "@/modules/users/users.module";
import { EmailModule } from "@/shared/email/module";
import { TicketLifecycleRepository } from "./ticket-lifecycle.repository";
import { DatabaseModule } from "@/shared/database/datasource";
import { FileUploadModule } from "../file-upload/module";
import { AccountsModule } from "../accounts/accounts.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";
import { UtilsModule } from "@/utils/utils.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Tickets, TicketLifecycle]),
		UsersModule,
		EmailModule,
		DatabaseModule,
		FileUploadModule,
		AccountsModule,
		SubscriptionsModule,
		UtilsModule,
	],
	providers: [
		TicketsService,
		TicketsRepository,
		TicketLifecycleRepository,
		AccountsAuthGuard,
	],
	controllers: [TicketsController, AccountTicketsController],
	exports: [TicketsService],
})
export class TicketsModule {}
