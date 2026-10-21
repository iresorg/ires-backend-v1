import {
	HttpException,
	HttpStatus,
	Injectable,
	InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "@/shared/email/service";
import { EnvVariables } from "@/utils/env.validate";
import { CreateIncidentReportDto } from "./dto/create-incident-report.dto";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 5;

@Injectable()
export class IncidentReportsService {
	private readonly hits = new Map<string, number[]>();

	constructor(
		private readonly emailService: EmailService,
		private readonly config: ConfigService<EnvVariables>,
	) {}

	async submit(dto: CreateIncidentReportDto, ip: string) {
		this.assertWithinLimit(ip);

		const to = this.config.get("SUPPORT_EMAIL");
		if (!to) {
			throw new InternalServerErrorException("Could not send the report.");
		}

		const subject = `Incident report — ${dto.severity} — ${dto.incidentType.replace(/[\r\n]+/g, " ")}`;

		try {
			await this.emailService.sendPlainTextEmail({
				to,
				replyTo: dto.email,
				subject,
				text: this.buildBody(dto),
			});
		} catch {
			throw new InternalServerErrorException("Could not send the report.");
		}

		return { message: "Incident report received" };
	}

	private assertWithinLimit(ip: string) {
		const now = Date.now();
		const recent = (this.hits.get(ip) ?? []).filter(
			(at) => now - at < WINDOW_MS,
		);
		if (recent.length >= MAX_REPORTS_PER_WINDOW) {
			throw new HttpException(
				"Too many incident reports. Try again later.",
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
		recent.push(now);
		this.hits.set(ip, recent);
	}

	private buildBody(dto: CreateIncidentReportDto): string {
		const lines = [
			`Severity: ${dto.severity}`,
			`Incident type: ${dto.incidentType}`,
			`Ongoing: ${dto.ongoing}`,
			`Name: ${dto.name}`,
			`Organization: ${dto.organization}`,
			`Phone: ${dto.phone}`,
			`Email: ${dto.email}`,
		];
		if (dto.detectedAt) lines.push(`Detected: ${dto.detectedAt}`);
		if (dto.affectedSystems) {
			lines.push(`Affected systems: ${dto.affectedSystems}`);
		}
		lines.push("", dto.description);
		return lines.join("\n");
	}
}
