import {
	Injectable,
	Inject,
	ConflictException,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { UpdateResponderStatusDto } from "./dto/update-responder-status.dto";
import { GenerateTokenDto } from "./dto/generate-token.dto";
import {
	ResponderNotFoundError,
	ResponderAlreadyExistsError,
} from "@/shared/errors/responder.errors";
import { IResponder, IResponderUpdate } from "./interfaces/responder.interface";
import {
	IResponderRepository,
	IResponderTokenRepository,
} from "./interfaces/responder-repo.interface";
import constants from "./constants/constants";
import { generateUniqueResponderId } from "./utils/responder-id.generator";
import { TokenEncryption } from "@/shared/utils/token-encryption.util";
import { ConfigService } from "@nestjs/config";
import { EnvVariables } from "@/utils/env.validate";
import { Utils } from "@/utils/utils";
import { Logger } from "@/shared/logger/service";
import { AsyncContextService } from "@/shared/async-context/service";
import { IUser } from "../users/interfaces/user.interface";
import { QueueService } from "@/shared/queue/service";
import { ResponderType } from "./enums/responder-type.enum";
import { RESPONDER_STATUS_QUEUE } from "@/shared/queue/consumers/responder-status.consumer";

@Injectable()
export class RespondersService {
	constructor(
		@Inject(constants.RESPONDER_REPOSITORY)
		private responderRepository: IResponderRepository,
		@Inject(constants.RESPONDER_TOKEN_REPOSITORY)
		private responderTokenRepository: IResponderTokenRepository,
		private configService: ConfigService<EnvVariables>,
		private utils: Utils,
		private readonly logger: Logger,
		private readonly asyncContext: AsyncContextService,
		private readonly queueService: QueueService,
	) {}

	async create(
		type: ResponderType = ResponderType.TIER1,
	): Promise<IResponder> {
		try {
			const responderId = await generateUniqueResponderId(
				this.responderRepository,
			);
			const responder = await this.responderRepository.create({
				responderId,
				type,
			});

			const contextUser = this.asyncContext.get("user");
			const user = contextUser as IUser;
			this.logger.log("Responder created successfully", {
				responderId,
				type,
				createdBy: user?.email || "system",
			});

			// Send initial status to queue
			await this.queueService.sendToQueue(RESPONDER_STATUS_QUEUE, {
				responderId,
				status: "offline",
				timestamp: new Date().toISOString(),
			});

			return responder;
		} catch (error) {
			this.logger.error("Failed to create responder", {
				error: error instanceof Error ? error.message : "Unknown error",
				type,
			});
			if (error instanceof ResponderAlreadyExistsError) {
				throw new ConflictException(
					"Responder with this ID already exists.",
				);
			}
			throw error;
		}
	}

	async findAll(): Promise<IResponder[]> {
		return this.responderRepository.findAll();
	}

	async findActiveResponders(): Promise<IResponder[]> {
		return this.responderRepository.findActiveResponders();
	}

	async findOnlineResponders(): Promise<IResponder[]> {
		return this.responderRepository.findOnlineResponders();
	}

	async findOne(responderId: string): Promise<IResponder> {
		const responder = await this.responderRepository.findById(responderId);
		if (!responder) {
			this.logger.error("Responder not found", { responderId });
			throw new NotFoundException("Responder not found.");
		}
		return responder;
	}

	async updateStatus(
		responderId: string,
		updateStatusDto: UpdateResponderStatusDto,
	): Promise<IResponder> {
		try {
			const updateData: IResponderUpdate = {
				isActive: updateStatusDto.isActive,
			};
			const responder = await this.responderRepository.update(
				responderId,
				updateData,
			);

			this.logger.log("Responder status updated", {
				responderId,
				...updateData,
			});

			return responder;
		} catch (error) {
			this.logger.error("Failed to update responder status", {
				error: error instanceof Error ? error.message : "Unknown error",
				responderId,
				isActive: updateStatusDto.isActive,
			});
			if (error instanceof ResponderNotFoundError) {
				throw new NotFoundException("Responder not found.");
			}
			throw error;
		}
	}

	async generateToken(
		responderId: string,
		generateTokenDto: GenerateTokenDto,
	): Promise<{ token: string }> {
		try {
			await this.findOne(responderId);

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
			await this.responderTokenRepository.revokeToken(responderId);

			// Create new token record
			await this.responderTokenRepository.create({
				responderId,
				tokenHash,
				encryptedToken,
				expiresAt: expirationDate,
			});

			this.logger.log("Token generated for responder", {
				responderId,
				expiresAt: expirationDate,
			});

			return { token };
		} catch (error) {
			this.logger.error("Failed to generate token", {
				error: error instanceof Error ? error.message : "Unknown error",
				responderId,
			});
			if (
				error instanceof BadRequestException ||
				error instanceof ConflictException
			) {
				throw error; // Re-throw validation and conflict errors
			}
			if (error instanceof NotFoundException) {
				throw new NotFoundException("Responder not found.");
			}
			// Handle unexpected errors
			throw new BadRequestException(
				"Failed to generate token. Please try again.",
			);
		}
	}

	async validateToken(responderId: string, token: string): Promise<boolean> {
		const activeToken =
			await this.responderTokenRepository.findActiveToken(responderId);
		if (!activeToken) {
			return false;
		}

		return bcrypt.compare(token, activeToken.tokenHash);
	}

	async getToken(responderId: string): Promise<string | null> {
		const activeToken =
			await this.responderTokenRepository.findActiveToken(responderId);
		if (!activeToken || !activeToken.encryptedToken) {
			return null;
		}

		try {
			// Ensure token encryption is initialized
			if (!TokenEncryption.isReady()) {
				this.logger.warn(
					"Token encryption not initialized when trying to decrypt token",
					{ responderId },
				);
				return null;
			}

			return TokenEncryption.decrypt(activeToken.encryptedToken);
		} catch (error) {
			this.logger.error("Failed to decrypt token", {
				error: error instanceof Error ? error.message : "Unknown error",
				responderId,
			});
			return null;
		}
	}

	async revokeToken(responderId: string): Promise<void> {
		try {
			await this.responderTokenRepository.revokeToken(responderId);
			this.logger.log("Token revoked for responder", { responderId });
		} catch (error) {
			this.logger.error("Failed to revoke token", {
				error: error instanceof Error ? error.message : "Unknown error",
				responderId,
			});
			if (error instanceof ResponderNotFoundError) {
				throw new NotFoundException("Responder not found.");
			}
			throw error;
		}
	}

	async updateType(
		responderId: string,
		type: ResponderType,
	): Promise<IResponder> {
		try {
			const responder = await this.responderRepository.update(
				responderId,
				{ type },
			);
			this.logger.log("Responder type updated", {
				responderId,
				type,
			});
			return responder;
		} catch (error) {
			this.logger.error("Failed to update responder type", {
				error: error instanceof Error ? error.message : "Unknown error",
				responderId,
				type,
			});
			if (error instanceof ResponderNotFoundError) {
				throw new NotFoundException("Responder not found.");
			}
			throw error;
		}
	}

	// Internal method for queue/consumer updates
	async updateStatusFromConsumer(
		responderId: string,
		update: {
			isOnline?: boolean;
			lastSeen?: Date;
			lastStatusChangeAt?: Date;
		},
	): Promise<IResponder> {
		const responder = await this.responderRepository.update(
			responderId,
			update,
		);
		this.logger.log("Responder status updated from consumer", {
			responderId,
			...update,
		});
		return responder;
	}
}
