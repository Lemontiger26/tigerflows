<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createClassComponent } from 'svelte/legacy';
	import { Editor, Viewer } from 'bytemd';
	import gfm from '@bytemd/plugin-gfm';
	import highlight from '@bytemd/plugin-highlight';
	import 'bytemd/dist/index.css';
	import 'github-markdown-css/github-markdown-light.css';
	import 'highlight.js/styles/github.css';

	interface Props {
		value: string;
		onchange: (value: string) => void;
		placeholder?: string;
		minHeight?: string;
		label?: string;
	}

	let { value, onchange, placeholder = 'Description...', minHeight = '40px', label }: Props = $props();

	let mode = $state<'edit' | 'render'>('edit');
	let showHelp = $state(false);
	let lastEmitted = value;

	let editorContainer = $state<HTMLDivElement>();
	let viewerContainer = $state<HTMLDivElement>();
	let editor: ReturnType<typeof createClassComponent> | null = null;
	let viewer: ReturnType<typeof createClassComponent> | null = null;
	const plugins = [gfm(), highlight()];

	function mountEditor() {
		if (!editorContainer || editor) return;
		editor = createClassComponent({
			component: Editor as any,
			target: editorContainer,
			props: { value, plugins, placeholder, mode: 'tab' }
		});
		editor.$on('change', (e: CustomEvent<{ value: string }>) => {
			lastEmitted = e.detail.value;
			onchange(e.detail.value);
		});
	}

	function destroyEditor() {
		editor?.$destroy();
		editor = null;
	}

	function mountViewer() {
		if (!viewerContainer || viewer) return;
		viewer = createClassComponent({
			component: Viewer as any,
			target: viewerContainer,
			props: { value, plugins }
		});
	}

	function destroyViewer() {
		viewer?.$destroy();
		viewer = null;
	}

	onMount(() => {
		mountEditor();
	});

	onDestroy(() => {
		destroyEditor();
		destroyViewer();
	});

	// Mount/unmount on mode change
	$effect(() => {
		if (mode === 'edit') {
			destroyViewer();
			queueMicrotask(mountEditor);
		} else {
			destroyEditor();
			queueMicrotask(mountViewer);
		}
	});

	// External value changes (parent reset / prop update) → push into editor
	$effect(() => {
		if (value !== lastEmitted) {
			lastEmitted = value;
			editor?.$set({ value });
			viewer?.$set({ value });
		}
	});
</script>

{#snippet iconButtons()}
	<button
		type="button"
		class="btn btn-ghost btn-xs hover:bg-base-300 border-0 bg-transparent"
		onclick={() => (showHelp = true)}
		title="Markdown help"
	>
		<span class="icon-[lucide--circle-help] size-4"></span>
	</button>
	<button
		type="button"
		class="btn btn-ghost btn-xs hover:bg-base-300 border-0 bg-transparent"
		onclick={() => (mode = mode === 'edit' ? 'render' : 'edit')}
		title={mode === 'edit' ? 'Preview' : 'Edit'}
	>
		{#if mode === 'edit'}
			<span class="icon-[lucide--eye] size-4"></span>
		{:else}
			<span class="icon-[lucide--pencil] size-4"></span>
		{/if}
	</button>
{/snippet}

{#if label}
	<div class="md-label-row">
		<span class="label-text font-medium">{label}</span>
		<div class="md-actions-inline">{@render iconButtons()}</div>
	</div>
{/if}

<div class="bytemd-wrapper" style="--md-min-height: {minHeight};">
	{#if !label}
		<div class="md-actions-float">{@render iconButtons()}</div>
	{/if}
	<div class="md-body">
		<div bind:this={editorContainer} class:hidden={mode !== 'edit'}></div>
		<div bind:this={viewerContainer} class="md-viewer markdown-body" class:hidden={mode !== 'render'}></div>
	</div>
</div>

{#if showHelp}
	<div class="modal modal-open" role="dialog">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Markdown cheatsheet</h3>
			<div class="mt-3 text-sm">
				<table class="table-sm w-full">
					<tbody>
						<tr><td class="font-mono"># Heading</td><td>Heading 1</td></tr>
						<tr><td class="font-mono">## Heading</td><td>Heading 2</td></tr>
						<tr><td class="font-mono">**bold**</td><td>bold</td></tr>
						<tr><td class="font-mono">*italic*</td><td>italic</td></tr>
						<tr><td class="font-mono">~~strike~~</td><td>strikethrough</td></tr>
						<tr><td class="font-mono">`code`</td><td>inline code</td></tr>
						<tr><td class="font-mono">```lang</td><td>fenced code block</td></tr>
						<tr><td class="font-mono">&gt; quote</td><td>blockquote</td></tr>
						<tr><td class="font-mono">- item</td><td>unordered list</td></tr>
						<tr><td class="font-mono">1. item</td><td>ordered list</td></tr>
						<tr><td class="font-mono">- [ ] task</td><td>task list</td></tr>
						<tr><td class="font-mono">[text](url)</td><td>link</td></tr>
						<tr><td class="font-mono">![alt](url)</td><td>image</td></tr>
						<tr><td class="font-mono">---</td><td>horizontal rule</td></tr>
						<tr><td class="font-mono">| a | b |</td><td>table (GFM)</td></tr>
					</tbody>
				</table>
			</div>
			<div class="modal-action">
				<button type="button" class="btn btn-sm" onclick={() => (showHelp = false)}>Close</button>
			</div>
		</div>
		<button type="button" class="modal-backdrop" aria-label="Close" onclick={() => (showHelp = false)}></button>
	</div>
{/if}

<style>
	.bytemd-wrapper {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-base-300);
		border-radius: 0.375rem;
		overflow: hidden;
		background: var(--color-base-100);
	}

	.md-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 1.5rem;
	}
	.md-actions-inline {
		display: flex;
		gap: 0rem;
	}
	.md-actions-float {
		position: absolute;
		top: 25px;
		right: 15px;
		z-index: 5;
		display: flex;
		/* gap: 0.125rem; */
		background: transparent;
	}

	.md-body {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: var(--md-min-height);
	}
	.md-body > div:not(.hidden) {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.md-viewer {
		padding: 0.5rem 0.75rem;
		background: var(--color-base-100);
		color: var(--color-base-content);
		min-height: var(--md-min-height);
	}

	.hidden {
		display: none !important;
	}

	/* Bytemd container — no toolbar/status, respects wrapper min-height */
	.bytemd-wrapper :global(.bytemd) {
		border: none;
		height: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: var(--md-min-height);
		background: var(--color-base-100);
		color: var(--color-base-content);
	}
	.bytemd-wrapper :global(.bytemd-toolbar),
	.bytemd-wrapper :global(.bytemd-status) {
		display: none;
	}
	.bytemd-wrapper :global(.bytemd-body) {
		height: auto;
		flex: 1;
		display: flex;
		min-height: 0;
	}
	.bytemd-wrapper :global(.bytemd-editor) {
		width: 100%;
		height: auto;
		flex: 1;
		display: flex;
		min-height: 0;
	}
	.bytemd-wrapper :global(.bytemd-editor .CodeMirror) {
		width: 100%;
		height: auto;
		flex: 1;
		min-height: var(--md-min-height);
		background: var(--color-base-100);
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
	}

	/* Left-align editor/preview content */
	.bytemd-wrapper :global(.bytemd-editor .CodeMirror .CodeMirror-lines) {
		max-width: none;
		margin: 0;
		padding: 6px 0;
	}
	.bytemd-wrapper :global(.bytemd-editor .CodeMirror pre.CodeMirror-line),
	.bytemd-wrapper :global(.bytemd-editor .CodeMirror pre.CodeMirror-line-like) {
		padding: 0 12px;
	}
	.bytemd-wrapper :global(.bytemd-preview .markdown-body) {
		max-width: none;
		margin: 0;
		padding: 8px 12px;
	}

	/* Dark theme — lifted surface, stronger inset */
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.bytemd-editor .CodeMirror) {
		background: var(--color-base-300);
		color: var(--color-base-content);
		box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.CodeMirror-gutters) {
		background: var(--color-base-200);
		border-right-color: var(--color-base-300);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.CodeMirror-linenumber) {
		color: var(--color-text-muted);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.CodeMirror-cursor) {
		border-left-color: var(--color-base-content);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.CodeMirror-selected),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.CodeMirror-focused .CodeMirror-selected) {
		background: color-mix(in oklch, var(--color-primary) 35%, transparent);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.CodeMirror-activeline-background) {
		background: color-mix(in oklch, var(--color-primary) 10%, transparent);
	}

	/* CodeMirror markdown syntax tokens in dark mode */
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-header) {
		color: var(--color-primary);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-quote) {
		color: var(--color-success);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-keyword),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-atom) {
		color: var(--color-secondary);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-string),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-string-2) {
		color: var(--color-warning);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-link),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-url) {
		color: var(--color-accent);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-comment) {
		color: var(--color-text-muted);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-variable-2),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.cm-s-default .cm-variable-3) {
		color: var(--color-primary);
	}

	/* Rendered markdown — dark overrides */
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body) {
		color: var(--color-base-content);
		background: transparent;
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body h1),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body h2),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body h3),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body h4),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body h5),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body h6) {
		color: var(--color-base-content);
		border-bottom-color: var(--color-base-300);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body a) {
		color: var(--color-primary);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body blockquote) {
		color: var(--color-text-secondary);
		border-left-color: var(--color-base-300);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body hr) {
		background-color: var(--color-base-300);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body code) {
		background-color: var(--color-base-200);
		color: var(--color-base-content);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body pre) {
		background-color: var(--color-base-200);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body pre code) {
		background: transparent;
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body table tr) {
		background: transparent;
		border-top-color: var(--color-base-300);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body table th),
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body table td) {
		border-color: var(--color-base-300);
	}
	:global([data-theme='tigerdark']) .bytemd-wrapper :global(.markdown-body table tr:nth-child(2n)) {
		background-color: var(--color-base-200);
	}
</style>
