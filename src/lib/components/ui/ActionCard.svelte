<script lang="ts">
	import type { FlowAction } from '~types';
	import MarkdownView from './MarkdownView.svelte';

	interface Props {
		action: FlowAction;
		ontoggle: () => void;
		oncomment: (comment: string) => void;
		readonly?: boolean;
	}

	let { action, ontoggle, oncomment, readonly = false }: Props = $props();

	let showComment = $state(false);

	function toggleComment(e: Event) { e.stopPropagation(); showComment = !showComment; }

	function handleKeydown(e: KeyboardEvent) {
		if (readonly) return;
		if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ontoggle(); }
	}

	function circleClass(): string {
		if (action.checked) return 'bg-success/20 border-2 border-success text-success';
		if (action.isCritical) return 'bg-error/15 border-2 border-error text-error';
		return 'bg-warning/15 border-2 border-warning/60 text-warning';
	}

	function cardClass(): string {
		const base = 'flex-1 card transition-all duration-200 ease-in-out';
		const interactive = readonly ? '' : 'cursor-pointer';
		if (action.checked) return `${base} bg-success/10 border-l-4 border-success shadow-inner scale-[0.98] ${interactive}`;
		if (action.isCritical) return `${base} bg-error/5 border-l-4 border-error shadow-sm ${interactive}`;
		return `${base} bg-base-100 border-l-4 border-base-300 shadow-sm ${interactive}`;
	}

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<!-- Timeline row -->
<div class="flex gap-3 items-stretch">
	<!-- Timeline column: circle + connecting line -->
	<div class="flex flex-col items-center shrink-0 pt-3">
		<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 {circleClass()}">
			{action.order + 1}
		</div>
		<div class="w-0.5 flex-1 bg-warning/30 mt-1.5"></div>
	</div>

	<!-- Card -->
	<div class={cardClass()} role="checkbox" aria-checked={action.checked} aria-readonly={readonly}
		tabindex={readonly ? -1 : 0} onclick={readonly ? undefined : ontoggle} onkeydown={handleKeydown}>
		<div class="card-body p-3">
			<div class="flex items-start gap-2">
				<div class="flex-1 min-w-0">
					<h4 class="font-medium text-base">{action.title}</h4>
					{#if action.description}
						<div class="mt-1">
							<MarkdownView content={action.description} class="text-sm text-base-content/70" />
						</div>
					{/if}
				</div>
				<div class="flex items-center gap-1 shrink-0">
					{#if action.checked && action.checkedAt}
						<span class="text-sm text-success">{formatTime(action.checkedAt)}</span>
					{/if}
					{#if !readonly}
						<button type="button" class="btn btn-ghost btn-xs btn-circle text-base-content/50"
							onclick={toggleComment} title="Comment">
							<span class="icon-[lucide--message-square] size-4"></span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

{#if showComment}
	<div class="pl-11 pb-2">
		<textarea class="textarea textarea-bordered textarea-sm w-full text-sm" placeholder="Add a note..."
			onblur={(e) => oncomment((e.target as HTMLTextAreaElement).value)} rows="2">{action.comment ?? ''}</textarea>
	</div>
{/if}
