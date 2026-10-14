<script lang="ts">
	import type { GradeLevel, GradingPolicy } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';

	let { open = $bindable(false), gradeLevel, confirm = false, onConfirmStep }: { open?: boolean; gradeLevel: GradeLevel; confirm?: boolean; onConfirmStep: (value: boolean) => void } = $props();
	const owner = getGradeLevelsPageState();
	let busy = $state(false);
	let initialized = $state(false);
	let editingYearId = $state('');
	let expectedRevision = $state(0);
	let scaleId = $state('');
	let mode = $state<GradingPolicy['mode']>('numeric-first');
	let aggregateLabel = $state('');
	let equivalents = $state<Record<string, string>>({});
	const level = $derived(owner.gradingLevel?.id === gradeLevel.id ? owner.gradingLevel : gradeLevel);
	const policies = $derived((level.gradingPolicies ?? []).filter(row => row.academicYearId === academicContext.yearId));
	const previous = $derived(policies.toSorted((a, b) => b.revision - a.revision)[0]);
	const selectedScale = $derived(owner.gradingScales.find(row => row.id === scaleId));
	const conversions = $derived(mode === 'numeric-first' ? policies.filter(row => row.mode === 'mention-first').flatMap(row => row.scale.ranges.map(interval => ({ key: `${row.revision}:${interval.id}`, label: `${interval.letter} · ${interval.interpretation ?? ''} (v${row.revision})` }))) : []);
	const validEquivalents = $derived(conversions.every(row => equivalents[row.key]?.trim() && Number.isFinite(Number(equivalents[row.key])) && Number(equivalents[row.key]) >= 0 && Number(equivalents[row.key]) <= (selectedScale?.maxScore ?? 0)));
	const pointsMissing = $derived(mode === 'mention-first' && selectedScale?.ranges?.some(row => row.gpaValue == null));
	const currentYear = $derived(academicContext.year?.status === 'published' && new Date(academicContext.year.startDate) <= new Date() && new Date(academicContext.year.endDate) >= new Date());
	const canSubmit = $derived(currentYear && editingYearId === academicContext.yearId && !!selectedScale?.ranges?.length && selectedScale.minScore === 0 && selectedScale.maxScore > 0 && selectedScale.intervalConvention === 'continuous' && !!aggregateLabel.trim() && !pointsMissing && validEquivalents && !owner.gradingLoading && !owner.gradingError);
	const calculationChanged = $derived(!previous || previous.mode !== mode || previous.scale.id !== scaleId || previous.scale.revision !== selectedScale?.revision || conversions.some(row => Number(equivalents[row.key]) !== previous.numericEquivalents?.[row.key]));
	const scaleOptions = $derived([{ value: '', label: $t('grading.chooseScale') }, ...owner.gradingScales.filter(row => row.intervalConvention === 'continuous' && row.ranges?.length).map(row => ({ value: row.id, label: `${row.name} · ${row.maxScore}` }))]);
	const modeOptions = $derived([{ value: 'numeric-first', label: $t('grading.numeric') }, { value: 'mention-first', label: $t('grading.mention') }]);

	$effect(() => {
		if (!open) {
			initialized = false;
			return;
		}
		if (owner.gradingLoading || owner.gradingError || initialized)
			return;
		editingYearId = academicContext.yearId;
		expectedRevision = previous?.revision ?? 0;
		scaleId = previous?.scale.id ?? '';
		mode = previous?.mode ?? 'numeric-first';
		aggregateLabel = previous?.aggregateLabel ?? 'Moyenne générale';
		equivalents = Object.fromEntries(Object.entries(previous?.numericEquivalents ?? {}).map(([key, value]) => [key, String(value)]));
		initialized = true;
		onConfirmStep(false);
	});
	async function submit() {
		if (!canSubmit || busy)
			return;
		if (calculationChanged && !confirm) {
			onConfirmStep(true);
			return;
		}
		busy = true;
		try {
			const ok = await owner.configureGrading({ gradeLevelId: gradeLevel.id, scaleId, expectedScaleRevision: selectedScale?.revision, mode, aggregateLabel, numericEquivalents: { ...previous?.numericEquivalents, ...Object.fromEntries(conversions.map(row => [row.key, Number(equivalents[row.key])])) }, expectedRevision, confirmed: confirm, successMessage: get(t)('grading.saved') });
			if (ok)
				open = false;
		}
		finally { busy = false; }
	}
</script>

<FormModal bind:open title={$t('grading.configure')} description={`${gradeLevel.name} · ${academicContext.year?.label ?? ''}`} submitLabel={confirm ? $t('grading.confirm') : $t('common.save')} cancelLabel={$t('common.cancel')} {busy} submitDisabled={!canSubmit} onSubmit={submit} contentClass="max-w-2xl">
	<p class="text-sm text-muted-foreground">{$t('grading.yearScope', { year: academicContext.year?.label ?? '' })}</p>
	{#if owner.gradingLoading}<p role="status">{$t('common.loading')}</p>{/if}
	{#if owner.gradingError}<Button variant="outline" onclick={() => owner.loadGrading(gradeLevel.id)}>{$t('common.retry')}</Button>{/if}
	{#if !currentYear}<p role="alert">{$t('grading.currentYearOnly')}</p>{/if}
	{#if confirm}
		<p role="alert" class="rounded-xl border border-border bg-secondary p-4 text-sm">{$t('grading.warning')}</p>
		<Button variant="ghost" onclick={() => onConfirmStep(false)}>{$t('common.edit')}</Button>
	{:else}
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
	{/if}
</FormModal>
