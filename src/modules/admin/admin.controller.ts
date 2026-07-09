import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
	ApiTags,
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiQuery,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { UsersQueryDto } from "./dto/users-query.dto";
import { SubscribersQueryDto } from "./dto/subscribers-query.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { SubscriberResponseDto } from "./dto/subscriber-response.dto";
import { OverviewResponseDto } from "./dto/overview-response.dto";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "../users/enums/role.enum";
import { buildPaginationResult } from "@/shared/utils/pagination.util";
import { PaginationResult } from "@/shared/types/pagination-result.type";

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller("admin")
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Get("overview")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Get admin dashboard overview",
		description:
			"Returns summary metrics, ticket status chart, user roles chart, and recent activity for the admin dashboard.",
	})
	@ApiResponse({
		status: 200,
		description: "Admin dashboard overview data",
		type: OverviewResponseDto,
	})
	@ApiResponse({
		status: 403,
		description: "Forbidden - Only SUPER_ADMIN and ADMIN can access",
	})
	async getOverview(): Promise<OverviewResponseDto> {
		return this.adminService.getOverview();
	}

	@Get("users")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Get all users (accounts)",
		description:
			"Get paginated list of all user accounts (individual and organization) with optional filters. All filters can be combined. Requires authentication as SUPER_ADMIN or ADMIN role.",
	})
	@ApiQuery({
		name: "search",
		required: false,
		description: "Search by name or email",
		example: "john",
	})
	@ApiQuery({
		name: "role",
		required: false,
		enum: ["individual", "organization"],
		description: "Filter by account role",
		example: "individual",
	})
	@ApiQuery({
		name: "emailVerified",
		required: false,
		enum: ["verified", "not_verified"],
		description: "Filter by email verification status",
		example: "verified",
	})
	@ApiQuery({
		name: "joinedDateFrom",
		required: false,
		description: "Filter by joined date (start date)",
		example: "2024-01-01",
	})
	@ApiQuery({
		name: "joinedDateTo",
		required: false,
		description: "Filter by joined date (end date)",
		example: "2024-12-31",
	})
	@ApiQuery({
		name: "page",
		required: false,
		type: Number,
		description: "Page number (starts from 1)",
		example: 1,
	})
	@ApiQuery({
		name: "limit",
		required: false,
		type: Number,
		description: "Number of items per page (minimum 5)",
		example: 10,
	})
	@ApiResponse({
		status: 200,
		description: "Paginated list of users",
		schema: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string", example: "uuid-string" },
							name: { type: "string", example: "John Doe" },
							email: {
								type: "string",
								example: "john@example.com",
							},
							role: {
								type: "string",
								enum: ["individual", "organization"],
								example: "individual",
							},
							emailVerified: { type: "boolean", example: true },
							phone: {
								type: "string",
								nullable: true,
								example: "+1234567890",
							},
							joinedDate: {
								type: "string",
								format: "date-time",
								example: "2024-01-01T00:00:00.000Z",
							},
						},
					},
				},
				total: { type: "number", example: 100 },
				limit: { type: "number", example: 10 },
				page: { type: "number", example: 1 },
				totalPages: { type: "number", example: 10 },
				nextPage: { type: "number", nullable: true, example: 2 },
			},
		},
	})
	@ApiResponse({
		status: 403,
		description: "Forbidden - Only SUPER_ADMIN and ADMIN can access",
	})
	async getUsers(
		@Query() query: UsersQueryDto,
	): Promise<
		| PaginationResult<UserResponseDto>
		| { users: UserResponseDto[]; total: number }
	> {
		const { page, limit } = query;

		if (page && limit) {
			const result = await this.adminService.getUsers(query);
			return buildPaginationResult(result.users, result.total, {
				page,
				limit,
			});
		}

		const result = await this.adminService.getUsers(query);
		return { users: result.users, total: result.total };
	}

	@Get("subscribers")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Get all subscribers",
		description:
			"Get paginated list of users with active subscriptions. Includes subscription details like plan, status, dates. Only accessible by SUPER_ADMIN and ADMIN.",
	})
	@ApiResponse({
		status: 200,
		description: "Paginated list of subscribers",
		schema: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string", example: "uuid-string" },
							userName: { type: "string", example: "John Doe" },
							email: {
								type: "string",
								example: "john@example.com",
							},
							role: {
								type: "string",
								enum: ["individual", "organization"],
								example: "individual",
							},
							planSubscribedTo: {
								type: "string",
								nullable: true,
								example: "Premium Plan",
							},
							amount: {
								type: "number",
								nullable: true,
								example: 15000000,
							},
							startDate: {
								type: "string",
								format: "date-time",
								nullable: true,
								example: "2024-01-01T00:00:00.000Z",
							},
							endDate: {
								type: "string",
								format: "date-time",
								nullable: true,
								example: "2024-02-01T00:00:00.000Z",
							},
							status: {
								type: "string",
								enum: [
									"active",
									"expired",
									"cancelled",
									"past_due",
								],
								nullable: true,
								example: "active",
							},
						},
					},
				},
				total: { type: "number", example: 50 },
				limit: { type: "number", example: 10 },
				page: { type: "number", example: 1 },
				totalPages: { type: "number", example: 5 },
				nextPage: { type: "number", nullable: true, example: 2 },
			},
		},
	})
	@ApiResponse({
		status: 403,
		description: "Forbidden - Only SUPER_ADMIN and ADMIN can access",
	})
	async getSubscribers(
		@Query() query: SubscribersQueryDto,
	): Promise<
		| PaginationResult<SubscriberResponseDto>
		| { subscribers: SubscriberResponseDto[]; total: number }
	> {
		const { page, limit } = query;

		if (page && limit) {
			const result = await this.adminService.getSubscribers(query);
			return buildPaginationResult(result.subscribers, result.total, {
				page,
				limit,
			});
		}

		const result = await this.adminService.getSubscribers(query);
		return { subscribers: result.subscribers, total: result.total };
	}
}
