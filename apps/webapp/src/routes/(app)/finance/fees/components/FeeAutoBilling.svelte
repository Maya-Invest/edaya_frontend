<script lang="ts">
	import type { Fee } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { locale, t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { getFeesPageState } from '../fees-page.svelte';

	const { fee }: { fee: Fee } = $props();
	const billingState = getFeesPageState().autoBilling;
	const modals = createUrlSyncedModals({
		allowed: () => billingState.options?.canConfigureAutomatic ? ['retry-billing'] as const : [],
		owned: ['retry-billing'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		if (billingState.optionsStatus !== 'loading')
			modals.hydrate();
	});
	const retryOpen = bindUrlModal(modals, 'retry-billing');
	const retryTarget = $derived(billingState.runs.find(run => run.id === modals.target && run.status === 'failed'));
	function requestRetry(id: string) {
		modals.open('retry-billing', { target: id });
	}
	async function confirmRetry() {
		if (retryTarget && billingState.options?.canConfigureAutomatic && await billingState.retry(retryTarget.id))
			retryOpen.open = false;
	}
	const grades = $derived(fee.autoBilling.mode === 'matching' && fee.autoBilling.gradeLevelIds !== null
		? fee.autoBilling.gradeLevelIds.map(id => billingState.options?.gradeLevels.find(row => row.id === id)?.label ?? id).join(', ')
		: $t('fee.autoBilling.allGrades'));
	const statuses = $derived(fee.autoBilling.mode === 'matching' && fee.autoBilling.placementStatusIds !== null
		? fee.autoBilling.placementStatusIds.map(id => billingState.options?.placementStatuses.find(row => row.id === id)?.label ?? id).join(', ')
		: $t('fee.autoBilling.allStatuses'));
</script>

<section class="space-y-4" aria-label={$t('fee.autoBilling')}>
	<h3 class="text-sm font-semibold">{$t('fee.autoBilling')}</h3>
	<p>{$t(`fee.autoBilling.${fee.autoBilling.mode}`)}</p>
	{#if fee.autoBilling.mode === 'matching'}
		<p class="text-sm">{$t('fee.autoBilling.grades')}: {grades}</p>
		<p class="text-sm">{$t('fee.autoBilling.statuses')}: {statuses}</p>
	{/if}
	<p class="text-xs text-muted-foreground">{$t('fee.autoBilling.hint')}</p>
	<DataState status={billingState.status} errorMessage={$t('fee.autoBilling.loadError')}>
		{#each billingState.runs as run (run.id)}
			<div class="space-y-2 border-t border-border py-3">
				<p class="text-sm">{$t(`fee.autoBilling.run.${run.status}`)} · {new Date(run.createdAt).toLocaleString($locale)}</p>
				<p class="text-xs text-muted-foreground">{$t('fee.autoBilling.counts', { created: run.createdCount, skipped: run.skippedCount })}</p>
				{#if run.status === 'failed'}
					<p class="text-sm" role="alert">{$t('fee.autoBilling.failedHint')}</p>
					{#if billingState.options?.canConfigureAutomatic}
						<Button variant="outline" disabled={billingState.retrying !== null} onclick={() => requestRetry(run.id)}>{$t('dataState.retry')}</Button>
					{/if}
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">{$t('fee.autoBilling.noRuns')}</p>
		{/each}
	</DataState>
</section>
<ConfirmModal variant="default" bind:open={retryOpen.open} confirmDisabled={!retryTarget || !billingState.options?.canConfigureAutomatic} busy={billingState.retrying !== null} title={$t('fee.autoBilling.retryTitle')} description={$t(retryTarget ? 'fee.autoBilling.retryDescription' : 'fee.autoBilling.retryUnavailable')} confirmLabel={$t('dataState.retry')} onConfirm={confirmRetry} />
