import type { Template } from '~types';
import { seedTemplates } from '../../../db/seed/builtin';
import { tigerid } from '$lib/helpers/tigerId';
import { slugify } from '$lib/helpers/slugify';

function createTemplateStore() {
	let items = $state<Template[]>(seedTemplates);

	return {
		get items() {
			return items;
		},

		add(
			data: Pick<Template, 'name' | 'description' | 'steps' | 'tags'> &
				Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>
		) {
			const now = new Date().toISOString();
			const t: Template = {
				userId: null,
				categoryId: null,
				slug: slugify(data.name),
				embeddings: [] as unknown as Template['embeddings'],
				...data,
				id: tigerid(),
				createdAt: now,
				updatedAt: now
			};
			items = [...items, t];
			return t;
		},

		update(id: string, patch: Partial<Template>) {
			items = items.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i));
		},

		remove(id: string) {
			items = items.filter((i) => i.id !== id);
		},

		getById(id: string) {
			return items.find((i) => i.id === id);
		},

		getBySlug(slug: string) {
			return items.find((i) => slugify(i.name) === slug);
		}
	};
}

export const templateStore = createTemplateStore();
