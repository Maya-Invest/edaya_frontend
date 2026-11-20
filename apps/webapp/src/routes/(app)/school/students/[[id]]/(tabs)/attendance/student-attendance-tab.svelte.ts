import type { components } from '$lib/api/schema';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { nowIso } from '$lib/date/format';
import { getContext, setContext } from 'svelte';
import { StudentHistoryState } from '../../../lib/student-history-state.svelte';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';

export { summarizeStudentAttendanceHistory } from '../../../lib/student-attendance-history';

const STUDENT_ATTENDANCE_TAB_KEY = Symbol('student-attendance-tab');

export class StudentAttendanceTabState extends StudentHistoryState<components['schemas']['StudentAttendanceHistoryPage']> {
	constructor() {
		super(({ studentId }, cursor, signal) => getBrowserSchoolClient().queries.getStudentAttendanceHistory({ studentId, cursor }, { signal }));
	}

	async recordAbsence(input: {
		studentId: string;
		classGroupId: string;
		date: string;
		status: 'absent' | 'late';
		successMessage?: string;
	}): Promise<boolean> {
		const result = await runStudentRouteMutation({
			request: () => getBrowserSchoolClient().commands.recordDailyAttendance({
				id: crypto.randomUUID(),
				studentId: input.studentId,
				classGroupId: input.classGroupId,
				date: input.date,
				status: input.status,
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['students', 'attendance'],
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
