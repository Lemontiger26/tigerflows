/**
 * db:wipe — deletes all seeded relational data so `db:seed` can run cleanly.
 *
 * Usage: bun run db:wipe
 */

import { db, categories, templates, templateSteps, flows, flowSteps, tags, templateTags } from './db';

async function wipe() {
	console.log('Wiping seed data...');

	await db.delete(flowSteps);
	await db.delete(flows);
	await db.delete(templateTags);
	await db.delete(templateSteps);
	await db.delete(templates);
	await db.delete(categories);
	await db.delete(tags);

	console.log('All seed tables wiped');
	process.exit(0);
}

wipe().catch((err) => {
	console.error('Wipe failed:', err);
	process.exit(1);
});
