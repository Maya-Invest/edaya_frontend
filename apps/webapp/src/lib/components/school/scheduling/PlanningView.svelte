<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { ChevronLeft, ChevronRight, Plus, Search } from '$lib/icons';
	import { readPlanningListFilters, writePlanningListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { canEditTimetable } from '$lib/permissions';
	import AttendanceFlow from './AttendanceFlow.svelte';
	import ClassTimetableCalendar from './ClassTimetableCalendar.svelte';
	import {
		filterPlanningEventsForWeek,
		formatPlanningWeekRange,
		formatWeekAnchor,
		isCurrentWeek,
		mondayOfWeek,
		parseWeekAnchor,
		shiftWeek,
	} from './planning-calendar';
	import PlanningFormModal from './PlanningFormModal.svelte';
	import ScheduleFormModal from './ScheduleFormModal.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (e: PlanningEvent) => void;
		selectedId?: string;
	} = $props();

	const events = $derived(detailDataContext.planningForClass(classId));
	const classes = $derived(academicContext.classes);
	const students = $derived(detailDataContext.studentsForClass(classId));

	const initialFilters = $derived(readPlanningListFilters($page.url));
	const weekStart = $derived(parseWeekAnchor(initialFilters.week));
	const weekRange = $derived(formatPlanningWeekRange(weekStart, $locale));
	const viewingCurrentWeek = $derived(isCurrentWeek(weekStart));

	let q = $state('');
	let weekPickerValue = $state('');
	let filtersReady = $state(false);
	let attendanceSession = $state<PlanningEvent | null>(null);
	let createOpen = $state(false);
	let scheduleCreateOpen = $state(false);

	const editable = $derived(canEditTimetable({ classId }));

	const filteredEvents = $derived(
		events.filter((ev) => {
			const needle = q.trim().toLowerCase();
			if (!needle)
				return true;
			return ev.title.toLowerCase().includes(needle)
				|| ev.subject.toLowerCase().includes(needle)
				|| ev.teacher.toLowerCase().includes(needle)
				|| ev.room.toLowerCase().includes(needle);
		}),
	);
	const weekEvents = $derived(filterPlanningEventsForWeek(filteredEvents, weekStart));

	const attendanceClass = $derived(
		attendanceSession ? classes.find(c => c.id === attendanceSession!.classId) : null,
	);
	const attendanceStudents = $derived(
		attendanceSession ? students.filter(s => s.classId === attendanceSession!.classId) : [],
	);

	function handleCreated(sessionId: string) {
		const path = detailHref.classPlanning(classId, sessionId);
		const href = `${path}${$page.url.search}`;
		if ($page.url.pathname === path) {
			return;
		}
		appGoto(href);
	}

	function syncFiltersToUrl() {
		const href = writePlanningListFilters($page.url, {
			q,
			week: viewingCurrentWeek ? '' : formatWeekAnchor(weekStart),
		});
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function navigateWeek(nextWeekStart: Date) {
		const href = writePlanningListFilters($page.url, {
			q,
			week: isCurrentWeek(nextWeekStart) ? '' : formatWeekAnchor(nextWeekStart),
		});
		appGoto(href, { keepFocus: true, noScroll: true });
	}

	function goToPreviousWeek() {
		navigateWeek(shiftWeek(weekStart, -1));
	}

	function goToNextWeek() {
		navigateWeek(shiftWeek(weekStart, 1));
	}

	function goToThisWeek() {
		navigateWeek(mondayOfWeek(new Date()));
	}

	function handleWeekPickerChange(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		if (!value) {
			return;
		}
		navigateWeek(parseWeekAnchor(value));
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		weekPickerValue = formatWeekAnchor(parseWeekAnchor(next.week));
		filtersReady = true;
	});

	$effect(() => {
		if (!filtersReady || !selectedId) {
			return;
		}
		if (weekEvents.some(event => event.id === selectedId)) {
			return;
		}
		const href = `${detailHref.classPlanning(classId)}${$page.url.search}`;
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}
</script>

<div class="animate-fade-in">
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
					bind:value={q}
					oninput={scheduleFilterSync}
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
						<Button
							size="sm"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => (scheduleCreateOpen = true)}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('planning.newSchedule')}
						</Button>
						<Button
							size="sm"
							variant="outline"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => (createOpen = true)}
						>
							<Plus class="mr-1 h-4 w-4" />
							{$t('planning.newSession')}
						</Button>
					</div>
				{/snippet}
			</PermissionGate>
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
				onclick={goToPreviousWeek}
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
					value={weekPickerValue}
					onchange={handleWeekPickerChange}
					class="h-8 w-[10.5rem] rounded-full px-3 text-xs"
					aria-label={$t('planning.goToWeek')}
				/>
			</div>
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 rounded-full"
				onclick={goToNextWeek}
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
				onclick={goToThisWeek}
			>
				{$t('planning.thisWeek')}
			</Button>
		{/if}
	</div>

	<ScheduleFormModal {classId} {weekStart} bind:open={scheduleCreateOpen} />
	<PlanningFormModal {classId} weekStart={weekStart} bind:open={createOpen} onCreated={handleCreated} />

	<ClassTimetableCalendar
		events={weekEvents}
		{selectedId}
		{weekStart}
		{editable}
		{onSelect}
		onAttendance={ev => (attendanceSession = ev)}
	/>

	{#if attendanceSession && attendanceClass}
		<AttendanceFlow
			open={true}
			onClose={() => (attendanceSession = null)}
			students={attendanceStudents}
			className="{attendanceClass.name} · {attendanceSession.subject}"
			classLevel="{$t(`day.${attendanceSession.day}`)} {attendanceSession.start}–{attendanceSession.end}"
		/>
	{/if}
</div>
