import type { PlanningEventKind } from '$lib/types/school';
import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
import { buildLessonSessionSavePayload } from '$lib/api/lesson-session-save-payload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
import { queryClient } from '$lib/queries/client';
import { getContext, setContext } from 'svelte';
import { findPlanningEventById } from '$lib/api/planning-data';
import { runTimetableRouteMutation } from '../../../lib/timetable-route-mutation';
import { resolveTimetablePageLoad } from '../../../lib/timetable-page-status';
import {
	sessionDetailIdFromUrl,
	timetableClassIdFromUrl,
} from '../../../lib/timetable-helpers';
import type { TimetablePageState } from '../../../timetable-page.svelte';

const SESSION_ATTENDANCE_TAB_KEY = Symbol('session-attendance-tab');

export interface SessionAttendanceTabSlice {
	sessionId: string;
	attendance: SessionAttendanceRow[];
}

function emptySlice(sessionId: string): SessionAttendanceTabSlice {
	return { sessionId, attendance: [] };
}

export class SessionAttendanceTabState {
	slice = $state<SessionAttendanceTabSlice | null>(null);

	constructor(private readonly getPage: () => TimetablePageState) {}

	clear() {
		this.slice = null;
	}

	seed(sessionId: string, attendance: SessionAttendanceRow[]) {
		if (!this.slice || this.slice.sessionId !== sessionId) {
			this.slice = { ...emptySlice(sessionId), attendance };
			return;
		}
		this.slice = { ...this.slice, attendance };
	}

	attendanceFor(sessionId: string): SessionAttendanceRow[] {
		return this.slice?.sessionId === sessionId ? this.slice.attendance : [];
	}

	patchAttendance(sessionId: string, studentId: string, patch: Partial<SessionAttendanceRow>) {
		if (this.slice?.sessionId !== sessionId) {
			return;
		}
		this.slice = {
			...this.slice,
			attendance: this.slice.attendance.map(row =>
				row.studentId === studentId ? { ...row, ...patch } : row,
			),
		};
	}

	replaceAttendance(sessionId: string, attendance: SessionAttendanceRow[]) {
		if (this.slice?.sessionId !== sessionId) {
			return;
		}
		this.slice = { ...this.slice, attendance };
	}

	query() {
		return (url: URL) => resolveTimetablePageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const sessionId = sessionDetailIdFromUrl(url);
				const classId = timetableClassIdFromUrl(url);
				if (!sessionId || !classId) {
					return {};
				}

				const page = this.getPage();
				const session = page.selectedSession(classId, sessionId)
					?? findPlanningEventById(page.events, sessionId);
				if (!session) {
					return {};
				}

				const detail = await loadPlanningOccurrenceDetail(
					queryClient(),
					{ id: session.id, kind: session.kind },
				);
				if (detail) {
					this.seed(sessionId, detail.attendance);
				}
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load session attendance.',
		});
	}

	async recordStudentAttendance(input: {
		sessionId: string;
		kind?: PlanningEventKind;
		studentId: string;
		status: SessionAttendanceStatus;
		attendanceId?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const id = input.attendanceId ?? `${input.studentId}-${input.sessionId}`;
		const previous = this.attendanceFor(input.sessionId).find(row => row.studentId === input.studentId);
		const anchor = input.kind === 'activity'
			? { activitySessionId: input.sessionId }
			: input.kind === 'assessment'
				? { assessmentId: input.sessionId }
				: { lessonSessionId: input.sessionId };

		const result = await runTimetableRouteMutation({
			request: () => client.commands.recordAttendance({
				id,
				studentId: input.studentId,
				...anchor,
				status: input.status,
				createdAt: new Date().toISOString(),
			}),
			successMessage: input.successMessage,
			apply: () => {
				this.patchAttendance(input.sessionId, input.studentId, {
					attendanceId: id,
					status: input.status,
				});
			},
			rollback: () => {
				if (previous) {
					this.patchAttendance(input.sessionId, input.studentId, previous);
				}
			},
		});
		return result !== null;
	}

	async recordBulkAttendance(input: {
		sessionId: string;
		attendanceByStudent: Record<string, SessionAttendanceStatus>;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.attendanceFor(input.sessionId);

		const result = await runTimetableRouteMutation({
			request: () => client.commands.recordLessonSessionAttendance({
				lessonSessionId: input.sessionId,
				attendanceByStudent: input.attendanceByStudent,
				createdAt: new Date().toISOString(),
			}),
			successMessage: input.successMessage,
			apply: () => {
				for (const [studentId, status] of Object.entries(input.attendanceByStudent)) {
					this.patchAttendance(input.sessionId, studentId, { status });
				}
			},
			rollback: () => {
				this.replaceAttendance(input.sessionId, previous);
			},
		});
		return result !== null;
	}
}

export function setSessionAttendanceTabState(state: SessionAttendanceTabState) {
	setContext(SESSION_ATTENDANCE_TAB_KEY, state);
}

export function getSessionAttendanceTabState() {
	return getContext<SessionAttendanceTabState>(SESSION_ATTENDANCE_TAB_KEY);
}
