/**
 * db/scripts/db.ts — Standalone DB client for use in CLI scripts.
 * Uses the same libSQL setup as the app DB client.
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../schema';

export const client = createClient({
	url: process.env.TURSO_DB_URL ?? 'file:./data/userFlows.db',
	authToken: process.env.TURSO_AUTH_TOKEN
});

await client.execute('PRAGMA foreign_keys = ON');

export const db = drizzle(client, { schema });

export * from '../schema';
