<script lang="ts">
	import type { ReferenceCopy } from '../reference-copy';
	import Button from '$lib/components/ui/button/button.svelte';
	import CollectionMenu from '$lib/components/ui/collection/CollectionMenu.svelte';
	import { MoreHorizontal } from '$lib/icons';

	const { copy }: { copy: ReferenceCopy } = $props();
	let selected = $state<'table' | 'list'>('table');
</script>
<div class="space-y-2" data-testid="reference-icon-buttons">
	<h3 class="text-sm font-semibold">{copy.iconButtons}</h3>
	<p class="text-sm text-muted-foreground">{copy.topMenuHint}</p>
	<div class="flex flex-wrap items-center gap-2">
		<CollectionMenu iconTreatment="circle"><Button variant="ghost" aria-pressed={selected === 'table'} onclick={() => selected = 'table'}>{copy.table}</Button><Button variant="ghost" aria-pressed={selected === 'list'} onclick={() => selected = 'list'}>{copy.list}</Button></CollectionMenu>
		<Button size="icon" variant="ghost" iconTreatment="circle" disabled aria-label={copy.topMenuDisabled}><MoreHorizontal aria-hidden="true" /></Button><span class="text-sm text-muted-foreground">{copy.disabled}</span>
	</div>
	<p class="text-sm" role="status">{selected === 'table' ? copy.table : copy.list}</p>
</div>
