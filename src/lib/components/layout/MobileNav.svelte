<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const navItems = [
		{ path: '/flows',      icon: 'lucide--zap',             label: 'Flows' },
		{ path: '/categories', icon: 'lucide--folder',          label: 'Categories' },
		{ path: '/templates',  icon: 'lucide--layout-template', label: 'Templates' },
		{ path: '/history',    icon: 'lucide--history',         label: 'History' },
		{ path: '/stats',      icon: 'lucide--chart-bar',       label: 'Stats' },
	];

	function isActive(path: string): boolean {
		return page.url.pathname.startsWith(path);
	}
</script>

<nav class="btm-nav btm-nav-sm bg-base-100 shadow-lg md:hidden z-50">
	{#each navItems as item}
		<button
			class="{isActive(item.path) ? 'active' : ''}"
			onclick={() => goto(item.path)}
		>
			<span class="icon-[{item.icon}] size-5"></span>
			<span class="btm-nav-label text-xs">{item.label}</span>
		</button>
	{/each}
</nav>
