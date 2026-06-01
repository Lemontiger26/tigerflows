<script lang="ts">
	import { goto } from '$app/navigation';
	import { categoryStore } from '$lib/stores';
	import { slugify } from '$lib/helpers/slugify';
	import MarkdownEditor from '$lib/components/ui/MarkdownEditor.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';

	interface Props {
		id?: string; // present for edit mode, absent for create
	}

	let { id }: Props = $props();

	let name = $state('');
	let description = $state('');
	let selectedColor = $state('primary');
	let showDeleteDialog = $state(false);

	const COLORS = ['primary', 'secondary', 'accent', 'info', 'success', 'warning'] as const;

	let editingCategory = $derived(id ? categoryStore.getById(id) : null);
	let isEditMode = $derived(editingCategory != null);

	$effect(() => {
		if (editingCategory) {
			name = editingCategory.name;
			description = editingCategory.description;
			selectedColor = editingCategory.color;
		} else {
			name = '';
			description = '';
			selectedColor = 'primary';
		}
	});

	function handleSave() {
		if (!name.trim()) return;
		if (isEditMode && editingCategory) {
			categoryStore.update(editingCategory.id, {
				name: name.trim(), description, color: selectedColor
			});
			goto('/categories/' + slugify(name.trim()));
		} else {
			const c = categoryStore.add({ name: name.trim(), description });
			goto('/categories/' + slugify(c.name));
		}
	}

	function handleDelete() {
		if (editingCategory) { categoryStore.remove(editingCategory.id); goto('/categories'); }
	}

	function handleCancel() {
		if (isEditMode && editingCategory) goto('/categories/' + slugify(editingCategory.name));
		else goto('/categories');
	}
</script>

<div class="flex flex-col gap-4 max-w-2xl mx-auto">
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h2 class="card-title">{isEditMode ? 'Edit Category' : 'New Category'}</h2>

			<div class="form-control gap-2">
				<label class="label" for="cat-name"><span class="label-text">Name</span></label>
				<input id="cat-name" type="text" class="input input-bordered w-full"
					placeholder="Category name" bind:value={name} />
			</div>

			<div class="form-control gap-2">
				<MarkdownEditor label="Description" value={description} onchange={(v) => (description = v)}
					placeholder="Describe this category..." minHeight="120px" />
			</div>

<div class="form-control gap-2">
				<label class="label"><span class="label-text">Color</span></label>
				<div class="flex gap-3">
					{#each COLORS as color}
						<button type="button"
							class="rounded-full w-8 h-8 bg-{color} transition-all {selectedColor === color ? 'ring-2 ring-offset-2 ring-base-content' : 'opacity-70 hover:opacity-100'}"
							onclick={() => (selectedColor = color)} aria-label="Select {color}"></button>
					{/each}
				</div>
			</div>

			<div class="flex gap-2 justify-end mt-4">
				{#if isEditMode}
					<button type="button" class="btn btn-ghost text-error" onclick={() => (showDeleteDialog = true)}>Delete</button>
				{/if}
				<button type="button" class="btn btn-ghost" onclick={handleCancel}>Cancel</button>
				<button type="button" class="btn btn-primary" disabled={!name.trim()} onclick={handleSave}>
					{isEditMode ? 'Save' : 'Create'}
				</button>
			</div>
		</div>
	</div>
</div>

<ConfirmDialog
	open={showDeleteDialog}
	message="Are you sure you want to delete this category? This action cannot be undone."
	confirmLabel="Delete" variant="error"
	onconfirm={handleDelete} oncancel={() => (showDeleteDialog = false)}
/>
