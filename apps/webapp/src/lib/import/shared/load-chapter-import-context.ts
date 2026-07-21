import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ChapterImportClassSubjectTarget } from '$lib/import/chapters/types';
import { fetchSchoolSubjectsSources } from '$lib/api/subjects-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface ChapterImportClassOption {

	id: string;

	name: string;

	gradeLevelId: string;

}

export interface ChapterImportGradeLevelOption {

	id: string;

	name: string;

}

export async function loadChapterImportContext(

	client: SchoolClient,

	classes: readonly ChapterImportClassOption[],

	gradeLevels: readonly ChapterImportGradeLevelOption[],

): Promise<ChapterImportClassSubjectTarget[]> {
	const sources = await fetchSchoolSubjectsSources(client);

	const classNameById = new Map(classes.map(entry => [entry.id, entry.name]));

	const classGradeLevelById = new Map(classes.map(entry => [entry.id, entry.gradeLevelId]));

	const gradeLevelNameById = new Map(gradeLevels.map(entry => [entry.id, entry.name]));

	const subjectById = new Map(

		sources.subjectsRaw.map(subject => [subject.id, subject]),

	);

	const targets: ChapterImportClassSubjectTarget[] = [];

	for (const classSubject of sources.classSubjectsRaw) {
		const subject = subjectById.get(classSubject.subjectId);

		const subjectName = typeof subject?.name === 'string' ? subject.name.trim() : '';

		if (!subjectName) {
			continue;
		}

		const gradeLevelId = classGradeLevelById.get(classSubject.classGroupId) ?? '';

		targets.push({

			classSubjectId: classSubject.id,

			subjectId: classSubject.subjectId,

			classGroupId: classSubject.classGroupId,

			gradeLevelId,

			...(classSubject.gradeLevelSubjectId

				? { gradeLevelSubjectId: classSubject.gradeLevelSubjectId }

				: {}),

			subjectName,

			className: classNameById.get(classSubject.classGroupId) ?? classSubject.classGroupId,

			gradeLevelName: gradeLevelNameById.get(gradeLevelId) ?? gradeLevelId,

		});
	}

	return targets.sort((left, right) => {
		const byLevel = left.gradeLevelName.localeCompare(right.gradeLevelName, 'fr');

		if (byLevel !== 0) {
			return byLevel;
		}

		const bySubject = left.subjectName.localeCompare(right.subjectName, 'fr');

		if (bySubject !== 0) {
			return bySubject;
		}

		return left.className.localeCompare(right.className, 'fr');
	});
}

export function uniqueChapterSubjectNames(

	targets: readonly ChapterImportClassSubjectTarget[],

): string[] {
	return [...new Set(targets.map(entry => entry.subjectName))].sort((left, right) =>

		left.localeCompare(right, 'fr'),

	);
}
