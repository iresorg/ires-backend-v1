import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AccountsModule } from "../accounts/accounts.module";
import { UsersModule } from "../users/users.module";
import { Subscription } from "../subscriptions/entities/subscription.entity";

@Module({
	imports: [
		AccountsModule,
		UsersModule,
		TypeOrmModule.forFeature([Subscription]),
	],
	controllers: [AdminController],
	providers: [AdminService],
	exports: [AdminService],
})
export class AdminModule {}
