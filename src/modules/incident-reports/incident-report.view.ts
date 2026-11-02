import { IncidentReport } from "./entities/incident-report.entity";

export type IncidentView = {
	id: string;
	reference: string;
	accountId: string;
	status: "OPEN" | "CLOSED";
	severity: string;
	incidentType: string;
	ongoing: string;
	name: string;
	organization: string;
	phone: string;
	email: string;
	detectedAt: string | null;
	affectedSystems: string | null;
	description: string;
	assignedAgent: {
		id: string;
		firstName: string;
		lastName: string;
	} | null;
	ticketId: string | null;
	ticketStatus: string | null;
	createdByStaffId?: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export function toIncidentView(
	incident: IncidentReport,
	ticketStatus: string | null,
	includeStaff: boolean,
): IncidentView {
	const view: IncidentView = {
		id: incident.id,
		reference: incident.reference,
		accountId: incident.account?.id,
		status: incident.status,
		severity: incident.severity,
		incidentType: incident.incidentType,
		ongoing: incident.ongoing,
		name: incident.name,
		organization: incident.organization,
		phone: incident.phone,
		email: incident.email,
		detectedAt: incident.detectedAt ?? null,
		affectedSystems: incident.affectedSystems ?? null,
		description: incident.description,
		assignedAgent: incident.assignedAgent
			? {
					id: incident.assignedAgent.id,
					firstName: incident.assignedAgent.firstName,
					lastName: incident.assignedAgent.lastName,
				}
			: null,
		ticketId: incident.ticketId ?? null,
		ticketStatus,
		createdAt: incident.createdAt,
		updatedAt: incident.updatedAt,
	};
	if (includeStaff) {
		view.createdByStaffId = incident.createdByStaffId ?? null;
	}
	return view;
}
