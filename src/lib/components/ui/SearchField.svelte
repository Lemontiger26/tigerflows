<script lang="ts">
	interface Props {
		value: string;
		onchange: (value: string) => void;
		placeholder?: string;
	}

	let { value, onchange, placeholder = 'Search' }: Props = $props();

	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => onchange(v), 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			(e.target as HTMLInputElement).value = '';
			onchange('');
		}
	}

	function clearInput(e: Event) {
		e.preventDefault();
		(e.target as HTMLInputElement).value = '';
		onchange('');
	}
</script>

<div class="relative">
	<span class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
		<span class="icon-[lucide--search] size-4 text-base-content/40"></span>
	</span>
	<input
		type="text"
		class="search-field w-full pl-9 pr-8 h-12 text-xl rounded-sm bg-base-100 border-none focus:ring-0 focus-visible:ring-0"
		{placeholder}
		{value}
		oninput={handleInput}
		onkeydown={handleKeydown}
	/>
	{#if value && value.length > 0}
		<button
			class="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
			onclick={clearInput}
			aria-label="Clear search"
		>
			<span class="icon-[lucide--x] size-3"></span>
		</button>
	{/if}
</div>
