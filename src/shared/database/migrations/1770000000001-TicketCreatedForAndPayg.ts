import { MigrationInterface, QueryRunner } from "typeorm";

export class TicketCreatedForAndPayg1770000000001 implements MigrationInterface {
	name = "TicketCreatedForAndPayg1770000000001";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "subscription_plans"
			ALTER COLUMN "paystack_plan_code" DROP NOT NULL
		`);

		await queryRunner.query(`
			CREATE TYPE "incident_credits_status_enum" AS ENUM ('available', 'used', 'expired')
		`);

		await queryRunner.query(`
			CREATE TABLE "incident_credits" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"account_id" uuid NOT NULL,
				"plan_id" uuid,
				"transaction_id" uuid,
				"incidents_granted" integer NOT NULL DEFAULT 1,
				"incidents_used" integer NOT NULL DEFAULT 0,
				"status" "incident_credits_status_enum" NOT NULL DEFAULT 'available',
				"ticket_id" character varying,
				"metadata" jsonb,
				CONSTRAINT "PK_incident_credits" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(
			`CREATE INDEX "IDX_incident_credits_account_id" ON "incident_credits" ("account_id")`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_incident_credits_status" ON "incident_credits" ("status")`,
		);

		await queryRunner.query(`
			ALTER TABLE "incident_credits"
			ADD CONSTRAINT "FK_incident_credits_account_id"
			FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
		`);
		await queryRunner.query(`
			ALTER TABLE "incident_credits"
			ADD CONSTRAINT "FK_incident_credits_plan_id"
			FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
		`);
		await queryRunner.query(`
			ALTER TABLE "incident_credits"
			ADD CONSTRAINT "FK_incident_credits_transaction_id"
			FOREIGN KEY ("transaction_id") REFERENCES "subscription_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
		`);

		await queryRunner.query(`
			ALTER TABLE "tickets"
			ADD COLUMN "created_for_account_id" uuid
		`);
		await queryRunner.query(`
			ALTER TABLE "tickets"
			ADD COLUMN "entitlement_source" character varying
		`);
		await queryRunner.query(`
			ALTER TABLE "tickets"
			ADD COLUMN "incident_credit_id" uuid
		`);

		await queryRunner.query(`
			ALTER TABLE "tickets"
			ADD CONSTRAINT "FK_ticket_created_for_account_id"
			FOREIGN KEY ("created_for_account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
		`);
		await queryRunner.query(`
			ALTER TABLE "tickets"
			ADD CONSTRAINT "FK_ticket_incident_credit_id"
			FOREIGN KEY ("incident_credit_id") REFERENCES "incident_credits"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "tickets" DROP CONSTRAINT "FK_ticket_incident_credit_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "tickets" DROP CONSTRAINT "FK_ticket_created_for_account_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "tickets" DROP COLUMN "incident_credit_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "tickets" DROP COLUMN "entitlement_source"`,
		);
		await queryRunner.query(
			`ALTER TABLE "tickets" DROP COLUMN "created_for_account_id"`,
		);

		await queryRunner.query(
			`ALTER TABLE "incident_credits" DROP CONSTRAINT "FK_incident_credits_transaction_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "incident_credits" DROP CONSTRAINT "FK_incident_credits_plan_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE "incident_credits" DROP CONSTRAINT "FK_incident_credits_account_id"`,
		);
		await queryRunner.query(`DROP INDEX "IDX_incident_credits_status"`);
		await queryRunner.query(`DROP INDEX "IDX_incident_credits_account_id"`);
		await queryRunner.query(`DROP TABLE "incident_credits"`);
		await queryRunner.query(`DROP TYPE "incident_credits_status_enum"`);

		await queryRunner.query(`
			ALTER TABLE "subscription_plans"
			ALTER COLUMN "paystack_plan_code" SET NOT NULL
		`);
	}
}
