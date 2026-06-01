/**
 * db/scripts/db.ts — Standalone DB client for use in CLI scripts.
 * Uses PGLite with a local data directory.
 */
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '../schema';

const client = await PGlite.create({
	dataDir: './data/pglite',
	extensions: { vector }
});

await client.exec('CREATE EXTENSION IF NOT EXISTS vector;');

export const db = drizzle(client, { schema });

export * from '../schema';
