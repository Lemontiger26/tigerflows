import { asc, eq } from 'drizzle-orm';
import { db, categories, templates, templateSteps, templateTags, tags, flows, flowSteps } from '../../../db';
import type { Category, Flow, FlowStep, Template, TemplateStep } from '~types';

function stripEmbedding<T extends { embeddings: Buffer | null }>(row: T): Omit<T, 'embeddings'> & { embeddings: null } {
	return { ...row, embeddings: null };
}

export async function loadFlowData() {
	const [categoryRows, templateRows, templateStepRows, templateTagRows, flowRows, flowStepRows] = await Promise.all([
		db.select().from(categories).orderBy(asc(categories.name)),
		db.select().from(templates).orderBy(asc(templates.name)),
		db.select().from(templateSteps).orderBy(asc(templateSteps.templateId), asc(templateSteps.order)),
		db
			.select({
				templateId: templateTags.templateId,
				tagName: tags.name
			})
			.from(templateTags)
			.innerJoin(tags, eq(templateTags.tagId, tags.id))
			.orderBy(asc(templateTags.templateId), asc(tags.name)),
		db.select().from(flows).orderBy(asc(flows.createdAt), asc(flows.title)),
		db.select().from(flowSteps).orderBy(asc(flowSteps.flowId), asc(flowSteps.order))
	]);

	const stepsByTemplateId = new Map<string, TemplateStep[]>();
	for (const row of templateStepRows) {
		const step = stripEmbedding(row) as TemplateStep;
		const list = stepsByTemplateId.get(step.templateId) ?? [];
		list.push(step);
		stepsByTemplateId.set(step.templateId, list);
	}

	const tagsByTemplateId = new Map<string, string[]>();
	for (const row of templateTagRows) {
		const list = tagsByTemplateId.get(row.templateId) ?? [];
		list.push(row.tagName);
		tagsByTemplateId.set(row.templateId, list);
	}

	const stepsByFlowId = new Map<string, FlowStep[]>();
	for (const row of flowStepRows) {
		const step = stripEmbedding(row) as FlowStep;
		const list = stepsByFlowId.get(step.flowId) ?? [];
		list.push(step);
		stepsByFlowId.set(step.flowId, list);
	}

	const hydratedCategories: Category[] = categoryRows.map((row) => stripEmbedding(row) as Category);
	const hydratedTemplates: Template[] = templateRows.map((row) => ({
		...stripEmbedding(row),
		steps: stepsByTemplateId.get(row.id) ?? [],
		tags: tagsByTemplateId.get(row.id) ?? []
	}));
	const hydratedFlows: Flow[] = flowRows.map((row) => ({
		...stripEmbedding(row),
		steps: stepsByFlowId.get(row.id) ?? []
	}));

	return {
		categories: hydratedCategories,
		templates: hydratedTemplates,
		flows: hydratedFlows
	};
}
