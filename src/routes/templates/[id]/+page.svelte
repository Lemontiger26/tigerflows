<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { templateStore } from '$lib/stores';
	import TemplateEditor from '$lib/components/templates/TemplateEditor.svelte';

	// 'new' is a magic slug for the create form; anything else resolves to a real template.
	let resolvedId = $derived(
		page.params.id === 'new'
			? 'new'
			: (templateStore.getBySlug(page.params.id!)?.id ?? null),
	);

	$effect(() => {
		if (resolvedId === null) goto('/templates', { replaceState: true });
	});
</script>

{#if resolvedId}
	<TemplateEditor id={resolvedId} />
{/if}
