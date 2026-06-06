<script lang="ts">
	import { goto } from '$app/navigation';
	import { templateStore, navigationStore } from '$lib/stores';
	import type { Template } from '~types';
	import { slugify } from '$lib/helpers/slugify';
	import Badge from '$lib/components/ui/Badge.svelte';
</script>

<div class="flex flex-col gap-4">
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
		<!-- New Template Card -->
		<button
			type="button"
			class="card bg-base-100 border-2 border-dashed border-base-300 hover:border-primary transition-all cursor-pointer min-h-[120px]"
			onclick={() => goto('/templates/new')}
		>
			<div class="flex items-center justify-center h-full w-full">
				<span class="text-base-content/50 text-lg">+ New Template</span>
			</div>
		</button>

		<!-- Template Cards -->
		{#each templateStore.items.filter((t: Template) => !navigationStore.searchQuery || t.name
					.toLowerCase()
					.includes(navigationStore.searchQuery.toLowerCase()) || t.tags.some((tag) => tag
						.toLowerCase()
						.includes(navigationStore.searchQuery.toLowerCase()))) as t (t.id)}
			<button
				type="button"
				class="card bg-base-100 shadow-sm hover:shadow-md transition-all cursor-pointer text-left"
				onclick={() => goto('/templates/' + slugify(t.name))}
			>
				<div class="card-body gap-2">
					<!-- Color indicator bar -->
					<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-card"></div>

					<h3 class="card-title text-base">{t.name}</h3>

					<div class="flex flex-wrap gap-1 mt-1">
						{#each t.tags as tag}
							<Badge text={tag} color="secondary" size="xs" />
						{/each}
					</div>

					<div class="flex items-center gap-2 mt-1">
						<Badge text="{t.steps.length} steps" color="primary" size="xs" />
					</div>

					<p class="text-xs text-base-content/50 mt-1">
						{new Date(t.createdAt).toLocaleDateString()}
					</p>
				</div>
			</button>
		{/each}
	</div>

	{#if templateStore.items.length === 0}
		<p class="text-center text-base-content/50 py-8">No templates yet. Create your first one!</p>
	{/if}
</div>
