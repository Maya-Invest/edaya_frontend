import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchCatalogSubjectsSources } from '$lib/api/subjects-data';
import type {
	ChapterImportCatalogTarget,
	ChapterImportClassAssignment,
} from '$lib/import/chapters/types';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type GradeLevelSubjectRaw = components['schemas']['GradeLevelSubject'];

export interface ChapterImportClassOption {
	id: string;
	name: string;
	gradeLevelId: string;
}

export interface ChapterImportGradeLevelOption {
	id: string;
	name: string;
}

function catalogSubjectKey(gradeLevelId: string, subjectName: string): string {
	return `${gradeLevelId}:${subjectName.trim().toLowerCase()}`;
}

function classAssignmentsForGradeLevelSubject(
	classSubjectsRaw: readonly ClassSubjectRaw[],
	gradeLevelSubjectId: string,
): ChapterImportClassAssignment[] {
	return classSubjectsRaw
		.filter(classSubject => classSubject.gradeLevelSubjectId === gradeLevelSubjectId)
		.map(classSubject => ({
			classGroupId: classSubject.classGroupId,
			classSubjectId: classSubject.id,
		}));
}

function buildFromGradeLevelSubjects(
	gradeLevelSubjectsRaw: readonly GradeLevelSubjectRaw[],
	classSubjectsRaw: readonly ClassSubjectRaw[],
	subjectById: Map<string, { name: string }>,
	gradeLevelNameById: Map<string, string>,
): ChapterImportCatalogTarget[] {
	const seen = new Set<string>();
	const targets: ChapterImportCatalogTarget[] = [];

	for (const gradeLevelSubject of gradeLevelSubjectsRaw) {
		const subject = subjectById.get(gradeLevelSubject.subjectId);
		const subjectName = subject?.name.trim() ?? '';
		if (!subjectName) {
			continue;
		}

		const key = catalogSubjectKey(gradeLevelSubject.gradeLevelId, subjectName);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);

		targets.push({
			gradeLevelSubjectId: gradeLevelSubject.id,
			subjectId: gradeLevelSubject.subjectId,
			gradeLevelId: gradeLevelSubject.gradeLevelId,
			gradeLevelName: gradeLevelNameById.get(gradeLevelSubject.gradeLevelId) ?? gradeLevelSubject.gradeLevelId,
			subjectName,
			classAssignments: classAssignmentsForGradeLevelSubject(
				classSubjectsRaw,
				gradeLevelSubject.id,
			),
		});
	}

	return targets;
}

function buildLegacyCatalogTargets(
	classSubjectsRaw: readonly ClassSubjectRaw[],
	classGradeLevelById: Map<string, string>,
	subjectById: Map<string, { name: string }>,
	gradeLevelNameById: Map<string, string>,
): ChapterImportCatalogTarget[] {
	const byCatalogKey = new Map<string, ChapterImportCatalogTarget>();

	for (const classSubject of classSubjectsRaw) {
		const gradeLevelId = classGradeLevelById.get(classSubject.classGroupId) ?? '';
		const subject = subjectById.get(classSubject.subjectId);
		const subjectName = subject?.name.trim() ?? '';
		if (!gradeLevelId || !subjectName) {
			continue;
		}

		const key = catalogSubjectKey(gradeLevelId, subjectName);
		const gradeLevelSubjectId = classSubject.gradeLevelSubjectId
			?? `catalog-${gradeLevelId}-${classSubject.subjectId}`;

		const existing = byCatalogKey.get(key);
		if (existing) {
			if (!existing.classAssignments.some(assignment => assignment.classSubjectId === classSubject.id)) {
				byCatalogKey.set(key, {
					...existing,
					classAssignments: [
						...existing.classAssignments,
						{
							classGroupId: classSubject.classGroupId,
							classSubjectId: classSubject.id,
						},
					],
				});
			}
			continue;
		}

		byCatalogKey.set(key, {
			gradeLevelSubjectId,
			subjectId: classSubject.subjectId,
			gradeLevelId,
			gradeLevelName: gradeLevelNameById.get(gradeLevelId) ?? gradeLevelId,
			subjectName,
			classAssignments: [{
				classGroupId: classSubject.classGroupId,
				classSubjectId: classSubject.id,
			}],
		});
	}

	return [...byCatalogKey.values()];
}

export async function loadChapterImportContext(
	client: SchoolClient,
	classes: readonly ChapterImportClassOption[],
	gradeLevels: readonly ChapterImportGradeLevelOption[],
): Promise<ChapterImportCatalogTarget[]> {
	const sources = await fetchCatalogSubjectsSources(client);

	const classGradeLevelById = new Map(classes.map(entry => [entry.id, entry.gradeLevelId]));
	const gradeLevelNameById = new Map(gradeLevels.map(entry => [entry.id, entry.name]));
	const subjectById = new Map(
		sources.subjectsRaw.map(subject => [subject.id, { name: subject.name }]),
	);

	const classSubjectsLinkedToGradeLevelCatalog = sources.classSubjectsRaw.some(
		classSubject => typeof classSubject.gradeLevelSubjectId === 'string'
			&& classSubject.gradeLevelSubjectId.length > 0,
	);

	let targets: ChapterImportCatalogTarget[];
	if (sources.gradeLevelSubjectsRaw.length > 0) {
		targets = buildFromGradeLevelSubjects(
			sources.gradeLevelSubjectsRaw,
			sources.classSubjectsRaw,
			subjectById,
			gradeLevelNameById,
		);
	}
	else if (classSubjectsLinkedToGradeLevelCatalog) {
		targets = [];
	}
	else {
		targets = buildLegacyCatalogTargets(
			sources.classSubjectsRaw,
			classGradeLevelById,
			subjectById,
			gradeLevelNameById,
		);
	}

	return targets.sort((left, right) => {
		const byLevel = left.gradeLevelName.localeCompare(right.gradeLevelName, 'fr');
		if (byLevel !== 0) {
			return byLevel;
		}
		return left.subjectName.localeCompare(right.subjectName, 'fr');
	});
}

export function uniqueChapterSubjectNames(
	targets: readonly ChapterImportCatalogTarget[],
): string[] {
	return [...new Set(targets.map(entry => entry.subjectName))].sort((left, right) =>
		left.localeCompare(right, 'fr'),
	);
}
