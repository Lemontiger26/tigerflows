/**
 * Drizzle database client — server-side only.
 * Uses libSQL locally (`file:`) and can point at remote Turso via env vars.
 * Import this in +page.server.ts, +server.ts, or server-only lib files.
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

export const client = createClient({
	url: process.env.TURSO_DB_URL ?? 'file:./data/userFlows.db',
	authToken: process.env.TURSO_AUTH_TOKEN
});

await client.execute('PRAGMA foreign_keys = ON');

export const db = drizzle(client, { schema });

export * from './schema';
