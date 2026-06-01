<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { categoryStore, flowStore } from '$lib/stores';
	import FlowView from '$lib/components/flows/FlowView.svelte';

	let category = $derived(categoryStore.getBySlug(page.params.id!));
	let flow = $derived(
		category ? flowStore.getBySlug(page.params.flowId!, category.id) : null,
	);

	$effect(() => {
		if (category && !flow) goto('/categories/' + page.params.id, { replaceState: true });
		else if (!category) goto('/categories', { replaceState: true });
	});
</script>

{#if flow}
	<FlowView flowId={flow.id} />
{/if}
