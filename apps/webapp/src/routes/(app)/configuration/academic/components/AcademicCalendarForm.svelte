<script lang="ts">
	import type { AcademicPeriod, AcademicYear } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { formatDateInput } from '$lib/date/format';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { untrack } from 'svelte';
	import { getAcademicPageState } from '../academic-page.svelte';
	import { calendarFormError, defaultPeriodType } from '../lib/academic-calendar-form';

	let { open = $bindable(false), year, period, editingYear = false }: {
		open?: boolean;
		year: AcademicYear;
		period?: AcademicPeriod;
		editingYear?: boolean;
	} = $props();
	const academicPage = getAcademicPageState();
	// The keyed parent captures the target once. Refreshes must not reset a draft.
	const initial = untrack(() => ({ ...year }));
	const originalPeriod = untrack(() => period ? { ...period } : undefined);
	const isYear = untrack(() => editingYear);
	const initialType = originalPeriod ? originalPeriod.type : defaultPeriodType(academicContext.canonicalPeriods.filter(entry => entry.academicYearId === initial.id));
	let name = $state(isYear ? initial.label : originalPeriod?.label ?? '');
	let shortName = $state(isYear ? initial.shortName ?? initial.label : originalPeriod?.shortName ?? originalPeriod?.label ?? '');
	let startDate = $state(isYear ? formatDateInput(initial.startDate) : formatDateInput(originalPeriod?.startDate));
	let endDate = $state(isYear ? formatDateInput(initial.endDate) : formatDateInput(originalPeriod?.endDate));
	let type = $state<AcademicPeriod['type']>(initialType);
	let busy = $state(false);
	let attempted = $state(false);
	let saved = $state(false);
	const title = $derived($t(editingYear ? 'academic.updateYear' : originalPeriod ? 'academic.updatePeriod' : 'academic.addPeriod'));
	const currentYear = $derived(academicContext.years.find(entry => entry.id === initial.id));
	const currentPeriod = $derived(originalPeriod ? academicContext.canonicalPeriods.find(entry => entry.id === originalPeriod.id) : undefined);
	const error = $derived(!currentYear || currentYear.schoolId !== initial.schoolId || (originalPeriod && (!currentPeriod || currentPeriod.schoolId !== initial.schoolId)) ? 'academic.targetUnavailable' : calendarFormError({ name, startDate, endDate }, currentYear, academicContext.canonicalPeriods, currentPeriod, editingYear));
	const dirty = $derived(!saved && (shortName !== (isYear ? initial.shortName ?? initial.label : originalPeriod?.shortName ?? originalPeriod?.label ?? '') || name !== (editingYear ? initial.label : originalPeriod?.label ?? '') || startDate !== formatDateInput(editingYear ? initial.startDate : originalPeriod?.startDate) || endDate !== formatDateInput(editingYear ? initial.endDate : originalPeriod?.endDate) || (!editingYear && type !== initialType)));
	async function submit() {
		attempted = true;
		if (busy || error || !hasPermission('SCHOOL_CONFIGURE'))
			return;
		busy = true;
		try {
			const fields = { name, shortName, startDate, endDate, type };
			const ok = editingYear
				? await academicPage.updateYear(initial.id, fields, $t('academic.toastUpdated'))
				: await academicPage.savePeriod(originalPeriod?.id ?? initial.id, fields, !originalPeriod, $t(originalPeriod ? 'academic.toastUpdated' : 'academic.toastPeriodCreated'));
			if (ok) {
				saved = true;
				open = false;
			}
		}
		finally { busy = false; }
	}
</script>

<FormModal bind:open {title} description={initial.label} {busy} {dirty} submitDisabled={!dirty || !hasPermission('SCHOOL_CONFIGURE')} onSubmit={submit}>
	<label class="block space-y-1.5 text-sm"><span>{$t('academic.yearLabel')}</span><Input name="name" bind:value={name} required /></label>
	{#if !editingYear}
		<label class="block space-y-1.5 text-sm"><span>{$t('academic.periodType')}</span><SelectField name="type" bind:value={type}>
			{#if originalPeriod && !originalPeriod.type}<option value={undefined}>{$t('academic.typeUnspecified')}</option>{/if}
			<option value="trimester">{$t('academic.typeTrimester')}</option><option value="semester">{$t('academic.typeSemester')}</option><option value="other">{$t('academic.typeOther')}</option>
		</SelectField></label>
	{/if}
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm"><span>{$t('academic.startDate')}</span><Input name="startDate" type="date" bind:value={startDate} required /></label>
		<label class="space-y-1.5 text-sm"><span>{$t('academic.endDate')}</span><Input name="endDate" type="date" bind:value={endDate} required /></label>
	</div>
	{#if attempted && error}<p role="alert" class="text-sm text-destructive">{$t(error)}</p>{/if}
	<ShortNameField {name} bind:value={shortName} creating={!editingYear && !originalPeriod} />
</FormModal>
