import { academicContext } from '$lib/academic/context.svelte';
import { fetchDeadlines } from '$lib/api/homework-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { getClassSubjects } from '$lib/queries/subjects.queries';

export function queryClassHomeworkPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classId }),
		load: async () => {
			const [deadlines, subjects] = await Promise.all([
				fetchDeadlines(classId, undefined, { periodId: academicContext.periodId }),
				getClassSubjects(classId),
			]);
			detailDataContext.seedDeadlines(deadlines, { classId });
			detailDataContext.seedSubjects(subjects, { classId });
			return { classId };
		},
		hasItems: listPageHasItems,
	});
}
