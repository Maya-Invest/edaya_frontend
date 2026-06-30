<script lang="ts">
	import type { GradeLevelTemplateKey, StructureModel } from '$lib/onboarding/structure-templates';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { Minus, Plus } from '$lib/icons';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import {
		gradeLevelLabel,
		structureSummary,
		toggleStructureModel,
		updateStructureLevel,
	} from '$lib/onboarding/structure-step-helpers';
	import {
		isGradeLevelTemplateKey,
		previewClassNames,
		sortedStructureLevels,

	} from '$lib/onboarding/structure-templates';

	interface Props {
		disabled?: boolean;
	}

	const { disabled = false }: Props = $props();

	const structureModels: Array<{ value: StructureModel; labelKey: 'onboarding.structure.modelCollege' | 'onboarding.structure.modelLycee' }> = [
		{ value: 'college', labelKey: 'onboarding.structure.modelCollege' },
		{ value: 'lycee', labelKey: 'onboarding.structure.modelLycee' },
	];

	const sortedLevels = $derived(
		sortedStructureLevels(onboardingContext.draft.structure.levels),
	);

	const summary = $derived(structureSummary(onboardingContext.draft.structure));

	function persistDraft() {
		onboardingContext.persist();
	}

	function isModelSelected(model: StructureModel): boolean {
		return onboardingContext.draft.structure.models.includes(model);
	}

	function setModelEnabled(model: StructureModel, enabled: boolean) {
		onboardingContext.draft.structure = toggleStructureModel(
			onboardingContext.draft.structure,
			model,
			enabled,
		);
		persistDraft();
	}

	function adjustClassCount(gradeLevelId: GradeLevelTemplateKey, delta: number) {
		const current = onboardingContext.draft.structure.levels.find(level => level.gradeLevelId === gradeLevelId);
		if (!current) {
			return;
		}
		const nextCount = Math.min(10, Math.max(1, current.classCount + delta));
		onboardingContext.draft.structure = updateStructureLevel(
			onboardingContext.draft.structure,
			gradeLevelId,
			{ classCount: nextCount },
		);
		persistDraft();
	}

	function updateCapacity(gradeLevelId: GradeLevelTemplateKey, value: string) {
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
</script>

<div class="space-y-6">
	<section class="space-y-3">
		<h2 class="text-sm font-medium text-foreground">{$t('onboarding.structure.modelsTitle')}</h2>
		<p class="text-xs text-muted-foreground">{$t('onboarding.structure.modelsHint')}</p>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each structureModels as model (model.value)}
				<label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/20 p-4">
					<Checkbox
						checked={isModelSelected(model.value)}
						{disabled}
						onCheckedChange={checked => setModelEnabled(model.value, checked === true)}
					/>
					<span>
						<span class="block text-sm font-medium text-foreground">{$t(model.labelKey)}</span>
						<span class="mt-1 block text-xs text-muted-foreground">
							{$t(model.value === 'college' ? 'onboarding.structure.modelCollegeHint' : 'onboarding.structure.modelLyceeHint')}
						</span>
					</span>
				</label>
			{/each}
		</div>
	</section>

	{#if sortedLevels.length > 0}
		<section class="space-y-3">
			<h2 class="text-sm font-medium text-foreground">{$t('onboarding.structure.levelsTitle')}</h2>
			<div class="space-y-3">
				{#each sortedLevels as level (level.gradeLevelId)}
					{#if isGradeLevelTemplateKey(level.gradeLevelId)}
						{@const gradeLevelId = level.gradeLevelId}
						<article class="rounded-xl border border-border bg-secondary/20 p-4">
							<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
								<h3 class="text-sm font-medium">{gradeLevelLabel(gradeLevelId)}</h3>
								<p class="text-xs text-muted-foreground">
									{$t('onboarding.structure.previewLabel')}: {previewClassNames(gradeLevelId, level.classCount).join(', ')}
								</p>
							</div>
							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<Label>{$t('onboarding.structure.classCountLabel')}</Label>
									<div class="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="icon"
											class="h-9 w-9"
											{disabled}
											onclick={() => adjustClassCount(gradeLevelId, -1)}
										>
											<Minus class="h-4 w-4" />
										</Button>
										<span class="min-w-[2rem] text-center text-sm font-medium">{level.classCount}</span>
										<Button
											type="button"
											variant="outline"
											size="icon"
											class="h-9 w-9"
											{disabled}
											onclick={() => adjustClassCount(gradeLevelId, 1)}
										>
											<Plus class="h-4 w-4" />
										</Button>
									</div>
								</div>
								<div class="space-y-1.5">
									<Label for={`structure-capacity-${gradeLevelId}`}>
										{$t('onboarding.structure.capacityLabel')}
									</Label>
									<Input
										id={`structure-capacity-${gradeLevelId}`}
										type="number"
										min="1"
										value={String(level.capacity)}
										{disabled}
										oninput={event => updateCapacity(gradeLevelId, event.currentTarget.value)}
									/>
								</div>
							</div>
						</article>
					{/if}
				{/each}
			</div>
		</section>

		<section class="rounded-xl border border-border bg-card px-4 py-3 text-sm">
			<p class="font-medium text-foreground">{$t('onboarding.structure.summaryTitle')}</p>
			<p class="mt-1 text-muted-foreground">
				{$t('onboarding.structure.summaryBody', summary)}
			</p>
		</section>
	{/if}

	{#if onboardingContext.draft.structureStepSubmitted}
		<p class="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
			{$t('onboarding.structureStep.alreadySubmitted')}
		</p>
	{/if}
</div>
