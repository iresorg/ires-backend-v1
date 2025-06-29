import { forwardRef, Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Logger } from "@/shared/logger/service";
import { RespondersService } from "@/modules/responders/responders.service";
import { QueueService } from "../service";
import { ConsumeMessage } from "amqplib";
import {
	ResponderStatusMessageDto,
	StatusType,
} from "./dto/status-message.dto";
import { validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";

export const RESPONDER_STATUS_QUEUE = "responder-status";

type MessageHandler = (message: ConsumeMessage) => Promise<void>;

@Injectable()
export class ResponderStatusConsumer implements OnModuleInit {
	constructor(
		@Inject(forwardRef(() => RespondersService))
		private readonly respondersService: RespondersService,
		private readonly logger: Logger,
		private readonly queueService: QueueService,
	) {}

	async onModuleInit() {
		try {
			const handler = this.handleMessage.bind(this) as MessageHandler;
			await this.queueService.registerConsumer(
				RESPONDER_STATUS_QUEUE,
				handler,
			);
			this.logger.log(
				"Responder status queue consumer registered successfully",
			);
		} catch (error) {
			this.logger.error("Failed to register responder status consumer", {
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	private validateMessage(data: unknown): ResponderStatusMessageDto {
		const messageDto = plainToInstance(ResponderStatusMessageDto, data);
		const errors = validateSync(messageDto);

		if (errors.length > 0) {
			throw new Error(`Message validation failed: ${errors.toString()}`);
		}

		return messageDto;
	}

	private handleMessage: MessageHandler = async (message) => {
		try {
			const content = message.content.toString();
			const rawData = JSON.parse(content) as Record<string, unknown>;

			// Derive isOnline from status if not provided
			if (rawData.status && !rawData.isOnline) {
				rawData.isOnline = rawData.status === StatusType.ONLINE;
			}

			const data = this.validateMessage(rawData);

			// First check if responder exists and is active
			const responder = await this.respondersService.findOne(
				data.responderId,
			);
			if (!responder) {
				this.logger.warn("Responder not found for status update", {
					responderId: data.responderId,
				});
				this.queueService.nack(message, false);
				return;
			}

			if (!responder.isActive) {
				this.logger.warn("Inactive responder trying to update status", {
					responderId: data.responderId,
				});
				this.queueService.nack(message, false);
				return;
			}

			// Check if status is actually changing
			const isOnline = data.isOnline ?? data.status === StatusType.ONLINE;
			const isStatusChanging = responder.isOnline !== isOnline;
			const now = new Date();

			// Update both isOnline and lastSeen for better status tracking
			await this.respondersService.updateStatusFromConsumer(
				data.responderId,
				{
					isOnline: isOnline,
					lastSeen: new Date(data.timestamp),
					lastStatusChangeAt: isStatusChanging ? now : undefined,
				},
			);

			this.logger.log("Responder status updated successfully", {
				responderId: data.responderId,
				status: data.status,
				timestamp: data.timestamp,
				isOnline: isOnline,
				statusChanged: isStatusChanging,
			});

			this.queueService.ack(message);
		} catch (error) {
			this.logger.error("Failed to process responder status message", {
				error: error instanceof Error ? error.message : "Unknown error",
				messageContent: message.content.toString(),
			});
			// Reject the message and don't requeue it
			this.queueService.nack(message, false);
		}
	};
}
