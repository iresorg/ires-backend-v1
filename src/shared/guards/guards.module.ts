import { Module, forwardRef } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RoleGuard } from "./roles.guard";
import { UsersModule } from "@/modules/users/users.module";

@Module({
	imports: [forwardRef(() => UsersModule)],
	providers: [AuthGuard, RoleGuard],
	exports: [AuthGuard, RoleGuard],
})
export class GuardsModule {}
