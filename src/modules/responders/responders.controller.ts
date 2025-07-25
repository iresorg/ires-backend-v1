import {
	Controller,
	Post,
	Body,
	Req,
	UseGuards,
	ForbiddenException,
	Get,
	Query,
} from "@nestjs/common";
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

@Controller("responders")
@UseGuards(AuthGuard, RoleGuard)
export class RespondersController {
	constructor(private readonly respondersService: RespondersService) {}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.RESPONDER_ADMIN)
	async createResponder(
		@Body() createResponderDto: CreateResponderDto,
		@Req() req: AuthRequest,
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
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	async getResponders(
		@Query() pagination: PaginationQuery,
	): Promise<PaginationResult<UserResponseDto>> {
		const page = pagination.page ?? 1;
		const limit = pagination.limit ?? 10;
		const offset = (page - 1) * limit;
		const { users, total } =
			await this.respondersService.findRespondersPaginated(limit, offset);
		const data = UserResponseDto.fromUsers(users);
		return buildPaginationResult(data, total, { page, limit });
	}
}
