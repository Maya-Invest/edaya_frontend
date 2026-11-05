<script lang="ts">
	import type { GradeScale } from '$lib/types/report-cards';
	import { validGradeScalePrecision } from '$lib/api/grade-intervals';
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { hasAnyPermission } from '$lib/permissions';
	import { getGradeScalesPageState } from '../grade-scales-page.svelte';

	let { open = $bindable(false), scale = null }: { open?: boolean; scale?: GradeScale | null } = $props();
	const owner = getGradeScalesPageState();
	let busy = $state(false);
	let name = $state('');
	let shortName = $state('');
	let description = $state('');
	let minimum = $state('0');
	let maximum = $state('20');
	let precision = $state('2');
	let rounding = $state('nearest');
	let id = '';
	let revision = 0;
	let wasOpen = false;
	let openedIdentity = '';
	$effect.pre(() => {
		if (open && (!wasOpen || openedIdentity !== (scale?.id ?? 'new'))) {
			openedIdentity = scale?.id ?? 'new';
			name = scale?.name ?? '';
			shortName = scale?.shortName ?? scale?.name ?? '';
			description = scale?.storedDescription ?? '';
			minimum = String(scale?.minScore ?? 0);
			maximum = String(scale?.maxScore ?? 20);
			precision = String(scale?.decimalPlaces ?? 2);
			rounding = scale?.roundingMode ?? 'nearest';
			id = scale?.id ?? crypto.randomUUID();
			revision = scale?.revision ?? 0;
		}
		wasOpen = open;
	});
	const valid = $derived(!!name.trim() && !!minimum.trim() && !!maximum.trim() && !!precision.trim() && Number(minimum) >= 0 && Number(maximum) > Number(minimum) && validGradeScalePrecision(Number(minimum), Number(maximum), Number(precision)) && (!scale?.ranges?.length || (Number(minimum) === scale.minScore && scale.ranges.every(row => (row.minScore < Number(maximum) && (row.gpaValue == null || row.gpaValue <= Number(maximum)))))));
	async function save() {
		if (!valid || busy || !hasAnyPermission(['GRADE_SCALE_CONFIGURE']))
			return;
		busy = true;
		try {
			if (await owner.configureScale({ id, expectedRevision: revision, action: 'metadata', metadata: { name: name.trim(), shortName, description: description.trim() || null, minScore: Number(minimum), maxScore: Number(maximum), decimalPlaces: Number(precision), roundingMode: rounding as 'nearest' | 'truncate' } }))
				open = false;
		}
		finally {
			busy = false;
		}
	}
</script>
<FormModal bind:open title={scale ? $t('gradeScales.editTitle') : $t('gradeScales.add')} description={$t('grading.scaleHelp')} submitLabel={$t('common.save')} cancelLabel={$t('common.cancel')} {busy} submitDisabled={!valid || !hasAnyPermission(['GRADE_SCALE_CONFIGURE'])} onSubmit={save}>
	<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.name')}</span><Input bind:value={name} required /></label>
	<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.description')}</span><Input bind:value={description} /></label>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.min')}</span><Input type="number" step="any" bind:value={minimum} disabled={!!scale?.ranges?.length} /></label>
		<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.max')}</span><Input type="number" step="any" bind:value={maximum} /></label>
		<label class="block space-y-1.5 text-sm"><span>{$t('gradeScales.decimals')}</span><Input type="number" min="0" max="3" bind:value={precision} /></label>
		<div class="space-y-1.5 text-sm"><span>{$t('grading.rounding')}</span><FilterSelect aria-label={$t('grading.rounding')} class="w-full" bind:value={rounding} options={[{ value: 'nearest', label: $t('grading.nearest') }, { value: 'truncate', label: $t('grading.truncate') }]} /></div>
	</div>
	{#if !valid && name.trim()}<p role="alert" class="text-sm text-destructive">{$t('grading.invalidMetadata')}</p>{/if}
	{#if !scale}<p class="text-sm text-muted-foreground">{$t('grading.emptyHelp')}</p>{/if}
	<ShortNameField name={name} bind:value={shortName} creating={!scale} />
</FormModal>
