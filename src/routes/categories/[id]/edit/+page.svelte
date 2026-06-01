<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { categoryStore } from '$lib/stores';
	import CategoryEditor from '$lib/components/categories/CategoryEditor.svelte';

	let category = $derived(categoryStore.getBySlug(page.params.id!));

	$effect(() => {
		if (!category) goto('/categories', { replaceState: true });
	});
</script>

{#if category}
	<CategoryEditor id={category.id} />
{/if}
