<script lang="ts">
	import { goto } from '$app/navigation';
	import { templateStore } from '$lib/stores';
	import type { TemplateStep } from '~types';
	import { tigerid } from '$lib/helpers/tigerId';
	import MarkdownEditor from '$lib/components/ui/MarkdownEditor.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import TemplateStepEditor from './TemplateStepEditor.svelte';

	interface Props {
		id: string; // 'new' for create mode, existing id for edit
	}

	let { id }: Props = $props();

	let mode = $derived(id === 'new' ? 'create' : 'edit');
	let existingTemplate = $derived(mode === 'edit' ? templateStore.getById(id) : null);

	// Form state — initialized empty, synced via $effect below
	let name = $state('');
	let description = $state('');
	let tagsInput = $state('');
	let steps = $state<TemplateStep[]>([]);

	// Sync when existingTemplate changes (navigating between templates)
	$effect(() => {
		if (existingTemplate) {
			name = existingTemplate.name;
			description = existingTemplate.description;
			tagsInput = existingTemplate.tags.join(', ');
			steps = [...existingTemplate.steps];
		} else {
			name = '';
			description = '';
			tagsInput = '';
			steps = [];
		}
	});

	let tags = $derived(
		tagsInput
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0)
	);

	let showDeleteConfirm = $state(false);

	function handleNameChange(e: Event) {
		name = (e.target as HTMLInputElement).value;
	}

	function handleDescriptionChange(value: string) {
		description = value;
	}

	function handleTagsChange(e: Event) {
		tagsInput = (e.target as HTMLInputElement).value;
	}

	function addStep() {
		const newStep: TemplateStep = {
			id: tigerid(),
			templateId: id === 'new' ? '' : id,
			slug: '',
			order: steps.length + 1,
			title: '',
			description: '',
			stepType: 'boolean',
			executorType: 'human',
			config: {},
			isCritical: false,
			embeddings: [] as unknown as TemplateStep['embeddings']
		};
		steps = [...steps, newStep];
	}

	function updateStep(index: number, updated: TemplateStep) {
		steps = steps.map((a, i) => (i === index ? updated : a));
	}

	function removeStep(index: number) {
		steps = steps.filter((_, i) => i !== index).map((a, i) => ({ ...a, order: i + 1 }));
	}

	function save() {
		if (!name.trim() || steps.length === 0) return;

		const templateSteps = steps.map((a, i) => ({ ...a, order: i + 1 }));

		if (mode === 'create') {
			templateStore.add({
				name: name.trim(),
				description,
				steps: templateSteps,
				tags
			});
		} else {
			templateStore.update(id, {
				name: name.trim(),
				description,
				steps: templateSteps,
				tags
			});
		}
		goto('/templates');
	}

	function handleDelete() {
		templateStore.remove(id);
		goto('/templates');
	}

	function removeTag(tag: string) {
		tagsInput = tags.filter((t) => t !== tag).join(', ');
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Header -->
	<div class="card bg-base-100 sticky top-16 z-10 shadow-sm">
		<div class="card-body flex-row items-center justify-between">
			<div class="flex items-center gap-2">
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => goto('/templates')}> ← Back </button>
				<h2 class="card-title">
					{mode === 'create' ? 'New Template' : 'Edit Template'}
				</h2>
			</div>
			<div class="flex gap-2">
				{#if mode === 'edit'}
					<button
						type="button"
						class="btn btn-error btn-outline btn-sm border-1"
						onclick={() => (showDeleteConfirm = true)}
					>
						Delete
					</button>
				{/if}
				<button
					type="button"
					class="btn btn-primary btn-sm"
					onclick={save}
					disabled={!name.trim() || steps.length === 0}
				>
					Save
				</button>
			</div>
		</div>
	</div>

	<!-- Details -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<!-- Name -->
			<div class="form-control gap-1">
				<!-- <label class="label" for="template-name">
					<span class="label-text font-medium">Name</span>
				</label> -->
				<input
					id="template-name"
					type="text"
					class="input input-bordered w-full font-serif text-2xl font-semibold tracking-tight"
					placeholder="Template name"
					value={name}
					oninput={handleNameChange}
				/>
			</div>

			<!-- Tags -->
			<div class="form-control gap-1">
				<label class="label" for="template-tags">
					<span class="label-text font-medium">Tags</span>
				</label>
				<input
					id="template-tags"
					type="text"
					class="input input-bordered input-md w-full"
					placeholder="Comma-separated tags (e.g., work, urgent, daily)"
					value={tagsInput}
					oninput={handleTagsChange}
				/>
				{#if tags.length > 0}
					<div class="mt-1 flex flex-wrap gap-1">
						{#each tags as tag}
							<Badge text={tag} color="secondary" size="sm" />
							<button type="button" class="btn btn-ghost btn-xs" onclick={() => removeTag(tag)}> ✕ </button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Description -->
			<div class="form-control gap-1">
				{#key id}
					<!-- label="Description" -->
					<MarkdownEditor value={description} onchange={handleDescriptionChange} minHeight="120px" />
				{/key}
			</div>
		</div>
	</div>

	<!-- Steps -->
	<div class="card shadow-sm">
		<div class="card-body gap-4">
			<div class="flex items-center justify-between">
				<h3 class="card-title text-base">Steps ({steps.length})</h3>
				<button type="button" class="btn btn-outline btn-sm" onclick={addStep}> + Add Step </button>
			</div>

			{#if steps.length === 0}
				<p class="text-base-content/50 py-4 text-center">No steps yet. Add your first step above.</p>
			{:else}
				<div class="flex flex-col gap-3">
					{#each steps as step, index (step.id)}
						<TemplateStepEditor
							{step}
							{index}
							onupdate={(updated) => updateStep(index, updated)}
							onremove={() => removeStep(index)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Validation messages -->
	{#if name.trim() && steps.length === 0}
		<p class="text-warning text-center text-sm">Add at least one step to save</p>
	{/if}
</div>

<ConfirmDialog
	open={showDeleteConfirm}
	message="Are you sure you want to delete this template? This action cannot be undone."
	confirmLabel="Delete"
	variant="error"
	onconfirm={handleDelete}
	oncancel={() => (showDeleteConfirm = false)}
/>
