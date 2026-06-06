<script lang="ts">
	import { goto } from '$app/navigation';
	import { flowStore, categoryStore } from '$lib/stores';
	import { slugify } from '$lib/helpers/slugify';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		categoryId?: string;
		search?: string;
	}
	let { categoryId, search = '' }: Props = $props();

	type ViewMode = 'active' | 'past';
	let viewMode = $state<ViewMode>('active');

	let filtered = $derived(
		flowStore.items
			.filter((f) => {
				if (viewMode === 'active' && f.status !== 'active') return false;
				if (viewMode === 'past' && f.status === 'active') return false;
				if (categoryId && f.categoryId !== categoryId) return false;
				if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
				return true;
			})
			.toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
	);

	let activeCount = $derived(
		flowStore.items.filter((f) => f.status === 'active' && (!categoryId || f.categoryId === categoryId)).length
	);
	let pastCount = $derived(
		flowStore.items.filter((f) => f.status !== 'active' && (!categoryId || f.categoryId === categoryId)).length
	);

	function statusColor(status: string) {
		return status === 'completed' ? 'success' : status === 'abandoned' ? 'error' : 'primary';
	}
	function progress(flow: (typeof flowStore.items)[0]) {
		if (flow.steps.length === 0) return 0;
		return (flow.steps.filter((a) => a.checked).length / flow.steps.length) * 100;
	}
	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Active / Past toggle -->
	<div class="flex items-center gap-2">
		<div class="join">
			<button
				type="button"
				class="join-item btn btn-sm {viewMode === 'active' ? 'btn-primary' : 'btn-ghost'}"
				onclick={() => (viewMode = 'active')}
			>
				Active
				{#if activeCount > 0}
					<span class="badge badge-sm {viewMode === 'active' ? 'badge-primary-content' : 'badge-neutral'} ml-1"
						>{activeCount}</span
					>
				{/if}
			</button>
			<button
				type="button"
				class="join-item btn btn-sm {viewMode === 'past' ? 'btn-primary' : 'btn-ghost'}"
				onclick={() => (viewMode = 'past')}
			>
				Past
				{#if pastCount > 0}
					<span class="badge badge-sm {viewMode === 'past' ? 'badge-primary-content' : 'badge-neutral'} ml-1"
						>{pastCount}</span
					>
				{/if}
			</button>
		</div>
	</div>

	{#if filtered.length > 0}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filtered as f (f.id)}
				{@const cat = f.categoryId ? categoryStore.getById(f.categoryId) : null}
				{@const prog = progress(f)}
				<button
					type="button"
					class="card bg-base-100 shadow-sm cursor-pointer hover:shadow-md text-left"
					onclick={() => goto('/categories/' + slugify(cat?.name ?? '') + '/' + slugify(f.title))}
				>
					<div class="card-body gap-2">
						<h3 class="card-title text-base truncate flex-1">{f.title}</h3>
						<div class="flex items-center gap-2 flex-wrap">
							{#if cat}
								<div class="flex items-center gap-1">
									<div class="w-3 h-3 rounded-full bg-{cat.color}"></div>
									<Badge text={cat.name} color="secondary" size="xs" />
								</div>
							{/if}
							<Badge text={f.status} color={statusColor(f.status)} size="xs" />
						</div>
						<div class="mt-1">
							<div class="flex justify-between text-xs text-base-content/50 mb-1">
								<span>Progress</span><span>{Math.round(prog)}%</span>
							</div>
							<progress class="progress progress-primary w-full h-1" value={prog} max="100"></progress>
						</div>
						<p class="text-xs text-base-content/50 mt-1">{formatDate(f.createdAt)}</p>
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<p class="text-center text-base-content/50 py-8">
			{search
				? `No ${viewMode} flows matching "${search}".`
				: viewMode === 'active'
					? 'No active flows.'
					: 'No past flows.'}
		</p>
	{/if}
</div>
