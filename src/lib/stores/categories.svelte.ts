import type { Category } from '~types';
import { seedCategories } from './seed';
import { tigerid } from '$lib/helpers/tigerId';
import { slugify } from '$lib/helpers/slugify';

const COLOR_CYCLE = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'] as const;

function createCategoryStore() {
	let items = $state<Category[]>(seedCategories);

	return {
		get items() {
			return items;
		},

		add(
			data: Pick<Category, 'name' | 'description'> &
				Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'color'>>
		) {
			const now = new Date().toISOString();
			const existingColors = new Set(items.map((i) => i.color));
			const nextColor =
				COLOR_CYCLE.find((c) => !existingColors.has(c)) ??
				COLOR_CYCLE[items.length % COLOR_CYCLE.length];
			const c: Category = {
				userId: null,
				slug: slugify(data.name),
				embeddings: [] as unknown as Category['embeddings'],
				...data,
				id: tigerid(),
				color: nextColor,
				createdAt: now,
				updatedAt: now
			};
			items = [...items, c];
			return c;
		},

		update(id: string, patch: Partial<Category>) {
			items = items.map((i) =>
				i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
			);
		},

		remove(id: string) {
			items = items.filter((i) => i.id !== id);
		},

		getById(id: string) {
			return items.find((i) => i.id === id);
		},

		getBySlug(slug: string) {
			return items.find((i) => slugify(i.name) === slug);
		},
	};
}

export const categoryStore = createCategoryStore();
