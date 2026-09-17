import { AppDataSource } from "./datasource";

const INITIAL_MIGRATION = {
	timestamp: "1789648491657",
	name: "InitialSchema1789648491657",
};

async function baseline() {
	await AppDataSource.initialize();

	try {
		await AppDataSource.query(`
			CREATE TABLE IF NOT EXISTS "migrations" (
				"id" SERIAL NOT NULL,
				"timestamp" bigint NOT NULL,
				"name" character varying NOT NULL,
				CONSTRAINT "PK_migrations" PRIMARY KEY ("id")
			)
		`);

		const rows: Array<{ name: string }> = await AppDataSource.query(
			`SELECT name FROM "migrations" WHERE name = $1`,
			[INITIAL_MIGRATION.name],
		);

		if (rows.length > 0) {
			console.log(`Already baselined: ${INITIAL_MIGRATION.name}`);
			return;
		}

		await AppDataSource.query(
			`INSERT INTO "migrations"("timestamp", "name") VALUES ($1, $2)`,
			[INITIAL_MIGRATION.timestamp, INITIAL_MIGRATION.name],
		);
		console.log(
			`Baselined ${INITIAL_MIGRATION.name} without recreating existing tables`,
		);
	} finally {
		await AppDataSource.destroy();
	}
}

baseline().catch((error) => {
	console.error(error);
	process.exit(1);
});
