import type { AssessmentResultRow, Evaluation, StudentGradeRow } from '$lib/types/school';
import type { StudentsPageState } from '../../../students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassEvaluationsPageData } from '$lib/api/assessments-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadStudentGradeRows } from '$lib/api/student-drawer-data';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';
import { schoolStudentDetailIdFromUrl } from '../../../students-page.svelte';
import { buildStudentGradeSummaryFromRows } from './student-grades-tab.selectors';

export { buildStudentGradeSummaryFromRows };

const STUDENT_GRADES_TAB_KEY = Symbol('student-grades-tab');

export interface StudentGradesTabSlice {
	studentId: string;
	grades: StudentGradeRow[];
	evaluations: Evaluation[];
	assessmentResults: AssessmentResultRow[];
}

export type StudentGradesTabSeed = Partial<Omit<StudentGradesTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentGradesTabSlice {
	return {
		studentId,
		grades: [],
		evaluations: [],
		assessmentResults: [],
	};
}

function studentAverageFromSlice(slice: StudentGradesTabSlice, studentId: string): number {
	let weightedSum = 0;
	let totalCoefficient = 0;

	for (const result of slice.assessmentResults) {
		if (result.studentId !== studentId || typeof result.score !== 'number') {
			continue;
		}

		const evaluation = slice.evaluations.find(entry => entry.id === result.assessmentId);
		if (!evaluation || evaluation.outOf <= 0) {
			continue;
		}

		const normalized = (result.score / evaluation.outOf) * 20;
		weightedSum += normalized * evaluation.coefficient;
		totalCoefficient += evaluation.coefficient;
	}

	if (totalCoefficient === 0) {
		return 0;
	}

	return Math.round((weightedSum / totalCoefficient) * 10) / 10;
}

export class StudentGradesTabState {
	slice = $state<StudentGradesTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentsPageState) {}

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

	evaluationsForClass(classId: string) {
		return (this.slice?.evaluations ?? [])
			.filter(evaluation => evaluation.classId === classId)
			.sort((left, right) => right.date.localeCompare(left.date));
	}

	appendAssessmentResult(result: AssessmentResultRow) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			assessmentResults: [...this.slice.assessmentResults, result],
		};
	}

	removeAssessmentResult(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			assessmentResults: this.slice.assessmentResults.filter(result => result.id !== id),
		};
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = schoolStudentDetailIdFromUrl(url);
				const page = this.getPage();
				const student = studentId ? page.findStudent(studentId) : undefined;
				if (!studentId || !student) {
					return {};
				}

				const client = getBrowserSchoolClient();
				const [grades, { evaluations, assessmentResults }] = await Promise.all([
					loadStudentGradeRows(client, studentId),
					loadClassEvaluationsPageData(client, student.classId, academicContext.periodId),
				]);

				this.seed(studentId, {
					grades,
					evaluations,
					assessmentResults,
				});
				return {};
			},
			hasItems: () => true,
		});
	}

	async recordGrade(input: {
		studentId: string;
		assessmentId: string;
		score: number;
		successMessage?: string;
	}): Promise<boolean> {
		const page = this.getPage();
		const client = getBrowserSchoolClient();
		const resultId = `ar-${input.assessmentId}-${input.studentId}`;
		const previous = page.findStudent(input.studentId);
		const previousAverage = previous?.average ?? 0;

		const result = await runStudentRouteMutation(() => client.commands.recordAssessmentResult({
			id: resultId,
			studentId: input.studentId,
			assessmentId: input.assessmentId,
			score: input.score,
			createdAt: new Date().toISOString(),
		}), {
			successMessage: input.successMessage,
			apply: () => {
				this.appendAssessmentResult({
					id: resultId,
					studentId: input.studentId,
					assessmentId: input.assessmentId,
					score: input.score,
				});
				const slice = this.forStudent(input.studentId);
				const average = slice
					? studentAverageFromSlice(slice, input.studentId)
					: previousAverage;
				page.patchStudent(input.studentId, { average });
			},
			rollback: () => {
				this.removeAssessmentResult(resultId);
				if (previous) {
					page.patchStudent(input.studentId, { average: previousAverage });
				}
			},
		});
		return result !== null;
	}
}

export function setStudentGradesTabState(state: StudentGradesTabState) {
	setContext(STUDENT_GRADES_TAB_KEY, state);
}

export function getStudentGradesTabState() {
	return getContext<StudentGradesTabState>(STUDENT_GRADES_TAB_KEY);
}
