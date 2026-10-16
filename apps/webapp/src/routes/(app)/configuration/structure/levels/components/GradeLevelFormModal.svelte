<script lang="ts">
	import type { GradeLevel, GradingPolicy } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';

	let {
		gradeLevel,
		open = $bindable(false),
		confirm = false,
		onConfirmStep,
	}: {
		gradeLevel?: GradeLevel;
		open?: boolean;
		confirm?: boolean;
		onConfirmStep: (value: boolean) => void;
	} = $props();

	const gradeLevelsPage = getGradeLevelsPageState();

	let busy = $state(false);
	let name = $state('');
	let label = $state('');
	let cycle = $state('');
	let order = $state('1');
	/** Once the user edits the label, it stops mirroring the name. */
	let labelEdited = $state(false);

	const levelId = $derived(gradeLevel?.id);
	const isEdit = $derived(levelId !== undefined);
	const validDetails = $derived(
		name.trim().length > 0 && label.trim().length > 0 && Number(order) >= 1,
	);
	const existingClassCount = $derived(
		gradeLevel ? gradeLevelsPage.classCountFor(gradeLevel.id) : 0,
	);
	const showLabelWarning = $derived(
		isEdit && existingClassCount > 0 && label.trim() !== gradeLevel?.label,
	);

	let editingYearId = $state('');
	let expectedRevision = $state(0);
	let scaleId = $state('');
	let mode = $state<GradingPolicy['mode']>('numeric-first');
	let aggregateLabel = $state('');
	let equivalents = $state<Record<string, string>>({});
	let policies = $state<GradingPolicy[]>([]);
	const previous = $derived(policies.toSorted((a, b) => b.revision - a.revision)[0]);
	const selectedScale = $derived(gradeLevelsPage.gradingScales.find(row => row.id === scaleId));
	const conversions = $derived(mode === 'numeric-first' ? policies.filter(row => row.mode === 'mention-first').flatMap(row => row.scale.ranges.map(interval => ({ key: `${row.revision}:${interval.id}`, label: `${interval.letter} · ${interval.interpretation ?? ''} (v${row.revision})` }))) : []);
	const validEquivalents = $derived(conversions.every(row => equivalents[row.key]?.trim() && Number.isFinite(Number(equivalents[row.key])) && Number(equivalents[row.key]) >= 0 && Number(equivalents[row.key]) <= (selectedScale?.maxScore ?? 0)));
	const pointsMissing = $derived(mode === 'mention-first' && selectedScale?.ranges?.some(row => row.gpaValue == null));
	const currentYear = $derived(academicContext.year?.status === 'published' && new Date(academicContext.year.startDate) <= new Date() && new Date(academicContext.year.endDate) >= new Date());
	const validGrading = $derived(currentYear && editingYearId === academicContext.yearId && !!selectedScale?.ranges?.length && selectedScale.minScore === 0 && selectedScale.maxScore > 0 && selectedScale.intervalConvention === 'continuous' && !!aggregateLabel.trim() && !pointsMissing && validEquivalents && !gradeLevelsPage.gradingLoading && !gradeLevelsPage.gradingError);
	const calculationChanged = $derived(!previous || previous.mode !== mode || previous.scale.id !== scaleId || previous.scale.revision !== selectedScale?.revision || conversions.some(row => Number(equivalents[row.key]) !== previous.numericEquivalents?.[row.key]));
	const scaleOptions = $derived([{ value: '', label: $t('grading.chooseScale') }, ...gradeLevelsPage.gradingScales.filter(row => row.intervalConvention === 'continuous' && row.ranges?.length).map(row => ({ value: row.id, label: `${row.name} · ${row.maxScore}` }))]);
	const modeOptions = $derived([{ value: 'numeric-first', label: $t('grading.numeric') }, { value: 'mention-first', label: $t('grading.mention') }]);

	const canEditDetails = $derived(hasPermission('SCHOOL_STRUCTURE_CONFIGURE'));
	const canEditGrading = $derived(hasPermission('REPORT_CARD_CONFIGURE'));
	let initialized = $state(false);
	let formId = $state('');
	let savedDetails = $state('');
	let initialGrading = $state('');
	let partialSave = $state(false);
	const detailSnapshot = $derived(JSON.stringify({ name: name.trim(), label: label.trim(), cycle: cycle.trim(), order: Number(order) }));
	const gradingSnapshot = $derived(JSON.stringify({ scaleId, mode, aggregateLabel, equivalents }));
	const detailsChanged = $derived(canEditDetails && detailSnapshot !== savedDetails);
	const gradingChanged = $derived(canEditGrading && initialized && gradingSnapshot !== initialGrading);
	const canSubmit = $derived(validDetails && (isEdit || canEditDetails) && (detailsChanged || gradingChanged) && (!canEditGrading || initialized) && (!gradingChanged || validGrading) && editingYearId === academicContext.yearId);

	function resetForm() {
		labelEdited = false;
		if (gradeLevel) {
			name = gradeLevel.name;
			label = gradeLevel.label;
			cycle = gradeLevel.cycle;
			order = String(gradeLevel.order);
		}
		else {
			const nextOrder = academicContext.gradeLevels.length > 0
				? Math.max(...academicContext.gradeLevels.map(level => level.order)) + 1
				: 1;
			name = '';
			label = '';
			cycle = '';
			order = String(nextOrder);
		}
	}

	function onNameInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		name = value;
		if (!isEdit && !labelEdited) {
			label = value;
		}
	}

	$effect(() => {
		if (!open)
			return;
		const id = levelId;
		const yearId = academicContext.yearId;
		untrack(() => {
			resetForm();
			formId = id ?? `gl-${crypto.randomUUID()}`;
			savedDetails = id ? detailSnapshot : '';
			partialSave = false;
			initialized = false;
			editingYearId = yearId;
			onConfirmStep(false);
			if (canEditGrading)
				void gradeLevelsPage.loadGrading(id);
		});
	});
	$effect(() => {
		if (!open || initialized || !canEditGrading || gradeLevelsPage.gradingLoading || gradeLevelsPage.gradingError)
			return;
		untrack(() => {
			const level = gradeLevelsPage.gradingLevel?.id === gradeLevel?.id ? gradeLevelsPage.gradingLevel : gradeLevel;
			policies = structuredClone($state.snapshot(level?.gradingPolicies ?? []).filter(row => row.academicYearId === editingYearId));
			expectedRevision = previous?.revision ?? 0;
			scaleId = previous?.scale.id ?? '';
			mode = previous?.mode ?? 'numeric-first';
			aggregateLabel = previous?.aggregateLabel ?? 'Moyenne générale';
			equivalents = Object.fromEntries(Object.entries(previous?.numericEquivalents ?? {}).map(([key, value]) => [key, String(value)]));
			initialGrading = gradingSnapshot;
			initialized = true;
		});
	});

	async function submit() {
		if (!canSubmit || busy)
			return;
		if (gradingChanged && calculationChanged && !confirm) {
			onConfirmStep(true);
			return;
		}
		const scopeGeneration = academicContext.scopeGeneration;
		busy = true;
		try {
			if (detailsChanged) {
				const ok = await gradeLevelsPage.saveGradeLevel({
					id: formId,
					name: name.trim(),
					label: label.trim(),
					cycle,
					order: Math.max(1, Math.trunc(Number(order) || 1)),
					successMessage: gradingChanged ? undefined : get(t)(isEdit ? 'gradeLevels.toastUpdated' : 'gradeLevels.toastCreated', { name: name.trim() }),
				});
				if (!ok)
					return;
				if (scopeGeneration !== academicContext.scopeGeneration || editingYearId !== academicContext.yearId)
					return;
				savedDetails = detailSnapshot;
				partialSave = gradingChanged;
			}
			if (gradingChanged) {
				const ok = await gradeLevelsPage.configureGrading({ gradeLevelId: formId, scaleId, expectedScaleRevision: selectedScale?.revision, mode, aggregateLabel, numericEquivalents: { ...previous?.numericEquivalents, ...Object.fromEntries(conversions.map(row => [row.key, Number(equivalents[row.key])])) }, expectedRevision, confirmed: confirm, successMessage: get(t)('grading.saved') });
				if (!ok)
					return;
			}
			open = false;
		}
		finally { busy = false; }
	}

</script>

<FormModal
	bind:open
	title={isEdit ? $t('gradeLevels.edit') : $t('gradeLevels.add')}
	description={isEdit ? gradeLevel?.name : undefined}
	submitLabel={confirm ? $t('grading.confirm') : $t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	busy={busy}
	submitDisabled={!canSubmit}
	contentClass="max-w-2xl"
	onSubmit={submit}
>
	{#if partialSave}<p role="status" class="text-sm text-muted-foreground">{$t('grading.detailsSaved')}</p>{/if}
	{#if confirm}
		<p role="alert" class="rounded-xl border border-border bg-secondary p-4 text-sm">{$t('grading.warning')}</p>
		<Button variant="ghost" onclick={() => onConfirmStep(false)}>{$t('common.edit')}</Button>
	{/if}
	<div class:hidden={confirm} class="space-y-6">
		<fieldset disabled={!canEditDetails || busy} class="grid gap-4 sm:grid-cols-2">
			<label class="space-y-1.5 text-sm">
				<span class="text-muted-foreground">{$t('gradeLevels.name')}</span>
				<Input bind:value={name} oninput={onNameInput} class="rounded-xl" required />
			</label>
			<label class="space-y-1.5 text-sm">
				<span class="text-muted-foreground">{$t('gradeLevels.label')}</span>
				<Input
					bind:value={label}
					oninput={() => (labelEdited = true)}
					class="rounded-xl"
					required
				/>
				<span class="block text-xs text-muted-foreground">{$t('gradeLevels.labelHint')}</span>
				{#if showLabelWarning}
					<span class="block text-xs text-amber-600 dark:text-amber-500">
						{$t('gradeLevels.labelEditWarning', { n: existingClassCount })}
					</span>
				{/if}
			</label>
			<label class="space-y-1.5 text-sm">
				<span class="text-muted-foreground">{$t('gradeLevels.cycle')}</span>
				<Input bind:value={cycle} placeholder="Middle School" class="rounded-xl" />
			</label>
			<label class="space-y-1.5 text-sm">
				<span class="text-muted-foreground">{$t('gradeLevels.order')}</span>
				<Input type="number" min="1" bind:value={order} class="rounded-xl" />
			</label>
		</fieldset>
		{#if canEditGrading}
			<section class="space-y-4 border-t border-border pt-5 text-sm">
				<h3 class="font-display text-base font-semibold">{$t('grading.configure')}</h3>
				<p class="text-sm text-muted-foreground">{$t('grading.yearScope', { year: academicContext.year?.label ?? '' })}</p>
				{#if gradeLevelsPage.gradingLoading}<p role="status">{$t('dataState.loading')}</p>{/if}
				{#if gradeLevelsPage.gradingError}<Button variant="outline" onclick={() => gradeLevelsPage.loadGrading(gradeLevel?.id)}>{$t('common.retry')}</Button>{/if}
				{#if !currentYear}<p role="alert">{$t('grading.currentYearOnly')}</p>{/if}
				<fieldset disabled={!currentYear || busy || gradeLevelsPage.gradingLoading || gradeLevelsPage.gradingError}>
					<div class="space-y-4">
						<div class="space-y-1.5"><label for="grading-scale">{$t('grading.scale')}</label><FilterSelect id="grading-scale" class="flex w-full" bind:value={scaleId} options={scaleOptions} aria-label={$t('grading.scale')} /></div>
						<div class="space-y-1.5"><label for="grading-mode">{$t('grading.mode')}</label><FilterSelect id="grading-mode" class="flex w-full" value={mode} onchange={value => mode = value as GradingPolicy['mode']} options={modeOptions} aria-label={$t('grading.mode')} /></div>
						<label class="block space-y-1.5"><span>{$t('grading.aggregateLabel')}</span><Input bind:value={aggregateLabel} placeholder="Moyenne générale / GPA" /></label>
						{#if pointsMissing}<p role="alert" class="text-sm text-destructive">{$t('grading.missingPoints')}</p>{/if}
						{#if conversions.length}
							<fieldset class="space-y-3"><legend class="font-semibold">{$t('grading.equivalents')}</legend><p class="text-sm text-muted-foreground">{$t('grading.equivalentsHelp')}</p>
								{#each conversions as conversion (conversion.key)}<label class="block space-y-1.5 text-sm"><span>{conversion.label} / {selectedScale?.maxScore ?? '—'}</span><Input type="number" min="0" max={selectedScale?.maxScore} step="any" bind:value={equivalents[conversion.key]} required /></label>{/each}
							</fieldset>
						{/if}
					</div>
				</fieldset>
			</section>
		{/if}
	</div>
</FormModal>
