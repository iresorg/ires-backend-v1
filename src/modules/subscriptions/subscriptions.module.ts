import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SubscriptionsController } from "./controllers/subscriptions.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { SubscriptionsService } from "./services/subscriptions.service";
import { PaystackService } from "./services/paystack.service";
import { PaystackWebhookService } from "./services/paystack-webhook.service";
import { SubscriptionsRepository } from "./repository/subscriptions.repository";
import { TransactionsRepository } from "./repository/transactions.repository";
import { IncidentCreditsRepository } from "./repository/incident-credits.repository";
import { Subscription } from "./entities/subscription.entity";
import { SubscriptionPlan } from "./entities/subscription-plan.entity";
import { PaystackEvent } from "./entities/paystack-event.entity";
import { SubscriptionTransaction } from "./entities/transaction.entity";
import { IncidentCredit } from "./entities/incident-credit.entity";
import { Tickets } from "../tickets/entities/ticket.entity";
import { AccountsModule } from "../accounts/accounts.module";
import { EmailModule } from "@/shared/email/module";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Subscription,
			SubscriptionPlan,
			PaystackEvent,
			SubscriptionTransaction,
			IncidentCredit,
			Tickets,
		]),
		AccountsModule,
		EmailModule,
	],
	controllers: [SubscriptionsController, WebhooksController],
	providers: [
		SubscriptionsService,
		PaystackService,
		PaystackWebhookService,
		SubscriptionsRepository,
		TransactionsRepository,
		IncidentCreditsRepository,
	],
	exports: [
		SubscriptionsService,
		SubscriptionsRepository,
		PaystackService,
		IncidentCreditsRepository,
	],
})
export class SubscriptionsModule {}
