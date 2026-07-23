import type { EvaluationsPageSlice } from './evaluation-helpers';
import {
	fetchClassAssessmentsSources,
	loadClassEvaluationsPageData,
	mapAssessmentResults,
} from '$lib/api/assessments-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadClassSubjects } from '$lib/api/subjects-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyEvaluationsSlice, evaluationsPeriodIdFromUrl } from './evaluation-helpers';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadEvaluationGradingData(
	client: SchoolClient,
	classId: string,
	periodId: string,
) {
	const sources = await fetchClassAssessmentsSources(client, classId, periodId);
	return mapAssessmentResults(sources.resultsRaw);
}

export async function loadEvaluationsSlice(
	classId: string,
	periodId: string,
): Promise<EvaluationsPageSlice> {
	const client = getBrowserSchoolClient();
	const [{ evaluations }, subjects] = await Promise.all([
		loadClassEvaluationsPageData(client, classId, periodId).then(({ evaluations }) => ({ evaluations })),
		loadClassSubjects(client, classId),
	]);
	return {
		classId,
		periodId,
		evaluations,
		assessmentResults: [],
		subjects,
		students: [],
	};
}

export function queryEvaluationsListPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyEvaluationsSlice(classId),
		load: () => loadEvaluationsSlice(classId, evaluationsPeriodIdFromUrl(url)),
		hasItems: () => true,
	});
}
