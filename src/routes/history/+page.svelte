<script lang="ts">
	import { navigationStore } from '$lib/stores';
	import HistoryBrowser from '$lib/components/history/HistoryBrowser.svelte';
</script>

<HistoryBrowser
	categoryId={navigationStore.historyFilters.categoryId}
	status={navigationStore.historyFilters.status}
	dateFrom={navigationStore.historyFilters.dateFrom}
	dateTo={navigationStore.historyFilters.dateTo}
	search={navigationStore.searchQuery}
/>
