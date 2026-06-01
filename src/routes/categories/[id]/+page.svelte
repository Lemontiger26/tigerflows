<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { categoryStore } from '$lib/stores';
	import CategoryDetail from '$lib/components/categories/CategoryDetail.svelte';

	let category = $derived(categoryStore.getBySlug(page.params.id!));

	$effect(() => {
		if (!category) goto('/categories', { replaceState: true });
	});
</script>

{#if category}
	<CategoryDetail categoryId={category.id} />
{/if}
