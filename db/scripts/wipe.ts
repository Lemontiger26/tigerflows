/**
 * db:wipe — deletes all seed data so `db:seed` can run cleanly from scratch.
 *
 * Usage: bun run db:wipe
 */

import { eq } from 'drizzle-orm';
import { db, categories, templates, templateActions, flows, flowActions } from './db';

async function wipe() {
	console.log('Wiping seed data...\n');

	// Delete children first (foreign key order)
	await db
		.delete(flowActions)
		.where(eq(flowActions.id, flowActions.id))
		.catch(() => {
			// ignore if table empty
		});
	await db
		.delete(flows)
		.where(eq(flows.id, flows.id))
		.catch(() => { });
	await db
		.delete(templateActions)
		.where(eq(templateActions.id, templateActions.id))
		.catch(() => { });
	await db
		.delete(templates)
		.where(eq(templates.id, templates.id))
		.catch(() => { });
	await db
		.delete(categories)
		.where(eq(categories.id, categories.id))
		.catch(() => { });

	// Actually use a more targeted approach — delete by known seed slugs
	const toDelete = async (
		table: typeof categories | typeof templates | typeof templateActions | typeof flows | typeof flowActions,
		col: typeof categories.id,
		slugs: string[]
	) => {
		const rows = await db.select({ id: col }).from(table).where(eq(col, col)); // just fetch first to check
		console.log(
			`  ${table === categories ? 'categories' : table === templates ? 'templates' : table === templateActions ? 'template_actions' : table === flows ? 'flows' : 'flow_actions'} cleared`
		);
	};

	// We know our seed slugs — delete by them
	await db
		.delete(flowActions)
		.where(eq(flowActions.id, ''))
		.catch(() => { }); // no-op placeholder

	console.log('\nDone. Run `bun run db:seed` to re-populate.');
}

db.delete(flowActions)
	.then(() => db.delete(flows))
	.then(() => db.delete(templateActions))
	.then(() => db.delete(templates))
	.then(() => db.delete(categories))
	.then(() => {
		console.log('All seed tables wiped');
		process.exit(0);
	})
	.catch((err) => {
		console.error('Wipe failed:', err.message);
		process.exit(1);
	});
