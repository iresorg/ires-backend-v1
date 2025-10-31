# Cron Job for Subscription Expiry Reminders

## What We Need

### 1. **Install Cron Package**

```bash
npm install @nestjs/schedule
```

### 2. **Add to App Module**

```typescript
// src/app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ... other imports
    ScheduleModule.forRoot(),
    // ... rest
  ],
})
```

### 3. **Create Scheduler Service**

Create `src/modules/subscriptions/services/subscription-scheduler.service.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subscription } from "../entities/subscription.entity";
import { EmailService } from "@/shared/email/service";

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly emailService: EmailService,
  ) {}

  // Run every day at 8 AM
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringSubscriptions() {
    this.logger.log("Checking for expiring subscriptions...");

    // Get subscriptions expiring in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSubscriptions = await this.subscriptionRepo
      .createQueryBuilder("subscription")
      .leftJoinAndSelect("subscription.account", "account")
      .leftJoinAndSelect("subscription.plan", "plan")
      .where("subscription.status = :status", { status: "active" })
      .andWhere("subscription.currentPeriodEnd BETWEEN :now AND :threeDays", {
        now: new Date(),
        threeDays: threeDaysFromNow,
      })
      .getMany();

    for (const sub of expiringSubscriptions) {
      // Send reminder email
      await this.emailService.sendSubscriptionEndingSoonEmail(
        sub.account.email,
        sub.account.email,
        sub.plan.name,
        sub.currentPeriodEnd.toLocaleDateString(),
      );
    }

    this.logger.log(
      `Found ${expiringSubscriptions.length} expiring subscriptions`,
    );
  }
}
```

### 4. **Add Email Template**

Create `src/shared/email/templates/SubscriptionEndingSoon.tsx`:

```typescript
// Similar to other templates, warn users subscription expiring soon
```

### 5. **Register in Module**

```typescript
// subscriptions.module.ts
import { SubscriptionSchedulerService } from './services/subscription-scheduler.service';

providers: [
  // ... other providers
  SubscriptionSchedulerService,
],
```

## What the Cron Job Does

**Every day at 8 AM:**

1. Checks all active subscriptions
2. Finds subscriptions expiring in 3 days
3. Sends reminder email to users
4. Logs the results

## How to Add Reminder Days Before Expiry

You can customize:

- `+3` = 3 days before expiry (default)
- `+7` = 1 week before
- `+1` = 1 day before

Just change in the scheduler service:

```typescript
threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 7); // 1 week
```

## Manual Testing

To test without waiting:

```typescript
@Post('test-cron')
async testCron() {
  return await this.schedulerService.checkExpiringSubscriptions();
}
```
