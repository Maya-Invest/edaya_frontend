import type { StudentAttendanceHistoryItem } from '$lib/types/school';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { loadStudentAttendanceHistory } from '$lib/api/student-drawer-data';
import { formatDateInput, nowIso } from '$lib/date/format';
import { getContext, setContext } from 'svelte';
import {
	dailyAttendanceHistoryItem,
	patchAttendanceHistory,
	removeAttendanceHistory,
	summarizeStudentAttendanceHistory,
} from '../../../lib/student-attendance-history';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';

export { summarizeStudentAttendanceHistory };

const STUDENT_ATTENDANCE_TAB_KEY = Symbol('student-attendance-tab');

type AttendanceStatus = 'absent' | 'late';

export interface StudentAttendanceTabSlice {
	studentId: string;
	attendance: StudentAttendanceHistoryItem[];
}

export type StudentAttendanceTabSeed = Partial<Omit<StudentAttendanceTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentAttendanceTabSlice {
	return {
		studentId,
		attendance: [],
	};
}

export class StudentAttendanceTabState {
	slice = $state<StudentAttendanceTabSlice | null>(null);

	clear() {
		this.slice = null;
	}

	seed(studentId: string, data: StudentAttendanceTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	attendanceSummaryFor(studentId: string) {
		const attendance = this.forStudent(studentId)?.attendance ?? [];
		return summarizeStudentAttendanceHistory(attendance);
	}

	patchAttendance(record: StudentAttendanceHistoryItem, dropIds: readonly string[] = []) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			attendance: patchAttendanceHistory(this.slice.attendance, record, dropIds),
		};
	}

	removeAttendance(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			attendance: removeAttendanceHistory(this.slice.attendance, id),
		};
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const studentId = studentDetailIdFromPathname(url.pathname);
				if (!studentId) {
					return {};
				}

				const attendance = await loadStudentAttendanceHistory(getBrowserSchoolClient(), studentId);
				signal.throwIfAborted();
				this.seed(studentId, { attendance });
				return {};
			},
			hasItems: () => true,
		}, request);
	}

	async recordAbsence(input: {
		studentId: string;
		classGroupId: string;
		date: string;
		status: AttendanceStatus;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const currentDaily = this.slice?.attendance.find(
			record => record.kind === 'daily' && record.date === input.date,
		);
		const id = currentDaily?.id ?? `att-${input.studentId}-${input.date}`;
		const previous = currentDaily
			?? this.slice?.attendance.find(record => record.id === id);
		const optimistic = dailyAttendanceHistoryItem({
			id,
			date: input.date,
			status: input.status,
		});

		const result = await runStudentRouteMutation({
			request: () => client.commands.recordDailyAttendance({
				id,
				studentId: input.studentId,
				classGroupId: input.classGroupId,
				date: input.date,
				status: input.status,
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['students', 'attendance'],
			apply: () => {
				this.patchAttendance(optimistic);
			},
			onSuccess: (record) => {
				this.patchAttendance(
					dailyAttendanceHistoryItem({
						id: record.id,
						date: formatDateInput(record.date) || input.date,
						status: record.status,
					}),
					record.id === id ? [] : [id],
				);
			},
			rollback: () => {
				if (previous) {
					this.patchAttendance(previous, [id]);
					return;
				}
				this.removeAttendance(id);
			},
		});
		return result !== null;
	}
}

export function setStudentAttendanceTabState(state: StudentAttendanceTabState) {
	setContext(STUDENT_ATTENDANCE_TAB_KEY, state);
}

export function getStudentAttendanceTabState() {
	return getContext<StudentAttendanceTabState>(STUDENT_ATTENDANCE_TAB_KEY);
}
