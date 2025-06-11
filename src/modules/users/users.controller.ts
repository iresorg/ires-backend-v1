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
} from "@nestjs/common";
import { UsersService } from "./users.service";
import {
	ApiBearerAuth,
	ApiTags,
	ApiOperation,
	ApiResponse,
} from "@nestjs/swagger";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "./enums/role.enum";
import { UserResponseDto } from "./dto/user-response.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { AuthRequest } from "@/shared/interfaces/request.interface";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	@Roles(Role.SUPER_ADMIN)
	@ApiOperation({ summary: "Get all users" })
	@ApiResponse({
		status: 200,
		description: "List of all users",
		type: [UserResponseDto],
	})
	async getUsers(): Promise<{ message: string; data: UserResponseDto[] }> {
		const users = await this.usersService.findAll();
		const data = UserResponseDto.fromUsers(users);

		return {
			message: "Users fetched successfully",
			data,
		};
	}

	@Get(":id")
	@Roles(Role.SUPER_ADMIN)
	@ApiOperation({ summary: "Get user by ID" })
	@ApiResponse({
		status: 200,
		description: "User details",
		type: UserResponseDto,
	})
	async getUserById(
		@Param("id") id: string,
	): Promise<{ message: string; data: UserResponseDto }> {
		const user = await this.usersService.findOne({ id });

		if (!user)
			throw new NotFoundException(
				"User not found. Please check and try again later.",
			);

		const data = UserResponseDto.fromUser(user);

		return {
			message: "User fetched successfully",
			data,
		};
	}

	@Post()
	@Roles(Role.SUPER_ADMIN)
	@ApiOperation({ summary: "Create a new user" })
	@ApiResponse({
		status: 201,
		description: "User created successfully",
		type: UserResponseDto,
	})
	async createUser(
		@Body() createUserDto: CreateUserDto,
	): Promise<{ message: string; data: UserResponseDto }> {
		const user = await this.usersService.create({
			firstName: createUserDto.firstName,
			lastName: createUserDto.lastName,
			email: createUserDto.email,
			password: createUserDto.password,
			role: createUserDto.role,
		});
		const data = UserResponseDto.fromUser(user);

		return {
			message: "User created successfully",
			data,
		};
	}

	@Put(":id")
	@Roles(Role.SUPER_ADMIN)
	@ApiOperation({ summary: "Update user" })
	@ApiResponse({
		status: 200,
		description: "User updated successfully",
		type: UserResponseDto,
	})
	async updateUser(
		@Param("id") id: string,
		@Body() updateUserDto: Partial<CreateUserDto>,
	): Promise<{ message: string; data: UserResponseDto }> {
		const user = await this.usersService.update(id, updateUserDto);
		if (!user) {
			throw new NotFoundException("User not found");
		}

		const data = UserResponseDto.fromUser(user);

		return {
			message: "User updated successfully",
			data,
		};
	}

	@Delete(":id")
	@Roles(Role.SUPER_ADMIN)
	@ApiOperation({ summary: "Delete user" })
	@ApiResponse({
		status: 200,
		description: "User deleted successfully",
	})
	async deleteUser(@Param("id") id: string): Promise<{ message: string }> {
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
			email: updateUserDto.email,
			password: updateUserDto.password,
			role: updateUserDto.role,
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
}
