/**
 * db:seed — wipes all tables, then inserts system templates/categories/flows
 * with embeddings computed in a single batched pass before any inserts.
 *
 * Usage: bun run db:seed
 */

import { db, categories, templates, templateSteps, flows, flowSteps, tags, templateTags } from './db';
import { seedCategories, seedTemplates, seedFlows } from '../../src/lib/stores/seed';
import { embedMany } from './embed';

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

	// ── Batch-compute all embeddings upfront ────────────────────────────────────
	console.log('Computing embeddings (model: BAAI/bge-small-en-v1.5, 384d)...');

	const allTplSteps = seedTemplates.flatMap((t) => t.steps);
	const allFlowSteps = seedFlows.flatMap((f) => f.steps);

	const catEmb = await embedMany(seedCategories.map((c) => c.name));
	const tplEmb = await embedMany(seedTemplates.map((t) => t.name));
	const tplStepEmb = await embedMany(allTplSteps.map((a) => a.title));
	const flowEmb = await embedMany(seedFlows.map((f) => f.title));
	const flowStepEmb = await embedMany(allFlowSteps.map((a) => a.title));

	console.log(
		`  ✓ ${catEmb.length + tplEmb.length + tplStepEmb.length + flowEmb.length + flowStepEmb.length} vectors\n`
	);

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

	let tplStepIdx = 0;
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
				embeddings: tplStepEmb[tplStepIdx++]
			});
		}
	}
	console.log(`  ✓ ${seedTemplates.length} templates (with ${allTplSteps.length} steps)`);

	let flowStepIdx = 0;
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
				embeddings: flowStepEmb[flowStepIdx++]
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
