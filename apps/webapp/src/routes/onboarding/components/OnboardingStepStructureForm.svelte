<script lang="ts">
	import type { CatalogGradeLevel } from '$lib/onboarding/dataset-model';
	import type { OnboardingClassNamingMode, OnboardingStructureLevelDraft } from '$lib/onboarding/types';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogGradeShortLabel } from '$lib/i18n/catalog-label';
	import { Minus, Plus } from '$lib/icons';
	import { previewClassNamesFromCatalog } from '$lib/onboarding/class-naming';
	import { gradeLevelsForTemplates } from '$lib/onboarding/dataset-model';
	import { gradeLevelLabel, structureSummary, syncStructureLevels, toggleStructureTemplate, updateStructureLevel } from '$lib/onboarding/structure-step-helpers';
	import { onboardingContext } from '../context.svelte';
	import { getOnboardingWizardState } from '../onboarding-wizard-state.svelte';
	import OnboardingDatasetStatus from './OnboardingDatasetStatus.svelte';

	interface Props {
		disabled?: boolean;
	}
	const { disabled = false }: Props = $props();
	const wizard = getOnboardingWizardState();
	const catalog = $derived(wizard.catalog);
	const summary = $derived(structureSummary(onboardingContext.draft.structure));
	function levelsForModel(model: string): Array<{
		catalogLevel: CatalogGradeLevel;
		draft: OnboardingStructureLevelDraft;
	}> {
		if (!catalog || !onboardingContext.draft.structure.templates.includes(model)) {
			return [];
		}
		const byId = new Map(onboardingContext.draft.structure.levels.map(level => [level.gradeLevelId, level]));
		const rows: Array<{
			catalogLevel: CatalogGradeLevel;
			draft: OnboardingStructureLevelDraft;
		}> = [];
		for (const catalogLevel of gradeLevelsForTemplates(catalog, [model])) {
			const draft = byId.get(catalogLevel.id);
			if (draft) {
				rows.push({ catalogLevel, draft });
			}
		}
		return rows;
	}
	function persistDraft() {
		onboardingContext.persist();
	}
	function isModelSelected(model: string): boolean {
		return onboardingContext.draft.structure.templates.includes(model);
	}
	function setModelEnabled(model: string, enabled: boolean) {
		if (!catalog || catalog.gradeLevels.length === 0) {
			return;
		}
		onboardingContext.draft.structure = toggleStructureTemplate(onboardingContext.draft.structure, model, enabled, catalog);
		persistDraft();
	}
	function adjustClassCount(gradeLevelId: string, delta: number) {
		const current = onboardingContext.draft.structure.levels.find(level => level.gradeLevelId === gradeLevelId);
		if (!current) {
			return;
		}
		const nextCount = Math.min(10, Math.max(0, current.classCount + delta));
		onboardingContext.draft.structure = updateStructureLevel(onboardingContext.draft.structure, gradeLevelId, { classCount: nextCount });
		if (catalog)
			onboardingContext.draft.structure = syncStructureLevels(onboardingContext.draft.structure, catalog);
		persistDraft();
	}
	function updateCapacity(gradeLevelId: string, value: string) {
		const capacity = Number.parseInt(value, 10);
		if (!Number.isFinite(capacity)) {
			return;
		}
		onboardingContext.draft.structure = updateStructureLevel(onboardingContext.draft.structure, gradeLevelId, { capacity: Math.max(1, capacity) });
		persistDraft();
	}
	function setClassNamingMode(gradeLevelId: string, mode: OnboardingClassNamingMode) {
		onboardingContext.draft.structure = updateStructureLevel(onboardingContext.draft.structure, gradeLevelId, { classNamingMode: mode });
		persistDraft();
	}
</script>

{#snippet levelRows(title: string, rows: Array<{ catalogLevel: CatalogGradeLevel; draft: OnboardingStructureLevelDraft }>)}
	{#if rows.length > 0 && catalog}
		<div class="space-y-1.5">
			<h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
			<div class="divide-y divide-border rounded-collection border border-border">
				{#each rows as entry (entry.catalogLevel.id)}
					{@const draft = entry.draft}
					{@const gradeLevelId = entry.catalogLevel.id}
					<div class="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-foreground">
								{gradeLevelLabel(gradeLevelId, catalog, $lang)}
							</p>
							{#if draft.classCount > 0}
								<p class="truncate text-[11px] text-muted-foreground">
									{previewClassNamesFromCatalog({
										shortLabel: catalogGradeShortLabel(
											entry.catalogLevel.shortLabel,
											$lang,
											entry.catalogLevel.code,
										),
									}, draft.classCount, draft.classNamingMode).join(', ')}
								</p>
							{/if}
						</div>
						<div class="flex flex-wrap items-center gap-3">
							<div class="flex items-center gap-1.5">
								<span class="text-[11px] text-muted-foreground">{$t('onboarding.structure.classCountLabel')}</span>
								<Button
									type="button"
									variant="outline"
									size="icon"
									class="w-7"
									{disabled}
									aria-label={$t('onboarding.dataset.removeClass', { level: entry.catalogLevel.shortLabel })}
									onclick={() => adjustClassCount(gradeLevelId, -1)}
								>
									<Minus class="h-3.5 w-3.5" />
								</Button>
								<span class="min-w-[1.5rem] text-center text-sm font-medium">{draft.classCount}</span>
								<Button
									type="button"
									variant="outline"
									size="icon"
									class="w-7"
									{disabled}
									aria-label={$t('onboarding.dataset.addClass', { level: entry.catalogLevel.shortLabel })}
									onclick={() => adjustClassCount(gradeLevelId, 1)}
								>
									<Plus class="h-3.5 w-3.5" />
								</Button>
							</div>
							{#if draft.classCount > 0}
								<div class="flex items-center gap-1">
									<Button
										type="button"
										variant={draft.classNamingMode === 'alphabetical' ? 'secondary' : 'outline'}
										size="sm"
										class="text-[11px]"
										{disabled}
										onclick={() => setClassNamingMode(gradeLevelId, 'alphabetical')}
									>
										{$t('onboarding.structure.namingAlphabetical')}
									</Button>
									<Button
										type="button"
										variant={draft.classNamingMode === 'numerical' ? 'secondary' : 'outline'}
										size="sm"
										class="text-[11px]"
										{disabled}
										onclick={() => setClassNamingMode(gradeLevelId, 'numerical')}
									>
										{$t('onboarding.structure.namingNumerical')}
									</Button>
								</div>
							{/if}
							<div class="flex items-center gap-1.5">
								<Label for={`structure-capacity-${gradeLevelId}`} class="text-[11px] text-muted-foreground">
									{$t('onboarding.structure.capacityLabel')}
								</Label>
								<Input
									id={`structure-capacity-${gradeLevelId}`}
									type="number"
									min="1"
									class="w-16"
									value={String(draft.capacity)}
									{disabled}
									oninput={event => updateCapacity(gradeLevelId, event.currentTarget.value)}
								/>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

<div class="space-y-4">
	<OnboardingDatasetStatus {disabled} />
	{#if catalog && wizard.datasetStatus === 'ready'}
		<section class="space-y-2">
			<h2 class="text-sm font-medium">{$t('onboarding.structure.templatesTitle')}</h2>
			<div class="flex flex-wrap gap-5">
				{#each catalog.dataset.templates as template (template.id)}
					<label class="inline-flex items-center gap-2">
						<Checkbox checked={isModelSelected(template.id)} {disabled} onCheckedChange={checked => setModelEnabled(template.id, checked === true)} />
						<span>{template.label}</span>
					</label>
				{/each}
			</div>
		</section>
		{#each catalog.dataset.templates as template (template.id)}
			{@render levelRows(template.label, levelsForModel(template.id))}
		{/each}
		<p class="text-sm text-muted-foreground">{$t('onboarding.structure.summaryBody', summary)}</p>
	{/if}
</div>
