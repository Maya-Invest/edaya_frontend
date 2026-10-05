<script lang="ts">
	import type { CatalogGradeLevel, StructureTemplateCatalog } from '$lib/onboarding/structure-template-catalog';
	import type { StructureModel } from '$lib/onboarding/structure-templates';
	import type { OnboardingClassNamingMode, OnboardingStructureLevelDraft } from '$lib/onboarding/types';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogGradeShortLabel } from '$lib/i18n/catalog-label';
	import { Minus, Plus } from '$lib/icons';
	import {
		gradeLevelLabel,
		structureSummary,
		syncStructureLevels,
		toggleStructureModel,
		updateStructureLevel,
	} from '$lib/onboarding/structure-step-helpers';
	import {
		gradeLevelsForModels,
		loadStructureTemplateCatalog,
		previewClassNamesFromCatalog,
	} from '$lib/onboarding/structure-template-catalog';
	import { onboardingContext } from '../context.svelte';

	interface Props {
		disabled?: boolean;
	}

	const { disabled = false }: Props = $props();

	const structureModels: Array<{ value: StructureModel; labelKey: 'onboarding.structure.modelCollege' | 'onboarding.structure.modelLycee' }> = [
		{ value: 'college', labelKey: 'onboarding.structure.modelCollege' },
		{ value: 'lycee', labelKey: 'onboarding.structure.modelLycee' },
	];

	let catalog = $state<StructureTemplateCatalog | null>(null);
	let catalogStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let loadToken = 0;

	const catalogHasLevels = $derived((catalog?.gradeLevels.length ?? 0) > 0);
	const summary = $derived(structureSummary(onboardingContext.draft.structure));

	const collegeLevels = $derived.by(() => levelsForModel('college'));
	const lyceeLevels = $derived.by(() => levelsForModel('lycee'));

	function levelsForModel(model: StructureModel): Array<{ catalogLevel: CatalogGradeLevel; draft: OnboardingStructureLevelDraft }> {
		if (!catalog || !onboardingContext.draft.structure.models.includes(model)) {
			return [];
		}
		const byId = new Map(onboardingContext.draft.structure.levels.map(level => [level.gradeLevelId, level]));
		const rows: Array<{ catalogLevel: CatalogGradeLevel; draft: OnboardingStructureLevelDraft }> = [];
		for (const catalogLevel of gradeLevelsForModels(catalog, [model])) {
			const draft = byId.get(catalogLevel.id);
			if (draft) {
				rows.push({ catalogLevel, draft });
			}
		}
		return rows;
	}

	async function ensureCatalog(country: string) {
		const token = ++loadToken;
		catalogStatus = 'loading';
		try {
			const next = await loadStructureTemplateCatalog(country);
			if (token !== loadToken) {
				return;
			}
			catalog = next;
			catalogStatus = 'ready';
			if (onboardingContext.draft.structure.models.length > 0) {
				onboardingContext.draft.structure = syncStructureLevels(
					onboardingContext.draft.structure,
					next,
				);
				onboardingContext.persist();
			}
		}
		catch {
			if (token !== loadToken) {
				return;
			}
			catalog = null;
			catalogStatus = 'error';
		}
	}

	$effect(() => {
		const country = onboardingContext.draft.school.country;
		void ensureCatalog(country);
	});

	function persistDraft() {
		onboardingContext.persist();
	}

	function isModelSelected(model: StructureModel): boolean {
		return onboardingContext.draft.structure.models.includes(model);
	}

	function setModelEnabled(model: StructureModel, enabled: boolean) {
		if (!catalog || catalog.gradeLevels.length === 0) {
			return;
		}
		onboardingContext.draft.structure = toggleStructureModel(
			onboardingContext.draft.structure,
			model,
			enabled,
			catalog,
		);
		persistDraft();
	}

	function adjustClassCount(gradeLevelId: string, delta: number) {
		const current = onboardingContext.draft.structure.levels.find(level => level.gradeLevelId === gradeLevelId);
		if (!current) {
			return;
		}
		const nextCount = Math.min(10, Math.max(0, current.classCount + delta));
		onboardingContext.draft.structure = updateStructureLevel(
			onboardingContext.draft.structure,
			gradeLevelId,
			{ classCount: nextCount },
		);
		persistDraft();
	}

	function updateCapacity(gradeLevelId: string, value: string) {
		const capacity = Number.parseInt(value, 10);
		if (!Number.isFinite(capacity)) {
			return;
		}
		onboardingContext.draft.structure = updateStructureLevel(
			onboardingContext.draft.structure,
			gradeLevelId,
			{ capacity: Math.max(1, capacity) },
		);
		persistDraft();
	}

	function setClassNamingMode(gradeLevelId: string, mode: OnboardingClassNamingMode) {
		onboardingContext.draft.structure = updateStructureLevel(
			onboardingContext.draft.structure,
			gradeLevelId,
			{ classNamingMode: mode },
		);
		persistDraft();
	}
</script>

{#snippet levelRows(title: string, rows: Array<{ catalogLevel: CatalogGradeLevel; draft: OnboardingStructureLevelDraft }>)}
	{#if rows.length > 0 && catalog}
		<div class="space-y-1.5">
			<h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
			<div class="divide-y divide-border rounded-lg border border-border">
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
									class="h-7 w-7"
									{disabled}
									onclick={() => adjustClassCount(gradeLevelId, -1)}
								>
									<Minus class="h-3.5 w-3.5" />
								</Button>
								<span class="min-w-[1.5rem] text-center text-sm font-medium">{draft.classCount}</span>
								<Button
									type="button"
									variant="outline"
									size="icon"
									class="h-7 w-7"
									{disabled}
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
										class="h-7 px-2 text-[11px]"
										{disabled}
										onclick={() => setClassNamingMode(gradeLevelId, 'alphabetical')}
									>
										{$t('onboarding.structure.namingAlphabetical')}
									</Button>
									<Button
										type="button"
										variant={draft.classNamingMode === 'numerical' ? 'secondary' : 'outline'}
										size="sm"
										class="h-7 px-2 text-[11px]"
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
									class="h-7 w-16"
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
	<section class="space-y-2">
		<h2 class="text-sm font-medium text-foreground">{$t('onboarding.structure.modelsTitle')}</h2>
		<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
			{#each structureModels as model (model.value)}
				<label class="inline-flex cursor-pointer items-center gap-2">
					<Checkbox
						checked={isModelSelected(model.value)}
						disabled={disabled || catalogStatus !== 'ready' || !catalog || !catalogHasLevels}
						onCheckedChange={checked => setModelEnabled(model.value, checked === true)}
					/>
					<span class="text-sm text-foreground">{$t(model.labelKey)}</span>
				</label>
			{/each}
		</div>
	</section>

	{#if catalogStatus === 'loading'}
		<p class="text-xs text-muted-foreground">{$t('onboarding.structure.catalogLoading')}</p>
	{:else if catalogStatus === 'error'}
		<p class="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
			{$t('onboarding.structure.catalogError')}
		</p>
	{:else if catalogStatus === 'ready' && catalog && catalog.gradeLevels.length === 0}
		<p class="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
			{$t('onboarding.structure.catalogEmpty')}
		</p>
	{:else if collegeLevels.length > 0 || lyceeLevels.length > 0}
		<section class="space-y-3">
			<h2 class="text-sm font-medium text-foreground">{$t('onboarding.structure.levelsTitle')}</h2>
			{@render levelRows($t('onboarding.structure.modelCollege'), collegeLevels)}
			{@render levelRows($t('onboarding.structure.modelLycee'), lyceeLevels)}

			<section class="rounded-lg border border-border bg-card px-3 py-2 text-sm">
				<p class="font-medium text-foreground">{$t('onboarding.structure.summaryTitle')}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">
					{$t('onboarding.structure.summaryBody', summary)}
				</p>
			</section>
		</section>
	{/if}

	{#if onboardingContext.draft.structureStepSubmitted}
		<p class="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
			{$t('onboarding.structureStep.alreadySubmitted')}
		</p>
	{/if}
</div>
