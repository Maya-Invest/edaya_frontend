import type { PageQueryRequest } from '$lib/queries/page-status';
import type { EvaluationsPageSlice } from './evaluation-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import {
	fetchClassAssessmentsSources,
	loadClassEvaluationsPageData,
	mapAssessmentResults,
} from '$lib/api/assessments-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyEvaluationsSlice } from './evaluation-helpers';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadEvaluationGradingData(
	client: SchoolClient,
	classId: string,
	periodId: string,
) {
	const sources = await fetchClassAssessmentsSources(client, classId, periodId, true);
	return mapAssessmentResults(sources.resultsRaw);
}

export async function loadEvaluationsSlice(classId: string): Promise<EvaluationsPageSlice> {
	const periodId = academicContext.periodId;
	if (!periodId) {
		return emptyEvaluationsSlice(classId);
	}
	const client = getBrowserSchoolClient();
	const { evaluations, subjects } = await loadClassEvaluationsPageData(client, classId, periodId);
	return {
		classId,
		evaluations,
		assessmentResults: [],
		subjects,
		students: [],
	};
}

export function queryEvaluationsListPage(classId: string) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyEvaluationsSlice(classId),
		load: () => loadEvaluationsSlice(classId),
		hasItems: () => true,
	}, request);
}
