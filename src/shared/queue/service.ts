import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Logger } from "../logger/service";
import { EnvVariables } from "src/utils/env.validate";
import * as amqp from "amqplib";
import { scheduler } from "node:timers/promises";

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
	private connection: amqp.Connection;
	private channel: amqp.Channel;
	private queueReady = false;

	constructor(
		private readonly configService: ConfigService<EnvVariables>,
		private readonly logger: Logger,
	) {}

	async onModuleInit() {
		await this.connect();
		this.queueReady = true;
		this.logger.log("QueueService initialized");
	}

	async onModuleDestroy() {
		await this.disconect();
		this.logger.log("QueueService disconnected");
	}

	private isEventBusInitialized() {
		if (!this.connection || !this.channel || !this.queueReady) {
			throw new Error("Event bus is not initialized");
		}
	}

	private async connect(): Promise<void> {
		const amqpUrl = this.configService.get<string>("AMQP_URL");
		try {
			this.connection = await amqp.connect(amqpUrl);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
			this.channel = await this.connection.createChannel();

			this.connection.on("error", (error) => {
				this.logger.error(
					"RabbitMQ connection error: ",
					error as Error,
				);
			});

			this.connection.on("close", () => {
				this.logger.warn("RabbitMQ connection close");
			});

			this.logger.log("RabbitMQ connection established");
		} catch (error) {
			this.logger.error(
				"Failed to connect to RabbitMQ: ",
				error as Error,
			);
			throw error;
		}
	}

	private async disconect(): Promise<void> {
		try {
			if (this.connection) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				await this.connection.close();
			}

			if (this.channel) {
				await this.channel.close();
			}

			this.logger.log("RabbitMQ connection closed");
		} catch (error) {
			this.logger.error(
				"Failed to disconnect from RabbitMQ: ",
				error as Error,
			);

			throw error;
		}
	}

	async registerConsumer(
		queueName: string,
		callback: (message: amqp.ConsumeMessage) => void | Promise<void>,
		limit = 10,
	) {
		await this.waitForQueueReady();
		try {
			this.isEventBusInitialized();

			await this.channel.prefetch(limit);
			await this.channel.assertQueue(queueName, {
				durable: true,
			});

			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			await this.channel.consume(queueName, callback, {
				noAck: false,
			});
		} catch (error) {
			this.logger.error("Failed to register consumer: ", error as Error);
			throw error;
		}
	}

	async waitForQueueReady() {
		while (!this.queueReady) {
			await scheduler.wait(5000);
		}
	}

	acknowledgeMessage(message: amqp.ConsumeMessage) {
		this.channel.ack(message);
	}

	async sendToQueue(queueName: string, message: unknown) {
		this.isEventBusInitialized();

		await this.channel.assertQueue(queueName, {
			durable: true,
		});

		return this.channel.sendToQueue(
			queueName,
			Buffer.from(JSON.stringify(message)),
			{
				persistent: true,
			},
		);
	}
}
