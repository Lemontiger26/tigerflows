import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type Client, type InValue } from '@libsql/client';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

let tempDir: string;
let userDbPath: string;
let systemDbPath: string;
let user: Client;

async function runScript(script: string, args: string[], env: Record<string, string>) {
	await execFileAsync('bunx', ['tsx', '--tsconfig', './tsconfig.json', script, ...args], {
		env: { ...process.env, ...env }
	});
}

async function count(table: string, where = '1 = 1', args: InValue[] = []) {
	const result = await user.execute({
		sql: `SELECT count(*) AS count FROM ${table} WHERE ${where}`,
		args
	});
	return Number(result.rows[0]?.count ?? 0);
}

beforeAll(async () => {
	tempDir = await mkdtemp(path.join(tmpdir(), 'tigerflows-db-'));
	userDbPath = path.join(tempDir, 'userFlows.db');
	systemDbPath = path.join(tempDir, 'systemFlows.db');

	await runScript('./db/scripts/migrate.ts', ['--fresh'], { TURSO_DB_URL: `file:${userDbPath}` });
	await runScript('./db/scripts/migrate.ts', ['--fresh'], { TURSO_DB_URL: `file:${systemDbPath}` });
	await runScript('./db/scripts/seed.ts', ['--system'], { TURSO_DB_URL: `file:${systemDbPath}` });

	user = createClient({ url: `file:${userDbPath}` });
	await user.execute('PRAGMA foreign_keys = ON');
}, 180_000);

afterAll(async () => {
	user?.close();
	if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe('system content installation', () => {
	it('installs core built-ins without optional showcase rows', async () => {
		await runScript('./db/scripts/install-system.ts', [], {
			TURSO_DB_URL: `file:${userDbPath}`,
			SYSTEM_DB_URL: `file:${systemDbPath}`
		});

		expect(await count('users')).toBe(2);
		expect(await count('categories')).toBe(2);
		expect(await count('templates')).toBe(3);
		expect(await count('flows')).toBe(5);
		expect(await count('flow_steps')).toBe(25);
		expect(await count('flows', 'id LIKE ?', ['flow-syn-pm-%'])).toBe(0);
		expect((await user.execute('PRAGMA foreign_key_check')).rows).toHaveLength(0);
	}, 60_000);

	it('installs showcase rows on demand and remains idempotent', async () => {
		for (let i = 0; i < 2; i += 1) {
			await runScript('./db/scripts/install-system.ts', ['--showcase'], {
				TURSO_DB_URL: `file:${userDbPath}`,
				SYSTEM_DB_URL: `file:${systemDbPath}`
			});
		}

		expect(await count('categories')).toBe(3);
		expect(await count('templates')).toBe(4);
		expect(await count('flows')).toBe(55);
		expect(await count('flow_steps')).toBe(475);
		expect(await count('flows', 'id LIKE ?', ['flow-syn-pm-%'])).toBe(50);
		expect((await user.execute('PRAGMA foreign_key_check')).rows).toHaveLength(0);
	}, 60_000);
});
