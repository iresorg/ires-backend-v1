import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
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
import {
	CreateSubscriptionPlanDto,
	UpdateSubscriptionPlanDto,
} from "./dto/subscription-plan.dto";
import {
	FinancialsOverviewQueryDto,
	FinancialsTransactionsQueryDto,
	PaystackSettlementsQueryDto,
} from "./dto/financials-query.dto";
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
		summary: "Get subscribers / PAYG customers",
		description:
			"Lists recurring subscribers by default. Pass paymentType=one_time for pay-as-you-go customers. Each row includes paymentType.",
	})
	@ApiQuery({
		name: "paymentType",
		required: false,
		enum: ["subscription", "one_time"],
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
							planId: { type: "string", nullable: true },
							planSubscribedTo: {
								type: "string",
								nullable: true,
								example: "Premium Plan",
							},
							paymentType: {
								type: "string",
								enum: ["subscription", "one_time"],
								example: "subscription",
							},
							interval: {
								type: "string",
								nullable: true,
								example: "monthly",
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
								nullable: true,
								example: "active",
							},
							paygCreditsAvailable: {
								type: "number",
								nullable: true,
								example: 1,
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

	@Get("subscription-plans")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "List all subscription plans",
		description:
			"Returns every subscription plan, including inactive ones. Filter by accountType and/or paymentType.",
	})
	@ApiQuery({
		name: "accountType",
		required: false,
		enum: ["individual", "organization"],
	})
	@ApiQuery({
		name: "paymentType",
		required: false,
		enum: ["subscription", "one_time"],
	})
	async getSubscriptionPlans(
		@Query("accountType") accountType?: "individual" | "organization",
		@Query("paymentType") paymentType?: string,
	) {
		const plans = await this.adminService.getSubscriptionPlans({
			accountType,
			paymentType,
		});
		return { plans };
	}

	@Post("subscription-plans")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Create a subscription plan",
		description:
			"Create a plan in the database. If paystackPlanCode is omitted, a matching Paystack plan is created automatically. Amount is in kobo.",
	})
	async createSubscriptionPlan(@Body() dto: CreateSubscriptionPlanDto) {
		const plan = await this.adminService.createSubscriptionPlan(dto);
		return { message: "Subscription plan created", plan };
	}

	@Patch("subscription-plans/:id")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Update a subscription plan",
		description:
			"Update amount, features, name, or active status. Amount changes are synced to Paystack for new subscribers.",
	})
	async updateSubscriptionPlan(
		@Param("id") id: string,
		@Body() dto: UpdateSubscriptionPlanDto,
	) {
		const plan = await this.adminService.updateSubscriptionPlan(id, dto);
		return { message: "Subscription plan updated", plan };
	}

	@Delete("subscription-plans/:id")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Delete or deactivate a subscription plan",
		description:
			"Deletes the plan if nobody is subscribed. If subscribers exist, the plan is deactivated instead.",
	})
	async deleteSubscriptionPlan(@Param("id") id: string) {
		return this.adminService.deleteSubscriptionPlan(id);
	}

	@Get("financials/overview")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Admin financials overview (from local payments)",
		description:
			"Revenue, success/fail counts, PAYG vs subscription split, approximate MRR, and monthly chart. Amounts in kobo.",
	})
	async getFinancialsOverview(@Query() query: FinancialsOverviewQueryDto) {
		return this.adminService.getFinancialsOverview(query);
	}

	@Get("financials/transactions")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Admin payment ledger",
		description:
			"Paginated local Paystack-backed transactions with status and paymentType filters.",
	})
	async getFinancialsTransactions(
		@Query() query: FinancialsTransactionsQueryDto,
	): Promise<
		| PaginationResult<Record<string, unknown>>
		| { transactions: Record<string, unknown>[]; total: number }
	> {
		const page = query.page ?? 1;
		const limit = query.limit ?? 10;
		const result = await this.adminService.getFinancialsTransactions({
			...query,
			page,
			limit,
		});

		if (query.page && query.limit) {
			return buildPaginationResult(result.transactions, result.total, {
				page,
				limit,
			});
		}

		return result;
	}

	@Get("financials/paystack/balance")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Paystack wallet balance (live)",
		description: "Proxies Paystack GET /balance so ops need not open the Paystack dashboard.",
	})
	async getPaystackBalance() {
		return this.adminService.getPaystackBalance();
	}

	@Get("financials/paystack/settlements")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN)
	@ApiOperation({
		summary: "Paystack settlements (live)",
		description: "Proxies Paystack GET /settlement for bank payout history.",
	})
	async getPaystackSettlements(@Query() query: PaystackSettlementsQueryDto) {
		return this.adminService.getPaystackSettlements(query);
	}
}
