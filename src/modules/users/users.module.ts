import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";
import { UserRepository } from "./users.repository";
import constants from "./constants/constants";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { EmailModule } from "@/shared/email/module";

@Module({
	imports: [TypeOrmModule.forFeature([User]), EmailModule],
	controllers: [UsersController],
	providers: [
		{
			provide: constants.USER_REPOSITORY,
			useClass: UserRepository,
		},
		UsersService,
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
	],
	exports: [UsersService],
})
export class UsersModule {}
