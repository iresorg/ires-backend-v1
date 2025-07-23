import { Module } from "@nestjs/common";
import { RespondersController } from "./responders.controller";
import { RespondersService } from "./responders.service";
import { UsersModule } from "../users/users.module";

@Module({
	imports: [UsersModule],
	controllers: [RespondersController],
	providers: [RespondersService],
	exports: [RespondersService],
})
export class RespondersModule {}
