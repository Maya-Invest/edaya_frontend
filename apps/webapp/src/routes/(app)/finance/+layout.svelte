<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-0 flex-1">
	<main class="flex min-w-0 flex-1 flex-col">
		<section class="scrollbar-thin flex-1 overflow-y-auto px-8 py-8">
			{@render children()}
		</section>
	</main>
</div>
