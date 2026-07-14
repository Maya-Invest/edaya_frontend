<script lang="ts">
	import type { Activity, PlanningEvent, SchoolYearEvent, Student, Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import AttendanceFlow from '$lib/components/school/scheduling/AttendanceFlow.svelte';
	import ClassTimetableCalendar from '$lib/components/school/scheduling/ClassTimetableCalendar.svelte';
	import NewSessionWizard from '$lib/components/school/scheduling/NewSessionWizard.svelte';
	import {
		activePlanningEvents,
		detectPlanningOverlaps,
		filterPlanningEventsForWeek,
		formatPlanningWeekRange,
		parseWeekAnchor,
	} from '$lib/components/school/scheduling/planning-calendar';
	import ScheduleFormModal from '$lib/components/school/scheduling/ScheduleFormModal.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { ChevronLeft, ChevronRight, Plus, Search } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { canEditTimetable } from '$lib/permissions';
	import { PlanningState, setPlanningState } from '$lib/scheduling/planning-state.svelte';
	import { cn } from '$lib/utils';

	const {
		classId,
		events: routeEvents,
		students: routeStudents,
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
	const classes = $derived(academicContext.classes);
	const students = $derived(routeStudents);

	const planning = new PlanningState(() => $page.url);
	setPlanningState(planning);

	const weekStart = $derived(planning.weekStart);
	const weekRange = $derived(formatPlanningWeekRange(weekStart, $locale));
	const viewingCurrentWeek = $derived(planning.viewingCurrentWeek());

	const editable = $derived(canEditTimetable({ classId }));

	const filteredEvents = $derived(planning.filterEvents(events));
	const weekEvents = $derived(
		activePlanningEvents(filterPlanningEventsForWeek(filteredEvents, weekStart)),
	);
	const planningOverlaps = $derived(detectPlanningOverlaps(weekEvents));

	const attendanceClass = $derived(
		planning.attendanceSession ? classes.find(c => c.id === planning.attendanceSession!.classId) : null,
	);
	const attendanceStudents = $derived(
		planning.attendanceSession
			? students.filter(s => s.classId === planning.attendanceSession!.classId)
			: [],
	);

	function handleWeekPickerChange(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		if (!value) {
			return;
		}
		planning.navigateWeek(parseWeekAnchor(value));
	}

	$effect(() => {
		planning.hydrateFromUrl($page.url);
	});

	let lastAppliedFocusDate = $state('');

	$effect(() => {
		if (!focusDate || focusDate === lastAppliedFocusDate) {
			return;
		}
		lastAppliedFocusDate = focusDate;
		planning.navigateWeek(new Date(`${focusDate}T12:00:00`));
	});

	$effect(() => {
		if (!planning.filters.ready || !selectedId) {
			return;
		}
		if (weekEvents.some(event => event.id === selectedId)) {
			return;
		}
		const href = `${detailHref.classPlanning(classId)}${$page.url.search}`;
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	});
</script>

<div class={cn('animate-fade-in', expandCalendar && 'flex min-h-0 flex-1 flex-col')}>
	<ListPageHeader
		eyebrow={$t('planning.weeklyBoard')}
		title={$t('planning.title')}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={planning.filters.values.q}
					oninput={() => planning.filters.scheduleSync()}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="TIMETABLE_UPDATE"
				mode="disable"
				tooltip={$t('calendar.permissionUpdate')}
			>
				{#snippet children({ disabled, title })}
					<div class="flex flex-wrap items-center gap-2">
						<NewSessionWizard
							{classId}
							{weekStart}
							bind:open={planning.wizardOpen}
							{disabled}
							{title}
							onCreated={async (sessionId) => {
								await onRefresh?.();
								appGoto(detailHref.classPlanning(classId, sessionId));
							}}
						/>
						<Button
							size="sm"
							variant="outline"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => planning.openScheduleCreate('lesson')}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('planning.newSchedule')}
						</Button>
					</div>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
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
				class="h-8 w-8 rounded-full"
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
					class="h-8 w-[10.5rem] rounded-full px-3 text-xs"
					aria-label={$t('planning.goToWeek')}
				/>
			</div>
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 rounded-full"
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
				class="rounded-full"
				onclick={() => planning.goToThisWeek()}
			>
				{$t('planning.thisWeek')}
			</Button>
		{/if}
	</div>

	{#if planningOverlaps.length > 0}
		<div
			class="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
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

	<ScheduleFormModal {classId} {weekStart} {subjects} {activities} defaultScheduleKind={planning.scheduleCreateKind} bind:open={planning.scheduleCreateOpen} onSaved={onRefresh} />

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
			onAttendance={planning.openAttendance}
			onChanged={onRefresh}
		/>
	</div>

	{#if planning.attendanceSession && attendanceClass}
		<AttendanceFlow
			open={true}
			onClose={() => (planning.attendanceSession = null)}
			students={attendanceStudents}
			className="{attendanceClass.name} · {planning.attendanceSession.subject}"
			classLevel="{$t(`day.${planning.attendanceSession.day}`)} {planning.attendanceSession.start}–{planning.attendanceSession.end}"
		/>
	{/if}
</div>
