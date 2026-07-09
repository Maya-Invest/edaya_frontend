<script lang="ts">
	import type { Snippet } from 'svelte';

	const { icon, label }: { icon: Snippet; label: string } = $props();
</script>

<div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
	{@render icon()}
	<p class="text-xs text-muted-foreground">{label}</p>
</div>
