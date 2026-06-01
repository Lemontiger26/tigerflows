/**
 * db:seed — wipes all tables, then inserts system templates/categories/flows
 * with embeddings computed in a single batched pass before any inserts.
 *
 * Usage: bun run db:seed
 */

import { db, categories, templates, templateActions, flows, flowActions, tags, templateTags } from './db';
import { seedCategories, seedTemplates, seedFlows } from '../../src/lib/stores/seed';
import { embedMany } from './embed';

async function seed() {
	// ── Wipe ────────────────────────────────────────────────────────────────────
	console.log('Wiping tables...');
	await db.delete(flowActions);
	await db.delete(flows);
	await db.delete(templateTags);
	await db.delete(templateActions);
	await db.delete(templates);
	await db.delete(categories);
	await db.delete(tags);
	console.log('  ✓ all tables cleared\n');

	// ── Batch-compute all embeddings upfront ────────────────────────────────────
	console.log('Computing embeddings (model: BAAI/bge-small-en-v1.5, 384d)...');

	const allTplActions = seedTemplates.flatMap((t) => t.actions);
	const allFlowActions = seedFlows.flatMap((f) => f.actions);

	const catEmb = await embedMany(seedCategories.map((c) => c.name));
	const tplEmb = await embedMany(seedTemplates.map((t) => t.name));
	const tplActEmb = await embedMany(allTplActions.map((a) => a.title));
	const flowEmb = await embedMany(seedFlows.map((f) => f.title));
	const flowActEmb = await embedMany(allFlowActions.map((a) => a.title));

	console.log(`  ✓ ${catEmb.length + tplEmb.length + tplActEmb.length + flowEmb.length + flowActEmb.length} vectors\n`);

	// ── Insert ───────────────────────────────────────────────────────────────────
	console.log('Seeding database...');

	for (const [i, cat] of seedCategories.entries()) {
		await db.insert(categories).values({
			id: cat.id,
			userId: cat.userId,
			name: cat.name,
			description: cat.description,
			color: cat.color,
			slug: cat.slug,
			embeddings: catEmb[i],
			createdAt: cat.createdAt,
			updatedAt: cat.updatedAt
		});
	}
	console.log(`  ✓ ${seedCategories.length} categories`);

	// Collect unique tag names across all templates, insert as system tags
	const allTagNames = Array.from(new Set(seedTemplates.flatMap((t) => t.tags)));
	const tagEmb = await embedMany(allTagNames);
	const tagIdByName = new Map<string, string>();
	for (const [i, name] of allTagNames.entries()) {
		const [row] = await db
			.insert(tags)
			.values({
				userId: null,
				name,
				slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
				embeddings: tagEmb[i]
			})
			.returning({ id: tags.id });
		tagIdByName.set(name, row.id);
	}
	console.log(`  ✓ ${allTagNames.length} tags`);

	let tplActIdx = 0;
	for (const [i, tpl] of seedTemplates.entries()) {
		await db.insert(templates).values({
			id: tpl.id,
			userId: tpl.userId,
			categoryId: tpl.categoryId,
			name: tpl.name,
			description: tpl.description,
			slug: tpl.slug,
			embeddings: tplEmb[i],
			createdAt: tpl.createdAt,
			updatedAt: tpl.updatedAt
		});
		for (const tagName of tpl.tags) {
			const tagId = tagIdByName.get(tagName);
			if (tagId) await db.insert(templateTags).values({ templateId: tpl.id, tagId });
		}
		for (const action of tpl.actions) {
			await db.insert(templateActions).values({
				id: action.id,
				templateId: action.templateId,
				slug: action.slug,
				order: action.order,
				title: action.title,
				description: action.description,
				actionType: action.actionType,
				executorType: action.executorType,
				config: action.config,
				isCritical: action.isCritical,
				embeddings: tplActEmb[tplActIdx++]
			});
		}
	}
	console.log(`  ✓ ${seedTemplates.length} templates (with ${allTplActions.length} actions)`);

	let flowActIdx = 0;
	for (const [i, flow] of seedFlows.entries()) {
		await db.insert(flows).values({
			id: flow.id,
			userId: flow.userId,
			categoryId: flow.categoryId,
			templateId: flow.templateId,
			title: flow.title,
			status: flow.status,
			slug: flow.slug,
			embeddings: flowEmb[i],
			createdAt: flow.createdAt,
			updatedAt: flow.updatedAt,
			completedAt: flow.completedAt
		});
		for (const action of flow.actions) {
			await db.insert(flowActions).values({
				id: action.id,
				flowId: flow.id, // action.flowId is '' in seed data — use parent flow.id
				templateActionId: action.templateActionId,
				order: action.order,
				title: action.title,
				description: action.description,
				actionType: action.actionType,
				executorType: action.executorType,
				config: action.config,
				isCritical: action.isCritical,
				checked: action.checked,
				value: action.value,
				checkedAt: action.checkedAt,
				comment: action.comment,
				embeddings: flowActEmb[flowActIdx++]
			});
		}
	}
	console.log(`  ✓ ${seedFlows.length} flows (with ${allFlowActions.length} actions)`);

	console.log('\n✓ Seed complete');

	process.exit(0);
}

seed().catch((err) => {
	console.error('\nSeed failed:', err);
	process.exit(1);
});
