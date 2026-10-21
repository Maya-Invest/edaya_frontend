import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages, schoolSubjectsCatalogList } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

export interface SchoolSubjectCatalogEntry {
	id: string;
	name: string;
}

export async function loadSchoolSubjectCatalog(schoolId?: string): Promise<SchoolSubjectCatalogEntry[]> {
	const resolvedSchoolId = schoolId
		?? authSession.schoolId
		?? academicContext.schools[0]?.id
		?? null;
	if (!resolvedSchoolId) {
		return [];
	}

	const client = getBrowserSchoolClient();
	const subjects = await listAllEntityPages(query => client.entities.subjects.list(query), { baseQuery: { ...schoolSubjectsCatalogList(resolvedSchoolId), academicYearId: academicContext.yearId ?? undefined } });
	const entries: SchoolSubjectCatalogEntry[] = [];

	for (const subject of subjects ?? []) {
		const id = typeof subject.id === 'string' ? subject.id.trim() : '';
		const name = typeof subject.name === 'string' ? subject.name.trim() : '';
		if (id && name) {
			entries.push({ id, name });
		}
	}

	return entries.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function loadSchoolSubjectNames(schoolId?: string): Promise<string[]> {
	const catalog = await loadSchoolSubjectCatalog(schoolId);
	return catalog.map(entry => entry.name);
}
