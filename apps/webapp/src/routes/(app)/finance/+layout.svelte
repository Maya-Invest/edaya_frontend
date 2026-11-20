<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children: pageChildren }: { children: Snippet } = $props();
</script>

<div class="flex min-h-0 flex-1">
	<main class="flex min-w-0 flex-1 flex-col">
		<section class="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-6">
			{@render pageChildren()}
		</section>
	</main>
</div>
