import { schoolSubjectsCatalogList } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export interface SchoolSubjectCatalogEntry {
	id: string;
	name: string;
}

export async function loadSchoolSubjectCatalog(): Promise<SchoolSubjectCatalogEntry[]> {
	const client = getBrowserSchoolClient();
	const subjects = await client.entities.subjects.list(schoolSubjectsCatalogList());
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

export async function loadSchoolSubjectNames(): Promise<string[]> {
	const catalog = await loadSchoolSubjectCatalog();
	return catalog.map(entry => entry.name);
}
