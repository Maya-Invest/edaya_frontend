<script lang="ts">
	import type { PublishResult } from '$lib/api/mutations/timetable-generation.mutations';
	import type { TimetablePublishStep } from '../lib/tools-workflow';
	import type { TimetablePlanningPageState } from '../timetable-planning-page.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import { buildTimetableRangePresets } from '$lib/components/school/scheduling/timetable-generation-ui';
	import TimetablePublishResultPanel from '$lib/components/school/scheduling/TimetablePublishResultPanel.svelte';
	import TimetableRangeSelector from '$lib/components/school/scheduling/TimetableRangeSelector.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { formatDateInput } from '$lib/date/format';
	import { t } from '$lib/i18n';

	let {
		open = $bindable(false),
		state: planningPage,
		classGroupId,
		className,
		phase,
		onPhaseChange,
		onInvalidPhase,
	}: {
		open?: boolean;
		state: TimetablePlanningPageState;
		classGroupId: string;
		className: string;
		phase: TimetablePublishStep;
		onPhaseChange: (phase: TimetablePublishStep) => void;
		onInvalidPhase: (phase: TimetablePublishStep) => void;
	} = $props();

	let startDate = $state('');
	let endDate = $state('');
	let policy = $state<'fail' | 'skip'>('fail');
	let publishResult = $state<PublishResult | null>(null);

	const yearStart = $derived(formatDateInput(academicContext.year?.startDate));
	const yearEnd = $derived(formatDateInput(academicContext.year?.endDate));
	const rangePresets = $derived(buildTimetableRangePresets({
		periods: academicContext.periodsForYear,
		yearStart,
		yearEnd,
	}));
	const validRange = $derived(Boolean(startDate && endDate && startDate <= endDate
		&& (!yearStart || startDate >= yearStart)
		&& (!yearEnd || endDate <= yearEnd)));
	const rangeLabel = $derived(`${startDate} – ${endDate}`);
	const modalTitle = $derived(phase === 'result' ? $t('timetable.publishResultTitle') : $t('timetable.publishTitle'));
	const modalDescription = $derived(
		phase === 'result'
			? $t('timetable.resultReviewHint')
			: `${className}. ${$t('timetable.publishHint')}`,
	);

	function initializeForm() {
		({ startDate, endDate } = planningPage.range);
		policy = 'fail';
		publishResult = null;
	}

	function handleModalOpenChange(isOpen: boolean) {
		if (isOpen) {
			initializeForm();
			return;
		}
		publishResult = null;
	}

	async function submit() {
		if (!validRange) {
			return;
		}
		const result = await planningPage.publish(classGroupId, startDate, endDate, policy);
		if (!result) {
			return;
		}
		publishResult = result;
		onPhaseChange('result');
	}

	$effect(() => {
		if (open && phase === 'result' && !publishResult) {
			onInvalidPhase('setup');
		}
	});
</script>

<FormModal
	bind:open
	title={modalTitle}
	description={modalDescription}
	busy={planningPage.busy}
	submitDisabled={!validRange}
	onSubmit={submit}
	onOpenChange={handleModalOpenChange}
>
	{#if phase === 'result' && publishResult}
		<TimetablePublishResultPanel result={publishResult} {className} {rangeLabel} />
	{:else}
		<div class="space-y-4">
			<TimetableRangeSelector bind:startDate bind:endDate presets={rangePresets} {validRange} />
			<label class="space-y-1.5 text-sm">
				<span>{$t('timetable.conflictPolicy')}</span>
				<select bind:value={policy} class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
					<option value="fail">{$t('timetable.policyFail')}</option>
					<option value="skip">{$t('timetable.policySkip')}</option>
				</select>
			</label>
			<p class="text-xs text-muted-foreground">{policy === 'skip' ? $t('timetable.skipHint') : $t('timetable.failHint')}</p>
		</div>
	{/if}

	{#snippet footer({ close, submit, busy, submitDisabled })}
		{#if phase === 'result'}
			<Button onclick={close} disabled={busy}>{$t('common.close')}</Button>
		{:else}
			<Button variant="ghost" onclick={close} disabled={busy}>{$t('common.cancel')}</Button>
			<Button onclick={submit} disabled={busy || submitDisabled}>{$t('timetable.publish')}</Button>
		{/if}
	{/snippet}
</FormModal>
