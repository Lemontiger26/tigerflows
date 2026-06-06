<script lang="ts">
	import { categoryStore, flowStore, statsStore } from '$lib/stores';
	import Badge from '$lib/components/ui/Badge.svelte';

	let selectedCategoryId = $state<string | null>(null);
	let stats = $derived(selectedCategoryId ? statsStore.getCategoryStats(selectedCategoryId) : null);
	let categories = $derived(categoryStore.items);

	function barColor(rate: number): string {
		if (rate >= 80) return 'bg-success';
		if (rate >= 40) return 'bg-warning';
		return 'bg-error';
	}

	function formatDuration(ms: number | null): string {
		if (ms === null) return '—';
		if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
		if (ms < 86400000) return `${Math.round(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
		return `${Math.round(ms / 86400000)}d`;
	}

	function getWeeklyData() {
		const weeks: { label: string; count: number; completed: number }[] = [];
		const now = new Date();
		const flows = selectedCategoryId ? flowStore.getByCategory(selectedCategoryId) : flowStore.items;
		for (let i = 7; i >= 0; i--) {
			const d = new Date(now);
			d.setDate(d.getDate() - i * 7);
			const weekStart = d.toISOString().split('T')[0];
			const weekEnd = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			const inWeek = flows.filter((f) => f.createdAt >= weekStart && f.createdAt < weekEnd);
			weeks.push({
				label: `W${8 - i}`,
				count: inWeek.length,
				completed: inWeek.filter((f) => f.status === 'completed').length
			});
		}
		return weeks;
	}

	let weeklyData = $derived(getWeeklyData());
	let maxWeekCount = $derived(Math.max(...weeklyData.map((w) => w.count), 1));
</script>

<div class="flex flex-col gap-4 p-4 h-full overflow-y-auto">
	<!-- Category selector -->
	<div class="flex items-center gap-3">
		<select
			class="select select-bordered select-sm flex-1 max-w-xs"
			value={selectedCategoryId ?? ''}
			onchange={(e) => {
				const v = e.currentTarget.value;
				selectedCategoryId = v || null;
			}}
		>
			<option value="">All Categories</option>
			{#each categories as c}
				<option value={c.id}>{c.name}</option>
			{/each}
		</select>
	</div>

	{#if !selectedCategoryId}
		<div class="text-center py-12 text-base-content/50">Select a category to view statistics</div>
	{:else if stats && stats.totalFlows === 0}
		<div class="text-center py-12 text-base-content/50">No flows in this category yet</div>
	{:else if stats}
		<!-- Summary stats -->
		<div class="stats stats-horizontal shadow">
			<div class="stat">
				<div class="stat-title text-xs">Total</div>
				<div class="stat-value text-2xl">{stats.totalFlows}</div>
			</div>
			<div class="stat">
				<div class="stat-title text-xs">Completed</div>
				<div class="stat-value text-2xl text-success">{stats.completedFlows}</div>
			</div>
			<div class="stat">
				<div class="stat-title text-xs">Abandoned</div>
				<div class="stat-value text-2xl text-error">{stats.abandonedFlows}</div>
			</div>
			<div class="stat">
				<div class="stat-title text-xs">Avg Completion</div>
				<div class="stat-value text-2xl">
					{Math.round(stats.averageCompletionPercent)}%
				</div>
			</div>
			<div class="stat">
				<div class="stat-title text-xs">Avg Time</div>
				<div class="stat-value text-2xl text-sm">
					{formatDuration(stats.averageCompletionTimeMs)}
				</div>
			</div>
		</div>

		<!-- Step completion rates -->
		{#if stats.stepCompletionRates.length > 0}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-4">
					<h3 class="text-sm font-bold mb-3">Step Completion Rates</h3>
					{#each stats.stepCompletionRates as step}
						<div class="flex items-center gap-2 mb-2 last:mb-0">
							<span class="text-sm w-40 truncate">{step.stepTitle}</span>
							<div class="flex-1 bg-base-300 rounded-full h-4">
								<div
									class="{barColor(step.rate)} rounded-full h-4 transition-all duration-500"
									style="width: {step.rate}%"
								></div>
							</div>
							<span class="text-sm w-12 text-right font-mono">{Math.round(step.rate)}%</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Activity over time (last 8 weeks) -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4">
				<h3 class="text-sm font-bold mb-3">Activity (Last 8 Weeks)</h3>
				<div class="flex flex-row gap-2 items-end h-32">
					{#each weeklyData as week}
						<div class="flex-1 flex flex-col gap-1 items-center">
							<span class="text-xs text-base-content/50">{week.count}</span>
							<div class="w-full flex-1 flex flex-col gap-0.5 justify-end">
								{#if week.completed > 0}
									<div
										class="w-full bg-success rounded-sm"
										style="height: {(week.completed / maxWeekCount) * 100}%"
									></div>
								{/if}
								{#if week.count - week.completed > 0}
									<div
										class="w-full bg-warning rounded-sm"
										style="height: {((week.count - week.completed) / maxWeekCount) * 100}%"
									></div>
								{/if}
								{#if week.count === 0}
									<div class="w-full bg-base-300 rounded-sm" style="height: 4px"></div>
								{/if}
							</div>
							<span class="text-xs text-base-content/50">{week.label}</span>
						</div>
					{/each}
				</div>
				<div class="flex items-center gap-4 mt-2">
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 bg-success rounded-sm"></div>
						<span class="text-xs text-base-content/50">Completed</span>
					</div>
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 bg-warning rounded-sm"></div>
						<span class="text-xs text-base-content/50">Active</span>
					</div>
				</div>
			</div>
		</div>

		<!-- All flows in this category -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-4">
				<h3 class="text-sm font-bold mb-3">All Flows</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>Title</th>
								<th>Status</th>
								<th>Progress</th>
								<th>Created</th>
							</tr>
						</thead>
						<tbody>
							{#each flowStore.getByCategory(selectedCategoryId) as flow}
								{@const pct =
									flow.steps.length > 0
										? Math.round((flow.steps.filter((a) => a.checked).length / flow.steps.length) * 100)
										: 0}
								<tr>
									<td class="max-w-xs truncate">{flow.title}</td>
									<td>
										<Badge
											text={flow.status}
											color={flow.status === 'completed'
												? 'success'
												: flow.status === 'abandoned'
													? 'error'
													: 'warning'}
											size="xs"
										/>
									</td>
									<td>
										<div class="w-20 bg-base-300 rounded-full h-2">
											<div class="{barColor(pct)} rounded-full h-2" style="width: {pct}%"></div>
										</div>
									</td>
									<td class="text-xs text-base-content/50">
										{new Date(flow.createdAt).toLocaleDateString()}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>
