import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { AbsenceRecord, SchoolYearEvent } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { loadAbsences, loadCalendarEvents } from '$lib/api/school-life-data';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readCalendarListFilters, writeCalendarListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { queryClient } from '$lib/queries/client';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import { querySchoolCalendarPage } from './lib/calendar-queries';

const CALENDAR_VERSION_FAMILIES = ['schoolYearEvents'] as const satisfies readonly EntityVersionKey[];

const CALENDAR_PAGE_STATE_KEY = Symbol('calendar-page-state');

export class CalendarPageState {
	events = $state<SchoolYearEvent[]>([]);
	absences = $state<AbsenceRecord[]>([]);
	readonly filters: ListFiltersState<{ q: string; type: string }>;

	private readonly versions = new RouteVersionSnapshot(CALENDAR_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeCalendarListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readCalendarListFilters(getUrl()),
		);
	}

	seed(events: SchoolYearEvent[], absences: AbsenceRecord[]) {
		this.events = events;
		this.absences = absences;
		this.versions.markLoaded();
	}

	findEvent(eventId: string): SchoolYearEvent | undefined {
		return this.events.find(event => event.id === eventId);
	}

	appendEvent(event: SchoolYearEvent) {
		this.events = [...this.events.filter(entry => entry.id !== event.id), event];
	}

	removeEvent(eventId: string) {
		this.events = this.events.filter(event => event.id !== eventId);
	}

	patchEvent(eventId: string, patch: Partial<SchoolYearEvent>) {
		this.events = this.events.map(event =>
			event.id === eventId ? { ...event, ...patch } : event,
		);
	}

	queryListPage() {
		return querySchoolCalendarPage(this);
	}

	async refreshSlice() {
		const client = queryClient();
		const classIds = academicContext.classes.map(entry => entry.id);
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
		const [events, absences] = await Promise.all([
			loadCalendarEvents(client, academicContext.yearId, schoolId).catch((error) => {
				if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
					return this.events;
				}
				throw error;
			}),
			loadAbsences(client, classIds).catch((error) => {
				if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
					return [];
				}
				throw error;
			}),
		]);
		this.seed(events, absences);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}
}

export function setCalendarPageState(state: CalendarPageState) {
	setContext(CALENDAR_PAGE_STATE_KEY, state);
}

export function getCalendarPageState(): CalendarPageState {
	return getContext<CalendarPageState>(CALENDAR_PAGE_STATE_KEY);
}
