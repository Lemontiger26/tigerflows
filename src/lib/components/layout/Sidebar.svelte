<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { navigationStore } from '$lib/stores';

	const navItems = [
		{ path: '/flows', icon: 'lucide--zap', label: 'Flows' },
		{ path: '/categories', icon: 'lucide--folder', label: 'Categories' },
		{ path: '/templates', icon: 'lucide--layout-template', label: 'Templates' },
		{ path: '/history', icon: 'lucide--history', label: 'History' },
		{ path: '/stats', icon: 'lucide--chart-bar', label: 'Stats' }
	];

	function isActive(path: string): boolean {
		return page.url.pathname.startsWith(path);
	}
</script>

<!-- Desktop sidebar -->
<aside
	class="bg-base-100 sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto shadow-sm transition-all duration-300 md:flex {navigationStore.sidebarExpanded
		? 'w-60'
		: 'w-14'}"
>
	{#each navItems as item}
		<button
			class="flex items-center gap-3 px-4 py-3 transition-colors {isActive(item.path)
				? 'bg-primary/10 text-primary'
				: 'text-base-content hover:text-info hover:cursor-pointer'}"
			onclick={() => goto(item.path)}
		>
			<span class="icon-[{item.icon}] size-5 shrink-0"></span>
			{#if navigationStore.sidebarExpanded}
				<span class="text-sm">{item.label}</span>
			{/if}
		</button>
	{/each}
</aside>

<!-- Mobile off-canvas drawer -->
<div class="md:hidden">
	{#if navigationStore.sidebarExpanded}
		<!-- Backdrop -->
		<div class="fixed inset-0 z-40 bg-black/50" onclick={() => navigationStore.toggleSidebar()} role="presentation">
			<!-- Drawer panel -->
			<aside
				class="bg-base-100 h-full w-64 p-4 shadow-xl"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				tabindex="-1"
			>
				<div class="mb-4 flex items-center justify-between">
					<span class="text-lg font-bold">TigerFlows</span>
					<button
						class="btn btn-ghost btn-sm btn-circle"
						onclick={() => navigationStore.toggleSidebar()}
						aria-label="Close sidebar"
					>
						<span class="icon-[lucide--x] size-4"></span>
					</button>
				</div>
				<nav class="flex flex-col gap-1">
					{#each navItems as item}
						<button
							class="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors {isActive(item.path)
								? 'bg-primary/10 text-primary'
								: 'text-base-content'}"
							onclick={() => {
								navigationStore.toggleSidebar();
								goto(item.path);
							}}
						>
							<span class="icon-[{item.icon}] size-5 shrink-0"></span>
							<span class="text-sm">{item.label}</span>
						</button>
					{/each}
				</nav>
			</aside>
		</div>
	{/if}
</div>
