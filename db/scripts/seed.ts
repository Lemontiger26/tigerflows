/**
 * db:seed — wipes all tables, then inserts system templates/categories/flows
 * into the local libSQL database.
 *
 * Usage: bun run db:seed
 */

import { db, users, categories, templates, templateSteps, flows, flowSteps, tags, templateTags } from './db';
import { LOCAL_USER_ID, SYSTEM_USER_ID } from '../schema/shared';
import { seedCategories, seedTemplates, seedFlows } from '../seed/builtin';

async function seed() {
	// ── Wipe ────────────────────────────────────────────────────────────────────
	console.log('Wiping tables...');
	await db.delete(flowSteps);
	await db.delete(flows);
	await db.delete(templateTags);
	await db.delete(templateSteps);
	await db.delete(templates);
	await db.delete(categories);
	await db.delete(tags);
	console.log('  ✓ all tables cleared\n');

	const allTplSteps = seedTemplates.flatMap((t) => t.steps);
	const allFlowSteps = seedFlows.flatMap((f) => f.steps);

	// ── Insert ───────────────────────────────────────────────────────────────────
	console.log('Seeding database...');

	await db
		.insert(users)
		.values([
			{
				id: SYSTEM_USER_ID,
				authId: 'system',
				email: 'system@local.invalid'
			},
			{
				id: LOCAL_USER_ID,
				authId: 'local',
				email: 'local@local.invalid'
			}
		])
		.onConflictDoNothing();
	console.log('  ✓ sentinel users');

	for (const cat of seedCategories) {
		await db.insert(categories).values({
			id: cat.id,
			userId: cat.userId,
			name: cat.name,
			description: cat.description,
			color: cat.color,
			slug: cat.slug,
			embeddings: null,
			createdAt: cat.createdAt,
			updatedAt: cat.updatedAt
		});
	}
	console.log(`  ✓ ${seedCategories.length} categories`);

	// Collect unique tag names across all templates, insert as system tags
	const allTagNames = Array.from(new Set(seedTemplates.flatMap((t) => t.tags)));
	const tagIdByName = new Map<string, string>();
	for (const name of allTagNames) {
		const [row] = await db
			.insert(tags)
			.values({
				userId: SYSTEM_USER_ID,
				name,
				slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
				embeddings: null
			})
			.returning({ id: tags.id });
		tagIdByName.set(name, row.id);
	}
	console.log(`  ✓ ${allTagNames.length} tags`);

	for (const tpl of seedTemplates) {
		await db.insert(templates).values({
			id: tpl.id,
			userId: tpl.userId,
			categoryId: tpl.categoryId,
			name: tpl.name,
			description: tpl.description,
			slug: tpl.slug,
			embeddings: null,
			createdAt: tpl.createdAt,
			updatedAt: tpl.updatedAt
		});
		for (const tagName of tpl.tags) {
			const tagId = tagIdByName.get(tagName);
			if (tagId) await db.insert(templateTags).values({ templateId: tpl.id, tagId });
		}
		for (const step of tpl.steps) {
			await db.insert(templateSteps).values({
				id: step.id,
				templateId: step.templateId,
				slug: step.slug,
				order: step.order,
				title: step.title,
				description: step.description,
				stepType: step.stepType,
				executorType: step.executorType,
				config: step.config,
				isCritical: step.isCritical,
				embeddings: null
			});
		}
	}
	console.log(`  ✓ ${seedTemplates.length} templates (with ${allTplSteps.length} steps)`);

	for (const flow of seedFlows) {
		await db.insert(flows).values({
			id: flow.id,
			userId: flow.userId,
			categoryId: flow.categoryId,
			templateId: flow.templateId,
			title: flow.title,
			status: flow.status,
			slug: flow.slug,
			embeddings: null,
			createdAt: flow.createdAt,
			updatedAt: flow.updatedAt,
			completedAt: flow.completedAt
		});
		for (const step of flow.steps) {
			await db.insert(flowSteps).values({
				id: step.id,
				flowId: flow.id, // step.flowId is '' in seed data — use parent flow.id
				templateStepId: step.templateStepId,
				order: step.order,
				title: step.title,
				description: step.description,
				stepType: step.stepType,
				executorType: step.executorType,
				config: step.config,
				isCritical: step.isCritical,
				checked: step.checked,
				value: step.value,
				checkedAt: step.checkedAt,
				comment: step.comment,
				embeddings: null
			});
		}
	}
	console.log(`  ✓ ${seedFlows.length} flows (with ${allFlowSteps.length} steps)`);

	console.log('\n✓ Seed complete');

	process.exit(0);
}

seed().catch((err) => {
	console.error('\nSeed failed:', err);
	process.exit(1);
});
