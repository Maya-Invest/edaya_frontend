import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchCatalogSubjectsSources, mapCatalogSubjects } from '$lib/api/subjects-data';
import { subjectImportDuplicateKey } from '$lib/import/shared/subject-import-duplicate-key';

export { subjectImportDuplicateKey } from '$lib/import/shared/subject-import-duplicate-key';

export async function loadExistingSubjectImportKeys(
	classGradeLevelById: Readonly<Record<string, string>>,
): Promise<Set<string>> {
	const client = getBrowserSchoolClient();
	const sources = await fetchCatalogSubjectsSources(client);
	const catalog = mapCatalogSubjects(sources, classGradeLevelById);
	const keys = new Set<string>();

	for (const entry of catalog) {
		const gradeLevelId = entry.gradeLevelId ?? classGradeLevelById[entry.classId];
		if (!gradeLevelId) {
			continue;
		}
		keys.add(subjectImportDuplicateKey(gradeLevelId, entry.name));
	}

	return keys;
}
