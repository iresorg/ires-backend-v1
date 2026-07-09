import { ApiProperty } from "@nestjs/swagger";
import { TicketStatus } from "@/modules/tickets/interfaces/ticket.interface";
import { Role } from "@/modules/users/enums/role.enum";

export class OverviewSummaryDto {
	@ApiProperty({ example: 598 })
	totalUsers: number;

	@ApiProperty({ example: 67 })
	totalActiveTickets: number;

	@ApiProperty({ example: 30 })
	totalAgents: number;

	@ApiProperty({ example: 55 })
	totalResponders: number;

	@ApiProperty({ example: 420 })
	totalExternalUsers: number;

	@ApiProperty({ example: 180 })
	totalSubscribers: number;
}

export class TicketStatusMonthDto {
	@ApiProperty({ example: "2025-06" })
	month: string;

	@ApiProperty({ example: "June" })
	label: string;

	@ApiProperty({
		example: {
			ESCALATED: 12,
			RESOLVED: 20,
			IN_PROGRESS: 15,
			ASSIGNED: 10,
			ANALYSING: 8,
			PENDING: 5,
		},
	})
	statuses: Record<string, number>;
}

export class UserRoleCountDto {
	@ApiProperty({ enum: Role, example: Role.AGENT_ADMIN })
	role: Role;

	@ApiProperty({ example: "Agent Admin" })
	label: string;

	@ApiProperty({ example: 12 })
	count: number;
}

export class RecentActivityDto {
	@ApiProperty({ example: "Guy Hawkins" })
	user: string;

	@ApiProperty({ example: "Agent Admin" })
	role: string;

	@ApiProperty({ example: "Escalated ticket" })
	activity: string;

	@ApiProperty({ example: "2025-06-29T12:30:00.000Z" })
	timestamp: Date;
}

export class OverviewResponseDto {
	@ApiProperty({ type: OverviewSummaryDto })
	summary: OverviewSummaryDto;

	@ApiProperty({ type: [TicketStatusMonthDto] })
	ticketStatusChart: TicketStatusMonthDto[];

	@ApiProperty({ type: [UserRoleCountDto] })
	userRolesChart: UserRoleCountDto[];

	@ApiProperty({ type: [RecentActivityDto] })
	recentActivity: RecentActivityDto[];
}

const ROLE_LABELS: Partial<Record<Role, string>> = {
	[Role.SUPER_ADMIN]: "Super Admin",
	[Role.ADMIN]: "Admin",
	[Role.AGENT]: "Agent",
	[Role.AGENT_ADMIN]: "Agent Admin",
	[Role.RESPONDER_ADMIN]: "Responder Admin",
	[Role.RESPONDER_TIER_1]: "Responder Tier 1",
	[Role.RESPONDER_TIER_2]: "Responder Tier 2",
};

const TICKET_ACTION_LABELS: Record<TicketStatus, string> = {
	[TicketStatus.CREATED]: "Created ticket",
	[TicketStatus.PENDING]: "Marked ticket as pending",
	[TicketStatus.ANALYSING]: "Started analyzing ticket",
	[TicketStatus.ASSIGNED]: "Assigned ticket",
	[TicketStatus.REASSIGNED]: "Reassigned ticket",
	[TicketStatus.IN_PROGRESS]: "Started responding to ticket",
	[TicketStatus.RESOLVED]: "Resolved ticket",
	[TicketStatus.CLOSED]: "Closed ticket",
	[TicketStatus.ESCALATED]: "Escalated ticket",
};

const CHART_STATUSES = [
	TicketStatus.ESCALATED,
	TicketStatus.RESOLVED,
	TicketStatus.IN_PROGRESS,
	TicketStatus.ASSIGNED,
	TicketStatus.ANALYSING,
	TicketStatus.PENDING,
] as const;

export function formatRoleLabel(role: Role | string): string {
	return ROLE_LABELS[role as Role] ?? role;
}

export function formatTicketAction(action: TicketStatus): string {
	return TICKET_ACTION_LABELS[action] ?? action;
}

export function getLastMonths(count: number): { key: string; label: string }[] {
	const months: { key: string; label: string }[] = [];

	for (let i = count - 1; i >= 0; i--) {
		const date = new Date();
		date.setDate(1);
		date.setHours(0, 0, 0, 0);
		date.setMonth(date.getMonth() - i);

		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		const label = date.toLocaleString("en-US", { month: "long" });

		months.push({ key, label });
	}

	return months;
}

export function createEmptyStatusCounts(): Record<string, number> {
	return CHART_STATUSES.reduce(
		(acc, status) => {
			acc[status] = 0;
			return acc;
		},
		{} as Record<string, number>,
	);
}

export { CHART_STATUSES };
