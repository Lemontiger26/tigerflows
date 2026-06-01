<script lang="ts">
	import { navigationStore } from '$lib/stores';
	import FlowList from '$lib/components/flows/FlowList.svelte';
</script>

<FlowList search={navigationStore.searchQuery} />
