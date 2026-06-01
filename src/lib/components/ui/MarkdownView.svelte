<script lang="ts">
	import { marked } from 'marked';

	marked.setOptions({ gfm: true, breaks: true });

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();
</script>

{#if content && content.trim()}
	<div class="prose prose-sm max-w-none {className}">
		{@html marked.parse(content)}
	</div>
{:else}
	<p class="text-base-content/50 italic">No description</p>
{/if}
