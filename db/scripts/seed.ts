/**
 * db:seed — builds the system content catalog and backfills libSQL vector embeddings.
 *
 * Usage: bun run db:build-system
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { client, db, users, categories, templates, templateSteps, flows, flowSteps, tags, templateTags } from './db';
import { SYSTEM_USER_ID } from '../schema/shared';
import { seedCategories, seedTemplates, seedFlows } from '../seed/builtin';
import { embedMany } from './embed';

type EmbeddingTable = 'categories' | 'tags' | 'templates' | 'template_steps' | 'flows' | 'flow_steps';

type EmbeddingJob = {
	table: EmbeddingTable;
	id: string;
	text: string;
};

type ShowcaseStepType = 'boolean' | 'text' | 'number' | 'date' | 'enum_single' | 'enum_multi' | 'agent';

type ShowcaseFlowFile = {
	id: string;
	templateSlug: string;
	categorySlug: string;
	title: string;
	status: 'active' | 'completed' | 'abandoned';
	createdAt: string;
	completedAt: string | null;
	steps: Array<{
		order: number;
		title: string;
		stepType: ShowcaseStepType;
		value: unknown;
	}>;
};

const showcaseCategory = {
	id: 'cat-reliability-incident-learning',
	userId: SYSTEM_USER_ID,
	name: 'Reliability Incident Learning',
	description: 'Synthetic SaaS incident postmortems for recurring reliability review and historical Q&A.',
	color: 'warning',
	slug: 'reliability-incident-learning',
	embeddings: null,
	createdAt: '2026-06-06T00:00:00.000Z',
	updatedAt: '2026-06-06T00:00:00.000Z'
};

const showcaseTemplateId = 'tpl-incident-postmortem-review';

const showcaseStepDefs = [
	{
		title: 'Source intake',
		stepType: 'agent' as const,
		description: 'Capture provenance, source shape, generation metadata, and payload hash.',
		isCritical: false
	},
	{
		title: 'Classify incident',
		stepType: 'text' as const,
		description: 'Normalize company, product, severity, categories, keywords, and source quality.',
		isCritical: true
	},
	{
		title: 'Normalize timing',
		stepType: 'date' as const,
		description: 'Extract start, end, published time, duration, and timing confidence.',
		isCritical: true
	},
	{
		title: 'Summarize impact',
		stepType: 'text' as const,
		description: 'Summarize affected systems, users, impact, and risk types.',
		isCritical: true
	},
	{
		title: 'Extract timeline',
		stepType: 'text' as const,
		description: 'Capture ordered incident events and response stages.',
		isCritical: true
	},
	{
		title: 'Identify root cause',
		stepType: 'text' as const,
		description: 'Capture trigger type, root cause, contributing factors, and preventability.',
		isCritical: true
	},
	{
		title: 'Response and communication',
		stepType: 'text' as const,
		description: 'Summarize mitigation, response quality, and customer communication.',
		isCritical: true
	},
	{
		title: 'Lessons learned',
		stepType: 'text' as const,
		description: 'Capture lessons and recommended reliability controls.',
		isCritical: true
	},
	{
		title: 'Review quality',
		stepType: 'agent' as const,
		description: 'Capture extraction confidence, warnings, missing fields, and review need.',
		isCritical: false
	}
];

const showcaseTemplateSteps = showcaseStepDefs.map((step, idx) => ({
	id: `tpl-pm-step-${String(idx + 1).padStart(2, '0')}`,
	templateId: showcaseTemplateId,
	slug: step.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, ''),
	order: idx + 1,
	title: step.title,
	description: step.description,
	stepType: step.stepType,
	executorType: step.stepType === 'agent' ? ('agent' as const) : ('human' as const),
	config: {},
	isCritical: step.isCritical,
	embeddings: null
}));

const showcaseTemplate = {
	id: showcaseTemplateId,
	userId: SYSTEM_USER_ID,
	categoryId: showcaseCategory.id,
	name: 'Incident Postmortem Review',
	description: 'Structured review template for SaaS incident postmortems and reliability learning.',
	steps: showcaseTemplateSteps,
	tags: ['postmortem', 'incident', 'reliability', 'showcase'],
	slug: 'incident-postmortem-review',
	embeddings: null,
	createdAt: '2026-06-06T00:00:00.000Z',
	updatedAt: '2026-06-06T00:00:00.000Z'
};

const showcaseTemplateStepByTitle = new Map(showcaseTemplateSteps.map((step) => [step.title, step]));

function compactText(parts: Array<string | null | undefined>) {
	return parts
		.map((part) => part?.trim())
		.filter(Boolean)
		.join('\n');
}

function flattenValue(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) return value.map(flattenValue).filter(Boolean).join('\n');
	if (typeof value === 'object') return Object.values(value).map(flattenValue).filter(Boolean).join('\n');
	return '';
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

async function loadShowcaseFlows() {
	const dir = path.join(process.cwd(), 'db/seed/postmortems');
	const files = (await readdir(dir)).filter((file) => file.endsWith('.flow.json')).sort();
	const loaded: Array<
		ShowcaseFlowFile & { steps: Array<ShowcaseFlowFile['steps'][number] & { templateStepId: string }> }
	> = [];

	for (const file of files) {
		const flow = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as ShowcaseFlowFile;

		if (flow.templateSlug !== showcaseTemplate.slug || flow.categorySlug !== showcaseCategory.slug) {
			throw new Error(`Unexpected showcase category/template slug in ${file}`);
		}

		loaded.push({
			...flow,
			steps: flow.steps.map((step) => {
				const templateStep = showcaseTemplateStepByTitle.get(step.title);
				if (!templateStep) throw new Error(`Unknown showcase step "${step.title}" in ${file}`);
				return { ...step, templateStepId: templateStep.id };
			})
		});
	}

	return loaded;
}

async function seed() {
	const systemOnly = process.argv.includes('--system');
	if (!systemOnly) {
		throw new Error('seed.ts writes bundled SYSTEM catalog data only. Use `bun run db:build-system`.');
	}

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

	const showcaseFlows = await loadShowcaseFlows();
	const allCategories = [...seedCategories, showcaseCategory];
	const allTemplates = [...seedTemplates, showcaseTemplate];
	const allTplSteps = allTemplates.flatMap((t) => t.steps);
	const allBuiltinFlowSteps = seedFlows.flatMap((f) => f.steps);
	const embeddingJobs: EmbeddingJob[] = [
		...allCategories.map((category) => ({
			table: 'categories' as const,
			id: category.id,
			text: compactText([category.name, category.description])
		})),
		...allTemplates.map((template) => ({
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
		...showcaseFlows.map((flow) => ({
			table: 'flows' as const,
			id: flow.id,
			text: compactText([
				flow.title,
				flow.status,
				...flow.steps.map((step) => flattenValue(step.value)).filter(Boolean)
			])
		})),
		...allBuiltinFlowSteps.map((step) => ({
			table: 'flow_steps' as const,
			id: step.id,
			text: compactText([step.title, step.description, step.comment, step.stepType])
		})),
		...showcaseFlows.flatMap((flow) =>
			flow.steps.map((step) => ({
				table: 'flow_steps' as const,
				id: `${flow.id}-step-${String(step.order).padStart(2, '0')}`,
				text: compactText([step.title, step.stepType, flattenValue(step.value)])
			}))
		)
	];

	for (const flow of showcaseFlows) {
		if (flow.steps.length !== showcaseTemplateSteps.length) {
			throw new Error(
				`Showcase flow ${flow.id} has ${flow.steps.length} steps, expected ${showcaseTemplateSteps.length}`
			);
		}
	}

	const expectedShowcaseStepCount = showcaseFlows.reduce((sum, flow) => sum + flow.steps.length, 0);

	const showcaseTagNames = showcaseTemplate.tags;
	const allTagNames = Array.from(new Set([...seedTemplates.flatMap((t) => t.tags), ...showcaseTagNames]));

	// ── Insert ───────────────────────────────────────────────────────────────────
	console.log('Seeding database...');

	await db
		.insert(users)
		.values({
			id: SYSTEM_USER_ID,
			authId: 'system',
			email: 'system@local.invalid'
		})
		.onConflictDoNothing();
	console.log('  ✓ SYSTEM sentinel user');

	for (const cat of allCategories) {
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
	console.log(`  ✓ ${allCategories.length} categories`);

	// Collect unique tag names across all templates, insert as system tags
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

	for (const tpl of allTemplates) {
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
	console.log(`  ✓ ${allTemplates.length} templates (with ${allTplSteps.length} steps)`);

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
	console.log(`  ✓ ${seedFlows.length} built-in flows (with ${allBuiltinFlowSteps.length} steps)`);

	for (const flow of showcaseFlows) {
		await db.insert(flows).values({
			id: flow.id,
			userId: SYSTEM_USER_ID,
			categoryId: showcaseCategory.id,
			templateId: showcaseTemplate.id,
			title: flow.title,
			status: flow.status,
			slug: flow.id,
			embeddings: null,
			createdAt: flow.createdAt,
			updatedAt: flow.completedAt ?? flow.createdAt,
			completedAt: flow.completedAt
		});

		for (const step of flow.steps) {
			const templateStep = showcaseTemplateStepByTitle.get(step.title)!;
			await db.insert(flowSteps).values({
				id: `${flow.id}-step-${String(step.order).padStart(2, '0')}`,
				flowId: flow.id,
				templateStepId: step.templateStepId,
				order: step.order,
				title: step.title,
				description: templateStep.description,
				stepType: step.stepType,
				executorType: step.stepType === 'agent' ? 'agent' : 'human',
				config: {},
				isCritical: templateStep.isCritical,
				checked: true,
				value: step.value,
				checkedAt: flow.completedAt,
				comment: '',
				embeddings: null
			});
		}
	}
	console.log(`  ✓ ${showcaseFlows.length} showcase flows (with ${expectedShowcaseStepCount} steps)`);

	const probeVector = await backfillEmbeddings(embeddingJobs);
	await verifyEmbeddings(embeddingJobs.length, probeVector);

	console.log('\n✓ Seed complete');

	process.exit(0);
}

seed().catch((err) => {
	console.error('\nSeed failed:', err);
	process.exit(1);
});
