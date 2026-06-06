import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './db/schema/index.ts',
	out: './db/migrations',
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_DB_URL ?? 'file:./data/userFlows.db',
		authToken: process.env.TURSO_AUTH_TOKEN
	},
	verbose: true,
	strict: true
});
