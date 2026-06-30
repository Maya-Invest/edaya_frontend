import { academicContext } from '$lib/academic/context.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { refreshReportCardCatalog } from '$lib/queries/report-cards.queries';
import { reportCardsContext } from '$lib/report-cards/context.svelte';

export function queryClassGroupsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classCount: 0 }),
		load: async () => ({ classCount: academicContext.classes.length }),
		hasItems: listPageHasItems,
	});
}

export function queryAcademicAdminPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ yearCount: 0 }),
		load: async () => ({ yearCount: academicContext.years.length }),
		hasItems: listPageHasItems,
	});
}

export function queryGradeScalesPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			if (!reportCardsContext.ready) {
				await refreshReportCardCatalog();
			}
			return {};
		},
		hasItems: listPageHasItems,
	});
}

export function queryReportCardDefinitionsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			if (!reportCardsContext.ready) {
				await refreshReportCardCatalog();
			}
			return {};
		},
		hasItems: listPageHasItems,
	});
}
