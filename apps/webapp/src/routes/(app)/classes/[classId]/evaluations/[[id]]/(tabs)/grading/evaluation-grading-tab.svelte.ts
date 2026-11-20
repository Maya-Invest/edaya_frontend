import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { AssessmentResultRow, Student } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { locale, t } from '$lib/i18n';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import { evaluationDetailIdFromUrl, evaluationsClassIdFromUrl } from '../../../lib/evaluation-helpers';

const EVALUATION_GRADING_TAB_KEY = Symbol('evaluation-grading-tab');

export interface EvaluationGradingTabSlice {
	classId: string;
	students: Pick<Student, 'id' | 'name' | 'initials'>[];
	assessmentResults: AssessmentResultRow[];
}

export class EvaluationGradingTabState {
	slice = $state<EvaluationGradingTabSlice | null>(null);
	review = $state<components['schemas']['AssessmentMarksReviewResponse'] | null>(null);

	private epoch = 0;
	get scope() { return `${authSession.userId}|${academicContext.schoolScopeId}|${academicContext.yearId}|${academicContext.scopeGeneration}`; }
	get generation() { return this.epoch; }
	beginRead() { return ++this.epoch; }

	clear() {
		this.epoch += 1;
		this.slice = null;
		this.review = null;
	}

	adopt(classId: string, review: components['schemas']['AssessmentMarksReviewResponse']) {
		if (review.assessment.classGroupId !== classId)
return false;
		this.epoch += 1;
		this.review = review;
		this.slice = {
			classId,
			students: review.students.map(student => ({ id: student.id, name: `${student.firstName} ${student.lastName}`.trim(), initials: `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}` })),
			assessmentResults: review.results.map(result => ({ ...result, score: result.score ?? null })),
		};
		return true;
	}

	studentsFor(classId: string): Pick<Student, 'id' | 'name' | 'initials'>[] {
		if (this.slice?.classId !== classId) {
			return [];
		}
		return [...this.slice.students].sort((left, right) => left.name.localeCompare(right.name, get(locale)));
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
		return (url: URL, request?: PageQueryRequest) => {
			const epoch = ++this.epoch;
			const scope = this.scope;
			return resolvePageLoad(url, {
				empty: () => ({}),
				load: async (signal) => {
					const resolvedClassId = evaluationsClassIdFromUrl(url) ?? classId;
					const assessmentId = evaluationDetailIdFromUrl(url);
					if (!assessmentId)
throw new Error(get(t)('form.targetUnavailable'));
					const review = await getBrowserSchoolClient().queries.getAssessmentMarksReview({ assessmentId });
					signal.throwIfAborted();
					if (epoch !== this.epoch || scope !== this.scope)
throw new DOMException('Stale grading read', 'AbortError');
					if (review.assessment.id !== assessmentId || !this.adopt(resolvedClassId, review))
throw new Error(get(t)('form.targetUnavailable'));
					return {};
				},
				hasItems: () => true,
				errorMessage: get(t)('dataState.error'),
			}, request);
		};
	}
}

export function setEvaluationGradingTabState(state: EvaluationGradingTabState) {
	setContext(EVALUATION_GRADING_TAB_KEY, state);
}

export function getEvaluationGradingTabState(): EvaluationGradingTabState {
	return getContext<EvaluationGradingTabState>(EVALUATION_GRADING_TAB_KEY);
}
