/**
 * Install bundled system content from data/systemFlows.db into data/userFlows.db.
 *
 * Default mode installs core built-ins only. Pass --showcase to install the
 * synthetic incident-postmortem showcase pack on explicit user request.
 */

import { createClient, type Client, type InValue } from '@libsql/client';

const SYSTEM_DB_URL = process.env.SYSTEM_DB_URL ?? 'file:./data/systemFlows.db';
const USER_DB_URL = process.env.TURSO_DB_URL ?? 'file:./data/userFlows.db';
const installShowcase = process.argv.includes('--showcase');

const SHOWCASE_CATEGORY_ID = 'cat-reliability-incident-learning';
const SHOWCASE_TEMPLATE_ID = 'tpl-incident-postmortem-review';
const SHOWCASE_FLOW_PREFIX = 'flow-syn-pm-';

type Column = {
	name: string;
	pk?: boolean;
};

type CopySpec = {
	table: string;
	columns: Column[];
	where?: string;
	args?: InValue[];
	doNothing?: boolean;
};

const user = createClient({ url: USER_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const system = createClient({ url: SYSTEM_DB_URL });

await Promise.all([user.execute('PRAGMA foreign_keys = ON'), system.execute('PRAGMA foreign_keys = ON')]);

function pkColumns(columns: Column[]) {
	return columns.filter((column) => column.pk).map((column) => column.name);
}

function nonPkColumns(columns: Column[]) {
	return columns.filter((column) => !column.pk).map((column) => column.name);
}

function insertSql(spec: CopySpec) {
	const columnNames = spec.columns.map((column) => column.name);
	const placeholders = columnNames.map(() => '?').join(', ');
	const quotedColumns = columnNames.map((column) => `\`${column}\``).join(', ');
	const pk = pkColumns(spec.columns);

	if (spec.doNothing) {
		return `INSERT INTO ${spec.table} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT(${pk.join(', ')}) DO NOTHING`;
	}

	const updates = nonPkColumns(spec.columns).map((column) => `\`${column}\` = excluded.\`${column}\``);
	return `INSERT INTO ${spec.table} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT(${pk.join(', ')}) DO UPDATE SET ${updates.join(', ')}`;
}

async function ensureSentinels(db: Client) {
	await db.execute({
		sql: `
			INSERT INTO users (id, auth_id, email, created_at, updated_at)
			VALUES (?, ?, ?, datetime('now'), datetime('now'))
			ON CONFLICT(id) DO UPDATE SET
				auth_id = excluded.auth_id,
				email = excluded.email,
				updated_at = excluded.updated_at
		`,
		args: ['SYSTEM', 'system', 'system@local.invalid']
	});
	await db.execute({
		sql: `
			INSERT INTO users (id, auth_id, email, created_at, updated_at)
			VALUES (?, ?, ?, datetime('now'), datetime('now'))
			ON CONFLICT(id) DO UPDATE SET
				auth_id = excluded.auth_id,
				email = excluded.email,
				updated_at = excluded.updated_at
		`,
		args: ['LOCAL', 'local', 'local@local.invalid']
	});
}

async function copyRows(spec: CopySpec) {
	const columns = spec.columns.map((column) => column.name);
	const selectSql = [`SELECT ${columns.map((column) => `\`${column}\``).join(', ')} FROM ${spec.table}`];
	if (spec.where) selectSql.push(`WHERE ${spec.where}`);

	const rows = await system.execute({ sql: selectSql.join(' '), args: spec.args ?? [] });
	const sql = insertSql(spec);

	for (const row of rows.rows) {
		await user.execute({
			sql,
			args: columns.map((column) => row[column] as InValue)
		});
	}

	return rows.rows.length;
}

const coreWhere = {
	categories: 'id != ?',
	tags: 'id IN (SELECT tag_id FROM template_tags WHERE template_id != ?)',
	templates: 'id != ?',
	templateSteps: 'template_id != ?',
	templateTags: 'template_id != ?',
	flows: 'id NOT LIKE ?',
	flowSteps: 'flow_id NOT LIKE ?'
};

const showcaseWhere = {
	categories: 'id = ?',
	tags: 'id IN (SELECT tag_id FROM template_tags WHERE template_id = ?)',
	templates: 'id = ?',
	templateSteps: 'template_id = ?',
	templateTags: 'template_id = ?',
	flows: 'id LIKE ?',
	flowSteps: 'flow_id LIKE ?'
};

function scopedSpecs(): CopySpec[] {
	const where = installShowcase ? showcaseWhere : coreWhere;
	const categoryArg = installShowcase ? SHOWCASE_CATEGORY_ID : SHOWCASE_CATEGORY_ID;
	const templateArg = installShowcase ? SHOWCASE_TEMPLATE_ID : SHOWCASE_TEMPLATE_ID;
	const flowArg = installShowcase ? `${SHOWCASE_FLOW_PREFIX}%` : `${SHOWCASE_FLOW_PREFIX}%`;

	return [
		{
			table: 'categories',
			where: where.categories,
			args: [categoryArg],
			columns: [
				{ name: 'id', pk: true },
				{ name: 'user_id' },
				{ name: 'name' },
				{ name: 'description' },
				{ name: 'color' },
				{ name: 'slug' },
				{ name: 'embeddings' },
				{ name: 'created_at' },
				{ name: 'updated_at' }
			]
		},
		{
			table: 'tags',
			where: where.tags,
			args: [templateArg],
			columns: [
				{ name: 'id', pk: true },
				{ name: 'user_id' },
				{ name: 'name' },
				{ name: 'slug' },
				{ name: 'embeddings' },
				{ name: 'created_at' }
			]
		},
		{
			table: 'templates',
			where: where.templates,
			args: [templateArg],
			columns: [
				{ name: 'id', pk: true },
				{ name: 'user_id' },
				{ name: 'category_id' },
				{ name: 'name' },
				{ name: 'description' },
				{ name: 'slug' },
				{ name: 'embeddings' },
				{ name: 'created_at' },
				{ name: 'updated_at' }
			]
		},
		{
			table: 'template_steps',
			where: where.templateSteps,
			args: [templateArg],
			columns: [
				{ name: 'id', pk: true },
				{ name: 'template_id' },
				{ name: 'slug' },
				{ name: 'order' },
				{ name: 'title' },
				{ name: 'description' },
				{ name: 'step_type' },
				{ name: 'executor_type' },
				{ name: 'config' },
				{ name: 'is_critical' },
				{ name: 'embeddings' }
			]
		},
		{
			table: 'template_tags',
			where: where.templateTags,
			args: [templateArg],
			doNothing: true,
			columns: [
				{ name: 'template_id', pk: true },
				{ name: 'tag_id', pk: true }
			]
		},
		{
			table: 'flows',
			where: where.flows,
			args: [flowArg],
			columns: [
				{ name: 'id', pk: true },
				{ name: 'user_id' },
				{ name: 'category_id' },
				{ name: 'template_id' },
				{ name: 'title' },
				{ name: 'status' },
				{ name: 'slug' },
				{ name: 'embeddings' },
				{ name: 'created_at' },
				{ name: 'updated_at' },
				{ name: 'completed_at' }
			]
		},
		{
			table: 'flow_steps',
			where: where.flowSteps,
			args: [flowArg],
			columns: [
				{ name: 'id', pk: true },
				{ name: 'flow_id' },
				{ name: 'template_step_id' },
				{ name: 'order' },
				{ name: 'title' },
				{ name: 'description' },
				{ name: 'step_type' },
				{ name: 'executor_type' },
				{ name: 'config' },
				{ name: 'is_critical' },
				{ name: 'checked' },
				{ name: 'value' },
				{ name: 'checked_at' },
				{ name: 'comment' },
				{ name: 'embeddings' }
			]
		}
	];
}

async function main() {
	console.log(installShowcase ? 'Installing showcase system pack...' : 'Installing core system content...');
	await ensureSentinels(user);
	console.log('  ✓ SYSTEM and LOCAL sentinel users');

	for (const spec of scopedSpecs()) {
		const count = await copyRows(spec);
		console.log(`  ✓ ${count} ${spec.table}`);
	}

	const fk = await user.execute('PRAGMA foreign_key_check');
	if (fk.rows.length > 0) {
		throw new Error(`Foreign key check failed with ${fk.rows.length} row(s)`);
	}

	console.log('\n✓ Install complete');
}

main()
	.catch((err) => {
		console.error('\nInstall failed:', err);
		process.exit(1);
	})
	.finally(() => {
		user.close();
		system.close();
	});
