<script lang="ts">
	import type { Snippet } from 'svelte';
	import Label from '$lib/components/ui/label/label.svelte';

	const { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="space-y-1.5">
	<Label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
	{@render children()}
</div>
