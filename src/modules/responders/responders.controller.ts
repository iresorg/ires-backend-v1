import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Put,
	Delete,
	UseGuards,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiTags,
	ApiOperation,
	ApiResponse,
} from "@nestjs/swagger";
import { RespondersService } from "./responders.service";
import { UpdateResponderStatusDto } from "./dto/update-responder-status.dto";
import { GenerateTokenDto } from "./dto/generate-token.dto";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "../users/enums/role.enum";
import { ResponderType } from "./enums/responder-type.enum";

@ApiTags("Responders")
@ApiBearerAuth()
@Controller("responders")
@UseGuards(JwtAuthGuard, RoleGuard)
export class RespondersController {
	constructor(private readonly respondersService: RespondersService) {}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Create a new responder" })
	@ApiResponse({
		status: 201,
		description: "Responder created successfully",
	})
	async create(@Body("type") type: ResponderType) {
		const responder = await this.respondersService.create(type);
		return {
			message: "Responder created successfully",
			data: responder,
		};
	}

	@Get()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Get all responders" })
	@ApiResponse({
		status: 200,
		description: "List of all responders",
	})
	async findAll() {
		const responders = await this.respondersService.findAll();
		return {
			message: "Responders fetched successfully",
			data: responders,
		};
	}

	@Get("active")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Get all active responders" })
	@ApiResponse({
		status: 200,
		description: "List of active responders",
	})
	async findActive() {
		const responders = await this.respondersService.findActiveResponders();
		return {
			message: "Active responders fetched successfully",
			data: responders,
		};
	}

	@Get(":id")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Get responder by ID" })
	@ApiResponse({
		status: 200,
		description: "Responder details",
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async findOne(@Param("id") id: string) {
		const responder = await this.respondersService.findOne(id);
		return {
			message: "Responder fetched successfully",
			data: responder,
		};
	}

	@Put(":id/status")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Update responder active status (admin only)" })
	@ApiResponse({
		status: 200,
		description: "Responder status updated successfully",
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async updateStatus(
		@Param("id") id: string,
		@Body() updateStatusDto: UpdateResponderStatusDto,
	) {
		const responder = await this.respondersService.updateStatus(
			id,
			updateStatusDto,
		);
		return {
			message: "Responder status updated successfully",
			data: responder,
		};
	}

	@Put(":id/type")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Update responder type" })
	@ApiResponse({
		status: 200,
		description: "Responder type updated successfully",
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async updateType(
		@Param("id") id: string,
		@Body("type") type: ResponderType,
	) {
		const responder = await this.respondersService.updateType(id, type);
		return {
			message: "Responder type updated successfully",
			data: responder,
		};
	}

	@Post(":id/token")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Generate token for responder" })
	@ApiResponse({
		status: 201,
		description: "Token generated successfully",
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async generateToken(
		@Param("id") id: string,
		@Body() generateTokenDto: GenerateTokenDto,
	) {
		const result = await this.respondersService.generateToken(
			id,
			generateTokenDto,
		);
		return {
			message: "Token generated successfully",
			data: result,
		};
	}

	@Delete(":id/token")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.RESPONDER_ADMIN)
	@ApiOperation({ summary: "Revoke responder token" })
	@ApiResponse({
		status: 200,
		description: "Token revoked successfully",
	})
	@ApiResponse({
		status: 404,
		description: "Responder not found",
	})
	async revokeToken(@Param("id") id: string) {
		await this.respondersService.revokeToken(id);
		return {
			message: "Token revoked successfully",
		};
	}
}
