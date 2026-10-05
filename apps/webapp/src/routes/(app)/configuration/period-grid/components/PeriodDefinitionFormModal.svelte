<script lang="ts">
	import type { PeriodDefinition, PeriodDefinitionDayOfWeek } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';

	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import {
		PERIOD_DEFINITION_WEEKDAY_LABEL_KEY,
		PERIOD_DEFINITION_WEEKDAYS,
	} from '../lib/period-definition-presets';
	import { getPeriodGridPageState } from '../period-grid-page.svelte';

	let {
		open = $bindable(false),
		academicYearId,
		periodDefinition = null,
	}: {
		open?: boolean;
		academicYearId: string;
		periodDefinition?: PeriodDefinition | null;
	} = $props();

	const periodGridPage = getPeriodGridPageState();

	let busy = $state(false);
	let label = $state('');
	let dayOfWeek = $state<PeriodDefinitionDayOfWeek>('monday');
	let order = $state('1');
	let startTime = $state('08:00');
	let endTime = $state('08:45');
	let isBreak = $state(false);
	let isTeachingSlot = $state(true);

	const isEdit = $derived(periodDefinition !== null && periodDefinition !== undefined);
	const numericOrder = $derived(Number(order));
	const effectiveTeachingSlot = $derived(isBreak ? false : isTeachingSlot);
	const canSubmit = $derived(label.trim().length > 0 && Number.isFinite(numericOrder) && numericOrder > 0 && startTime.trim().length > 0 && endTime.trim().length > 0 && startTime < endTime);

	const dayOptions = $derived(
		PERIOD_DEFINITION_WEEKDAYS.map(day => ({
			value: day,
			label: $t(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[day]),
		})),
	);

	function resetForm() {
		if (periodDefinition) {
			label = periodDefinition.label;
			dayOfWeek = periodDefinition.dayOfWeek;
			order = String(periodDefinition.order);
			startTime = periodDefinition.startTime;
			endTime = periodDefinition.endTime;
			isBreak = periodDefinition.isBreak;
			isTeachingSlot = periodDefinition.isTeachingSlot;
			return;
		}
		const existing = academicContext.periodDefinitionsForYear(academicYearId);
		const nextOrder = existing.length > 0 ? Math.max(...existing.map(entry => entry.order)) + 1 : 1;
		label = '';
		dayOfWeek = 'monday';
		order = String(nextOrder);
		startTime = '08:00';
		endTime = '08:45';
		isBreak = false;
		isTeachingSlot = true;
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		try {
			const trimmedLabel = label.trim();
			const payload = {
				academicYearId,
				label: trimmedLabel,
				dayOfWeek,
				order: numericOrder,
				startTime: startTime.trim(),
				endTime: endTime.trim(),
				isBreak,
				isTeachingSlot: effectiveTeachingSlot,
			};

			const ok = isEdit && periodDefinition
				? await periodGridPage.performSavePeriodDefinition({
					id: periodDefinition.id,
					...payload,
					successMessage: get(t)('periodDefinitions.toastUpdated', { label: trimmedLabel }),
				})
				: await periodGridPage.performSavePeriodDefinition({
					...payload,
					successMessage: get(t)('periodDefinitions.toastCreated', { label: trimmedLabel }),
				});

			if (ok) {
				open = false;
				await periodGridPage.refreshSlice();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('periodDefinitions.editTitle') : $t('periodDefinitions.add')}
	description={isEdit ? periodDefinition?.label : $t('periodDefinitions.subtitle')}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('periodDefinitions.label')}</span>
		<Input bind:value={label} />
	</label>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('periodDefinitions.dayOfWeek')}</span>
		<FilterSelect
			value={dayOfWeek}
			options={dayOptions}
			onchange={(value) => {
				dayOfWeek = value as PeriodDefinitionDayOfWeek;
			}}
		/>
	</label>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('periodDefinitions.order')}</span>
		<Input bind:value={order} type="number" min="1" step="1" />
	</label>
	<div class="grid grid-cols-2 gap-3">
		<label class="grid gap-1 text-sm">
			<span class="text-muted-foreground">{$t('periodDefinitions.startTime')}</span>
			<Input bind:value={startTime} type="time" />
		</label>
		<label class="grid gap-1 text-sm">
			<span class="text-muted-foreground">{$t('periodDefinitions.endTime')}</span>
			<Input bind:value={endTime} type="time" />
		</label>
	</div>
	<label class="flex items-center gap-2 text-sm">
		<Checkbox bind:checked={isBreak} />
		<span>{$t('periodDefinitions.isBreak')}</span>
	</label>
	<label class="flex items-center gap-2 text-sm">
		<Checkbox
			checked={effectiveTeachingSlot}
			disabled={isBreak}
			onCheckedChange={(value) => {
				isTeachingSlot = value === true;
			}}
		/>
		<span>{$t('periodDefinitions.isTeachingSlot')}</span>
	</label>
</FormModal>
