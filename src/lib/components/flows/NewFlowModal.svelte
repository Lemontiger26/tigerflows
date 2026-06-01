<script lang="ts">
	import { goto } from '$app/navigation';
	import { flowStore, categoryStore, templateStore } from '$lib/stores';
	import { slugify } from '$lib/helpers/slugify';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		categoryId: string;
	}
	let { open, onclose, categoryId }: Props = $props();

	let category = $derived(categoryStore.getById(categoryId));
	let templateId = $state('');
	let title = $state('');

	$effect(() => {
		if (open && category) {
			templateId = '';
			title = '';
		}
	});

	function handleCreate() {
		if (!title.trim() || !templateId) return;
		const newFlow = flowStore.instantiate(templateId, categoryId, title.trim());
		onclose();
		goto('/categories/' + slugify(category!.name) + '/' + slugify(newFlow.title));
	}
</script>

<Modal {open} title="New Flow" {onclose}>
	<div class="flex flex-col gap-4 py-4">
		<div class="form-control gap-2">
			<label class="label" for="flow-title"><span class="label-text">Title</span></label>
			<input
				id="flow-title"
				type="text"
				class="input input-bordered w-full"
				placeholder="Flow title"
				bind:value={title}
			/>
		</div>

		{#if category}
			<div class="form-control gap-2">
				<label class="label"><span class="label-text">Category</span></label>
				<div class="flex items-center gap-2">
					<div class="h-4 w-4 rounded-full bg-{category.color}"></div>
					<span class="text-sm">{category.name}</span>
				</div>
			</div>
		{/if}

		<div class="form-control gap-2">
			<label class="label" for="flow-template"><span class="label-text">Template</span></label>
			<select id="flow-template" class="select select-bordered select-sm w-full" bind:value={templateId}>
				<option value="">No template (empty flow)</option>
				{#each templateStore.items as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
			</select>
		</div>
	</div>

	{#snippet actions()}
		<button type="button" class="btn btn-ghost" onclick={onclose}>Cancel</button>
		<button type="button" class="btn btn-primary" disabled={!title.trim()} onclick={handleCreate}> Start Flow </button>
	{/snippet}
</Modal>
