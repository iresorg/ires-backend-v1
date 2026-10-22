import { randomBytes } from "crypto";
import {
	HttpException,
	HttpStatus,
	Injectable,
	InternalServerErrorException,
	Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { EmailService } from "@/shared/email/service";
import { EnvVariables } from "@/utils/env.validate";
import IncidentReportConfirmation from "@/shared/email/templates/IncidentReportConfirmation";
import IncidentReportToSupport from "@/shared/email/templates/IncidentReportToSupport";
import { CreateIncidentReportDto } from "./dto/create-incident-report.dto";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 5;

@Injectable()
export class IncidentReportsService {
	private readonly hits = new Map<string, number[]>();
	private readonly logger = new Logger(IncidentReportsService.name);

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

		const reportedAt = new Date();
		const reference = createIncidentReference(reportedAt);
		const subject = `Incident report — ${reference} — ${dto.severity} — ${dto.incidentType.replace(/[\r\n]+/g, " ")}`;

		try {
			const html = await render(
				IncidentReportToSupport({
					headerText: "New incident report",
					reference,
					severity: dto.severity,
					incidentType: dto.incidentType,
					ongoing: dto.ongoing,
					name: dto.name,
					organization: dto.organization,
					phone: dto.phone,
					email: dto.email,
					detectedAt: dto.detectedAt,
					affectedSystems: dto.affectedSystems,
					description: dto.description,
				}),
			);
			await this.emailService.sendHtmlEmail({
				to,
				replyTo: dto.email,
				subject,
				html,
			});
		} catch {
			throw new InternalServerErrorException("Could not send the report.");
		}

		try {
			const html = await render(
				IncidentReportConfirmation({
					firstName: firstNameFrom(dto.name),
					reference,
					organization: dto.organization,
					incidentType: dto.incidentType,
					severity: dto.severity,
					ongoing: dto.ongoing,
					reportedAt: formatReportedAt(reportedAt),
					website: "https://iresorg.com",
				}),
			);
			await this.emailService.sendHtmlEmail({
				to: dto.email,
				subject: `We received your incident report — ${reference}`,
				html,
			});
		} catch (error) {
			this.logger.error(
				"Incident report was delivered to support, but the confirmation email failed",
				error instanceof Error ? error.stack : undefined,
			);
		}

		return {
			message: "Incident report received",
			incidentReference: reference,
		};
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
}

function firstNameFrom(name: string): string {
	const first = name.trim().split(/\s+/)[0];
	return first || name.trim();
}

function createIncidentReference(when: Date): string {
	const date = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Africa/Lagos",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.format(when)
		.replaceAll("-", "");
	const suffix = randomBytes(3).toString("hex").toUpperCase();
	return `IR-${date}-${suffix}`;
}

function formatReportedAt(when: Date): string {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: "Africa/Lagos",
		dateStyle: "long",
		timeStyle: "short",
	}).format(when);
}
