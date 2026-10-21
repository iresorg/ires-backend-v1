import { Module } from "@nestjs/common";
import { EmailModule } from "@/shared/email/module";
import { IncidentReportsController } from "./incident-reports.controller";
import { IncidentReportsService } from "./incident-reports.service";

@Module({
	imports: [EmailModule],
	controllers: [IncidentReportsController],
	providers: [IncidentReportsService],
})
export class IncidentReportsModule {}
