<script lang="ts">
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { academicYearLabelFromDates } from '$lib/onboarding/school-step-defaults';
	import { get } from 'svelte/store';
	import { getAcademicPageState } from '../academic-page.svelte';

	let {
		open = $bindable(false),
		onCreated,
	}: {
		open?: boolean;
		onCreated?: (yearId: string) => void;
	} = $props();

	const academicPage = getAcademicPageState();

	let busy = $state(false);
	let name = $state('');
	let shortName = $state('');
	let lastSuggestion = $state('');
	let startDate = $state('2027-09-01');
	let endDate = $state('2028-07-02');
	$effect(() => {
		const suggestion = academicYearLabelFromDates(startDate, endDate);
		if (!name || name === lastSuggestion)
			name = suggestion;
		lastSuggestion = suggestion;
	});

	const canSubmit = $derived(
		academicYearLabelFromDates(startDate, endDate).length > 0 && startDate <= endDate,
	);

	function resetForm() {
		name = '';
		shortName = '';
		lastSuggestion = '';
		startDate = '2027-09-01';
		endDate = '2028-07-02';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy)
			return;

		busy = true;
		try {
			const yearId = await academicPage.createYear({
				name,
				shortName,
				startDate,
				endDate,
				successMessage: get(t)('academic.toastYearCreated', { label: academicYearLabelFromDates(startDate, endDate) }),
			});
			if (yearId) {
				open = false;
				resetForm();
				onCreated?.(yearId);
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('academic.createYear')}
	description={$t('academic.subtitle')}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('academic.startDate')}</span>
			<Input type="date" bind:value={startDate} />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('academic.endDate')}</span>
			<Input type="date" bind:value={endDate} />
		</label>
	</div>
	<label class="block space-y-1.5 text-sm"><span>{$t('academic.yearLabel')}</span><Input bind:value={name} required /></label>
	<ShortNameField {name} bind:value={shortName} />
</FormModal>
