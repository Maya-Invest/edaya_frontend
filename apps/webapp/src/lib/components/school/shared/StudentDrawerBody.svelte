<script lang="ts">
	import type { Snippet } from 'svelte';

	const { context, children }: { context: Snippet; children: Snippet } = $props();
	let body = $state<HTMLDivElement | null>(null);
	let header = $state<HTMLDivElement | null>(null);
	let sticky = $state(false);
	$effect(() => {
		if (!body || !header)
			return;
		const outer = body;
		const inner = header;
		const measure = () => {
			sticky = inner.offsetHeight <= outer.clientHeight / 2 && outer.clientHeight - inner.offsetHeight >= 240;
			outer.style.setProperty('--student-context-height', sticky ? `${inner.offsetHeight}px` : '0px');
		};
		const observer = new ResizeObserver(measure);
		observer.observe(outer);
		observer.observe(inner);
		measure();
		return () => observer.disconnect();
	});
</script>
<div bind:this={body} class="ui-student-drawer-body" data-testid="student-drawer-body"><div bind:this={header} class="ui-student-drawer-context" data-sticky={sticky}>{@render context()}</div><div class="ui-student-drawer-content">{@render children()}</div></div>
