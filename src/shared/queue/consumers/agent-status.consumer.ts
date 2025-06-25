/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from "@nestjs/common";
import { QueueService } from "../service";
import { AgentsService } from "../../../modules/agents/agents.service";
import { Logger } from "../../logger/service";
import { ConsumeMessage } from "amqplib";

export const AGENT_STATUS_QUEUE = "agent_status";

interface AgentStatusMessage {
	agentId: string;
	status: "online" | "offline";
	timestamp: string;
}

type MessageHandler = (message: ConsumeMessage) => Promise<void>;

@Injectable()
export class AgentStatusConsumer implements OnModuleInit {
	constructor(
		private readonly queueService: QueueService,
		private readonly agentsService: AgentsService,
		private readonly logger: Logger,
	) {}

	async onModuleInit() {
		try {
			const handler: MessageHandler = this.handleMessage.bind(this);
			await this.queueService.registerConsumer(
				AGENT_STATUS_QUEUE,
				handler,
			);
			this.logger.log(
				"Agent status queue consumer registered successfully",
			);
		} catch (error) {
			this.logger.error("Failed to register agent status consumer", {
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	private handleMessage: MessageHandler = async (message) => {
		try {
			const content = message.content.toString();
			const data = JSON.parse(content) as AgentStatusMessage;

			// First check if agent exists and is active
			const agent = await this.agentsService.findOne(data.agentId);
			if (!agent) {
				this.logger.warn("Agent not found for status update", {
					agentId: data.agentId,
				});
				this.queueService.nack(message, false);
				return;
			}

			if (!agent.isActive) {
				this.logger.warn("Inactive agent trying to update status", {
					agentId: data.agentId,
				});
				this.queueService.nack(message, false);
				return;
			}

			// Only update lastSeen for active agents
			await this.agentsService.updateStatus(data.agentId, {
				lastSeen:
					data.status === "online" ? new Date(data.timestamp) : null,
			});

			this.logger.log("Agent status updated successfully", {
				agentId: data.agentId,
				status: data.status,
				timestamp: data.timestamp,
			});

			this.queueService.ack(message);
		} catch (error) {
			this.logger.error("Failed to process agent status message", {
				error: error instanceof Error ? error.message : "Unknown error",
				messageContent: message.content.toString(),
			});
			// Reject the message and don't requeue it
			this.queueService.nack(message, false);
		}
	};
}
