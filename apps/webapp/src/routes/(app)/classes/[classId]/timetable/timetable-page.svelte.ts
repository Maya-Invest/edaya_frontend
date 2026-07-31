import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PlanningEvent } from '$lib/types/school';
import type { TimetablePageSlice } from './lib';
import { academicContext } from '$lib/academic/context.svelte';
import { academicYearPlanningRange } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadCalendarEvents } from '$lib/api/school-life-data';
import { formatDateInput } from '$lib/date/format';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	emptyTimetableSlice,
	loadTimetableSlice,
	queryTimetableListPage,
	sessionDetailIdFromUrl,
	timetableClassIdFromUrl,

} from './lib';

export type TimetableGenerationOptions = components['schemas']['TimetableGenerationOptions'];
export type { TimetablePageSlice };

const TIMETABLE_VERSION_FAMILIES = ['planning'] as const satisfies readonly EntityVersionKey[];
const KEY = Symbol('timetable-page-state');

export class TimetablePageState {
	slice = $state<TimetablePageSlice | null>(null);
	busy = $state(false);
	focusDate = $state('');
	activeRange = $state<{ startDate: string; endDate: string } | null>(null);
	private readonly versions = new RouteVersionSnapshot(TIMETABLE_VERSION_FAMILIES);

	constructor(
		private readonly getUrl: () => URL,
		private readonly getClassId: () => string,
	) {}

	get classId() {
		return this.getClassId();
	}

	get selectedId() {
		return sessionDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		return this.selectedSession(this.classId, this.selectedId);
	}

	private canLoad(): boolean {
		return Boolean(this.classId && academicContext.shellReady);
	}

	get academicYearRange() {
		return academicYearPlanningRange(academicContext.year);
	}

	get periodRange() {
		if (this.activeRange) {
			return this.activeRange;
		}
		const period = academicContext.period;
		const year = academicContext.year;
		return {
			startDate: formatDateInput(period?.startDate ?? year?.startDate),
			endDate: formatDateInput(period?.endDate ?? year?.endDate),
		};
	}

	get events() {
		return this.slice?.classId === this.classId ? this.slice.events : [];
	}

	get schedules() {
		return this.slice?.classId === this.classId ? this.slice.schedules : [];
	}

	get students() {
		return this.slice?.classId === this.classId ? this.slice.students : [];
	}

	get subjects() {
		return this.slice?.classId === this.classId ? this.slice.subjects : [];
	}

	get activities() {
		return this.slice?.classId === this.classId ? this.slice.activities : [];
	}

	get schoolYearEvents() {
		return this.slice?.classId === this.classId ? this.slice.schoolYearEvents : [];
	}

	applySlice(classId: string, data: Partial<Omit<TimetablePageSlice, 'classId'>>) {
		this.slice = { ...emptyTimetableSlice(classId), ...data, classId };
		this.versions.markLoaded();
	}

	seed(classId: string, data: Partial<Omit<TimetablePageSlice, 'classId'>>) {
		if (this.slice?.classId === classId) {
			return;
		}
		this.applySlice(classId, data);
	}

	selectedSession(classId: string, sessionId?: string) {
		if (!sessionId || this.slice?.classId !== classId) {
			return undefined;
		}
		return this.slice.events.find(event => event.id === sessionId);
	}

	patchEvent(id: string, patch: Partial<PlanningEvent>) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			events: this.slice.events.map(event => event.id === id ? { ...event, ...patch } : event),
		};
	}

	queryListPage(classId: string) {
		return queryTimetableListPage(classId);
	}

	async invalidateIfStale() {
		if (!this.versions.hasLoaded() || !this.versions.isStale() || !this.canLoad()) {
			return;
		}
		try {
			await this.refresh({ silent: true });
		}
		catch {
			// PageQuery remains the source of truth on first paint; ignore background invalidation errors.
		}
	}

	async refresh(options?: { silent?: boolean }) {
		if (!this.canLoad()) {
			return;
		}
		try {
			const data = await loadTimetableSlice(this.classId);
			const yearId = academicContext.yearId;
			const schoolYearEvents = yearId
				? await loadCalendarEvents(getBrowserSchoolClient(), yearId)
				: data.schoolYearEvents;
			this.applySlice(this.classId, { ...data, schoolYearEvents });
		}
		catch (error) {
			if (!options?.silent) {
				throw error;
			}
		}
	}
}

export function setTimetablePageState(state: TimetablePageState) {
	setContext(KEY, state);
}

export function getTimetablePageState() {
	return getContext<TimetablePageState>(KEY);
}

export { timetableClassIdFromUrl };
