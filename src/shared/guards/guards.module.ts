import { Module, forwardRef } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RoleGuard } from "./roles.guard";
import { UsersModule } from "@/modules/users/users.module";
import { AgentsModule } from "@/modules/agents/agents.module";
import { RespondersModule } from "@/modules/responders/responders.module";

@Module({
	imports: [
		forwardRef(() => UsersModule),
		forwardRef(() => AgentsModule),
		forwardRef(() => RespondersModule),
	],
	providers: [AuthGuard, RoleGuard],
	exports: [AuthGuard, RoleGuard],
})
export class GuardsModule {}
