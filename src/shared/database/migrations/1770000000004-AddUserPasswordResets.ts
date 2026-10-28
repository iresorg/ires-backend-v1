import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPasswordResets1770000000004 implements MigrationInterface {
	name = "AddUserPasswordResets1770000000004";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "user_password_resets" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"email" character varying NOT NULL,
				"token" character varying NOT NULL,
				"expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
				"used" boolean NOT NULL DEFAULT false,
				"user_id" uuid,
				CONSTRAINT "PK_user_password_resets" PRIMARY KEY ("id")
			)
		`);
		await queryRunner.query(`
			DO $$ BEGIN
				ALTER TABLE "user_password_resets"
				ADD CONSTRAINT "FK_user_password_resets_user"
				FOREIGN KEY ("user_id") REFERENCES "users"("id")
				ON DELETE CASCADE ON UPDATE NO ACTION;
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END $$;
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_user_password_resets_email"
			ON "user_password_resets" ("email")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_user_password_resets_token"
			ON "user_password_resets" ("token")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS "user_password_resets"`);
	}
}
