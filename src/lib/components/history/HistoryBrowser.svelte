<script lang="ts">
	import { goto } from '$app/navigation';
	import { flowStore, categoryStore, navigationStore } from '$lib/stores';
	import { slugify } from '$lib/helpers/slugify';
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { Flow } from '~types';

	interface Props {
		categoryId?: string | null;
		status?: string | null;
		dateFrom?: string | null;
		dateTo?: string | null;
		search?: string;
	}

	let { categoryId = null, status = null, dateFrom = null, dateTo = null, search = '' }: Props = $props();

	let historyEnd = $state<HTMLDivElement | null>(null);

	let filtered = $derived(
		flowStore.items
			.filter((f) => {
				if (categoryId && f.categoryId !== categoryId) return false;
				if (status && f.status !== status) return false;
				if (dateFrom && f.createdAt < dateFrom) return false;
				if (dateTo && f.createdAt > dateTo) return false;
				if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
				return true;
			})
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
	);

	let byDay = $derived.by(() => {
		const map = new Map<string, Flow[]>();
		for (const f of filtered) {
			const day = f.createdAt.slice(0, 10);
			if (!map.has(day)) map.set(day, []);
			map.get(day)!.push(f);
		}
		return map;
	});

	function getCategoryColor(cid: string | null) {
		return cid ? (categoryStore.getById(cid)?.color ?? 'base-300') : 'base-300';
	}
	function getCategoryName(cid: string | null) {
		return cid ? (categoryStore.getById(cid)?.name ?? 'Unknown') : 'Unknown';
	}
	function statusDotColor(s: Flow['status']) {
		return s === 'completed' ? 'text-success' : s === 'abandoned' ? 'text-error' : 'text-warning';
	}
	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	}
	function calcProgress(f: Flow) {
		if (f.steps.length === 0) return 0;
		return (f.steps.filter((a) => a.checked).length / f.steps.length) * 100;
	}
	function handleCardClick(f: Flow) {
		const catName = f.categoryId ? (categoryStore.getById(f.categoryId)?.name ?? '') : '';
		goto('/categories/' + slugify(catName) + '/' + slugify(f.title));
	}
	function handleCategoryFilter(e: Event) {
		navigationStore.setHistoryFilters({ categoryId: (e.target as HTMLSelectElement).value || null });
	}
	function handleStatusFilter(e: Event) {
		navigationStore.setHistoryFilters({ status: ((e.target as HTMLSelectElement).value as Flow['status']) || null });
	}
	function handleDateFromFilter(e: Event) {
		navigationStore.setHistoryFilters({ dateFrom: (e.target as HTMLInputElement).value || null });
	}
	function handleDateToFilter(e: Event) {
		navigationStore.setHistoryFilters({ dateTo: (e.target as HTMLInputElement).value || null });
	}

	$effect(() => {
		if (historyEnd) historyEnd.scrollIntoView({ behavior: 'smooth' });
	});
</script>

<div class="flex flex-col h-full">
	<div class="sticky top-0 z-10 bg-base-200 py-2 px-3 flex flex-wrap gap-2 items-center">
		<select class="select select-bordered select-sm w-36" value={categoryId ?? ''} onchange={handleCategoryFilter}>
			<option value="">All Categories</option>
			{#each categoryStore.items as c}<option value={c.id}>{c.name}</option>{/each}
		</select>
		<select class="select select-bordered select-sm w-32" value={status ?? ''} onchange={handleStatusFilter}>
			<option value="">All</option>
			<option value="active">Active</option>
			<option value="completed">Completed</option>
			<option value="abandoned">Abandoned</option>
		</select>
		<input
			type="date"
			class="input input-bordered input-sm w-36"
			value={dateFrom ?? ''}
			onchange={handleDateFromFilter}
		/>
		<input type="date" class="input input-bordered input-sm w-36" value={dateTo ?? ''} onchange={handleDateToFilter} />
	</div>

	<div class="flex-1 overflow-y-auto px-4 py-2">
		{#if filtered.length === 0}
			<div class="text-center py-12 text-base-content/50">No flows match your filters</div>
		{:else}
			<div class="relative pl-8">
				<div class="absolute left-[11px] top-0 bottom-0 w-0.5 bg-base-300"></div>
				{#each [...byDay.entries()] as [day, flows]}
					<div class="relative mb-3 mt-4 first:mt-0">
						<div
							class="absolute -left-8 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-base-100 border-2 border-base-300 z-10"
						></div>
						<span class="text-xs font-bold text-base-content/50 uppercase tracking-wide">
							{formatDate(day + 'T00:00:00')}
						</span>
					</div>
					{#each flows as f (f.id)}
						<button
							type="button"
							class="card bg-base-100 shadow-sm hover:shadow-md mb-2 ml-2 w-full text-left"
							onclick={() => handleCardClick(f)}
						>
							<div class="card-body p-3">
								<div class="flex items-center gap-2 mb-1">
									<span class={`text-sm ${statusDotColor(f.status)}`}>●</span>
									<span class="font-medium text-sm truncate flex-1">{f.title}</span>
									<span class="text-xs text-base-content/50">{formatTime(f.createdAt)}</span>
								</div>
								<div class="flex items-center gap-2 mb-2">
									<Badge text={getCategoryName(f.categoryId)} color={getCategoryColor(f.categoryId)} size="xs" />
									<Badge
										text={f.status}
										color={f.status === 'completed' ? 'success' : f.status === 'abandoned' ? 'error' : 'warning'}
										size="xs"
									/>
								</div>
								<div class="w-full bg-base-300 rounded-full h-1">
									<div
										class="h-1 rounded-full transition-all duration-300"
										style="width: {calcProgress(f)}%"
										class:bg-success={f.status === 'completed'}
										class:bg-warning={f.status === 'active'}
										class:bg-error={f.status === 'abandoned'}
									></div>
								</div>
							</div>
						</button>
					{/each}
				{/each}
				<div bind:this={historyEnd}></div>
			</div>
		{/if}
	</div>
</div>
