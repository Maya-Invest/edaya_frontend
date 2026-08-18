<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	let {
		open = $bindable(false),
		onCreated,
	}: {
		open?: boolean;
		onCreated?: (definitionId: string) => void;
	} = $props();

	const reportCardsPage = getReportCardsPageState();

	let busy = $state(false);
	let wasOpen = false;
	let name = $state('');
	let gradeLevelId = $state('');
	let gradeScaleId = $state('');

	const gradeLevels = $derived(academicContext.gradeLevels);
	const scales = $derived(reportCardsPage.scales);
	const gradeLevelOptions = $derived(
		gradeLevels.map(level => ({ value: level.id, label: level.name })),
	);
	const scaleOptions = $derived(
		scales.map(scale => ({ value: scale.id, label: scale.name })),
	);
	const canSubmit = $derived(
		name.trim().length > 0 && gradeLevelId !== '' && gradeScaleId !== '',
	);

	function defaultGradeLevelId() {
		return academicContext.gradeLevels[0]?.id ?? '';
	}

	function defaultScaleId() {
		return reportCardsPage.scales.find(scale => scale.isDefault)?.id
			?? reportCardsPage.scales[0]?.id
			?? '';
	}

	function resetForm() {
		name = '';
		gradeLevelId = defaultGradeLevelId();
		gradeScaleId = defaultScaleId();
	}

	async function ensureCatalog() {
		if (reportCardsPage.scales.length === 0) {
			await reportCardsPage.refreshSlice();
		}
		if (gradeLevelId === '') {
			gradeLevelId = defaultGradeLevelId();
		}
		if (gradeScaleId === '') {
			gradeScaleId = defaultScaleId();
		}
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
			void ensureCatalog();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		try {
			const id = await reportCardsPage.createDefinition({
				name,
				gradeLevelId,
				gradeScaleId,
				successMessage: get(t)('reportCards.toastModelCreated', { name: name.trim() }),
			});
			if (id) {
				open = false;
				onCreated?.(id);
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('reportCards.createModel')}
	description={$t('reportCards.subtitle')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	bodyClass="overflow-visible"
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<Label for="report-card-name">{$t('gradeScales.name')}</Label>
			<Input id="report-card-name" bind:value={name} />
		</div>
		<div class="space-y-1.5">
			<Label>{$t('classGroups.gradeLevel')}</Label>
			<FilterSelect
				bind:value={gradeLevelId}
				class="h-10 w-full"
				options={gradeLevelOptions}
			/>
		</div>
		<div class="space-y-1.5">
			<Label>{$t('gradeScales.subtitle')}</Label>
			<FilterSelect
				bind:value={gradeScaleId}
				class="h-10 w-full"
				options={scaleOptions}
			/>
		</div>
	</div>
</FormModal>
