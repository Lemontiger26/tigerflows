<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		children?: Snippet;
		actions?: Snippet;
	}

	let { open, title, onclose, children, actions }: Props = $props();
</script>

<dialog class="modal" class:modal-open={open} onclose={onclose}>
	<div class="modal-box">
		<h3 class="font-bold text-lg">{title}</h3>
		{#if children}
			{@render children()}
		{/if}
		{#if actions}
			<div class="modal-action">
				{@render actions()}
			</div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onclose}>close</button>
	</form>
</dialog>
