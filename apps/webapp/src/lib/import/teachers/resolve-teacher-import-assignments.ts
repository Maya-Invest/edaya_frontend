import type { SchoolSubjectCatalogEntry } from '$lib/import/shared/load-school-subject-names';
import { resolveSubjectCatalogId } from './subject-name-lookup';
import type { TeacherImportClassSubjectOption } from './types';

export function resolveTeacherImportClassSubjectIds(
	classGroupId: string,
	subjectNames: readonly string[],
	catalog: readonly SchoolSubjectCatalogEntry[],
	classSubjects: readonly TeacherImportClassSubjectOption[],
): { classSubjectIds: string[]; missingInClass: string[] } {
	const classSubjectIds: string[] = [];
	const missingInClass: string[] = [];
	const subjectsInClass = classSubjects.filter(entry => entry.classGroupId === classGroupId);

	for (const subjectName of subjectNames) {
		const subjectId = resolveSubjectCatalogId(subjectName, catalog);
		if (!subjectId) {
			continue;
		}

		const match = subjectsInClass.find(entry => entry.subjectId === subjectId);
		if (match) {
			if (!classSubjectIds.includes(match.id)) {
				classSubjectIds.push(match.id);
			}
		}
		else {
			missingInClass.push(subjectName);
		}
	}

	return { classSubjectIds, missingInClass };
}
