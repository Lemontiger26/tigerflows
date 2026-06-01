<script lang="ts">
	import Modal from './Modal.svelte';

	interface Props {
		open: boolean;
		message: string;
		confirmLabel?: string;
		variant?: 'error' | 'warning';
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		message,
		confirmLabel = 'Confirm',
		variant = 'error',
		onconfirm,
		oncancel
	}: Props = $props();

	let confirmClass = $derived(variant === 'error' ? 'btn btn-error' : 'btn btn-warning');
</script>

<Modal {open} title={confirmLabel} onclose={oncancel}>
	<p class="py-4">{message}</p>
	{#snippet actions()}
		<button class="btn btn-ghost" onclick={oncancel}>Cancel</button>
		<button class={confirmClass} onclick={onconfirm}>{confirmLabel}</button>
	{/snippet}
</Modal>
