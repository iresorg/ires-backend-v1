import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AccountsModule } from "../accounts/accounts.module";
import { UsersModule } from "../users/users.module";
import { Subscription } from "../subscriptions/entities/subscription.entity";
import { User } from "../users/entities/user.entity";
import { Account } from "../accounts/entities/account.entity";
import { Tickets } from "../tickets/entities/ticket.entity";
import { TicketLifecycle } from "../tickets/entities/ticket-lifecycle.entity";

@Module({
	imports: [
		AccountsModule,
		UsersModule,
		TypeOrmModule.forFeature([
			Subscription,
			User,
			Account,
			Tickets,
			TicketLifecycle,
		]),
	],
	controllers: [AdminController],
	providers: [AdminService],
	exports: [AdminService],
})
export class AdminModule {}
