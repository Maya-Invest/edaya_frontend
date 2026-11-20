import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ReportCardResult } from '$lib/types/report-cards';
import type { ReportCardsPageState } from '../report-cards-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export interface ReportRosterSelection {
	scope: string;
	classId: string;
	periodId: string;
	filters: { q: string; status: string };
}
export type ReportListHeader = Pick<ReportCardResult, 'id' | 'status' | 'overallAverage' | 'grading' | 'classRank' | 'classSize' | 'studentId'>;
export interface ReportPupil { id: string; name: string; report?: ReportListHeader }
export async function readReportPage(selection: ReportRosterSelection, cursor?: string, signal?: AbortSignal) {
	const { filters, classId, periodId } = selection;
	const empty = { items: [] as ReportPupil[], total: 0, nextCursor: null, missingValues: false, missingGrading: false };
	// A stored draft is shown as "generated" by the staff workspace.
	if (!classId || !periodId || filters.status === 'draft')
		return empty;
	const status = filters.status === 'none' || filters.status === 'published' ? filters.status : filters.status === 'generated' ? 'draft' : undefined;
	const page = await getBrowserSchoolClient().queries.getClassReportRoster({ classGroupId: classId, periodId, q: filters.q || undefined, status, cursor }, { signal });
	const items: ReportPupil[] = page.items.map(({ studentId, studentName, report }) => ({
		id: studentId,
		name: studentName,
		report: report
			? { id: report.id, studentId, status: report.status === 'draft' ? 'generated' : 'published', overallAverage: report.overallAverage ?? undefined, grading: report.grading ?? undefined, classRank: report.rank ?? undefined, classSize: report.classSize ?? undefined }
			: undefined,
	}));
	return { items, total: page.matchedPupils, nextCursor: page.nextCursor, missingValues: page.missingValues, missingGrading: page.missingGrading };
}

export function queryReportCardsListPage(state: ReportCardsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({}),
		waitForShell: !academicContext.shellReady,
		load: async (signal) => {
			await state.refreshList(signal);
			signal.throwIfAborted();
			return {};
		},
		hasItems: listPageHasItems,
	}, request);
}
