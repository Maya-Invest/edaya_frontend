import type { StudentEnrollmentHistoryItem } from '$lib/types/school';
import type { StudentsPageState } from '../../../students-page.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadStudentEnrollmentHistory } from '$lib/api/student-drawer-data';
import { todayDateInput } from '$lib/date/format';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';
import { schoolStudentDetailIdFromUrl } from '../../../students-page.svelte';

const STUDENT_ENROLLMENTS_TAB_KEY = Symbol('student-enrollments-tab');

export interface StudentEnrollmentsTabSlice {
	studentId: string;
	enrollments: StudentEnrollmentHistoryItem[];
}

export type StudentEnrollmentsTabSeed = Partial<Omit<StudentEnrollmentsTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentEnrollmentsTabSlice {
	return { studentId, enrollments: [] };
}

export class StudentEnrollmentsTabState {
	slice = $state<StudentEnrollmentsTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentsPageState) {}

	clear() {
		this.slice = null;
	}

	seed(studentId: string, data: StudentEnrollmentsTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	enrollmentsFor(studentId: string) {
		return this.forStudent(studentId)?.enrollments ?? [];
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = schoolStudentDetailIdFromUrl(url);
				if (!studentId) {
					return {};
				}

				const enrollments = await loadStudentEnrollmentHistory(getBrowserSchoolClient(), studentId);
				this.seed(studentId, { enrollments });
				return {};
			},
			hasItems: () => true,
		});
	}

	async transferClass(input: {
		enrollmentId: string;
		studentId: string;
		nextClassGroupId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const page = this.getPage();
		const client = getBrowserSchoolClient();
		const previous = page.findStudent(input.studentId);
		const nextEnrollmentId = `enr-${input.studentId}-${crypto.randomUUID()}`;

		const result = await runStudentRouteMutation({
			request: () => client.commands.transferStudent({
				enrollmentId: input.enrollmentId,
				nextEnrollmentId,
				nextClassGroupId: input.nextClassGroupId,
				effectiveAt: todayDateInput(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['students', 'enrollments'],
			apply: () => {
				page.patchStudent(input.studentId, {
					classId: input.nextClassGroupId,
					enrollmentId: nextEnrollmentId,
				});
			},
			rollback: () => {
				if (previous) {
					page.patchStudent(input.studentId, previous);
				}
			},
		});
		return result !== null;
	}
}

export function setStudentEnrollmentsTabState(state: StudentEnrollmentsTabState) {
	setContext(STUDENT_ENROLLMENTS_TAB_KEY, state);
}

export function getStudentEnrollmentsTabState() {
	return getContext<StudentEnrollmentsTabState>(STUDENT_ENROLLMENTS_TAB_KEY);
}
