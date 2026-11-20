import type { PlanningEvent, PlanningEventKind } from '$lib/types/school';
import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
import type { PageQueryRequest } from '../../../lib/timetable-page-status';
import type { TimetablePageState } from '../../../timetable-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { findPlanningEventById } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
import { authSession } from '$lib/auth/session.svelte';
import { nowIso } from '$lib/date/format';
import { hasPermission } from '$lib/permissions';
import { queryClient } from '$lib/queries/client';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import {
	sessionDetailIdFromUrl,
	timetableClassIdFromUrl,
} from '../../../lib/timetable-helpers';
import { resolveTimetablePageLoad } from '../../../lib/timetable-page-status';
import { runTimetableRouteMutation } from '../../../lib/timetable-route-mutation';

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
	private readEpoch = 0;
	private pending = new SvelteSet<string>();

	constructor(private readonly getPage: () => TimetablePageState) {}

	get scope() {
		return `${authSession.userId}|${academicContext.schoolScopeId}|${academicContext.yearId}|${this.getPage().classId}`;
	}

	get dailyMode() {
		return academicContext.classes.find(row => row.id === this.getPage().classId)?.attendanceMode === 'daily';
	}

	canRecord(sessionId: string, kind: PlanningEventKind = 'lesson') {
		const page = this.getPage();
		const session = page.selectedSession(page.classId, sessionId);
		return !!session && session.classId === page.classId && session.kind === kind
			&& academicContext.classes.find(row => row.id === page.classId)?.attendanceMode === 'session'
			&& hasPermission('ATTENDANCE_RECORD', { classId: page.classId });
	}

	async loadRoster(session: PlanningEvent) {
		if (!this.canRecord(session.id, session.kind))
throw new ApiError(403, {});
		const scope = this.scope;
		const detail = await loadPlanningOccurrenceDetail(queryClient(), session, { attendanceOnly: true });
		if (scope !== this.scope || !detail || detail.classGroupId !== this.getPage().classId)
return null;
		this.seed(session.id, detail.attendance);
		return detail.attendance;
	}

	clear() {
		this.readEpoch += 1;
		this.slice = null;
	}

	seed(sessionId: string, attendance: SessionAttendanceRow[]) {
		this.readEpoch += 1;
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
		return (url: URL, request?: PageQueryRequest) => resolveTimetablePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
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
					{ attendanceOnly: true },
				);
				if (!detail || detail.classGroupId !== classId)
throw new ApiError(404, {});
				if (detail) {
					signal.throwIfAborted();
					this.seed(sessionId, detail.attendance);
				}
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load session attendance.',
		}, request);
	}

	async recordStudentAttendance(input: {
		sessionId: string;
		kind?: PlanningEventKind;
		studentId: string;
		status: SessionAttendanceStatus;
		attendanceId?: string;
		successMessage?: string;
	}): Promise<boolean> {
		if (!this.canRecord(input.sessionId, input.kind) || !this.attendanceFor(input.sessionId).some(row => row.studentId === input.studentId))
return false;
		const scope = this.scope;
		const epoch = this.readEpoch;
		const client = getBrowserSchoolClient();
		const previous = this.attendanceFor(input.sessionId).find(row => row.studentId === input.studentId);
		const id = previous?.attendanceId ?? `${input.studentId}-${input.sessionId}`;
		const pendingKey = `${scope}|${input.sessionId}|${input.studentId}`;
		if (this.pending.has(pendingKey))
return false;
		this.pending.add(pendingKey);
		const anchor = input.kind === 'activity'
			? { activitySessionId: input.sessionId }
			: input.kind === 'assessment'
				? { assessmentId: input.sessionId }
				: { lessonSessionId: input.sessionId };

		let result;
		try {
 result = await runTimetableRouteMutation({
			request: () => client.commands.recordAttendance({
				id,
				studentId: input.studentId,
				...anchor,
				status: input.status,
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage,
			apply: () => {
				this.patchAttendance(input.sessionId, input.studentId, {
					attendanceId: id,
					status: input.status,
				});
			},
			rollback: () => {
				if (previous && scope === this.scope && epoch === this.readEpoch) {
					this.patchAttendance(input.sessionId, input.studentId, { ...previous, attendanceId: previous.attendanceId, status: previous.status });
				}
			},
		});
}
 finally { this.pending.delete(pendingKey); }
		return result !== null;
	}

	async recordBulkAttendance(input: {
		sessionId: string;
		attendanceByStudent: Record<string, SessionAttendanceStatus>;
		successMessage?: string;
	}): Promise<boolean> {
		const previous = this.attendanceFor(input.sessionId);
		if (!this.canRecord(input.sessionId, 'lesson') || !Object.keys(input.attendanceByStudent).length
			|| Object.keys(input.attendanceByStudent).some(id => !previous.some(row => row.studentId === id))) {
 return false;
}
		const scope = this.scope;
		const epoch = this.readEpoch;
		const client = getBrowserSchoolClient();

		const pendingKeys = Object.keys(input.attendanceByStudent).map(id => `${scope}|${input.sessionId}|${id}`);
		if (pendingKeys.some(key => this.pending.has(key)))
return false;
		pendingKeys.forEach(key => this.pending.add(key));
		let result;
		try {
 result = await runTimetableRouteMutation({
			request: () => client.commands.recordLessonSessionAttendance({
				lessonSessionId: input.sessionId,
				attendanceByStudent: input.attendanceByStudent,
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage,
			onSuccess: (rows) => {
				if (scope !== this.scope || epoch !== this.readEpoch)
return;
				for (const row of rows) this.patchAttendance(input.sessionId, row.studentId, { attendanceId: row.id, status: row.status as SessionAttendanceStatus });
			},
			apply: () => {
				for (const [studentId, status] of Object.entries(input.attendanceByStudent)) {
					this.patchAttendance(input.sessionId, studentId, { status });
				}
			},
			rollback: () => {
				if (scope === this.scope && epoch === this.readEpoch)
this.replaceAttendance(input.sessionId, previous);
			},
		});
}
 finally { pendingKeys.forEach(key => this.pending.delete(key)); }
		return result !== null;
	}
}

export function setSessionAttendanceTabState(state: SessionAttendanceTabState) {
	setContext(SESSION_ATTENDANCE_TAB_KEY, state);
}

export function getSessionAttendanceTabState() {
	return getContext<SessionAttendanceTabState>(SESSION_ATTENDANCE_TAB_KEY);
}
