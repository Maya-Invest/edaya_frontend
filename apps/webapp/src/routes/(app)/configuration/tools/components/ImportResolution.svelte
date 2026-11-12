<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { DataImportState } from '../import-state.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';

	const { importState, rowId, field, revision }: { importState: DataImportState; rowId: string; field: string; revision: number } = $props();
	let choices = $state<components['schemas']['SchoolImportCandidates'] | null>(null);
	let selected = $state('');
	let loading = $state(false);
	let failed = $state(false);
	const current = $derived(choices?.revision === revision);
	async function load() {
		loading = true;
		failed = false;
		try {
			choices = await importState.candidates(rowId, field);
			failed = !choices;
			selected = '';
		}
		finally { loading = false; }
	}
</script>
<div class="mt-2 space-y-2 text-sm">
	{#if !current}
		<Button size="sm" variant="outline" disabled={loading || importState.busy} onclick={load}>{$t('durableImport.reviewChoices')}</Button>
		{#if failed}<p role="alert">{$t('durableImport.choicesUnavailable')}</p>{/if}
	{:else}
		{#if choices?.candidates.length}
			<label class="block space-y-1"><span>{$t('durableImport.selectRecord')}</span><SelectField class="w-full border border-input bg-background" bind:value={selected} disabled={importState.busy}>
				<option value="">{$t('durableImport.selectRecord')}</option>
				{#each choices.candidates as candidate (candidate.id)}<option value={candidate.id}>{[candidate.name, candidate.shortName, candidate.identifier].filter(Boolean).join(' · ')} · {candidate.id}</option>{/each}
			</SelectField></label>
			<Button size="sm" disabled={!selected || importState.busy} onclick={() => importState.resolve(rowId, field, selected, field === 'target' ? 'update' : undefined)}>{$t(field === 'target' ? 'durableImport.selectUpdate' : 'durableImport.useSelection')}</Button>
		{/if}
		{#if field === 'target'}<Button size="sm" variant="outline" disabled={importState.busy} onclick={() => importState.resolve(rowId, field, undefined, 'create')}>{$t('durableImport.createNew')}</Button>{/if}
	{/if}
</div>
