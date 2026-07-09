import { academicContext } from '$lib/academic/context.svelte';
import { loadClassEvaluationsPageData } from '$lib/api/assessments-data';
import { loadClassPeopleData } from '$lib/api/people-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { getClassSubjects } from '$lib/queries/subjects.queries';

export function queryClassEvaluationsPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			const periodId = academicContext.periodId;
			const client = queryClient();
			const [{ evaluations, assessmentResults }, subjects, { students }] = await Promise.all([
				loadClassEvaluationsPageData(client, classId, periodId),
				getClassSubjects(classId),
				loadClassPeopleData(client, classId, periodId),
			]);
			detailDataContext.seedEvaluations(evaluations, { classId });
			detailDataContext.seedAssessmentResults(assessmentResults, {
				assessmentIds: evaluations.map(evaluation => evaluation.id),
			});
			detailDataContext.seedSubjects(subjects, { classId });
			detailDataContext.seedStudents(students, { classId });
			return { classId };
		},
		hasItems: listPageHasItems,
	});
}
