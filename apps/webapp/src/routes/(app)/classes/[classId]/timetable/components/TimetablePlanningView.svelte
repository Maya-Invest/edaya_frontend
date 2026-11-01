<script lang="ts">
	import type { Activity, PlanningEvent, SchoolYearEvent, Student, Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';

	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { ChevronLeft, ChevronRight, Plus } from '$lib/icons';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { canEditTimetable, hasPermission } from '$lib/permissions';
	import {
		activePlanningEvents,
		detectPlanningOverlaps,
		filterPlanningEventsForWeek,
		formatPlanningWeekRange,
		parseWeekAnchor,
	} from '$lib/scheduling/planning-calendar';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getPlanningState } from '../planning-state.svelte';
	import ClassTimetableCalendar from './ClassTimetableCalendar.svelte';
	import NewSessionWizard from './NewSessionWizard.svelte';
	import ScheduleFormModal from './ScheduleFormModal.svelte';

	const {
		classId,
		events: routeEvents,
		subjects,
		activities,
		schoolYearEvents = [],
		focusDate,
		expandCalendar = false,
		onRefresh,
		onSelect,
		selectedId,
	}: {
		classId: string;
		events: PlanningEvent[];
		students: Student[];
		subjects: Subject[];
		activities: Activity[];
		schoolYearEvents?: SchoolYearEvent[];
		focusDate?: string;
		expandCalendar?: boolean;
		onRefresh?: () => Promise<void>;
		onSelect?: (e: PlanningEvent) => void;
		selectedId?: string;
	} = $props();

	const events = $derived(routeEvents);

	const planning = getPlanningState();
	const newSessionOpen = bindUrlModal(planning.modals, 'new-session');
	const scheduleCreateOpen = bindUrlModal(planning.modals, 'create-schedule');

	const weekStart = $derived(planning.weekStart);
	const weekRange = $derived(formatPlanningWeekRange(weekStart, $locale));
	const viewingCurrentWeek = $derived(planning.viewingCurrentWeek());

	const editable = $derived(canEditTimetable({ classId }));
	const canRecordAttendance = $derived(academicContext.classes.find(row => row.id === classId)?.attendanceMode === 'session' && hasPermission('ATTENDANCE_RECORD', { classId }));

	const filteredEvents = $derived(planning.filterEvents(events));
	const weekEvents = $derived(
		activePlanningEvents(filterPlanningEventsForWeek(filteredEvents, weekStart)),
	);
	const planningOverlaps = $derived(detectPlanningOverlaps(weekEvents));

	function handleWeekPickerChange(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		if (!value) {
			return;
		}
		planning.navigateWeek(parseWeekAnchor(value));
	}

	let lastAppliedFocusDate = $state('');

	$effect(() => {
		if (!focusDate || focusDate === lastAppliedFocusDate) {
			return;
		}
		lastAppliedFocusDate = focusDate;
		planning.navigateWeek(new Date(`${focusDate}T12:00:00`));
	});

</script>

<div class={cn('animate-fade-in', expandCalendar && 'flex min-h-0 flex-1 flex-col')}>
	<ListPageHeader
		eyebrow={$t('planning.weeklyBoard')}
		title={$t('planning.title')}
	>
		{#snippet search()}
			<ListSearchField bind:value={planning.filters.values.q} oninput={() => planning.filters.scheduleSync()} />
		{/snippet}
		{#snippet context()}
			<AcademicPeriodSelector />
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="TIMETABLE_MANAGE"
				{classId}
				mode="disable"
				tooltip={$t('calendar.permissionUpdate')}
			>
				{#snippet children({ disabled, title })}
					<div class="flex flex-wrap items-center gap-2">
						{#key newSessionOpen.open}
							<NewSessionWizard
								{classId}
								{weekStart}
								{subjects}
								{activities}
								bind:open={newSessionOpen.open}
								step={planning.newSessionStep}
								onOpen={() => planning.openNewSession()}
								onStepChange={(step, replace) =>
									replace ? planning.replaceStep(step) : planning.setStep(step)}
								{disabled}
								{title}
								onCreated={async (sessionId) => {
									await onRefresh?.();
									openDetailDrawer(
										detailHref.classPlanning(classId, sessionId),
										currentRouteSurfaceHref($page.url),
									);
								}}
							/>
						{/key}
						<Button
							size="sm"
							variant="outline"

							{disabled}
							{title}
							onclick={() => planning.openScheduleCreate()}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('planning.newSchedule')}
						</Button>
					</div>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly exportLabel={$t('documents.exportTimetable')} onExport={() => void planning.performRequestDocumentIssuance({
				templateKey: 'class-timetable.v1',
				sourceId: classId,
				classGroupId: classId,
				successMessage: get(t)('documents.toastRequested'),
			})} />
		{/snippet}
	</ListPageHeader>

	{#if editable}
		<p class="mb-4 text-xs text-muted-foreground">{$t('planning.dragHint')}</p>
	{/if}

	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
			<Button
				variant="ghost"
				size="icon"
				class="w-8"
				onclick={() => planning.goToPreviousWeek()}
				aria-label={$t('planning.prevWeek')}
			>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<div class="flex min-w-0 items-center gap-2 px-2">
				<p class="hidden text-sm font-medium sm:block">
					{$t('planning.weekRange', weekRange)}
				</p>
				<label class="sr-only" for="planning-week-picker">{$t('planning.goToWeek')}</label>
				<Input
					id="planning-week-picker"
					type="date"
					value={planning.weekPickerValue}
					onchange={handleWeekPickerChange}
					class="w-[10.5rem] text-xs"
					aria-label={$t('planning.goToWeek')}
				/>
			</div>
			<Button
				variant="ghost"
				size="icon"
				class="w-8"
				onclick={() => planning.goToNextWeek()}
				aria-label={$t('planning.nextWeek')}
			>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
		{#if !viewingCurrentWeek}
			<Button
				variant="outline"
				size="sm"

				onclick={() => planning.goToThisWeek()}
			>
				{$t('planning.thisWeek')}
			</Button>
		{/if}
	</div>

	{#if planningOverlaps.length > 0}
		<div
			class="mb-4 rounded-collection border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
			role="status"
		>
			<p class="font-medium">{$t('planning.overlapWarning', { count: planningOverlaps.length })}</p>
			<ul class="mt-2 space-y-1 text-xs text-muted-foreground">
				{#each planningOverlaps.slice(0, 3) as overlap (overlap.left.id + overlap.right.id)}
					<li>
						{$t('planning.overlapPair', {
							left: `${overlap.left.subject} (${overlap.left.start}–${overlap.left.end})`,
							right: `${overlap.right.subject} (${overlap.right.start}–${overlap.right.end})`,
						})}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<ScheduleFormModal
		{classId}
		{weekStart}
		{subjects}
		{activities}
		defaultScheduleKind="lesson"
		bind:open={scheduleCreateOpen.open}
		onSaved={onRefresh}
	/>

	<div class={cn(expandCalendar && 'min-h-0 flex-1')}>
		<ClassTimetableCalendar
			{expandCalendar}
			events={weekEvents}
			{schoolYearEvents}
			{classId}
			{selectedId}
			{weekStart}
			{editable}
			{onSelect}
			onAttendance={canRecordAttendance ? planning.openAttendance : undefined}
			rescheduleOpen={planning.modals.isOpen('reschedule')}
			rescheduleTarget={planning.modals.target}
			onRescheduleRequest={eventId => planning.openReschedule(eventId)}
			onInvalidReschedule={() => planning.closeInvalidSurface()}
			onRescheduleClose={() => planning.modals.close()}
			onChanged={onRefresh}
		/>
	</div>

</div>
