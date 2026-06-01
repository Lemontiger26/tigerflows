<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigationStore } from '$lib/stores';
	import SearchField from '$lib/components/ui/SearchField.svelte';

	function toggleTheme() {
		navigationStore.setTheme(navigationStore.theme === 'tigerlight' ? 'tigerdark' : 'tigerlight');
	}
</script>

<header class="navbar bg-base-100 shadow-sm sticky top-0 z-50 px-4">
	<!-- Left: brand + burger -->
	<div class="flex items-center gap-2">
		<button
			class="btn btn-ghost btn-sm btn-circle hover:bg-transparent hover:border-transparent"
			onclick={() => navigationStore.toggleSidebar()}
			aria-label="Toggle sidebar"
		>
			<span class="icon-[lucide--menu] size-5"></span>
		</button>
		<button
			class="btn btn-ghost btn-sm hover:bg-transparent hover:border-transparent"
			onclick={() => goto('/flows')}
			aria-label="Go to flows"
		>
			<span class="icon-[lucide--waves] size-5"></span>
		</button>
	</div>

	<!-- Center: search -->
	<div class="flex-1 flex justify-center px-4">
		<div class="w-full max-w-md">
			<SearchField
				value={navigationStore.searchQuery}
				onchange={(v) => navigationStore.setSearchQuery(v)}
				placeholder="Search..."
			/>
		</div>
	</div>

	<!-- Right: theme toggle -->
	<button
		class="btn btn-ghost btn-circle swap swap-rotate hover:bg-transparent hover:border-transparent"
		onclick={toggleTheme}
		aria-label="Toggle theme"
	>
		{#if navigationStore.theme === 'tigerdark'}
			<span class="icon-[lucide--sun] size-5"></span>
		{:else}
			<span class="icon-[lucide--moon] size-5"></span>
		{/if}
	</button>
</header>
