import type { PageQueryRequest } from '$lib/queries/page-status';
import type { SubjectCategoriesPageState } from '../subject-categories-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadSubjectCategories } from '$lib/api/subject-categories-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { emptySubjectCategoriesSlice } from './subject-categories-helpers';

function resolveSchoolId(): string | null {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
}

export async function loadSubjectCategoriesSlice() {
	const schoolId = resolveSchoolId();
	if (!schoolId) {
		return emptySubjectCategoriesSlice();
	}
	const categories = await loadSubjectCategories(getBrowserSchoolClient(), schoolId);
	return { categories };
}

export function querySubjectCategoriesListPage(state: SubjectCategoriesPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => emptySubjectCategoriesSlice(),
		load: async (signal) => {
			const data = await loadSubjectCategoriesSlice();
			signal.throwIfAborted();
			state.applySlice(data);
			return data;
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load subject categories.',
	}, request);
}
