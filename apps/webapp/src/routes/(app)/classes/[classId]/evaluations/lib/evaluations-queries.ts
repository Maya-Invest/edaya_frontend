import { academicContext } from '$lib/academic/context.svelte';
import { loadClassEvaluationsPageData } from '$lib/api/assessments-data';
import { loadClassPeopleData } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadClassSubjects } from '$lib/api/subjects-data';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyEvaluationsSlice, type EvaluationsPageSlice } from './evaluation-helpers';

export async function loadEvaluationsSlice(classId: string): Promise<EvaluationsPageSlice> {
	const periodId = academicContext.periodId;
	const client = getBrowserSchoolClient();
	const [{ evaluations, assessmentResults }, subjects, { students }] = await Promise.all([
		loadClassEvaluationsPageData(client, classId, periodId),
		loadClassSubjects(client, classId),
		loadClassPeopleData(client, classId, periodId),
	]);
	return {
		classId,
		evaluations,
		assessmentResults,
		subjects,
		students,
	};
}

export function queryEvaluationsListPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyEvaluationsSlice(classId),
		load: () => loadEvaluationsSlice(classId),
		hasItems: () => true,
	});
}
