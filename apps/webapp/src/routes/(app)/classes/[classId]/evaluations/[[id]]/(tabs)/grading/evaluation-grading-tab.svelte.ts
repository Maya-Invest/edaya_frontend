import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { AssessmentResultRow, Student } from '$lib/types/school';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { evaluationsClassIdFromUrl } from '../../../lib/evaluation-helpers';

const EVALUATION_GRADING_TAB_KEY = Symbol('evaluation-grading-tab');

export interface EvaluationGradingTabSlice {
	classId: string;
	students: Pick<Student, 'id' | 'name' | 'initials'>[];
	assessmentResults: AssessmentResultRow[];
}

export class EvaluationGradingTabState {
	slice = $state<EvaluationGradingTabSlice | null>(null);
	review = $state<components['schemas']['AssessmentMarksReviewResponse'] | null>(null);

	clear() {
		this.slice = null;
	}

	studentsFor(classId: string): Pick<Student, 'id' | 'name' | 'initials'>[] {
		if (this.slice?.classId !== classId) {
			return [];
		}
		return [...this.slice.students].sort((left, right) => left.name.localeCompare(right.name, 'fr'));
	}

	scoreFor(assessmentId: string, studentId: string): number | null {
		const result = this.slice?.assessmentResults.find(
			entry => entry.assessmentId === assessmentId && entry.studentId === studentId,
		);
		return typeof result?.score === 'number' ? result.score : null;
	}

	upsertAssessmentResult(result: AssessmentResultRow) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			assessmentResults: [
				...this.slice.assessmentResults.filter(entry => entry.id !== result.id),
				result,
			],
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

	removeResultsForAssessment(assessmentId: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			assessmentResults: this.slice.assessmentResults.filter(result => result.assessmentId !== assessmentId),
		};
	}

	query(classId: string) {
		return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const resolvedClassId = evaluationsClassIdFromUrl(url) ?? classId;

				const client = getBrowserSchoolClient();
                const assessmentId = url.pathname.split('/evaluations/')[1]?.split('/')[0];
                this.review = assessmentId ? await client.queries.getAssessmentMarksReview({ assessmentId }) : null;
                const students = (this.review?.students ?? []).map(student => ({ id: student.id, name: `${student.firstName} ${student.lastName}`.trim(), initials: `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}` }));
                const assessmentResults = (this.review?.results ?? []).map(result => ({ ...result, score: result.score ?? null }));

				signal.throwIfAborted();
				this.slice = {
					classId: resolvedClassId,
					students,
					assessmentResults,
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load evaluation grading data.',
		}, request);
	}
}

export function setEvaluationGradingTabState(state: EvaluationGradingTabState) {
	setContext(EVALUATION_GRADING_TAB_KEY, state);
}

export function getEvaluationGradingTabState(): EvaluationGradingTabState {
	return getContext<EvaluationGradingTabState>(EVALUATION_GRADING_TAB_KEY);
}
