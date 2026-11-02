import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailModule } from "@/shared/email/module";
import { AccountsModule } from "@/modules/accounts/accounts.module";
import { UsersModule } from "@/modules/users/users.module";
import { UtilsModule } from "@/utils/utils.module";
import { GuardsModule } from "@/shared/guards/guards.module";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";
import { Tickets } from "@/modules/tickets/entities/ticket.entity";
import { IncidentReport } from "./entities/incident-report.entity";
import { IncidentReportsController } from "./incident-reports.controller";
import { AccountIncidentsController } from "./account-incidents.controller";
import { IncidentReportsService } from "./incident-reports.service";
import { IncidentReportsRepository } from "./incident-reports.repository";

@Module({
	imports: [
		TypeOrmModule.forFeature([IncidentReport, Tickets]),
		EmailModule,
		AccountsModule,
		UsersModule,
		UtilsModule,
		GuardsModule,
	],
	controllers: [IncidentReportsController, AccountIncidentsController],
	providers: [
		IncidentReportsService,
		IncidentReportsRepository,
		AccountsAuthGuard,
	],
	exports: [IncidentReportsService],
})
export class IncidentReportsModule {}
