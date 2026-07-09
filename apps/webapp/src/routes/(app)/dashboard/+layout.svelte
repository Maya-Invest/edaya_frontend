<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<section class="scrollbar-thin flex-1 overflow-y-auto px-8 py-8">
		{@render children()}
	</section>
</main>
