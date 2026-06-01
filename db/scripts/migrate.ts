/**
 * db:mig — Run pending Drizzle migrations using our PGLite instance.
 *
 * We can't use drizzle-kit's built-in push/migrate because it creates its own
 * PGLite instance without the pgvector WASM extension loaded.
 *
 * Pass --fresh to wipe the local database and re-apply all migrations.
 *
 * Usage: bun run db:mig [--fresh]
 */
import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const fresh = process.argv.includes('--fresh');

if (fresh && existsSync('./data/pglite')) {
	console.log('Wiping local database...');
	await rm('./data/pglite', { recursive: true });
}

const { migrate } = await import('drizzle-orm/pglite/migrator');
const { db } = await import('./db');

console.log(fresh ? 'Applying all migrations from scratch...' : 'Running pending migrations...');
await migrate(db, { migrationsFolder: './db/migrations' });
console.log('✓ Migrations complete');
process.exit(0);
