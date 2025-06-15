import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import type { CreateUserDto } from "./dto/create-user";
import { Utils } from "@/utils/utils";
import type { IUser } from "../users/interfaces/user.interface";
import type { LoginDto, LoginResponseDto } from "./dto/login";
import type { AuthPayload } from "./interfaces/auth";
import { EmailService } from "@/shared/email/service";

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly utils: Utils,
		private readonly emailService: EmailService,
	) {}

	async login(body: LoginDto): Promise<LoginResponseDto> {
		const user = await this.usersService.findOne({ email: body.email });
		if (!user) {
			throw new UnauthorizedException("Invalid credentials");
		}

		const passwordMatch = await this.utils.ensureHashMatchesText(
			user.password,
			body.password,
		);

		if (!passwordMatch)
			throw new UnauthorizedException("Invalid credentials");
		const payload: AuthPayload = {
			id: user.id,
			email: user.email,
			role: user.role,
		};

		const token = this.utils.generateJWT(payload);

		return {
			user: {
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				id: user.id,
				avatar: user.avatar,
				status: user.status,
			},
			accessToken: token,
		};
	}
}
