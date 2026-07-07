import type { PlanningEvent, TimetableScheduleKind } from '$lib/types/school';
import {
	formatWeekAnchor,
	isCurrentWeek,
	mondayOfWeek,
	parseWeekAnchor,
	shiftWeek,
	todayDate,
} from '$lib/components/school/scheduling/planning-calendar';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readPlanningListFilters, writePlanningListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';

const PLANNING_STATE_KEY = Symbol('planning-state');

export class PlanningState {
	readonly filters: ListFiltersState<{ q: string; week: string }>;

	attendanceSession = $state<PlanningEvent | null>(null);
	scheduleCreateOpen = $state(false);
	scheduleCreateKind = $state<TimetableScheduleKind>('lesson');
	wizardOpen = $state(false);
	weekPickerValue = $state('');

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl: () => this.getUrl(),
				write: writePlanningListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readPlanningListFilters(this.getUrl()),
		);
	}

	get weekStart(): Date {
		return parseWeekAnchor(this.filters.values.week);
	}

	viewingCurrentWeek(): boolean {
		return isCurrentWeek(this.weekStart);
	}

	filterEvents(events: readonly PlanningEvent[]): PlanningEvent[] {
		const needle = this.filters.values.q.trim().toLowerCase();
		if (!needle) {
			return [...events];
		}
		return events.filter(ev =>
			ev.title.toLowerCase().includes(needle)
			|| ev.subject.toLowerCase().includes(needle)
			|| ev.teacher.toLowerCase().includes(needle)
			|| ev.room.toLowerCase().includes(needle),
		);
	}

	hydrateFromUrl(url: URL) {
		const next = readPlanningListFilters(url);
		this.filters.hydrate(next);
		this.weekPickerValue = formatWeekAnchor(parseWeekAnchor(next.week));
	}

	navigateWeek(nextWeekStart: Date) {
		const href = writePlanningListFilters(this.getUrl(), {
			q: this.filters.values.q,
			week: isCurrentWeek(nextWeekStart) ? '' : formatWeekAnchor(nextWeekStart),
		});
		appGoto(href, { keepFocus: true, noScroll: true });
	}

	goToPreviousWeek() {
		this.navigateWeek(shiftWeek(this.weekStart, -1));
	}

	goToNextWeek() {
		this.navigateWeek(shiftWeek(this.weekStart, 1));
	}

	goToThisWeek() {
		this.navigateWeek(mondayOfWeek(todayDate()));
	}

	openScheduleCreate(kind: TimetableScheduleKind) {
		this.scheduleCreateKind = kind;
		this.scheduleCreateOpen = true;
	}

	openAttendance(event: PlanningEvent) {
		this.attendanceSession = event;
	}
}

export function setPlanningState(state: PlanningState) {
	setContext(PLANNING_STATE_KEY, state);
}

export function getPlanningState(): PlanningState {
	return getContext<PlanningState>(PLANNING_STATE_KEY);
}
