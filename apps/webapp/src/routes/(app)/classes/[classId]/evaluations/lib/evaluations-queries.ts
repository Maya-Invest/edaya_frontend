import type { EvaluationsPageSlice } from './evaluation-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import {
	fetchClassAssessmentsSources,
	loadClassEvaluationsPageData,
	mapAssessmentResults,
} from '$lib/api/assessments-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadClassSubjects } from '$lib/api/subjects-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyEvaluationsSlice } from './evaluation-helpers';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadEvaluationGradingData(
	client: SchoolClient,
	classId: string,
	periodId: string,
) {
	const sources = await fetchClassAssessmentsSources(client, classId, periodId);
	return mapAssessmentResults(sources.resultsRaw);
}

export async function loadEvaluationsSlice(classId: string): Promise<EvaluationsPageSlice> {
	const periodId = academicContext.periodId;
	const client = getBrowserSchoolClient();
	const [{ evaluations }, subjects] = await Promise.all([
		loadClassEvaluationsPageData(client, classId, periodId).then(({ evaluations }) => ({ evaluations })),
		loadClassSubjects(client, classId),
	]);
	return {
		classId,
		evaluations,
		assessmentResults: [],
		subjects,
		students: [],
	};
}

export function queryEvaluationsListPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyEvaluationsSlice(classId),
		load: () => loadEvaluationsSlice(classId),
		hasItems: () => true,
	});
}
