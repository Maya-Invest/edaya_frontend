import type { AttendanceDay } from '$lib/types/school';
import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';
import type { AttendancePageState } from '../attendance-page.svelte';
import { loadAttendanceDayDetail } from '$lib/api/attendance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { nowIso } from '$lib/date/format';
import { t } from '$lib/i18n';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import {
	attendanceClassIdFromUrl,
	attendanceDayDetailIdFromUrl,
} from '../lib/attendance-helpers';
import { runAttendanceRouteMutation } from '../lib/attendance-route-mutation';

const ATTENDANCE_DAY_DETAIL_KEY = Symbol('attendance-day-detail');

export interface AttendanceDayDetailSlice {
	occurrenceId: string;
	attendance: SessionAttendanceRow[];
}

function emptySlice(occurrenceId: string): AttendanceDayDetailSlice {
	return { occurrenceId, attendance: [] };
}

export class AttendanceDayDetailState {
	slice = $state<AttendanceDayDetailSlice | null>(null);

	constructor(private readonly getPage: () => AttendancePageState) {}

	clear() {
		this.slice = null;
	}

	seed(occurrenceId: string, attendance: SessionAttendanceRow[]) {
		if (!this.slice || this.slice.occurrenceId !== occurrenceId) {
			this.slice = { ...emptySlice(occurrenceId), attendance };
			return;
		}
		this.slice = { ...this.slice, attendance };
	}

	attendanceFor(occurrenceId: string): SessionAttendanceRow[] {
		return this.slice?.occurrenceId === occurrenceId ? this.slice.attendance : [];
	}

	patchAttendance(occurrenceId: string, studentId: string, patch: Partial<SessionAttendanceRow>) {
		if (this.slice?.occurrenceId !== occurrenceId) {
			return;
		}
		this.slice = {
			...this.slice,
			attendance: this.slice.attendance.map(row =>
				row.studentId === studentId ? { ...row, ...patch } : row,
			),
		};
	}

	replaceAttendance(occurrenceId: string, attendance: SessionAttendanceRow[]) {
		if (this.slice?.occurrenceId !== occurrenceId) {
			return;
		}
		this.slice = { ...this.slice, attendance };
	}

	private countRecorded(occurrenceId: string): number {
		return this.attendanceFor(occurrenceId).filter(row => row.status).length;
	}

	query() {
		return (url: URL) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const occurrenceId = attendanceDayDetailIdFromUrl(url);
				const classId = attendanceClassIdFromUrl(url);
				if (!occurrenceId || !classId) {
					return {};
				}

				const page = this.getPage();
				const day = page.selectedDay(classId, occurrenceId);
				if (!day) {
					return {};
				}

				const detail = await loadAttendanceDayDetail(queryClient(), occurrenceId);
				if (detail) {
					this.seed(occurrenceId, detail.attendance);
				}
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load attendance day detail.',
		});
	}

	async recordStudentAttendance(input: {
		day: AttendanceDay;
		studentId: string;
		status: SessionAttendanceStatus;
		attendanceId?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const id = input.attendanceId ?? `att-${input.studentId}-${input.day.date}`;
		const previous = this.attendanceFor(input.day.id).find(row => row.studentId === input.studentId);
		const hadStatus = previous?.status !== undefined;

		const result = await runAttendanceRouteMutation({
			request: () => client.commands.recordDailyAttendance({
				id,
				studentId: input.studentId,
				classGroupId: input.day.classId,
				date: input.day.date,
				status: input.status,
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['attendance'],
			apply: () => {
				this.patchAttendance(input.day.id, input.studentId, {
					attendanceId: id,
					status: input.status,
				});
				if (!hadStatus) {
					this.getPage().patchAttendanceDay(input.day.id, {
						recordedCount: this.countRecorded(input.day.id),
					});
				}
			},
			rollback: () => {
				if (previous) {
					this.patchAttendance(input.day.id, input.studentId, previous);
					this.getPage().patchAttendanceDay(input.day.id, {
						recordedCount: this.countRecorded(input.day.id),
					});
				}
			},
		});
		return result !== null;
	}

	async recordBulkAttendance(input: {
		day: AttendanceDay;
		attendanceByStudent: Record<string, SessionAttendanceStatus>;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.attendanceFor(input.day.id);

		const result = await runAttendanceRouteMutation({
			request: () => client.commands.recordClassDailyAttendance({
				classGroupId: input.day.classId,
				date: input.day.date,
				attendanceByStudent: input.attendanceByStudent,
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage ?? get(t)('attendanceDay.bulkSuccess'),
			versionKeys: ['attendance'],
			apply: () => {
				for (const [studentId, status] of Object.entries(input.attendanceByStudent)) {
					this.patchAttendance(input.day.id, studentId, {
						attendanceId: `att-${studentId}-${input.day.date}`,
						status,
					});
				}
				this.getPage().patchAttendanceDay(input.day.id, {
					recordedCount: this.countRecorded(input.day.id),
				});
			},
			rollback: () => {
				this.replaceAttendance(input.day.id, previous);
				const previousCount = previous.filter(row => row.status).length;
				this.getPage().patchAttendanceDay(input.day.id, {
					recordedCount: previousCount,
				});
			},
		});
		return result !== null;
	}
}

export function setAttendanceDayDetailState(state: AttendanceDayDetailState) {
	setContext(ATTENDANCE_DAY_DETAIL_KEY, state);
}

export function getAttendanceDayDetailState() {
	return getContext<AttendanceDayDetailState>(ATTENDANCE_DAY_DETAIL_KEY);
}
