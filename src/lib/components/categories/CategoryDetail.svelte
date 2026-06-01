<script lang="ts">
	import { goto } from '$app/navigation';
	import { categoryStore, flowStore, templateStore } from '$lib/stores';
	import { slugify } from '$lib/helpers/slugify';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MarkdownView from '$lib/components/ui/MarkdownView.svelte';
	import FlowList from '$lib/components/flows/FlowList.svelte';
	import NewFlowModal from '$lib/components/flows/NewFlowModal.svelte';

	interface Props { categoryId: string; }
	let { categoryId }: Props = $props();

	let showNewFlowModal = $state(false);
	let category = $derived(categoryStore.getById(categoryId));
	let totalFlows    = $derived(category ? flowStore.items.filter(f => f.categoryId === category!.id).length : 0);
	let completedCount = $derived(category ? flowStore.items.filter(f => f.categoryId === category!.id && f.status === 'completed').length : 0);
	let activeCount   = $derived(category ? flowStore.items.filter(f => f.categoryId === category!.id && f.status === 'active').length : 0);
</script>

{#if category}
	<div class="flex flex-col gap-4">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body gap-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-4 h-4 rounded-full bg-{category.color}"></div>
						<h2 class="card-title">{category.name}</h2>
					</div>
					<div class="flex gap-2">
						<button type="button" class="btn btn-ghost btn-sm"
							onclick={() => goto('/categories/' + slugify(category!.name) + '/edit')}>
							Edit
						</button>
						<button type="button" class="btn btn-primary btn-sm"
							onclick={() => (showNewFlowModal = true)}>
							+ New Flow
						</button>
					</div>
				</div>

				{#if category.description}
					<div class="text-sm"><MarkdownView content={category.description} /></div>
				{/if}

<div class="mt-2">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => goto('/categories')}>
						← Back to Categories
					</button>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-4">
			<div class="card bg-base-100 shadow-sm"><div class="card-body p-4 text-center">
				<div class="text-2xl font-bold">{totalFlows}</div>
				<div class="text-xs text-base-content/60">Total</div>
			</div></div>
			<div class="card bg-base-100 shadow-sm"><div class="card-body p-4 text-center">
				<div class="text-2xl font-bold text-success">{completedCount}</div>
				<div class="text-xs text-base-content/60">Completed</div>
			</div></div>
			<div class="card bg-base-100 shadow-sm"><div class="card-body p-4 text-center">
				<div class="text-2xl font-bold text-primary">{activeCount}</div>
				<div class="text-xs text-base-content/60">Active</div>
			</div></div>
		</div>

		<div>
			<h3 class="text-lg font-semibold mb-2">Flows</h3>
			<FlowList {categoryId} />
		</div>
	</div>

	<NewFlowModal open={showNewFlowModal} onclose={() => (showNewFlowModal = false)} {categoryId} />
{:else}
	<div class="text-center py-8 text-base-content/50">Category not found.</div>
{/if}
