<script lang="ts">
	interface Props {
		text: string;
		color?: string;
		size?: 'sm' | 'xs';
	}

	let { text, color = 'primary', size = 'sm' }: Props = $props();
</script>

<span class="badge badge-{color} badge-{size}">{text}</span>
