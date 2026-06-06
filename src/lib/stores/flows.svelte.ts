import type { Flow, FlowStep } from '~types';
import { seedFlows } from './seed';
import { tigerid } from '$lib/helpers/tigerId';
import { templateStore } from './templates.svelte';
import { slugify } from '$lib/helpers/slugify';

function createFlowStore() {
	let items = $state<Flow[]>(seedFlows);

	return {
		get items() {
			return items;
		},

		add(
			data: Pick<Flow, 'categoryId' | 'templateId' | 'title' | 'status' | 'steps'> &
				Partial<Omit<Flow, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>>
		) {
			const now = new Date().toISOString();
			const flow: Flow = {
				userId: null,
				slug: slugify(data.title),
				embeddings: [] as unknown as Flow['embeddings'],
				...data,
				id: tigerid(),
				createdAt: now,
				updatedAt: now,
				completedAt: null
			};
			items = [...items, flow];
			return flow;
		},

		update(id: string, patch: Partial<Flow>) {
			items = items.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i));
		},

		remove(id: string) {
			items = items.filter((i) => i.id !== id);
		},

		getById(id: string) {
			return items.find((i) => i.id === id);
		},

		/** Instantiate a new flow from a template, copying its steps. */
		instantiate(templateId: string, categoryId: string, title: string): Flow {
			const template = templateStore.getById(templateId);
			if (!template) throw new Error(`Template ${templateId} not found`);

			const now = new Date().toISOString();
			const flowId = tigerid();
			const steps: FlowStep[] = template.steps.map((ta) => ({
				id: tigerid(),
				flowId,
				templateStepId: ta.id,
				order: ta.order,
				title: ta.title,
				description: ta.description,
				stepType: ta.stepType,
				executorType: ta.executorType,
				config: ta.config,
				isCritical: ta.isCritical,
				checked: false,
				value: null,
				checkedAt: null,
				comment: '',
				embeddings: [] as unknown as number[]
			}));

			const flow: Flow = {
				id: flowId,
				userId: null,
				categoryId,
				templateId,
				title,
				status: 'active',
				slug: slugify(title),
				steps,
				embeddings: [] as unknown as number[],
				createdAt: now,
				updatedAt: now,
				completedAt: null
			};
			items = [...items, flow];
			return flow;
		},

		toggleStep(flowId: string, stepId: string) {
			items = items.map((flow) => {
				if (flow.id !== flowId) return flow;
				const steps = flow.steps.map((a) => {
					if (a.id !== stepId) return a;
					const checked = !a.checked;
					return { ...a, checked, checkedAt: checked ? new Date().toISOString() : null };
				});
				return { ...flow, steps, updatedAt: new Date().toISOString() };
			});
		},

		updateStepComment(flowId: string, stepId: string, comment: string) {
			items = items.map((flow) => {
				if (flow.id !== flowId) return flow;
				const steps = flow.steps.map((a) => (a.id === stepId ? { ...a, comment } : a));
				return { ...flow, steps, updatedAt: new Date().toISOString() };
			});
		},

		complete(id: string) {
			const now = new Date().toISOString();
			items = items.map((i) => (i.id === id ? { ...i, status: 'completed', completedAt: now, updatedAt: now } : i));
		},

		abandon(id: string) {
			items = items.map((i) => (i.id === id ? { ...i, status: 'abandoned', updatedAt: new Date().toISOString() } : i));
		},

		getByCategory(categoryId: string) {
			return items.filter((i) => i.categoryId === categoryId);
		},

		/** Find a flow by title slug, optionally scoped to a category. */
		getBySlug(slug: string, categoryId?: string) {
			const pool = categoryId ? items.filter((i) => i.categoryId === categoryId) : items;
			return pool.find((i) => slugify(i.title) === slug);
		}
	};
}

export const flowStore = createFlowStore();
