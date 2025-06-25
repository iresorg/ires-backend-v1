import {
	Injectable,
	Inject,
	ConflictException,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";
import { GenerateTokenDto } from "./dto/generate-token.dto";
import {
	AgentNotFoundError,
	AgentAlreadyExistsError,
} from "@/shared/errors/agent.errors";
import { IAgent, IAgentUpdate } from "./interfaces/agent.interface";
import {
	IAgentRepository,
	IAgentTokenRepository,
} from "./interfaces/agent-repo.interface";
import constants from "./constants/constants";
import { generateUniqueAgentId } from "./utils/agent-id.generator";
import { TokenEncryption } from "@/shared/utils/token-encryption.util";
import { ConfigService } from "@nestjs/config";
import { EnvVariables } from "@/utils/env.validate";
import { Utils } from "@/utils/utils";
import { Logger } from "@/shared/logger/service";
import { AsyncContextService } from "@/shared/async-context/service";
import { IUser } from "../users/interfaces/user.interface";

@Injectable()
export class AgentsService {
	constructor(
		@Inject(constants.AGENT_REPOSITORY)
		private agentRepository: IAgentRepository,
		@Inject(constants.AGENT_TOKEN_REPOSITORY)
		private agentTokenRepository: IAgentTokenRepository,
		private configService: ConfigService<EnvVariables>,
		private utils: Utils,
		private readonly logger: Logger,
		private readonly asyncContext: AsyncContextService,
	) {}

	async create(): Promise<IAgent> {
		try {
			const agentId = await generateUniqueAgentId(this.agentRepository);
			const agent = await this.agentRepository.create({
				agentId,
			});

			const contextUser = this.asyncContext.get("user");
			const user = contextUser as IUser;
			this.logger.log("Agent created successfully", {
				agentId,
				createdBy: user?.email || "system",
			});

			return agent;
		} catch (error) {
			this.logger.error("Failed to create agent", {
				error: error instanceof Error ? error.message : "Unknown error",
			});
			if (error instanceof AgentAlreadyExistsError) {
				throw new ConflictException(
					"Agent with this ID already exists.",
				);
			}
			throw error;
		}
	}

	async findAll(): Promise<IAgent[]> {
		return this.agentRepository.findAll();
	}

	async findActiveAgents(): Promise<IAgent[]> {
		return this.agentRepository.findActiveAgents();
	}

	async findOne(agentId: string): Promise<IAgent> {
		const agent = await this.agentRepository.findById(agentId);
		if (!agent) {
			this.logger.error("Agent not found", { agentId });
			throw new AgentNotFoundError(`Agent with ID ${agentId} not found`);
		}
		return agent;
	}

	async updateStatus(
		agentId: string,
		updateStatusDto: UpdateAgentStatusDto,
	): Promise<IAgent> {
		try {
			const updateData: IAgentUpdate = {
				isActive: updateStatusDto.isActive,
			};
			const agent = await this.agentRepository.update(
				agentId,
				updateData,
			);
			this.logger.log("Agent status updated", {
				agentId,
				isActive: updateStatusDto.isActive,
			});
			return agent;
		} catch (error) {
			this.logger.error("Failed to update agent status", {
				error: error instanceof Error ? error.message : "Unknown error",
				agentId,
				isActive: updateStatusDto.isActive,
			});
			if (error instanceof AgentNotFoundError) {
				throw new NotFoundException("Agent not found.");
			}
			throw error;
		}
	}

	async generateToken(
		agentId: string,
		generateTokenDto: GenerateTokenDto,
	): Promise<string> {
		try {
			await this.findOne(agentId); // Verify agent exists

			// Validate expiration date is in the future
			const expirationDate = new Date(generateTokenDto.expiresAt);
			const currentDate = new Date();

			if (expirationDate <= currentDate) {
				throw new BadRequestException(
					"Expiration date must be in the future",
				);
			}

			// Ensure token encryption is initialized
			if (!TokenEncryption.isReady()) {
				this.logger.error("Token encryption service not ready");
				throw new BadRequestException(
					"Token encryption service is not ready. Please try again.",
				);
			}

			// Generate a random token
			const token = Math.random().toString(36).substring(2, 15);
			const tokenHash = await bcrypt.hash(token, 10);
			const encryptedToken = TokenEncryption.encrypt(token);

			// Revoke existing token if any
			await this.agentTokenRepository.revokeToken(agentId);

			// Create new token record
			await this.agentTokenRepository.create({
				agentId,
				tokenHash,
				encryptedToken,
				expiresAt: expirationDate,
			});

			this.logger.log("Token generated successfully", {
				agentId,
				expiresAt: expirationDate,
			});

			return token; // Return the original token to the client
		} catch (error) {
			this.logger.error("Failed to generate token", {
				error: error instanceof Error ? error.message : "Unknown error",
				agentId,
			});
			if (
				error instanceof BadRequestException ||
				error instanceof ConflictException
			) {
				throw error; // Re-throw validation and conflict errors
			}
			if (error instanceof NotFoundException) {
				throw new NotFoundException("Agent not found.");
			}
			// Handle unexpected errors
			throw new BadRequestException(
				"Failed to generate token. Please try again.",
			);
		}
	}

	async validateToken(agentId: string, token: string): Promise<boolean> {
		const activeToken =
			await this.agentTokenRepository.findActiveToken(agentId);
		if (!activeToken) {
			return false;
		}

		return bcrypt.compare(token, activeToken.tokenHash);
	}

	async getToken(agentId: string): Promise<string | null> {
		const activeToken =
			await this.agentTokenRepository.findActiveToken(agentId);
		if (!activeToken || !activeToken.encryptedToken) {
			return null;
		}

		try {
			// Ensure token encryption is initialized
			if (!TokenEncryption.isReady()) {
				console.warn(
					"Token encryption not initialized when trying to decrypt token",
				);
				return null;
			}

			return TokenEncryption.decrypt(activeToken.encryptedToken);
		} catch (error) {
			console.error("Failed to decrypt token:", error);
			return null;
		}
	}

	async revokeToken(agentId: string): Promise<void> {
		try {
			await this.agentTokenRepository.revokeToken(agentId);
		} catch (error) {
			if (error instanceof AgentNotFoundError) {
				throw new NotFoundException("Agent not found.");
			}
			throw error;
		}
	}
}
