import type { StudentGradeRow } from '$lib/types/school';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { loadStudentGradeRows } from '$lib/api/student-drawer-data';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { buildStudentGradeSummaryFromRows } from './student-grades-tab.selectors';

export { buildStudentGradeSummaryFromRows };

const STUDENT_GRADES_TAB_KEY = Symbol('student-grades-tab');

export interface StudentGradesTabSlice {
	studentId: string;
	grades: StudentGradeRow[];
}

export type StudentGradesTabSeed = Partial<Omit<StudentGradesTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentGradesTabSlice {
	return {
		studentId,
		grades: [],
	};
}

export class StudentGradesTabState {
	slice = $state<StudentGradesTabSlice | null>(null);

	clear() {
		this.slice = null;
	}

	seed(studentId: string, data: StudentGradesTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	gradesSummaryFor(
		studentId: string,
		evaluationHref?: (row: StudentGradeRow) => string | undefined,
	) {
		const grades = this.forStudent(studentId)?.grades ?? [];
		return buildStudentGradeSummaryFromRows(grades, evaluationHref);
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = studentDetailIdFromPathname(url.pathname);
				if (!studentId) {
					return {};
				}

				const grades = await loadStudentGradeRows(getBrowserSchoolClient(), studentId);

				this.seed(studentId, {
					grades,
				});
				return {};
			},
			hasItems: () => true,
		});
	}
}

export function setStudentGradesTabState(state: StudentGradesTabState) {
	setContext(STUDENT_GRADES_TAB_KEY, state);
}

export function getStudentGradesTabState() {
	return getContext<StudentGradesTabState>(STUDENT_GRADES_TAB_KEY);
}
