<script lang="ts">
	// @ts-ignore — CSS side-effect import, Vite handles this
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileNav from '$lib/components/layout/MobileNav.svelte';
	import { navigationStore } from '$lib/stores';

	let { children } = $props();

	// Apply current theme to <html> — re-runs whenever theme changes.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', navigationStore.theme);
	});

	// OS dark-mode listener — always attached, always wins.
	// Runs exactly once on mount; teardown on unmount.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = (e: MediaQueryListEvent) => {
			navigationStore.setTheme(e.matches ? 'tigerdark' : 'tigerlight');
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

<div class="min-h-screen bg-base-200">
	<Header />
	<div class="flex">
		<Sidebar />
		<main class="flex-1 p-4 pb-20 md:pb-4 min-h-[calc(100vh-4rem)]">
			{@render children()}
		</main>
	</div>
	<MobileNav />
</div>
