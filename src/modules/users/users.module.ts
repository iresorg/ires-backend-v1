import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";
import { UserRepository } from "./users.repository";
import constants from "./constants/constants";
import { EmailModule } from "@/shared/email/module";
import { GuardsModule } from "@/shared/guards/guards.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([User]),
		EmailModule,
		forwardRef(() => GuardsModule),
	],
	controllers: [UsersController],
	providers: [
		{
			provide: constants.USER_REPOSITORY,
			useClass: UserRepository,
		},
		UsersService,
	],
	exports: [UsersService],
})
export class UsersModule {}
