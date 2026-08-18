<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import type { TeacherUnavailability } from '../../../../teachers-page.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { createTeacherUnavailabilityPayload } from '../../../../lib/teacher-detail-mutations';
	import {
		utcWallClockDateTimeInput,
		utcWallClockInstantFromDateTimeInput,
	} from '../../../../lib/teacher-unavailability';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';

	let {
		open = $bindable(false),
		teacher,
		rule,
		onSaved,
	}: {
		open?: boolean;
		teacher: Teacher;
		rule?: TeacherUnavailability;
		onSaved?: () => void;
	} = $props();

	const teachersPage = getTeachersPageState();
	const initialRule = untrack(() => rule);
	const year = untrack(() => academicContext.year);
	let busy = $state(false);
	let recurrence = $state<'weekly' | 'one_off'>(initialRule?.recurrence ?? 'weekly');
	let dayOfWeek = $state(initialRule?.dayOfWeek ?? 'monday');
	let startTime = $state(initialRule?.startTime ?? '08:00');
	let endTime = $state(initialRule?.endTime ?? '09:00');
	let effectiveFrom = $state(dateInput(initialRule?.effectiveFrom ?? year?.startDate));
	let effectiveUntil = $state(dateInput(initialRule?.effectiveUntil ?? year?.endDate));
	let startsAt = $state(dateTimeInput(initialRule?.startsAt));
	let endsAt = $state(dateTimeInput(initialRule?.endsAt));
	let reason = $state(initialRule?.reason ?? '');

	function dateInput(value: unknown): string {
		return value ? new Date(String(value)).toISOString().slice(0, 10) : '';
	}

	function dateTimeInput(value: unknown): string {
		return utcWallClockDateTimeInput(value);
	}

	const canSubmit = $derived.by(() => {
		const yearStart = academicContext.year?.startDate ?? '';
		const yearEnd = academicContext.year?.endDate ?? '';
		if (recurrence === 'weekly') {
			return Boolean(dayOfWeek && startTime && endTime && effectiveFrom && effectiveUntil
				&& startTime < endTime && effectiveFrom <= effectiveUntil
				&& (!yearEnd || effectiveFrom <= yearEnd)
				&& (!yearStart || effectiveUntil >= yearStart));
		}
		return Boolean(startsAt && endsAt && startsAt < endsAt
			&& (!yearEnd || startsAt.slice(0, 10) <= yearEnd)
			&& (!yearStart || endsAt.slice(0, 10) >= yearStart));
	});

	async function submit() {
		if (!canSubmit)
			return;
		busy = true;
		const payload = createTeacherUnavailabilityPayload({
			id: rule?.id,
			teacherId: teacher.id,
			recurrence,
			dayOfWeek: dayOfWeek as TeacherUnavailability['dayOfWeek'],
			startTime,
			endTime,
			effectiveFrom: effectiveFrom ? `${effectiveFrom}T00:00:00.000Z` : undefined,
			effectiveUntil: effectiveUntil ? `${effectiveUntil}T00:00:00.000Z` : undefined,
			startsAt: utcWallClockInstantFromDateTimeInput(startsAt),
			endsAt: utcWallClockInstantFromDateTimeInput(endsAt),
			reason,
			isActive: rule?.isActive ?? true,
		});
		const ok = await teachersPage.saveUnavailability({
			rule: payload,
			successMessage: get(t)('teacher.availabilitySaved'),
		});
		busy = false;
		if (ok) {
			onSaved?.();
			open = false;
		}
	}
</script>

<FormModal
	bind:open
	title={rule ? $t('teacher.availabilityEdit') : $t('teacher.availabilityAdd')}
	description={$t('teacher.availabilityFormHint')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-secondary/30 p-1">
		<Button type="button" size="sm" variant={recurrence === 'weekly' ? 'default' : 'ghost'} onclick={() => (recurrence = 'weekly')}>
			{$t('teacher.availabilityWeekly')}
		</Button>
		<Button type="button" size="sm" variant={recurrence === 'one_off' ? 'default' : 'ghost'} onclick={() => (recurrence = 'one_off')}>
			{$t('teacher.availabilityOneOff')}
		</Button>
	</div>

	{#if recurrence === 'weekly'}
		<div class="space-y-1.5">
			<Label>{$t('teacher.availabilityDay')}</Label>
			<FilterSelect bind:value={dayOfWeek} options={[
				{ value: 'monday', label: $t('day.full.Mon') },
				{ value: 'tuesday', label: $t('day.full.Tue') },
				{ value: 'wednesday', label: $t('day.full.Wed') },
				{ value: 'thursday', label: $t('day.full.Thu') },
				{ value: 'friday', label: $t('day.full.Fri') },
			]} />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<label class="space-y-1.5 text-sm"><span>{$t('common.start')}</span><Input type="time" bind:value={startTime} /></label>
			<label class="space-y-1.5 text-sm"><span>{$t('common.end')}</span><Input type="time" bind:value={endTime} /></label>
			<label class="space-y-1.5 text-sm"><span>{$t('common.startDate')}</span><Input type="date" bind:value={effectiveFrom} /></label>
			<label class="space-y-1.5 text-sm"><span>{$t('common.endDate')}</span><Input type="date" bind:value={effectiveUntil} /></label>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<label class="space-y-1.5 text-sm"><span>{$t('common.start')}</span><Input type="datetime-local" bind:value={startsAt} /></label>
			<label class="space-y-1.5 text-sm"><span>{$t('common.end')}</span><Input type="datetime-local" bind:value={endsAt} /></label>
		</div>
	{/if}
	<label class="space-y-1.5 text-sm">
		<span>{$t('teacher.availabilityReason')}</span>
		<Input bind:value={reason} placeholder={$t('teacher.availabilityReasonPlaceholder')} />
	</label>
</FormModal>
