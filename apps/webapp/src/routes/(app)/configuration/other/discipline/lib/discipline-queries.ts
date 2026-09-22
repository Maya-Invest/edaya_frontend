import type { DisciplinePageState } from '../discipline-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadDisciplineCatalogData } from '$lib/api/discipline-catalog-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptyDisciplineSlice } from './discipline-helpers';

function resolveSchoolId(): string | null {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
}

export async function loadDisciplineSlice() {
	const schoolId = resolveSchoolId();
	if (!schoolId) {
		return emptyDisciplineSlice();
	}
	const data = await loadDisciplineCatalogData(getBrowserSchoolClient(), schoolId);
	return { actions: data.actions };
}

export function queryDisciplineListPage(state: DisciplinePageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyDisciplineSlice(),
		load: async () => {
			const data = await loadDisciplineSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load the disciplinary catalog.',
	});
}
