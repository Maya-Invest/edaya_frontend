<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children?: Snippet } = $props();
</script>

<div class="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
	{@render children?.()}
</div>
