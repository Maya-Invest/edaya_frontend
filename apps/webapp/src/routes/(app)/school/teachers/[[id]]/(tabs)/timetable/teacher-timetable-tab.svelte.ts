import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '../../../lib/teacher-page-status';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import {
	formatWeekAnchor,
	parseWeekAnchor,
	weekDateRange,
} from '$lib/scheduling/planning-calendar';
import { getContext, setContext } from 'svelte';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';

type TimetableEvent = components['schemas']['TimetableEvent'];

const TEACHER_TIMETABLE_TAB_KEY = Symbol('teacher-timetable-tab');

export interface TeacherTimetableTabSlice {
	teacherId: string;
	week: string;
	events: TimetableEvent[];
}

export class TeacherTimetableTabState {
	slice = $state<TeacherTimetableTabSlice | null>(null);

	constructor(private readonly getPage: () => TeachersPageState) {}

	clear() {
		this.slice = null;
	}

	eventsFor(teacherId: string, week: string): TimetableEvent[] {
		return this.slice?.teacherId === teacherId && this.slice.week === week ? this.slice.events : [];
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolveTeacherPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const teacherId = teacherDetailIdFromUrl(url);
				if (!teacherId) {
					return {};
				}
				this.getPage();
				const weekStart = parseWeekAnchor(url.searchParams.get('week') ?? undefined);
				const week = formatWeekAnchor(weekStart);
				const range = weekDateRange(weekStart);
				const timetable = await getBrowserSchoolClient().queries.getTeacherTimetable({
					teacherId,
					startDate: range.start,
					endDate: range.end,
				});
				signal.throwIfAborted();
				this.slice = {
					teacherId,
					week,
					events: timetable.events ?? [],
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load teacher timetable.',
		}, request);
	}
}

export function setTeacherTimetableTabState(state: TeacherTimetableTabState) {
	setContext(TEACHER_TIMETABLE_TAB_KEY, state);
}

export function getTeacherTimetableTabState() {
	return getContext<TeacherTimetableTabState>(TEACHER_TIMETABLE_TAB_KEY);
}
