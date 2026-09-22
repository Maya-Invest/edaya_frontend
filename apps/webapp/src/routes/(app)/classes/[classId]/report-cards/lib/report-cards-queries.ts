import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ReportCardsPageState } from '../report-cards-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassPeopleData } from '$lib/api/people-data';
import {
	loadClassReportCardResultsData,
	loadReportCardCatalogData,
} from '$lib/api/report-cards-data';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyReportCardsSlice } from './report-cards-helpers';

export async function loadReportCardsSlice(classId: string) {
	const periodId = academicContext.periodId;
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	let catalog;
	try {
		catalog = schoolId
			? await loadReportCardCatalogData(client, schoolId)
			: { gradeScales: [], definitions: [] };
	}
	catch (error) {
		if (!(error instanceof ApiError && (error.status === 403 || error.status === 401))) {
			throw error;
		}
		catalog = { gradeScales: [], definitions: [] };
	}

	const [results, people] = await Promise.all([
		periodId
			? safeOptionalEntityList(() =>
					loadClassReportCardResultsData(client, classId, periodId, catalog.definitions),
				)
			: Promise.resolve([]),
		periodId
			? loadClassPeopleData(client, classId, periodId).catch(() => ({ students: [] }))
			: Promise.resolve({ students: [] }),
	]);

	return {
		...emptyReportCardsSlice(classId),
		students: people.students,
		results,
		scales: catalog.gradeScales,
		definitions: catalog.definitions,
	};
}

export function queryReportCardsListPage(classId: string, state: ReportCardsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptyReportCardsSlice(classId),
		load: async (signal) => {
			const data = await loadReportCardsSlice(classId);
			signal.throwIfAborted();
			state.applySlice(classId, data);
			return data;
		},
		hasItems: listPageHasItems,
	}, request);
}
