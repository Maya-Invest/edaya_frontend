import type { Lang } from '$lib/i18n';
import type { FamilyFeedbackListFilters } from '$lib/list/list-url-filters';
import { isFamilyFeedbackStatus } from '$lib/api/family-feedback-types';
import { ScopedCursorList } from '$lib/list/scoped-cursor-list.svelte';
import { queryClient } from '$lib/queries/client';

type HistoryPage = Awaited<ReturnType<ReturnType<typeof queryClient>['queries']['getStaffFeedbackHistory']>>;
export type CampaignHistoryRow = HistoryPage['items'][number];
type Selection = FamilyFeedbackListFilters & { lang: Lang; academicYearId?: string; scope: string };

function requestFilter(selection: Selection) {
	const { q, status, lang, academicYearId } = selection;
	if (status !== 'all' && !isFamilyFeedbackStatus(status))
		return undefined;
	return { academicYearId, lang, q: q || undefined, status: isFamilyFeedbackStatus(status) ? status : undefined };
}

export class FamilyFeedbackHistory extends ScopedCursorList<Selection, CampaignHistoryRow> {
	constructor(selection: () => Selection, onScopeChange: () => void) {
		super(selection, onScopeChange, async (selected, cursor, signal) => {
			const input = requestFilter(selected);
			return input
				? queryClient().queries.getStaffFeedbackHistory({ ...input, cursor }, { signal })
				: { items: [], total: 0, nextCursor: null };
		}, async (selected) => {
			const input = requestFilter(selected);
			return input ? (await queryClient().queries.getStaffFeedbackHistoryExport(input)).items : [];
		});
	}
}
