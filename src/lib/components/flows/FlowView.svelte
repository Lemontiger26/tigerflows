<script lang="ts">
	import { goto } from '$app/navigation';
	import { flowStore, categoryStore } from '$lib/stores';
	import { slugify } from '$lib/helpers/slugify';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StepCard from '$lib/components/ui/StepCard.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';

	interface Props {
		flowId: string;
	}
	let { flowId }: Props = $props();

	let showAbandonDialog = $state(false);
	let flow = $derived(flowStore.getById(flowId));
	let category = $derived(flow?.categoryId ? categoryStore.getById(flow.categoryId) : null);

	let progress = $derived(
		flow && flow.steps.length > 0 ? (flow.steps.filter((a) => a.checked).length / flow.steps.length) * 100 : 0
	);
	let isReadonly = $derived(flow?.status !== 'active');
	let hasCriticalUnchecked = $derived(flow ? flow.steps.some((a) => a.isCritical && !a.checked) : false);
	let statusColor = $derived(
		flow?.status === 'completed' ? 'success' : flow?.status === 'abandoned' ? 'error' : 'primary'
	);

	function handleBack() {
		goto('/categories/' + slugify(category?.name ?? ''));
	}
	function handleComplete() {
		if (!flow || hasCriticalUnchecked) return;
		flowStore.complete(flow.id);
	}
	function confirmAbandon() {
		if (!flow) return;
		flowStore.abandon(flow.id);
		showAbandonDialog = false;
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

{#if flow}
	<div class="flex flex-col gap-4">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body gap-3">
				<div class="flex items-center justify-between flex-wrap gap-2">
					<div class="flex items-center gap-2 flex-wrap">
						<h2 class="text-xl font-semibold">{flow.title}</h2>
						{#if category}
							<div class="flex items-center gap-1">
								<div class="w-3 h-3 rounded-full bg-{category.color}"></div>
								<Badge text={category.name} color="secondary" size="xs" />
							</div>
						{/if}
						<Badge text={flow.status} color={statusColor} size="sm" />
					</div>
					<button type="button" class="btn btn-ghost btn-sm" onclick={handleBack}>Back</button>
				</div>
				<div class="text-xs text-base-content/50">
					Created {formatDate(flow.createdAt)}
					{#if flow.completedAt}
						· Completed {formatDate(flow.completedAt)}{/if}
				</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow-sm">
			<div class="card-body gap-2">
				<div class="flex justify-between items-center">
					<span class="text-sm font-medium">Progress</span>
					<span class="text-xs">{flow.steps.filter((a) => a.checked).length} / {flow.steps.length}</span>
				</div>
				<progress class="progress progress-primary w-full" value={progress} max="100"></progress>
				{#if hasCriticalUnchecked && !isReadonly}
					<div class="text-xs text-error mt-1">Some critical steps are unchecked</div>
				{/if}
			</div>
		</div>

		{#if flow.steps.length > 0}
			<div class="flex flex-col gap-2">
				<h3 class="text-lg font-semibold">Steps</h3>
				{#each flow.steps.toSorted((a, b) => a.order - b.order) as step (step.id)}
					<StepCard
						{step}
						ontoggle={() => flowStore.toggleStep(flow!.id, step.id)}
						oncomment={(c) => flowStore.updateStepComment(flow!.id, step.id, c)}
						readonly={isReadonly}
					/>
				{/each}
			</div>
		{:else}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body text-center text-base-content/50 py-8">No steps in this flow.</div>
			</div>
		{/if}

		{#if flow.status === 'active'}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body flex-row justify-end gap-2">
					<button type="button" class="btn btn-ghost btn-warning" onclick={() => (showAbandonDialog = true)}
						>Abandon</button
					>
					<button type="button" class="btn btn-success" disabled={hasCriticalUnchecked} onclick={handleComplete}>
						{hasCriticalUnchecked ? 'Complete (fix critical steps first)' : 'Complete'}
					</button>
				</div>
			</div>
		{:else}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body flex-row justify-between items-center">
					<span class="text-sm text-base-content/60">This flow is {flow.status}.</span>
					<button type="button" class="btn btn-ghost btn-sm" onclick={handleBack}>Back to Category</button>
				</div>
			</div>
		{/if}
	</div>

	<ConfirmDialog
		open={showAbandonDialog}
		message="Are you sure you want to abandon this flow? This action cannot be undone."
		confirmLabel="Abandon"
		variant="warning"
		onconfirm={confirmAbandon}
		oncancel={() => (showAbandonDialog = false)}
	/>
{:else}
	<div class="text-center py-8">
		<p class="text-base-content/50">Flow not found.</p>
		<button type="button" class="btn btn-primary btn-sm mt-4" onclick={() => goto('/categories')}
			>Back to Categories</button
		>
	</div>
{/if}
