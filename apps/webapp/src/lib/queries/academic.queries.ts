import { academicContext } from '$lib/academic/context.svelte';
import {
	classGroupDetailIdFromUrl,
	hydrateClassGroupDrawer,
	hydrateClassGroupStaffDirectory,
} from '$lib/api/configuration-data';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { refreshReportCardCatalog } from '$lib/queries/report-cards.queries';
import { reportCardsContext } from '$lib/report-cards/context.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';

export function queryClassGroupsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ classCount: 0 }),
		load: async () => {
			try {
				await hydrateClassGroupStaffDirectory();
			}
			catch (error) {
				if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
					throw error;
				}
			}
			const classGroupId = classGroupDetailIdFromUrl(url);
			if (classGroupId) {
				try {
					await hydrateClassGroupDrawer(classGroupId);
				}
				catch (error) {
					if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
						throw error;
					}
				}
			}
			return { classCount: academicContext.classes.length };
		},
		hasItems: listPageHasItems,
	});
}

export function queryGradeLevelsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ levelCount: 0 }),
		load: async () => ({ levelCount: academicContext.gradeLevels.length }),
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
				try {
					await refreshReportCardCatalog();
				}
				catch (error) {
					if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
						throw error;
					}
				}
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
				try {
					await refreshReportCardCatalog();
				}
				catch (error) {
					if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
						throw error;
					}
				}
			}
			return {};
		},
		hasItems: listPageHasItems,
	});
}
