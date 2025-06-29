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
import { QueueService } from "@/shared/queue/service";
import { AGENT_STATUS_QUEUE } from "@/shared/queue/consumers/agent-status.consumer";

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
		private readonly queueService: QueueService,
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

			// Send initial status to queue
			await this.queueService.sendToQueue(AGENT_STATUS_QUEUE, {
				agentId,
				status: "offline",
				timestamp: new Date().toISOString(),
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

	async findOnlineAgents(): Promise<IAgent[]> {
		return this.agentRepository.findOnlineAgents();
	}

	async findOne(agentId: string): Promise<IAgent> {
		const agent = await this.agentRepository.findById(agentId);
		if (!agent) {
			this.logger.error("Agent not found", { agentId });
			throw new NotFoundException("Agent not found.");
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
				...updateData,
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
				this.logger.warn(
					"Token encryption not initialized when trying to decrypt token",
					{ agentId },
				);
				return null;
			}

			return TokenEncryption.decrypt(activeToken.encryptedToken);
		} catch (error) {
			this.logger.error("Failed to decrypt token", {
				error: error instanceof Error ? error.message : "Unknown error",
				agentId,
			});
			return null;
		}
	}

	async revokeToken(agentId: string): Promise<void> {
		try {
			await this.agentTokenRepository.revokeToken(agentId);
			this.logger.log("Token revoked for agent", { agentId });
		} catch (error) {
			this.logger.error("Failed to revoke token", {
				error: error instanceof Error ? error.message : "Unknown error",
				agentId,
			});
			if (error instanceof AgentNotFoundError) {
				throw new NotFoundException("Agent not found.");
			}
			throw error;
		}
	}

	// Internal method for queue/consumer updates
	async updateStatusFromConsumer(
		agentId: string,
		update: {
			isOnline?: boolean;
			lastSeen?: Date;
			lastStatusChangeAt?: Date;
		},
	): Promise<IAgent> {
		const agent = await this.agentRepository.update(agentId, update);
		this.logger.log("Agent status updated from consumer", {
			agentId,
			...update,
		});
		return agent;
	}
}
