import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanPaymentType1770000000002 implements MigrationInterface {
	name = "AddPlanPaymentType1770000000002";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "subscription_plans"
			ADD COLUMN IF NOT EXISTS "payment_type" character varying NOT NULL DEFAULT 'subscription'
		`);

		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_subscription_plans_payment_type"
			ON "subscription_plans" ("payment_type")
		`);

		// Backfill: anything previously marked with interval one_time becomes PAYG
		await queryRunner.query(`
			UPDATE "subscription_plans"
			SET "payment_type" = 'one_time', "interval" = NULL
			WHERE "interval" = 'one_time'
		`);

		await queryRunner.query(`
			ALTER TABLE "subscription_plans"
			ALTER COLUMN "interval" DROP NOT NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE "subscription_plans"
			SET "interval" = 'one_time'
			WHERE "payment_type" = 'one_time'
		`);

		await queryRunner.query(`
			UPDATE "subscription_plans"
			SET "interval" = 'monthly'
			WHERE "interval" IS NULL
		`);

		await queryRunner.query(`
			ALTER TABLE "subscription_plans"
			ALTER COLUMN "interval" SET NOT NULL
		`);

		await queryRunner.query(
			`DROP INDEX IF EXISTS "IDX_subscription_plans_payment_type"`,
		);
		await queryRunner.query(`
			ALTER TABLE "subscription_plans"
			DROP COLUMN IF EXISTS "payment_type"
		`);
	}
}
