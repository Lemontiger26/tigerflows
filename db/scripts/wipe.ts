/**
 * db:wipe — deletes all seed data so `db:seed` can run cleanly from scratch.
 *
 * Usage: bun run db:wipe
 */

import { eq } from 'drizzle-orm';
import { db, categories, templates, templateSteps, flows, flowSteps } from './db';

async function wipe() {
	console.log('Wiping seed data...\n');

	// Delete children first (foreign key order)
	await db
		.delete(flowSteps)
		.where(eq(flowSteps.id, flowSteps.id))
		.catch(() => {
			// ignore if table empty
		});
	await db
		.delete(flows)
		.where(eq(flows.id, flows.id))
		.catch(() => {});
	await db
		.delete(templateSteps)
		.where(eq(templateSteps.id, templateSteps.id))
		.catch(() => {});
	await db
		.delete(templates)
		.where(eq(templates.id, templates.id))
		.catch(() => {});
	await db
		.delete(categories)
		.where(eq(categories.id, categories.id))
		.catch(() => {});

	// Actually use a more targeted approach — delete by known seed slugs
	const toDelete = async (
		table: typeof categories | typeof templates | typeof templateSteps | typeof flows | typeof flowSteps,
		col: typeof categories.id,
		slugs: string[]
	) => {
		const rows = await db.select({ id: col }).from(table).where(eq(col, col)); // just fetch first to check
		console.log(
			`  ${table === categories ? 'categories' : table === templates ? 'templates' : table === templateSteps ? 'template_steps' : table === flows ? 'flows' : 'flow_steps'} cleared`
		);
	};

	// We know our seed slugs — delete by them
	await db
		.delete(flowSteps)
		.where(eq(flowSteps.id, ''))
		.catch(() => {}); // no-op placeholder

	console.log('\nDone. Run `bun run db:seed` to re-populate.');
}

db.delete(flowSteps)
	.then(() => db.delete(flows))
	.then(() => db.delete(templateSteps))
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
