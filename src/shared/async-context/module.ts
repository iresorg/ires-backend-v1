import { Global, Module } from "@nestjs/common";
import { AsyncContextService } from "./service";

@Global()
@Module({
	providers: [AsyncContextService],
	exports: [AsyncContextService],
})
export class AsyncContextModule {}
