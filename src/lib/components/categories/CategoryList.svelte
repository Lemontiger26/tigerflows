<script lang="ts">
	import { goto } from '$app/navigation';
	import { categoryStore, flowStore, navigationStore } from '$lib/stores';
	import { slugify } from '$lib/helpers/slugify';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MarkdownView from '$lib/components/ui/MarkdownView.svelte';
</script>

<div class="flex flex-col gap-4">
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
		<!-- New Category Card -->
		<button
			type="button"
			class="card bg-base-100 border-2 border-dashed border-base-300 hover:border-primary transition-all cursor-pointer min-h-[140px]"
			onclick={() => goto('/categories/new')}
		>
			<div class="flex items-center justify-center h-full w-full">
				<span class="text-base-content/50 text-lg">+ New Category</span>
			</div>
		</button>

		<!-- Category Cards -->
		{#each categoryStore.items.filter(c =>
			!navigationStore.searchQuery ||
			c.name.toLowerCase().includes(navigationStore.searchQuery.toLowerCase())
		) as c (c.id)}
			{@const flowCount = flowStore.items.filter(f => f.categoryId === c.id).length}
			<button
				type="button"
				class="card bg-base-100 shadow-sm hover:shadow-md transition-all cursor-pointer text-left border-l-4 border-{c.color}"
				onclick={() => goto('/categories/' + slugify(c.name))}
			>
				<div class="card-body gap-2">
					<h3 class="card-title text-base">{c.name}</h3>

					{#if c.description}
						<div class="line-clamp-2 text-sm text-base-content/70">
							<MarkdownView content={c.description} />
						</div>
					{/if}

					<div class="flex items-center gap-2 mt-1 flex-wrap">
						<Badge text="{flowCount} flows" color="primary" size="xs" />
					</div>
				</div>
			</button>
		{/each}
	</div>

	{#if categoryStore.items.length === 0}
		<p class="text-center text-base-content/50 py-8">No categories yet. Create your first one!</p>
	{/if}
</div>
