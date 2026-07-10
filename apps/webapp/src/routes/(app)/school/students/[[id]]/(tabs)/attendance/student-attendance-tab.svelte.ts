import type { AbsenceRecord, StudentAttendanceHistoryItem } from '$lib/types/school';
import type { StudentsPageState } from '../../../students-page.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadStudentAttendanceHistory } from '$lib/api/student-drawer-data';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';
import { schoolStudentDetailIdFromUrl } from '../../../students-page.svelte';

export function summarizeStudentAttendanceHistory(
	records: readonly StudentAttendanceHistoryItem[],
): {
	records: StudentAttendanceHistoryItem[];
	present: number;
	absent: number;
	late: number;
} {
	return {
		records: [...records],
		present: records.filter(record => record.status === 'present').length,
		absent: records.filter(record => record.status === 'absent').length,
		late: records.filter(record => record.status === 'late').length,
	};
}

const STUDENT_ATTENDANCE_TAB_KEY = Symbol('student-attendance-tab');

type AttendanceStatus = 'absent' | 'late';

export interface StudentAttendanceTabSlice {
	studentId: string;
	attendance: StudentAttendanceHistoryItem[];
	absences: AbsenceRecord[];
}

export type StudentAttendanceTabSeed = Partial<Omit<StudentAttendanceTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentAttendanceTabSlice {
	return {
		studentId,
		attendance: [],
		absences: [],
	};
}

export class StudentAttendanceTabState {
	slice = $state<StudentAttendanceTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentsPageState) {}

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

	appendAbsence(absence: AbsenceRecord) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			absences: [...this.slice.absences, absence],
		};
	}

	removeAbsence(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			absences: this.slice.absences.filter(absence => absence.id !== id),
		};
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = schoolStudentDetailIdFromUrl(url);
				if (!studentId) {
					return {};
				}

				const attendance = await loadStudentAttendanceHistory(getBrowserSchoolClient(), studentId);
				this.seed(studentId, { attendance });
				return {};
			},
			hasItems: () => true,
		});
	}

	async recordAbsence(input: {
		studentId: string;
		classGroupId: string;
		date: string;
		status: AttendanceStatus;
		successMessage?: string;
	}): Promise<boolean> {
		const page = this.getPage();
		const client = getBrowserSchoolClient();
		const id = `att-${input.studentId}-${input.date}`;
		const previous = page.findStudent(input.studentId);
		const optimisticAbsence: AbsenceRecord = {
			id,
			studentId: input.studentId,
			date: input.date,
			time: '—',
			subject: '—',
			eventType: 'Cours',
			reason: input.status === 'late' ? 'Retard' : 'Absence',
		};

		const result = await runStudentRouteMutation(() => client.commands.recordDailyAttendance({
			id,
			studentId: input.studentId,
			classGroupId: input.classGroupId,
			date: input.date,
			status: input.status,
			createdAt: new Date().toISOString(),
		}), {
			successMessage: input.successMessage,
			apply: () => {
				this.appendAbsence(optimisticAbsence);
				if (previous) {
					page.patchStudent(input.studentId, {
						attendance: Math.max(0, Math.round((previous.attendance - 1) * 10) / 10),
					});
				}
			},
			rollback: () => {
				this.removeAbsence(id);
				if (previous) {
					page.patchStudent(input.studentId, { attendance: previous.attendance });
				}
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
