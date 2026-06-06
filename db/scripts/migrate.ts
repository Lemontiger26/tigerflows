/**
 * db:mig — Run pending Drizzle migrations using the local libSQL database.
 *
 * Pass --fresh to wipe the local database and re-apply all migrations.
 *
 * Usage: bun run db:mig [--fresh]
 */
import { rm } from 'node:fs/promises';

const fresh = process.argv.includes('--fresh');

if (fresh) {
	console.log('Wiping local database...');
	await Promise.all(
		['./data/userFlows.db', './data/userFlows.db-wal', './data/userFlows.db-shm'].map((path) =>
			rm(path, { force: true })
		)
	);
}

const { migrate } = await import('drizzle-orm/libsql/migrator');
const { db } = await import('./db');

console.log(fresh ? 'Applying all migrations from scratch...' : 'Running pending migrations...');
await migrate(db, { migrationsFolder: './db/migrations' });
console.log('✓ Migrations complete');
process.exit(0);
