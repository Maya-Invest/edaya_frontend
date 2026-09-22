<script lang="ts">
	import type { PeriodDefinitionDayOfWeek } from '$lib/types/school';
	import type { PeriodDefinitionPresetId, PeriodTemplateRow } from '../lib/period-definition-presets';
	import { academicContext } from '$lib/academic/context.svelte';
	import { savePeriodDefinitionsBatchMutation } from '$lib/api/mutations/period-definition.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogSlotLabel, toCanonicalCatalogText } from '$lib/i18n/catalog-label';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getAcademicPageState } from '../academic-page.svelte';
	import {
		PERIOD_DEFINITION_PRESET_IDS,
		PERIOD_DEFINITION_WEEKDAY_LABEL_KEY,
		PERIOD_DEFINITION_WEEKDAYS,
		clonePeriodDefinitionPreset,
		expandPeriodDefinitionTemplate,
	} from '../lib/period-definition-presets';

	type WizardStep = 'preset' | 'tweak' | 'preview';

	function isValidTemplateRow(row: PeriodTemplateRow): boolean {
		return row.label.trim().length > 0
			&& Number.isFinite(row.order)
			&& row.order > 0
			&& row.startTime.length > 0
			&& row.endTime.length > 0
			&& row.startTime < row.endTime;
	}

	let {
		open = $bindable(false),
		academicYearId,
		step,
		onStepChange,
	}: {
		open?: boolean;
		academicYearId: string;
		step: WizardStep;
		onStepChange: (step: WizardStep) => void;
	} = $props();

	const academicPage = getAcademicPageState();

	let busy = $state(false);
	let selectedPresetId = $state<PeriodDefinitionPresetId>('standard-secondary');
	let weekdays = $state<PeriodDefinitionDayOfWeek[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
	let halfDays = $state<PeriodDefinitionDayOfWeek[]>([]);
	let template = $state<PeriodTemplateRow[]>([
		{ label: 'Période 1', order: 1, startTime: '08:00', endTime: '08:45', isBreak: false },
	]);

	const existingCount = $derived(academicContext.periodDefinitionsForYear(academicYearId).length);
	const expanded = $derived(
		expandPeriodDefinitionTemplate({ template, weekdays, halfDays }),
	);
	const canAdvanceTweak = $derived(
		weekdays.length > 0 && template.length > 0 && template.every(isValidTemplateRow),
	);
	const canSubmit = $derived(canAdvanceTweak && expanded.length > 0);

	const modalTitle = $derived(
		step === 'preset'
			? $t('periodDefinitions.wizard.presetTitle')
			: step === 'tweak'
			? $t('periodDefinitions.wizard.tweakTitle')
			: $t('periodDefinitions.wizard.previewTitle'),
	);
	const modalDescription = $derived(
		step === 'preset'
			? $t('periodDefinitions.wizard.presetDescription')
			: step === 'tweak'
			? $t('periodDefinitions.wizard.tweakDescription')
			: $t('periodDefinitions.wizard.previewDescription'),
	);
	const submitLabel = $derived(
		step === 'preview' ? $t('periodDefinitions.wizard.apply') : $t('common.next'),
	);

	function applyPreset(id: PeriodDefinitionPresetId) {
		const preset = clonePeriodDefinitionPreset(id);
		selectedPresetId = id;
		weekdays = preset.weekdays;
		halfDays = preset.halfDays;
		template = preset.template;
	}

	function resetForm() {
		applyPreset('standard-secondary');
	}

	function toggleWeekday(day: PeriodDefinitionDayOfWeek) {
		if (weekdays.includes(day)) {
			weekdays = weekdays.filter(entry => entry !== day);
			halfDays = halfDays.filter(entry => entry !== day);
			return;
		}
		weekdays = PERIOD_DEFINITION_WEEKDAYS.filter(entry => entry === day || weekdays.includes(entry));
	}

	function toggleHalfDay(day: PeriodDefinitionDayOfWeek) {
		if (!weekdays.includes(day)) {
			return;
		}
		if (halfDays.includes(day)) {
			halfDays = halfDays.filter(entry => entry !== day);
			return;
		}
		halfDays = PERIOD_DEFINITION_WEEKDAYS.filter(entry => entry === day || halfDays.includes(entry));
	}

	function addTemplateRow() {
		const nextOrder = template.length > 0 ? Math.max(...template.map(row => row.order)) + 1 : 1;
		template = [
			...template,
			{
				label: '',
				order: nextOrder,
				startTime: '08:00',
				endTime: '08:45',
				isBreak: false,
			},
		];
	}

	function removeTemplateRow(index: number) {
		if (template.length <= 1) {
			return;
		}
		template = template.filter((_, rowIndex) => rowIndex !== index);
	}

	function updateTemplateRow(index: number, patch: Partial<PeriodTemplateRow>) {
		template = template.map((row, rowIndex) => {
			if (rowIndex !== index) {
				return row;
			}
			return { ...row, ...patch };
		});
	}

	function handleBack() {
		if (step === 'preview') {
			onStepChange('tweak');
		}
		else if (step === 'tweak') {
			onStepChange('preset');
		}
	}

	function handleNext() {
		if (step === 'preset') {
			onStepChange('tweak');
			return;
		}
		if (step === 'tweak' && canAdvanceTweak) {
			onStepChange('preview');
		}
	}

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		try {
			const ok = await savePeriodDefinitionsBatchMutation({
				definitions: expanded.map(slot => ({
					academicYearId,
					label: slot.label,
					dayOfWeek: slot.dayOfWeek,
					order: slot.order,
					startTime: slot.startTime,
					endTime: slot.endTime,
					isBreak: slot.isBreak,
					isTeachingSlot: slot.isTeachingSlot,
				})),
				successMessage: get(t)('periodDefinitions.toastBatchCreated', {
					count: String(expanded.length),
				}),
			});

			if (ok) {
				open = false;
				resetForm();
				await academicPage.refreshSlice();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={modalTitle}
	description={modalDescription}
	{submitLabel}
	cancelLabel={$t('academic.cancel')}
	{busy}
	submitDisabled={step === 'preview' ? !canSubmit : step === 'tweak' ? !canAdvanceTweak : false}
	contentClass="max-w-2xl"
	onCancel={resetForm}
	onSubmit={step === 'preview' ? submit : handleNext}
>
	{#if step !== 'preset'}
		<button
			type="button"
			class="mb-2 text-xs font-medium text-muted-foreground hover:text-foreground"
			onclick={handleBack}
		>
			← {$t('common.back')}
		</button>
	{/if}

	{#if step === 'preset'}
		<div class="grid gap-2">
			{#each PERIOD_DEFINITION_PRESET_IDS as presetId (presetId)}
				<button
					type="button"
					class={cn(
						'rounded-xl border px-4 py-3 text-left transition-colors',
						selectedPresetId === presetId
							? 'border-primary bg-primary/10'
							: 'border-border/70 bg-background/60 hover:bg-muted/40',
					)}
					onclick={() => applyPreset(presetId)}
				>
					<p class="text-sm font-medium">
						{$t(`periodDefinitions.wizard.preset.${presetId}`)}
					</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{$t(`periodDefinitions.wizard.preset.${presetId}Hint`)}
					</p>
				</button>
			{/each}
		</div>
	{:else if step === 'tweak'}
		<div class="space-y-4">
			<div>
				<p class="mb-2 font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
					{$t('periodDefinitions.wizard.weekdays')}
				</p>
				<div class="flex flex-wrap gap-3">
					{#each PERIOD_DEFINITION_WEEKDAYS as day (day)}
						<label class="flex items-center gap-2 text-sm">
							<Checkbox
								checked={weekdays.includes(day)}
								onCheckedChange={() => toggleWeekday(day)}
							/>
							<span>{$t(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[day])}</span>
						</label>
					{/each}
				</div>
			</div>

			<div>
				<p class="mb-2 font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
					{$t('periodDefinitions.wizard.halfDays')}
				</p>
				<div class="flex flex-wrap gap-3">
					{#each weekdays as day (day)}
						<label class="flex items-center gap-2 text-sm">
							<Checkbox
								checked={halfDays.includes(day)}
								onCheckedChange={() => toggleHalfDay(day)}
							/>
							<span>{$t(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[day])}</span>
						</label>
					{/each}
				</div>
			</div>

			<div>
				<div class="mb-2 flex items-center justify-between gap-3">
					<p class="font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
						{$t('periodDefinitions.wizard.template')}
					</p>
					<Button type="button" size="sm" variant="outline" class="rounded-full" onclick={addTemplateRow}>
						{$t('periodDefinitions.wizard.addRow')}
					</Button>
				</div>
				<div class="space-y-3">
					{#each template as row, index (index)}
						<div class="rounded-xl border border-border/70 bg-background/60 p-3 space-y-3">
							<div class="grid gap-3 sm:grid-cols-[1fr_5rem]">
								<label class="grid gap-1 text-sm">
									<span class="text-muted-foreground">{$t('periodDefinitions.label')}</span>
									<Input
										value={catalogSlotLabel(row.label, $lang)}
										oninput={event => updateTemplateRow(index, {
											label: toCanonicalCatalogText(event.currentTarget.value),
										})}
									/>
								</label>
								<label class="grid gap-1 text-sm">
									<span class="text-muted-foreground">{$t('periodDefinitions.order')}</span>
									<Input
										type="number"
										min="1"
										step="1"
										value={String(row.order)}
										oninput={event => updateTemplateRow(index, {
											order: Number(event.currentTarget.value) || 1,
										})}
									/>
								</label>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<label class="grid gap-1 text-sm">
									<span class="text-muted-foreground">{$t('periodDefinitions.startTime')}</span>
									<Input
										type="time"
										value={row.startTime}
										oninput={event => updateTemplateRow(index, {
											startTime: event.currentTarget.value,
										})}
									/>
								</label>
								<label class="grid gap-1 text-sm">
									<span class="text-muted-foreground">{$t('periodDefinitions.endTime')}</span>
									<Input
										type="time"
										value={row.endTime}
										oninput={event => updateTemplateRow(index, {
											endTime: event.currentTarget.value,
										})}
									/>
								</label>
							</div>
							<div class="flex flex-wrap items-center justify-between gap-3">
								<label class="flex items-center gap-2 text-sm">
									<Checkbox
										checked={row.isBreak}
										onCheckedChange={checked => updateTemplateRow(index, {
											isBreak: checked === true,
										})}
									/>
									<span>{$t('periodDefinitions.isBreak')}</span>
								</label>
								{#if template.length > 1}
									<Button
										type="button"
										size="sm"
										variant="ghost"
										class="text-destructive"
										onclick={() => removeTemplateRow(index)}
									>
										{$t('periodDefinitions.wizard.removeRow')}
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<p class="text-sm font-medium">
				{$t('periodDefinitions.wizard.previewCount', { count: String(expanded.length) })}
			</p>
			{#if existingCount > 0}
				<p class="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
					{$t('periodDefinitions.wizard.additiveWarning', { existing: String(existingCount) })}
				</p>
			{/if}
			<ul class="max-h-64 space-y-2 overflow-y-auto">
				{#each expanded.slice(0, 12) as slot, index (`${slot.dayOfWeek}-${slot.order}-${index}`)}
					<li class="rounded-xl border border-border/70 px-3 py-2 text-sm">
						<p class="font-medium">
							{catalogSlotLabel(slot.label, $lang)}
							{#if slot.isBreak}
								<span class="ml-2 rounded-full bg-secondary px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase text-muted-foreground">
									{$t('periodDefinitions.break')}
								</span>
							{:else if !slot.isTeachingSlot}
								<span class="ml-2 rounded-full bg-secondary px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase text-muted-foreground">
									{$t('periodDefinitions.nonTeaching')}
								</span>
							{/if}
						</p>
						<p class="font-sans tabular-nums text-[11px] text-muted-foreground">
							{$t(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[slot.dayOfWeek])}
							· #{slot.order}
							· {slot.startTime} → {slot.endTime}
						</p>
					</li>
				{/each}
			</ul>
			{#if expanded.length > 12}
				<p class="text-xs text-muted-foreground">
					+{expanded.length - 12}
				</p>
			{/if}
		</div>
	{/if}
</FormModal>
