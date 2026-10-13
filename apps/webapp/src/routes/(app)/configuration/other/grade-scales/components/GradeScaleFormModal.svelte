<script lang="ts">
	import type { GradeScale, GradeScaleRange } from '$lib/types/report-cards';
	import { lookupGradeInterval, roundedSample, newGradeIntervals, splitGradeInterval, validateGradeIntervals, validGradeScalePrecision } from '$lib/api/grade-intervals';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getGradeScalesPageState } from '../grade-scales-page.svelte';

	let { open = $bindable(false), scale = null }: { open?: boolean; scale?: GradeScale | null } = $props();
	const owner = getGradeScalesPageState();
	let busy = $state(false);
	let name = $state('');
	let minScore = $state('0');
	let maxScore = $state('20');
	let decimalPlaces = $state('2');
	let description = $state('');
	let roundingMode = $state<'nearest' | 'truncate'>('nearest');
	let convention = $state<'legacy-closed' | 'continuous'>('continuous');
	let ranges = $state<GradeScaleRange[]>([]);
	let sample = $state('');
	let wasOpen = false;
	const continuous = $derived(convention === 'continuous');
	const valid = $derived(!continuous || validateGradeIntervals(ranges, Number(minScore), Number(maxScore)));
	const validPrecision = $derived(!continuous || validGradeScalePrecision(Number(minScore), Number(maxScore), Number(decimalPlaces)));
	const canSubmit = $derived(name.trim().length > 0 && validPrecision && valid && Number.isInteger(Number(decimalPlaces)) && Number(decimalPlaces) >= 0 && Number(decimalPlaces) <= 3);
	const matched = $derived(sample.trim() ? lookupGradeInterval(ranges, roundedSample(Number(sample), Number(decimalPlaces), roundingMode), continuous) : undefined);
	const roundingOptions = $derived([{ value: 'nearest', label: $t('grading.nearest') }, { value: 'truncate', label: $t('grading.truncate') }]);

	function resetForm() {
		name = scale?.name ?? '';
		minScore = String(scale?.minScore ?? 0);
		maxScore = String(scale?.maxScore ?? 20);
		decimalPlaces = String(scale?.decimalPlaces ?? 2);
		description = scale?.storedDescription ?? '';
		roundingMode = scale?.roundingMode ?? 'nearest';
		convention = scale ? scale.intervalConvention ?? 'legacy-closed' : 'continuous';
		ranges = scale ? (scale.ranges ?? []).map(row => ({ ...row })) : newGradeIntervals();
		sample = '';
	}
	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});
	function convert() {
		ranges = ranges.map((row, i) => ({ ...row, id: row.id ?? crypto.randomUUID(), interpretation: row.interpretation ?? row.letter, maxScore: ranges[i + 1]?.minScore ?? Number(maxScore) }));
		convention = 'continuous';
	}
	function add() {
		const min = ranges.at(-1)?.maxScore ?? Number(minScore);
		ranges = [...ranges, { id: crypto.randomUUID(), letter: '', interpretation: '', minScore: min, maxScore: Number(maxScore), isPassing: false }];
	}
	async function submit() {
		if (!canSubmit || busy)
			return;
		busy = true;
		try {
			const payload = { name: name.trim(), minScore: Number(minScore), maxScore: Number(maxScore), decimalPlaces: Number(decimalPlaces), description: description.trim() || undefined, roundingMode, intervalConvention: convention, ranges, passingScore: Math.min(...ranges.filter(row => row.isPassing).map(row => row.minScore), Number(maxScore)) };
			const ok = scale ? await owner.updateScale({ ...payload, scaleId: scale.id, successMessage: get(t)('gradeScales.toastUpdated', { name }) }) : await owner.createScale({ ...payload, successMessage: get(t)('gradeScales.toastCreated', { name }) });
			if (ok)
				open = false;
		}
		finally { busy = false; }
	}
</script>

<FormModal bind:open title={scale ? $t('gradeScales.editTitle') : $t('gradeScales.add')} description={$t('grading.scaleHelp')} submitLabel={$t('academic.save')} cancelLabel={$t('academic.cancel')} {busy} submitDisabled={!canSubmit} onSubmit={submit} contentClass="max-w-4xl">
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm sm:col-span-2"><span>{$t('gradeScales.name')}</span><Input bind:value={name} required /></label>
		<label class="space-y-1.5 text-sm"><span>{$t('gradeScales.min')}</span><Input type="number" step="any" bind:value={minScore} disabled={!continuous} /></label>
		<label class="space-y-1.5 text-sm"><span>{$t('gradeScales.max')}</span><Input type="number" step="any" bind:value={maxScore} disabled={!continuous} /></label>
		<label class="space-y-1.5 text-sm"><span>{$t('gradeScales.decimals')}</span><Input type="number" min="0" max="3" bind:value={decimalPlaces} /></label>
		<div class="space-y-1.5 text-sm"><span id="rounding-label" class="block">{$t('grading.rounding')}</span><FilterSelect class="flex w-full" aria-label={$t('grading.rounding')} options={roundingOptions} value={roundingMode} onchange={value => roundingMode = value as 'nearest' | 'truncate'} /></div>
	</div>
	{#if !validPrecision}<p role="alert" class="text-sm text-destructive">{$t('grading.invalidPrecision')}</p>{/if}
	{#if !continuous}
		<div class="space-y-2 rounded-xl bg-secondary p-3"><p class="text-sm">{$t('grading.legacyIntervals')}</p><Button variant="outline" onclick={convert}>{$t('grading.convertIntervals')}</Button></div>
	{/if}
	<div class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2"><h3 class="font-semibold">{$t('grading.intervals')}</h3><Button variant="outline" onclick={add} disabled={!continuous}>{$t('grading.addInterval')}</Button></div>
		<p class="text-sm text-muted-foreground">{$t('grading.boundaryHelp')}</p>
		{#each ranges as row, i (row.id ?? i)}
			<fieldset class="grid min-w-0 gap-3 rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-4" disabled={!continuous}>
				<legend class="px-1 text-sm font-medium">{$t('grading.interval')} {i + 1}</legend>
				<label class="space-y-1 text-sm"><span>{$t('grading.code')}</span><Input bind:value={row.letter} required /></label>
				<label class="space-y-1 text-sm sm:col-span-1 lg:col-span-3"><span>{$t('grading.label')}</span><Input value={row.interpretation ?? ''} oninput={event => row.interpretation = event.currentTarget.value} required /></label>
				<label class="space-y-1 text-sm"><span>{$t('grading.lower')}</span><Input type="number" step="any" value={String(row.minScore)} oninput={event => row.minScore = event.currentTarget.value === '' ? Number.NaN : Number(event.currentTarget.value)} required /></label>
				<label class="space-y-1 text-sm"><span>{$t('grading.upper')}</span><Input type="number" step="any" value={String(row.maxScore)} oninput={event => row.maxScore = event.currentTarget.value === '' ? Number.NaN : Number(event.currentTarget.value)} required /></label>
				<label class="space-y-1 text-sm"><span>{$t('grading.points')}</span><Input type="number" step="any" value={String(row.gpaValue ?? '')} oninput={event => row.gpaValue = event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value)} /></label>
				<label class="flex items-center gap-2 text-sm"><Checkbox bind:checked={row.isPassing} />{$t('grading.passing')}</label>
				<div class="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4"><Button variant="ghost" size="sm" onclick={() => ranges = splitGradeInterval(ranges, row.id!)}>{$t('grading.split')}</Button><Button variant="ghost" size="sm" onclick={() => ranges = ranges.filter((_, index) => index !== i)}>{$t('common.delete')}</Button></div>
			</fieldset>
		{/each}
		{#if !valid}<p role="alert" class="text-sm text-destructive">{$t('grading.invalidIntervals')}</p>{/if}
	</div>
	<label class="block space-y-1.5 text-sm"><span>{$t('grading.sample')}</span><Input type="number" step="any" bind:value={sample} /><span aria-live="polite" class="block text-muted-foreground">{sample ? matched ? `${matched.letter} · ${matched.interpretation ?? ''}` : $t('grading.noMatch') : ''}</span></label>
	<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.description')}</span><Input bind:value={description} /></label>
</FormModal>
