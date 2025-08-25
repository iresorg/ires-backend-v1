import {
	Controller,
	Post,
	Body,
	Req,
	UseGuards,
	ForbiddenException,
	Get,
	Query,
	Param,
	Put,
	Delete,
	Patch,
	NotFoundException,
} from "@nestjs/common";
import {
	ApiTags,
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiParam,
} from "@nestjs/swagger";
import { RespondersService } from "./responders.service";
import { CreateResponderDto } from "./dto/create-responder.dto";
import { AuthRequest } from "@/shared/interfaces/request.interface";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "../users/enums/role.enum";
import { PaginationQuery } from "@/shared/dto/pagination.dto";
import { buildPaginationResult } from "@/shared/utils/pagination.util";
import { PaginationResult } from "@/shared/types/pagination-result.type";
import { UserResponseDto } from "../users/dto/user-response.dto";

@ApiTags("Responders")
@ApiBearerAuth()
@Controller("responders")
@UseGuards(AuthGuard, RoleGuard)
export class RespondersController {
	constructor(private readonly respondersService: RespondersService) {}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({
		summary: "Create a new responder",
		description:
			"Create a new responder user (TIER_1 or TIER_2). Only SUPER_ADMIN and RESPONDER_ADMIN can create responders.",
	})
	@ApiResponse({
		status: 201,
		description: "Responder created successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Responder created successfully",
				},
			},
		},
	})
	@ApiResponse({
		status: 403,
		description: "Forbidden - Can only create responders",
	})
	async createResponder(
		@Body() createResponderDto: CreateResponderDto,
	): Promise<{ message: string }> {
		// Only allow creation of RESPONDER roles
		if (
			createResponderDto.role &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				createResponderDto.role,
			)
		) {
			throw new ForbiddenException("Can only create responders");
		}
		await this.respondersService.createResponder({
			...createResponderDto,
			role: createResponderDto.role,
		});
		return { message: "Responder created successfully" };
	}

	@Get()
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({
		summary: "Get all responders with pagination",
		description:
			"Get paginated list of responders (TIER_1 and TIER_2) with optional search functionality. Supports pagination with page and limit parameters, or search with search parameter.",
	})
	@ApiResponse({
		status: 200,
		description: "List of responders",
		schema: {
			oneOf: [
				{
					type: "object",
					properties: {
						data: {
							type: "array",
							items: {
								$ref: "#/components/schemas/UserResponseDto",
							},
						},
						total: { type: "number" },
						limit: { type: "number" },
						page: { type: "number" },
						totalPages: { type: "number" },
						nextPage: { type: "number", nullable: true },
					},
				},
				{
					type: "array",
					items: { $ref: "#/components/schemas/UserResponseDto" },
				},
			],
		},
	})
	async getResponders(
		@Query() pagination: PaginationQuery,
	): Promise<PaginationResult<UserResponseDto> | UserResponseDto[]> {
		// If search is provided, return all matching responders without pagination
		if (pagination.search) {
			const users = await this.respondersService.searchResponders(
				pagination.search,
			);
			return UserResponseDto.fromUsers(users);
		}

		// If no pagination parameters, return all responders
		if (!pagination.page && !pagination.limit) {
			const users = await this.respondersService.findAllResponders();
			return UserResponseDto.fromUsers(users);
		}

		// Otherwise, return paginated results
		const page = pagination.page ?? 1;
		const limit = pagination.limit ?? 10;
		const offset = (page - 1) * limit;
		const { users, total } =
			await this.respondersService.findRespondersPaginated(limit, offset);
		const data = UserResponseDto.fromUsers(users);
		return buildPaginationResult(data, total, { page, limit });
	}

	@Get(":id")
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({
		summary: "Get responder by ID",
		description:
			"Retrieve a specific responder by their unique identifier.",
	})
	@ApiParam({
		name: "id",
		description: "The unique identifier of the responder",
		type: "string",
	})
	@ApiResponse({
		status: 200,
		description: "Responder details retrieved successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Responder fetched successfully",
				},
				data: { $ref: "#/components/schemas/UserResponseDto" },
			},
		},
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async getResponderById(
		@Param("id") id: string,
	): Promise<{ message: string; data: UserResponseDto }> {
		const user = await this.respondersService.findResponderById(id);

		if (!user) {
			throw new NotFoundException("Responder not found");
		}

		return {
			message: "Responder fetched successfully",
			data: UserResponseDto.fromUser(user),
		};
	}

	@Put(":id")
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({
		summary: "Update responder",
		description:
			"Update an existing responder's information. Only SUPER_ADMIN and RESPONDER_ADMIN can update responders.",
	})
	@ApiParam({
		name: "id",
		description: "The unique identifier of the responder to update",
		type: "string",
	})
	@ApiResponse({
		status: 200,
		description: "Responder updated successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Responder updated successfully",
				},
				data: { $ref: "#/components/schemas/UserResponseDto" },
			},
		},
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	@ApiResponse({
		status: 403,
		description: "Forbidden - Responders can only have RESPONDER roles",
	})
	async updateResponder(
		@Param("id") id: string,
		@Body() updateResponderDto: Partial<CreateResponderDto>,
	): Promise<{ message: string; data: UserResponseDto }> {
		const existingResponder =
			await this.respondersService.findResponderById(id);

		if (!existingResponder) {
			throw new NotFoundException("Responder not found");
		}

		// Prevent role escalation - responders can only be responders
		if (
			updateResponderDto.role &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				updateResponderDto.role,
			)
		) {
			throw new ForbiddenException(
				"Responders can only have RESPONDER roles",
			);
		}

		const responder = await this.respondersService.updateResponder(
			id,
			updateResponderDto,
		);

		return {
			message: "Responder updated successfully",
			data: UserResponseDto.fromUser(responder),
		};
	}

	@Delete(":id")
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({
		summary: "Delete responder",
		description:
			"Delete a responder from the system. Only SUPER_ADMIN and RESPONDER_ADMIN can delete responders.",
	})
	@ApiParam({
		name: "id",
		description: "The unique identifier of the responder to delete",
		type: "string",
	})
	@ApiResponse({
		status: 200,
		description: "Responder deleted successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Responder deleted successfully",
				},
			},
		},
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async deleteResponder(
		@Param("id") id: string,
	): Promise<{ message: string }> {
		const existingResponder =
			await this.respondersService.findResponderById(id);

		if (!existingResponder) {
			throw new NotFoundException("Responder not found");
		}

		await this.respondersService.deleteResponder(id);

		return {
			message: "Responder deleted successfully",
		};
	}

	@Patch(":id/activate")
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({
		summary: "Activate responder",
		description:
			"Activate a deactivated responder. Only SUPER_ADMIN and RESPONDER_ADMIN can activate responders.",
	})
	@ApiParam({
		name: "id",
		description: "The unique identifier of the responder to activate",
		type: "string",
	})
	@ApiResponse({
		status: 200,
		description: "Responder activated successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Responder activated successfully",
				},
				data: { $ref: "#/components/schemas/UserResponseDto" },
			},
		},
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async activateResponder(
		@Param("id") id: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id: activatedBy, role: activatedByRole } = req.user;
		const existingResponder =
			await this.respondersService.findResponderById(id);

		if (!existingResponder) {
			throw new NotFoundException("Responder not found");
		}

		const responder = await this.respondersService.activateResponder(
			id,
			activatedBy,
			activatedByRole,
		);

		return {
			message: "Responder activated successfully",
			data: UserResponseDto.fromUser(responder),
		};
	}

	@Patch(":id/deactivate")
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({
		summary: "Deactivate responder",
		description:
			"Deactivate an active responder. Only SUPER_ADMIN and RESPONDER_ADMIN can deactivate responders.",
	})
	@ApiParam({
		name: "id",
		description: "The unique identifier of the responder to deactivate",
		type: "string",
	})
	@ApiResponse({
		status: 200,
		description: "Responder deactivated successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Responder deactivated successfully",
				},
				data: { $ref: "#/components/schemas/UserResponseDto" },
			},
		},
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async deactivateResponder(
		@Param("id") id: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id: deactivatedBy, role: deactivatedByRole } = req.user;
		const existingResponder =
			await this.respondersService.findResponderById(id);

		if (!existingResponder) {
			throw new NotFoundException("Responder not found");
		}

		const responder = await this.respondersService.deactivateResponder(
			id,
			deactivatedBy,
			deactivatedByRole,
		);

		return {
			message: "Responder deactivated successfully",
			data: UserResponseDto.fromUser(responder),
		};
	}
}
