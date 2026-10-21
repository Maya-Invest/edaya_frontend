import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ChapterImportCatalogTarget } from '$lib/import/chapters/types';
import { fetchCatalogSubjectsSources, subjectMattersForSubject } from '$lib/api/subjects-data';
import { chapterImportDuplicateKey } from '$lib/import/chapters/types';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
export interface ChapterImportClassOption { id: string; name: string; gradeLevelId: string }
export interface ChapterImportGradeLevelOption { id: string; name: string }
export interface ChapterImportLoadedContext { targets: ChapterImportCatalogTarget[]; existingChapterKeys: Set<string> }

export function buildExistingChapterImportKeys(targets: readonly ChapterImportCatalogTarget[], matters: readonly { id: string; subjectId: string; name: string; sequenceOrder?: number }[]): Set<string> {
	return new Set(targets.flatMap(target => subjectMattersForSubject(target.subjectId, matters.map(matter => ({ ...matter, sequenceOrder: matter.sequenceOrder ?? 0 })))
		.map(matter => chapterImportDuplicateKey(target.subjectId, matter.name))));
}
export async function loadChapterImportContext(client: SchoolClient, schoolId: string, _classes: readonly ChapterImportClassOption[], gradeLevels: readonly ChapterImportGradeLevelOption[], academicYearId?: string): Promise<ChapterImportLoadedContext> {
	const sources = await fetchCatalogSubjectsSources(client, schoolId, academicYearId);
	const names = new Map(gradeLevels.map(level => [level.id, level.name]));
	const targets = sources.subjectsRaw.map(subject => ({
		subjectId: subject.id,
		gradeLevelId: subject.gradeLevelId,
		gradeLevelName: names.get(subject.gradeLevelId) ?? subject.gradeLevelId,
		subjectName: subject.name,
		classAssignments: sources.classSubjectsRaw.filter(offering => offering.subjectId === subject.id)
			.map(offering => ({ classGroupId: offering.classGroupId, classSubjectId: offering.id })),
	})).sort((a, b) => a.gradeLevelName.localeCompare(b.gradeLevelName, 'fr') || a.subjectName.localeCompare(b.subjectName, 'fr'));
	return { targets, existingChapterKeys: buildExistingChapterImportKeys(targets, sources.subjectMattersRaw) };
}
export function uniqueChapterSubjectNames(targets: readonly ChapterImportCatalogTarget[]): string[] {
	return [...new Set(targets.map(target => target.subjectName))].sort((a, b) => a.localeCompare(b, 'fr'));
}
