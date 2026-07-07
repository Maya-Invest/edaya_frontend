<script lang="ts">
	import type { PeriodDefinition } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { savePeriodDefinitionMutation } from '$lib/api/mutations/period-definition.mutations';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
		academicYearId,
		periodDefinition = null,
	}: {
		open?: boolean;
		academicYearId: string;
		periodDefinition?: PeriodDefinition | null;
	} = $props();

	let busy = $state(false);
	let label = $state('');
	let order = $state('1');
	let startTime = $state('08:00');
	let endTime = $state('08:45');
	let isBreak = $state(false);

	const isEdit = $derived(periodDefinition !== null && periodDefinition !== undefined);
	const numericOrder = $derived(Number(order));
	const canSubmit = $derived(
		label.trim().length > 0 && Number.isFinite(numericOrder) && numericOrder > 0 && startTime.trim().length > 0 && endTime.trim().length > 0,
	);

	function resetForm() {
		if (periodDefinition) {
			label = periodDefinition.label;
			order = String(periodDefinition.order);
			startTime = periodDefinition.startTime;
			endTime = periodDefinition.endTime;
			isBreak = periodDefinition.isBreak;
			return;
		}
		const existing = academicContext.periodDefinitionsForYear(academicYearId);
		const nextOrder = existing.length > 0 ? Math.max(...existing.map(entry => entry.order)) + 1 : 1;
		label = '';
		order = String(nextOrder);
		startTime = '08:00';
		endTime = '08:45';
		isBreak = false;
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
				order: numericOrder,
				startTime: startTime.trim(),
				endTime: endTime.trim(),
				isBreak,
			};

			const ok = isEdit && periodDefinition
				? await savePeriodDefinitionMutation({
					id: periodDefinition.id,
					...payload,
					successMessage: get(t)('periodDefinitions.toastUpdated', { label: trimmedLabel }),
				})
				: await savePeriodDefinitionMutation({
					...payload,
					successMessage: get(t)('periodDefinitions.toastCreated', { label: trimmedLabel }),
				});

			if (ok) {
				open = false;
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
</FormModal>
