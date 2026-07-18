<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children: pageChildren }: { children: Snippet } = $props();
</script>

{@render pageChildren()}
