import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";
import { UserRepository } from "./users.repository";
import { EmailModule } from "@/shared/email/module";
import { GuardsModule } from "@/shared/guards/guards.module";
import { FileUploadModule } from "../file-upload/module";

@Module({
	imports: [
		TypeOrmModule.forFeature([User]),
		EmailModule,
		forwardRef(() => GuardsModule),
		FileUploadModule,
	],
	controllers: [UsersController],
	providers: [
		UserRepository,
		UsersService,
	],
	exports: [UsersService],
})
export class UsersModule {}
