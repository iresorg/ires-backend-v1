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

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Controller("users")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Get all users with pagination" })
	@ApiResponse({
		status: 200,
		description: "Paginated list of users",
		schema: {
			type: "object",
			properties: {
				message: { type: "string" },
				data: {
					type: "array",
					items: { $ref: "#/components/schemas/UserResponseDto" },
				},
				pagination: {
					type: "object",
					properties: {
						page: { type: "number" },
						limit: { type: "number" },
						total: { type: "number" },
						totalPages: { type: "number" },
					},
				},
			},
		},
	})
	async getUsers(
		@Req() req: AuthRequest,
		@Query("page") page: string = "1",
		@Query("limit") limit: string = "10",
	): Promise<{
		message: string;
		data: UserResponseDto[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const { role: currentUserRole } = req.user;
		const pageNum = parseInt(page, 10) || 1;
		const limitNum = parseInt(limit, 10) || 10;

		let result;
		if (currentUserRole === Role.AGENT_ADMIN) {
			result = await this.usersService.findByRolePaginated(
				Role.AGENT,
				pageNum,
				limitNum,
			);
		} else if (currentUserRole === Role.RESPONDER_ADMIN) {
			result = await this.usersService.findByRolesPaginated(
				[Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2],
				pageNum,
				limitNum,
			);
		} else {
			result = await this.usersService.findAllPaginated(pageNum, limitNum);
		}

		const data = UserResponseDto.fromUsers(result.users);

		return {
			message: "Users fetched successfully",
			data,
			pagination: {
				page: pageNum,
				limit: limitNum,
				total: result.total,
				totalPages: result.totalPages,
			},
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

	@Put("profile")
	@ApiOperation({
		summary: "Update user profile",
		description: "Update the current user's profile information.",
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
