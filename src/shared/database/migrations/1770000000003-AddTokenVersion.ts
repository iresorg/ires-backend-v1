import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTokenVersion1770000000003 implements MigrationInterface {
	name = "AddTokenVersion1770000000003";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "accounts"
			ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0
		`);
		await queryRunner.query(`
			ALTER TABLE "users"
			ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "accounts" DROP COLUMN IF EXISTS "token_version"
		`);
		await queryRunner.query(`
			ALTER TABLE "users" DROP COLUMN IF EXISTS "token_version"
		`);
	}
}
