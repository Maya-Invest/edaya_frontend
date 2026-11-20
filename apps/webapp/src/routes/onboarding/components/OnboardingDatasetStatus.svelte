<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { onboardingContext } from '../context.svelte';
	import { getOnboardingWizardState } from '../onboarding-wizard-state.svelte';

	const { disabled = false }: { disabled?: boolean } = $props();
	const wizard = getOnboardingWizardState();
	const selected = $derived(onboardingContext.draft.structure.dataset);
	const label = $derived(wizard.datasetChoices.find(row => row.id === selected?.id)?.label ?? selected?.id ?? '');
	function selectAvailable() {
		const choice = wizard.datasetChoices.find(row => row.isDefault) ?? wizard.datasetChoices[0]!;
		wizard.selectDataset(`${choice.id}@${choice.version}`);
	}
</script>
<DataState status={wizard.datasetStatus} errorMessage={$t(wizard.datasetUnavailable ? 'onboarding.dataset.unavailable' : 'onboarding.structure.catalogError')} emptyTitle={$t('onboarding.structure.catalogEmpty')} onRetry={wizard.retryDataset}>
	<section class="mb-4 space-y-2 rounded-collection border border-border bg-card p-3" data-testid="onboarding-dataset">
		<h2 class="text-sm font-medium">{$t('onboarding.dataset.title')}</h2>
		{#if wizard.datasetChoices.length > 1}
			<Select.Root type="single" value={selected ? `${selected.id}@${selected.version}` : ''} onValueChange={wizard.selectDataset}>
				<Select.Trigger {disabled} aria-label={$t('onboarding.dataset.title')}><Select.Value>{label}</Select.Value></Select.Trigger>
				<Select.Content>{#each wizard.datasetChoices as choice (`${choice.id}@${choice.version}`)}<Select.Item value={`${choice.id}@${choice.version}`} label={choice.label}>{choice.label}</Select.Item>{/each}</Select.Content>
			</Select.Root>
		{:else}<p class="text-sm">{label}</p>{/if}
		<p class="text-xs text-muted-foreground">{$t('onboarding.dataset.readOnly')} · v{selected?.version}</p>
	</section>
</DataState>
{#if wizard.datasetStatus === 'error' && wizard.datasetChoices.length > 0 && !disabled}
	<Button variant="outline" onclick={selectAvailable}>{$t('onboarding.dataset.useAvailable')}</Button>
{/if}
{#if wizard.datasetSelectionChanged}<p role="status" class="mb-3 text-sm text-muted-foreground">{$t('onboarding.dataset.reviewSelection')}</p>{/if}
