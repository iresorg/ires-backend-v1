import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	NotFoundException,
	Req,
	Patch,
	UseGuards,
	ForbiddenException,
	Query,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import {
	ApiBearerAuth,
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
} from "@nestjs/swagger";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "./enums/role.enum";
import { UserResponseDto } from "./dto/user-response.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { AuthRequest } from "@/shared/interfaces/request.interface";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { PaginationQuery } from "@/shared/dto/pagination.dto";
import { buildPaginationResult } from "@/shared/utils/pagination.util";
import { PaginationResult } from "@/shared/types/pagination-result.type";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller("users")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@Roles(Role.SUPER_ADMIN)
	@ApiOperation({
		summary: "Get all users with pagination",
		description:
			"Get paginated list of users with optional filtering by role and search",
	})
	@ApiResponse({
		status: 200,
		description: "Paginated list of users",
		schema: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: { $ref: "#/components/schemas/UserResponseDto" },
				},
				total: { type: "number" },
				limit: { type: "number" },
				page: { type: "number" },
				totalPages: { type: "number" },
				nextPage: { type: "number", nullable: true },
			},
		},
	})
	async getUsers(
		@Req() req: AuthRequest,
		@Query() pagination: PaginationQuery,
	): Promise<PaginationResult<UserResponseDto>> {
		const page = pagination.page ?? 1;
		const limit = pagination.limit ?? 10;
		const search = pagination.search;
		const role = pagination.role;

		let result;

		if (role && search) {
			// Filter by role and search
			const users = await this.usersService.findByRoleAndSearch(
				role,
				search,
			);
			const total = users.length;
			const startIndex = (page - 1) * limit;
			const endIndex = startIndex + limit;
			const paginatedUsers = users.slice(startIndex, endIndex);
			result = {
				users: paginatedUsers,
				total,
				totalPages: Math.ceil(total / limit),
			};
		} else if (role) {
			// Filter by role only
			result = await this.usersService.findByRolePaginated(
				role,
				page,
				limit,
			);
		} else if (search) {
			// Search only - we'll need to add this method to the service
			const users = await this.usersService.findBySearch(search);
			const total = users.length;
			const startIndex = (page - 1) * limit;
			const endIndex = startIndex + limit;
			const paginatedUsers = users.slice(startIndex, endIndex);
			result = {
				users: paginatedUsers,
				total,
				totalPages: Math.ceil(total / limit),
			};
		} else {
			// No filters - get all users
			result = await this.usersService.findAllPaginated(page, limit);
		}

		const data = UserResponseDto.fromUsers(result.users);
		return buildPaginationResult(data, result.total, { page, limit });
	}

	@Get("profile")
	@ApiOperation({ summary: "Get user profile" })
	@ApiResponse({
		status: 200,
		description: "User profile",
		type: UserResponseDto,
	})
	async getUserProfile(
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id } = req.user;
		const user = await this.usersService.findOne({ id });

		if (!user)
			throw new NotFoundException(
				"User not found. Please check and try again later.",
			);

		return {
			message: "User profile fetched successfully",
			data: UserResponseDto.fromUser(user),
		};
	}

	@Get(":id")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Get user by ID" })
	@ApiResponse({
		status: 200,
		description: "User details",
		type: UserResponseDto,
	})
	async getUserById(
		@Param("id") id: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { role: currentUserRole } = req.user;
		const user = await this.usersService.findOne({ id });

		if (!user)
			throw new NotFoundException(
				"User not found. Please check and try again later.",
			);

		// Validate role permissions
		if (currentUserRole === Role.AGENT_ADMIN && user.role !== Role.AGENT) {
			throw new ForbiddenException("Agent admin can only view agents");
		}

		if (
			currentUserRole === Role.RESPONDER_ADMIN &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(user.role)
		) {
			throw new ForbiddenException(
				"Responder admin can only view responders",
			);
		}

		const data = UserResponseDto.fromUser(user);

		return {
			message: "User fetched successfully",
			data,
		};
	}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Create a new user" })
	@ApiResponse({
		status: 201,
		description: "User created successfully",
		type: UserResponseDto,
	})
	async createUser(
		@Body() createUserDto: CreateUserDto,
		@Req() req: AuthRequest,
	): Promise<{ message: string }> {
		const { role: currentUserRole } = req.user;

		// Validate role permissions
		if (
			currentUserRole === Role.AGENT_ADMIN &&
			createUserDto.role !== Role.AGENT
		) {
			throw new ForbiddenException("Agent admin can only create agents");
		}

		if (
			currentUserRole === Role.RESPONDER_ADMIN &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				createUserDto.role,
			)
		) {
			throw new ForbiddenException(
				"Responder admin can only create responders",
			);
		}

		await this.usersService.create({
			firstName: createUserDto.firstName,
			lastName: createUserDto.lastName,
			email: createUserDto.email,
			role: createUserDto.role,
		});

		return {
			message: "User created successfully",
		};
	}

	@Put("profile")
	@ApiOperation({
		summary: "Update user profile",
		description: "Update the current user profile information.",
	})
	@ApiResponse({
		status: 200,
		description: "User profile updated successfully",
		type: UserResponseDto,
	})
	async updateUserProfile(
		@Req() req: AuthRequest,
		@Body() updateUserDto: Partial<CreateUserDto>,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id } = req.user;

		const user = await this.usersService.update(id, {
			firstName: updateUserDto.firstName,
			lastName: updateUserDto.lastName,
		});

		if (!user)
			throw new NotFoundException(
				"User not found. Please check and try again later.",
			);

		return {
			message: "User profile updated successfully",
			data: UserResponseDto.fromUser(user),
		};
	}

	@Put(":id")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Update user" })
	@ApiResponse({
		status: 200,
		description: "User updated successfully",
		type: UserResponseDto,
	})
	async updateUser(
		@Param("id") id: string,
		@Body() updateUserDto: Partial<CreateUserDto>,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { role: currentUserRole } = req.user;
		const existingUser = await this.usersService.findOne({ id });

		if (!existingUser) {
			throw new NotFoundException("User not found");
		}

		// Validate role permissions
		if (
			currentUserRole === Role.AGENT_ADMIN &&
			existingUser.role !== Role.AGENT
		) {
			throw new ForbiddenException("Agent admin can only update agents");
		}

		if (
			currentUserRole === Role.RESPONDER_ADMIN &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				existingUser.role,
			)
		) {
			throw new ForbiddenException(
				"Responder admin can only update responders",
			);
		}

		// Prevent role escalation
		if (
			currentUserRole === Role.AGENT_ADMIN &&
			updateUserDto.role &&
			updateUserDto.role !== Role.AGENT
		) {
			throw new ForbiddenException(
				"Agent admin can only assign agent roles",
			);
		}

		if (
			currentUserRole === Role.RESPONDER_ADMIN &&
			updateUserDto.role &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				updateUserDto.role,
			)
		) {
			throw new ForbiddenException(
				"Responder admin can only assign responder roles",
			);
		}

		const user = await this.usersService.update(id, updateUserDto);
		const data = UserResponseDto.fromUser(user);

		return {
			message: "User updated successfully",
			data,
		};
	}

	@Delete(":id")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Delete user" })
	@ApiResponse({
		status: 200,
		description: "User deleted successfully",
	})
	async deleteUser(
		@Param("id") id: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string }> {
		const { role: currentUserRole } = req.user;
		const existingUser = await this.usersService.findOne({ id });

		if (!existingUser) {
			throw new NotFoundException("User not found");
		}

		// Validate role permissions
		if (
			currentUserRole === Role.AGENT_ADMIN &&
			existingUser.role !== Role.AGENT
		) {
			throw new ForbiddenException("Agent admin can only delete agents");
		}

		if (
			currentUserRole === Role.RESPONDER_ADMIN &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				existingUser.role,
			)
		) {
			throw new ForbiddenException(
				"Responder admin can only delete responders",
			);
		}

		await this.usersService.delete(id);

		return {
			message: "User deleted successfully",
		};
	}

	@Patch(":userId/activate")
	@ApiParam({ name: "userId", description: "The ID of the user to activate" })
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Activate user" })
	@ApiResponse({
		status: 200,
		description: "User activated successfully",
	})
	async activateUser(
		@Param("userId") userId: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id: activatedBy, role: activatedByRole } = req.user;
		const existingUser = await this.usersService.findOne({ id: userId });

		if (!existingUser) {
			throw new NotFoundException("User not found");
		}

		// Validate role permissions
		if (
			activatedByRole === Role.AGENT_ADMIN &&
			existingUser.role !== Role.AGENT
		) {
			throw new ForbiddenException(
				"Agent admin can only activate agents",
			);
		}

		if (
			activatedByRole === Role.RESPONDER_ADMIN &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				existingUser.role,
			)
		) {
			throw new ForbiddenException(
				"Responder admin can only activate responders",
			);
		}

		const data = await this.usersService.activateUser(
			userId,
			activatedBy,
			activatedByRole,
		);

		return {
			message: "User activated successfully",
			data: UserResponseDto.fromUser(data),
		};
	}

	@Patch(":userId/deactivate")
	@ApiParam({
		name: "userId",
		description: "The ID of the user to deactivate",
	})
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Deactivate user" })
	@ApiResponse({
		status: 200,
		description: "User deactivated successfully",
	})
	async deactivateUser(
		@Param("userId") userId: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id: deactivatedBy, role: deactivatedByRole } = req.user;
		const existingUser = await this.usersService.findOne({ id: userId });

		if (!existingUser) {
			throw new NotFoundException("User not found");
		}

		// Validate role permissions
		if (
			deactivatedByRole === Role.AGENT_ADMIN &&
			existingUser.role !== Role.AGENT
		) {
			throw new ForbiddenException(
				"Agent admin can only deactivate agents",
			);
		}

		if (
			deactivatedByRole === Role.RESPONDER_ADMIN &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				existingUser.role,
			)
		) {
			throw new ForbiddenException(
				"Responder admin can only deactivate responders",
			);
		}

		const data = await this.usersService.deactivateUser(
			userId,
			deactivatedBy,
			deactivatedByRole,
		);

		return {
			message: "User deactivated successfully",
			data: UserResponseDto.fromUser(data),
		};
	}
}
