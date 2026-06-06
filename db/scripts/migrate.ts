/**
 * db:mig — Run pending Drizzle migrations using the local libSQL database.
 *
 * Pass --fresh to wipe the local database and re-apply all migrations.
 *
 * Usage: bun run db:mig [--fresh]
 */
import { rm } from 'node:fs/promises';

const fresh = process.argv.includes('--fresh');
const dbUrl = process.env.TURSO_DB_URL ?? 'file:./data/userFlows.db';

function filePathFromDbUrl(url: string) {
	if (!url.startsWith('file:')) return null;
	const rawPath = url.slice('file:'.length);
	if (rawPath.startsWith('//')) return rawPath.slice('//'.length);
	return rawPath;
}

if (fresh) {
	const dbPath = filePathFromDbUrl(dbUrl);
	if (!dbPath) {
		throw new Error('--fresh is only supported for local file: database URLs');
	}

	console.log(`Wiping local database ${dbPath}...`);
	await Promise.all([dbPath, `${dbPath}-wal`, `${dbPath}-shm`].map((path) => rm(path, { force: true })));
}

const { migrate } = await import('drizzle-orm/libsql/migrator');
const { db } = await import('./db');

console.log(fresh ? 'Applying all migrations from scratch...' : 'Running pending migrations...');
await migrate(db, { migrationsFolder: './db/migrations' });
console.log('✓ Migrations complete');
process.exit(0);
