import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { SchoolYearEvent } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { loadCalendarEvents } from '$lib/api/school-life-data';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readCalendarListFilters, writeCalendarListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { queryClient } from '$lib/queries/client';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import { createCalendarEventOnPage, updateCalendarEventOnPage, deleteCalendarEventOnPage } from './lib/calendar-mutations';
import { querySchoolCalendarPage } from './lib/calendar-queries';

const CALENDAR_VERSION_FAMILIES = ['schoolYearEvents'] as const satisfies readonly EntityVersionKey[];

const CALENDAR_PAGE_STATE_KEY = Symbol('calendar-page-state');

export class CalendarPageState {
	createCalendarEvent = (...args: Parameters<typeof createCalendarEventOnPage> extends [unknown, ...infer Rest] ? Rest : never) => createCalendarEventOnPage(this, ...args);

	updateCalendarEvent = (...args: Parameters<typeof updateCalendarEventOnPage> extends [unknown, ...infer Rest] ? Rest : never) => updateCalendarEventOnPage(this, ...args);

	deleteCalendarEvent = (...args: Parameters<typeof deleteCalendarEventOnPage> extends [unknown, ...infer Rest] ? Rest : never) => deleteCalendarEventOnPage(this, ...args);

	events = $state<SchoolYearEvent[]>([]);
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

	seed(events: SchoolYearEvent[]) {
		this.events = events;
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

	async refreshSlice(signal?: AbortSignal) {
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
		const yearId = academicContext.yearId;
		let events: SchoolYearEvent[];
		try {
			events = await loadCalendarEvents(queryClient(), yearId, schoolId, signal);
		}
		catch (error) {
			if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
				throw error;
			}
			events = [];
		}
		signal?.throwIfAborted();
		if (yearId === academicContext.yearId && schoolId === (authSession.schoolId ?? academicContext.schools[0]?.id ?? '')) {
			this.seed(events);
		}
	}

	async invalidateIfStale() {
		if (!this.versions.hasLoaded() || !this.versions.isStale()) {
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
