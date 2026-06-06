/**
 * db:seed — wipes all tables, then inserts system templates/categories/flows
 * into the local libSQL database and backfills libSQL vector embeddings.
 *
 * Usage: bun run db:seed
 */

import { client, db, users, categories, templates, templateSteps, flows, flowSteps, tags, templateTags } from './db';
import { LOCAL_USER_ID, SYSTEM_USER_ID } from '../schema/shared';
import { seedCategories, seedTemplates, seedFlows } from '../seed/builtin';
import { embedMany } from './embed';

type EmbeddingTable = 'categories' | 'tags' | 'templates' | 'template_steps' | 'flows' | 'flow_steps';

type EmbeddingJob = {
	table: EmbeddingTable;
	id: string;
	text: string;
};

function compactText(parts: Array<string | null | undefined>) {
	return parts
		.map((part) => part?.trim())
		.filter(Boolean)
		.join('\n');
}

function vectorParam(vec: number[]) {
	return JSON.stringify(vec);
}

async function updateEmbedding(table: EmbeddingTable, id: string, vector: number[]) {
	await client.execute({
		sql: `UPDATE ${table} SET embeddings = vector32(?) WHERE id = ?`,
		args: [vectorParam(vector), id]
	});
}

async function backfillEmbeddings(jobs: EmbeddingJob[]) {
	console.log('\nComputing embeddings (model: Xenova/bge-small-en-v1.5, 384d)...');
	const vectors = await embedMany(jobs.map((job) => job.text));

	console.log('Writing embeddings via libSQL vector32()...');
	for (const [idx, job] of jobs.entries()) {
		await updateEmbedding(job.table, job.id, vectors[idx]!);
	}
	console.log(`  ✓ ${jobs.length} vectors`);

	return vectors[0]!;
}

async function verifyEmbeddings(expectedCount: number, probeVector: number[]) {
	const tables: EmbeddingTable[] = ['categories', 'tags', 'templates', 'template_steps', 'flows', 'flow_steps'];
	let storedCount = 0;

	for (const table of tables) {
		const result = await client.execute({
			sql: `SELECT count(*) AS count FROM ${table} WHERE embeddings IS NOT NULL`
		});
		storedCount += Number(result.rows[0]?.count ?? 0);
	}

	if (storedCount !== expectedCount) {
		throw new Error(`Expected ${expectedCount} stored embeddings, found ${storedCount}`);
	}

	const nearest = await client.execute({
		sql: `
			SELECT id, vector_distance_cos(embeddings, vector32(?)) AS distance
			FROM categories
			WHERE embeddings IS NOT NULL
			ORDER BY distance
			LIMIT 1
		`,
		args: [vectorParam(probeVector)]
	});

	if (!nearest.rows[0]) {
		throw new Error('Embedding verification query returned no rows');
	}

	console.log(`  ✓ vector_distance_cos() smoke test nearest category: ${nearest.rows[0].id}`);
}

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
	const embeddingJobs: EmbeddingJob[] = [
		...seedCategories.map((category) => ({
			table: 'categories' as const,
			id: category.id,
			text: compactText([category.name, category.description])
		})),
		...seedTemplates.map((template) => ({
			table: 'templates' as const,
			id: template.id,
			text: compactText([template.name, template.description, template.tags.join(', ')])
		})),
		...allTplSteps.map((step) => ({
			table: 'template_steps' as const,
			id: step.id,
			text: compactText([step.title, step.description, step.stepType])
		})),
		...seedFlows.map((flow) => ({
			table: 'flows' as const,
			id: flow.id,
			text: compactText([flow.title, flow.status])
		})),
		...allFlowSteps.map((step) => ({
			table: 'flow_steps' as const,
			id: step.id,
			text: compactText([step.title, step.description, step.comment, step.stepType])
		}))
	];

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
		embeddingJobs.push({
			table: 'tags',
			id: row.id,
			text: name
		});
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

	const probeVector = await backfillEmbeddings(embeddingJobs);
	await verifyEmbeddings(embeddingJobs.length, probeVector);

	console.log('\n✓ Seed complete');

	process.exit(0);
}

seed().catch((err) => {
	console.error('\nSeed failed:', err);
	process.exit(1);
});
