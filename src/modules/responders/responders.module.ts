import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Responder } from "./entities/responder.entity";
import { ResponderToken } from "./entities/responder-token.entity";
import { RespondersService } from "./responders.service";
import { RespondersController } from "./responders.controller";
import {
	ResponderRepository,
	ResponderTokenRepository,
} from "./repositories/responder.repository";
import { QueueModule } from "@/shared/queue/module";
import constants from "./constants/constants";

@Module({
	imports: [
		TypeOrmModule.forFeature([Responder, ResponderToken]),
		forwardRef(() => QueueModule),
	],
	controllers: [RespondersController],
	providers: [
		RespondersService,
		{
			provide: constants.RESPONDER_REPOSITORY,
			useClass: ResponderRepository,
		},
		{
			provide: constants.RESPONDER_TOKEN_REPOSITORY,
			useClass: ResponderTokenRepository,
		},
	],
	exports: [RespondersService],
})
export class RespondersModule {}
