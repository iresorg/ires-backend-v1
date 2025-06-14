import { Global, Module } from "@nestjs/common";
import { Logger } from "./service";

@Global()
@Module({
	providers: [Logger],
	exports: [Logger],
})
export class LoggerModule {}
