<script lang="ts">
	import type { TemplateStep } from '~types';
	import MarkdownEditor from '$lib/components/ui/MarkdownEditor.svelte';

	interface Props {
		step: TemplateStep;
		index: number;
		onupdate: (step: TemplateStep) => void;
		onremove: () => void;
	}

	let { step, index, onupdate, onremove }: Props = $props();

	function handleTitleChange(e: Event) {
		onupdate({ ...step, title: (e.target as HTMLInputElement).value });
	}

	function handleDescriptionChange(desc: string) {
		onupdate({ ...step, description: desc });
	}

	function toggleCritical() {
		onupdate({ ...step, isCritical: !step.isCritical });
	}
</script>

<!-- Timeline row -->
<div class="flex items-stretch gap-3">
	<!-- Timeline column -->
	<div class="flex shrink-0 flex-col items-center pt-3">
		<div
			class="bg-warning/15 border-warning/60 text-warning flex h-8 w-8 shrink-0 items-center justify-center
			rounded-full border-2 text-sm font-bold"
		>
			{index + 1}
		</div>
		<div class="bg-warning/30 mt-1.5 w-0.5 flex-1"></div>
	</div>

	<!-- Card -->
	<div class="card bg-base-100 border-base-300 mb-2 flex-1 border p-3 shadow-sm">
		<div class="flex flex-col gap-2">
			<input
				type="text"
				class="input input-bordered w-full font-serif text-lg font-semibold tracking-tight"
				placeholder="Step title"
				value={step.title}
				oninput={handleTitleChange}
			/>

			<MarkdownEditor
				value={step.description ?? ''}
				onchange={handleDescriptionChange}
				placeholder="Description (optional, supports markdown)"
				minHeight="40px"
			/>

			<div class="flex items-center justify-between">
				<button
					type="button"
					class="btn btn-xs rounded-xl border-none {step.isCritical
						? 'bg-error hover:bg-error/30 text-black'
						: 'btn-ghost text-base-content/50 hover:text-error'}"
					onclick={toggleCritical}
				>
					<span class="icon-[lucide--triangle-alert] size-4"></span>
					Critical
				</button>

				<button
					type="button"
					class="btn btn-ghost btn-sm text-base-content/40 hover:text-error border-1"
					onclick={onremove}
				>
					<span class="icon-[lucide--x] size-4"></span>
					Remove
				</button>
			</div>
		</div>
	</div>
</div>
