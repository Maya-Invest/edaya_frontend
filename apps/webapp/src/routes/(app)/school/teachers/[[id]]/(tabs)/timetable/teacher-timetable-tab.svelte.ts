import type { PageQueryRequest } from '../../../lib/teacher-page-status';
import type { TeacherTimetableContext, TeacherTimetableEvent } from '../../../lib/teacher-timetable';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { formatDateInput } from '$lib/date/format';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { getContext, setContext } from 'svelte';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';
import { teacherTimetableContextKey, teacherTimetableDays, teacherTimetableQueryRange, validTimetableDate } from '../../../lib/teacher-timetable';

const TEACHER_TIMETABLE_TAB_KEY = Symbol('teacher-timetable-tab');

export interface TeacherTimetableTabSlice {
	teacherId: string;
	contextKey: string;
	events: TeacherTimetableEvent[];
}

export class TeacherTimetableTabState {
	slice = $state<TeacherTimetableTabSlice | null>(null);
	private loadVersion = 0;
	private readonly versionedQuery = new VersionedRouteQuery(new RouteVersionSnapshot(['planning', 'teachers', 'subjects']));
	invalidateIfStale = () => this.versionedQuery.invalidateIfStale();

	constructor(private readonly getPage: () => TeachersPageState) {}

	context(): TeacherTimetableContext | null {
		const scope = this.getPage().teacherScope();
		const year = academicContext.years.find(row => row.id === scope.academicYearId && row.schoolId === scope.schoolId);
		const school = academicContext.schools.find(row => row.id === scope.schoolId);
		const startDate = formatDateInput(year?.startDate);
		const endDate = formatDateInput(year?.endDate);
		if (!validTimetableDate(startDate) || !validTimetableDate(endDate) || startDate > endDate)
			return null;
		return { ...scope, startDate, endDate, timeZone: school?.timeZone || 'UTC' };
	}

	clear() {
		this.loadVersion += 1;
		this.versionedQuery.clear();
		this.slice = null;
	}

	eventsFor(teacherId: string): TeacherTimetableEvent[] {
		const context = this.context();
		return context && this.slice?.teacherId === teacherId && this.slice.contextKey === teacherTimetableContextKey(context) ? this.slice.events : [];
	}

	query() {
		return this.versionedQuery.track((url: URL, request?: PageQueryRequest) => resolveTeacherPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const version = ++this.loadVersion;
				const teacherId = teacherDetailIdFromUrl(url);
				const context = this.context();
				if (!teacherId || !context) {
					this.slice = null;
					return {};
				}
				const contextKey = teacherTimetableContextKey(context);
				const timetable = await getBrowserSchoolClient().queries.getTeacherTimetable({ teacherId, ...teacherTimetableQueryRange(context) });
				signal.throwIfAborted();
				const current = this.context();
				if (version !== this.loadVersion || !current || contextKey !== teacherTimetableContextKey(current))
					return {};
				this.slice = {
					teacherId,
					contextKey,
					events: teacherTimetableDays(timetable.events ?? [], context).flatMap(day => day.events),
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load teacher timetable.',
		}, request));
	}
}

export function setTeacherTimetableTabState(state: TeacherTimetableTabState) {
	setContext(TEACHER_TIMETABLE_TAB_KEY, state);
}

export function getTeacherTimetableTabState() {
	return getContext<TeacherTimetableTabState>(TEACHER_TIMETABLE_TAB_KEY);
}
