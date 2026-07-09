import { academicContext } from '$lib/academic/context.svelte';
import { loadDisciplineCatalogData } from '$lib/api/discipline-catalog-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { disciplineCatalogContext } from '$lib/discipline-catalog/context.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

function resolveSchoolId(): string | null {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? null;
}

export async function refreshDisciplineCatalog(): Promise<void> {
	const schoolId = resolveSchoolId();
	if (!schoolId) {
		disciplineCatalogContext.hydrate([]);
		return;
	}

	const data = await loadDisciplineCatalogData(getBrowserSchoolClient(), schoolId);
	disciplineCatalogContext.hydrate(data.actions);
}

export function queryDisciplineCatalogPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => ({}),
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load the disciplinary catalog.',
	});
}
