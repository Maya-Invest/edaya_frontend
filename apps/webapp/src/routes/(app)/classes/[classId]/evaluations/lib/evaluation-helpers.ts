import type { AssessmentResultRow, Evaluation, Student, Subject } from '$lib/types/school';
import { resolveScopedPeriodId } from '$lib/academic/period-scope';
import { listRouteCacheKeyWithPeriod } from '$lib/detail-route-patterns';
import { readClassEvaluationListFilters } from '$lib/list/list-url-filters';

export interface EvaluationsPageSlice {
	classId: string;
	/** Academic period this slice was loaded for — used to re-seed on period changes. */
	periodId: string;
	evaluations: Evaluation[];
	assessmentResults: AssessmentResultRow[];
	students: Student[];
	subjects: Subject[];
}

export function emptyEvaluationsSlice(classId: string): EvaluationsPageSlice {
	return {
		classId,
		periodId: '',
		evaluations: [],
		assessmentResults: [],
		students: [],
		subjects: [],
	};
}

export function normalizedDescription(description?: string): string | undefined {
	const trimmed = description?.trim();
	return trimmed || undefined;
}

export function evaluationStatsFromResults(
	assessmentId: string,
	results: readonly AssessmentResultRow[],
): Pick<Evaluation, 'graded' | 'averageMark'> {
	const scored = results.filter(
		result => result.assessmentId === assessmentId && typeof result.score === 'number',
	);
	return {
		graded: scored.length,
		averageMark: scored.length > 0
			? scored.reduce((sum, result) => sum + (result.score ?? 0), 0) / scored.length
			: 0,
	};
}

export function evaluationDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/evaluations\/([^/]+)/);
	return match?.[2];
}

export function evaluationsClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/evaluations/);
	return match?.[1];
}

export function evaluationsPeriodIdFromUrl(url: URL): string {
	return resolveScopedPeriodId(readClassEvaluationListFilters(url).period);
}

/**
 * Cache by the raw `?period=` search param only.
 * Do not resolve via academicContext — that remounts the list when session period
 * changes before the URL updates, and hydrate snaps the select back.
 */
export function evaluationsListCacheKey(url: URL): string {
	return listRouteCacheKeyWithPeriod(url);
}
