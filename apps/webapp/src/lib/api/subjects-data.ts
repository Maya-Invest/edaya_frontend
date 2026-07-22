import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ClassSubjectInstructorSources } from '$lib/api/teacher-display';
import type { Subject, SubjectCategory } from '$lib/types/school';
import {
	classGroupScope,
	entitiesByIds,
	schoolSubjectsCatalogList,
	subjectMattersForSubjects,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import {
	fetchClassSubjectInstructorSourcesBundle,

	teacherNameForClassSubject,
} from '$lib/api/teacher-display';
import { buildSubjectChapterSummary } from '$lib/subjects/chapter-summary';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type SubjectRaw = components['schemas']['Subject'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectMatterRaw = components['schemas']['SubjectMatter'];
type GradeLevelSubjectRaw = components['schemas']['GradeLevelSubject'];
type GradeLevelSubjectMatterRaw = components['schemas']['GradeLevelSubjectMatter'];

export interface CatalogSubjectsSources {
	gradeLevelSubjectsRaw: GradeLevelSubjectRaw[];
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	subjectMattersRaw: SubjectMatterRaw[];
	gradeLevelSubjectMattersRaw: GradeLevelSubjectMatterRaw[];
}

export interface ClassSubjectsSources extends ClassSubjectInstructorSources {
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	subjectMattersRaw: SubjectMatterRaw[];
}

const SUBJECT_CATEGORIES = new Set<SubjectCategory>([
	'Scientifique',
	'Littéraire',
	'Langues',
	'Sciences humaines',
	'Sport',
	'Arts',
]);

const SUBJECT_COLORS = new Set<Subject['color']>(['mint', 'sky', 'warm']);

function subjectCategory(raw: SubjectRaw): SubjectCategory {
	if (raw.category && SUBJECT_CATEGORIES.has(raw.category as SubjectCategory)) {
		return raw.category as SubjectCategory;
	}
	return 'Scientifique';
}

function subjectColor(raw: SubjectRaw): Subject['color'] {
	if (raw.color && SUBJECT_COLORS.has(raw.color as Subject['color'])) {
		return raw.color as Subject['color'];
	}
	return 'mint';
}

function teacherNameForClassSubjectFromSources(
	classSubjectId: string,
	sources: ClassSubjectsSources,
): string {
	return teacherNameForClassSubject(classSubjectId, sources);
}

function hoursPerWeekForGradeLevelSubject(
	subject: SubjectRaw,
	gradeLevelSubject: GradeLevelSubjectRaw,
	subjectMattersRaw: SubjectMatterRaw[],
): number {
	if (typeof gradeLevelSubject.periodsPerWeek === 'number' && gradeLevelSubject.periodsPerWeek > 0) {
		return gradeLevelSubject.periodsPerWeek;
	}

	const estimatedHours = subjectMattersRaw
		.filter(matter => matter.subjectId === subject.id)
		.reduce((total, matter) => total + (matter.estimatedHours ?? 0), 0);

	if (estimatedHours > 0) {
		return estimatedHours;
	}

	const coefficient = gradeLevelSubject.coefficient ?? subject.defaultCoefficient;
	if (typeof coefficient === 'number' && coefficient > 0) {
		return Math.max(1, Math.round(coefficient * 2));
	}

	return 3;
}

function catalogSubjectKey(gradeLevelId: string, subjectName: string): string {
	return `${gradeLevelId}:${subjectName.trim().toLowerCase()}`;
}

export function subjectMattersLinkedToGradeLevelSubject(
	gradeLevelSubjectId: string,
	subjectMattersRaw: readonly SubjectMatterRaw[],
	gradeLevelSubjectMattersRaw: readonly GradeLevelSubjectMatterRaw[],
): SubjectMatterRaw[] {
	const linkedMatterIds = new Set(
		gradeLevelSubjectMattersRaw
			.filter(link => link.gradeLevelSubjectId === gradeLevelSubjectId)
			.map(link => link.subjectMatterId),
	);

	return [...subjectMattersRaw]
		.filter(matter => linkedMatterIds.has(matter.id))
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder);
}

function catalogChapterNamesForGradeLevelSubject(
	gradeLevelSubjectId: string,
	subjectMattersRaw: SubjectMatterRaw[],
	gradeLevelSubjectMattersRaw: readonly GradeLevelSubjectMatterRaw[],
): string[] {
	return subjectMattersLinkedToGradeLevelSubject(
		gradeLevelSubjectId,
		subjectMattersRaw,
		gradeLevelSubjectMattersRaw,
	).map(matter => matter.name);
}

function mapCatalogSubjectEntry(input: {
	id: string;
	gradeLevelId: string;
	subject: SubjectRaw;
	hoursPerWeek: number;
	subjectMattersRaw: SubjectMatterRaw[];
	gradeLevelSubjectMattersRaw: readonly GradeLevelSubjectMatterRaw[];
}): Subject {
	const catalogChapters = catalogChapterNamesForGradeLevelSubject(
		input.id,
		input.subjectMattersRaw,
		input.gradeLevelSubjectMattersRaw,
	);
	const linkedMatters = subjectMattersLinkedToGradeLevelSubject(
		input.id,
		input.subjectMattersRaw,
		input.gradeLevelSubjectMattersRaw,
	);
	return {
		id: input.id,
		classId: input.gradeLevelId,
		gradeLevelId: input.gradeLevelId,
		name: input.subject.name,
		teacher: '',
		hoursPerWeek: input.hoursPerWeek,
		color: subjectColor(input.subject),
		description: buildSubjectChapterSummary(catalogChapters) || descriptionForSubject(input.subject, linkedMatters),
		category: subjectCategory(input.subject),
		catalogChapters,
	};
}

export async function fetchCatalogSubjectsSources(client: SchoolClient): Promise<CatalogSubjectsSources> {
	const [
		gradeLevelSubjectsRaw,
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
		gradeLevelSubjectMattersRaw,
	] = await Promise.all([
		safeOptionalEntityList(() => client.entities.gradeLevelSubjects.list(schoolSubjectsCatalogList())),
		safeOptionalEntityList(() => client.entities.classSubjects.list(schoolSubjectsCatalogList())),
		safeOptionalEntityList(() => client.entities.subjects.list(schoolSubjectsCatalogList())),
		safeOptionalEntityList(() => client.entities.subjectMatters.list(schoolSubjectsCatalogList())),
		safeOptionalEntityList(() => client.entities.gradeLevelSubjectMatters.list(schoolSubjectsCatalogList())),
	]);

	return {
		gradeLevelSubjectsRaw: gradeLevelSubjectsRaw ?? [],
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
		gradeLevelSubjectMattersRaw: gradeLevelSubjectMattersRaw ?? [],
	};
}

export function mapCatalogSubjects(
	sources: CatalogSubjectsSources,
	classGradeLevelById: Readonly<Record<string, string>>,
): Subject[] {
	const subjectById = new Map(sources.subjectsRaw.map(subject => [subject.id, subject]));
	const classSubjectsLinkedToGradeLevelCatalog = sources.classSubjectsRaw.some(
		classSubject => typeof classSubject.gradeLevelSubjectId === 'string'
			&& classSubject.gradeLevelSubjectId.length > 0,
	);

	if (sources.gradeLevelSubjectsRaw.length > 0) {
		const seen = new Set<string>();
		const entries: Subject[] = [];
		for (const gradeLevelSubject of sources.gradeLevelSubjectsRaw) {
			const subject = subjectById.get(gradeLevelSubject.subjectId);
			if (!subject) {
				continue;
			}
			const key = catalogSubjectKey(gradeLevelSubject.gradeLevelId, subject.name);
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			entries.push(mapCatalogSubjectEntry({
				id: gradeLevelSubject.id,
				gradeLevelId: gradeLevelSubject.gradeLevelId,
				subject,
				hoursPerWeek: hoursPerWeekForGradeLevelSubject(subject, gradeLevelSubject, sources.subjectMattersRaw),
				subjectMattersRaw: sources.subjectMattersRaw,
				gradeLevelSubjectMattersRaw: sources.gradeLevelSubjectMattersRaw,
			}));
		}
		return entries.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
	}

	// Legacy schools without grade-level catalog rows. When class subjects already
	// reference gradeLevelSubjectId, an empty GLS list means an empty catalog — do
	// not rebuild deleted entries from class subjects.
	if (classSubjectsLinkedToGradeLevelCatalog) {
		return [];
	}

	const seen = new Set<string>();
	const entries: Subject[] = [];
	for (const classSubject of sources.classSubjectsRaw) {
		const gradeLevelId = classGradeLevelById[classSubject.classGroupId];
		const subject = subjectById.get(classSubject.subjectId);
		if (!gradeLevelId || !subject) {
			continue;
		}
		const key = catalogSubjectKey(gradeLevelId, subject.name);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		entries.push(mapCatalogSubjectEntry({
			id: classSubject.gradeLevelSubjectId ?? `catalog-${gradeLevelId}-${classSubject.subjectId}`,
			gradeLevelId,
			subject,
			hoursPerWeek: hoursPerWeekForSubject(subject, classSubject, sources.subjectMattersRaw),
			subjectMattersRaw: sources.subjectMattersRaw,
			gradeLevelSubjectMattersRaw: sources.gradeLevelSubjectMattersRaw,
		}));
	}

	return entries.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export async function loadCatalogSubjects(
	client: SchoolClient,
	classGradeLevelById: Readonly<Record<string, string>>,
): Promise<Subject[]> {
	const sources = await fetchCatalogSubjectsSources(client);
	return mapCatalogSubjects(sources, classGradeLevelById);
}

function hoursPerWeekForSubject(
	subject: SubjectRaw,
	classSubject: ClassSubjectRaw,
	subjectMattersRaw: SubjectMatterRaw[],
): number {
	const estimatedHours = subjectMattersRaw
		.filter(matter => matter.subjectId === subject.id)
		.reduce((total, matter) => total + (matter.estimatedHours ?? 0), 0);

	if (estimatedHours > 0) {
		return estimatedHours;
	}

	const coefficient = classSubject.coefficient ?? subject.defaultCoefficient;
	if (typeof coefficient === 'number' && coefficient > 0) {
		return Math.max(1, Math.round(coefficient * 2));
	}

	return 3;
}

function descriptionForSubject(
	subject: SubjectRaw,
	subjectMattersRaw: SubjectMatterRaw[],
): string {
	const matters = subjectMattersRaw
		.filter(matter => matter.subjectId === subject.id)
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder);
	const summary = buildSubjectChapterSummary(matters.map(matter => matter.name));

	if (summary.length > 0) {
		return summary;
	}

	if (subject.code) {
		return `${subject.name} (${subject.code})`;
	}

	return subject.name;
}

export async function fetchSchoolSubjectsSources(client: SchoolClient): Promise<ClassSubjectsSources> {
	const [
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
	] = await Promise.all([
		safeOptionalEntityList(() => client.entities.classSubjects.list(schoolSubjectsCatalogList())),
		safeOptionalEntityList(() => client.entities.subjects.list(schoolSubjectsCatalogList())),
		safeOptionalEntityList(() => client.entities.subjectMatters.list(schoolSubjectsCatalogList())),
	]);
	const classSubjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.id));
	const instructorSources = await fetchClassSubjectInstructorSourcesBundle(client, classSubjectIds);

	return {
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
		...instructorSources,
	};
}

export async function fetchClassSubjectsSources(
	client: SchoolClient,
	classGroupId: string,
): Promise<ClassSubjectsSources> {
	const classSubjectsRaw = (await client.entities.classSubjects.list(classGroupScope(classGroupId))) ?? [];
	const classSubjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.id));
	const subjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.subjectId));

	const [
		subjectsRaw,
		subjectMattersRaw,
	] = await Promise.all([
		subjectIds.length > 0
			? client.entities.subjects.list(entitiesByIds(subjectIds))
			: Promise.resolve([]),
		subjectIds.length > 0
			? client.entities.subjectMatters.list(subjectMattersForSubjects(subjectIds))
			: Promise.resolve([]),
	]);

	const instructorSources = await fetchClassSubjectInstructorSourcesBundle(client, classSubjectIds);

	return {
		classSubjectsRaw,
		subjectsRaw: subjectsRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
		...instructorSources,
	};
}

export function mapClassSubjects(
	classGroupId: string,
	sources: ClassSubjectsSources,
): Subject[] {
	const subjectById = new Map(sources.subjectsRaw.map(subject => [subject.id, subject]));

	return sources.classSubjectsRaw
		.filter(classSubject => classSubject.classGroupId === classGroupId)
		.map((classSubject) => {
			const subject = subjectById.get(classSubject.subjectId);
			if (!subject) {
				return null;
			}

			const teacher = teacherNameForClassSubjectFromSources(
				classSubject.id,
				sources,
			);
			return {
				id: classSubject.id,
				classId: classSubject.classGroupId,
				name: subject.name,
				teacher,
				hoursPerWeek: hoursPerWeekForSubject(subject, classSubject, sources.subjectMattersRaw),
				color: subjectColor(subject),
				description: teacher,
				category: subjectCategory(subject),
			} satisfies Subject;
		})
		.filter((subject): subject is Subject => subject !== null)
		.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export function mapAllClassSubjects(sources: ClassSubjectsSources): Subject[] {
	const classIds = [...new Set(sources.classSubjectsRaw.map(entry => entry.classGroupId))];
	return classIds.flatMap(classId => mapClassSubjects(classId, sources));
}

export async function loadClassSubjects(client: SchoolClient, classGroupId: string): Promise<Subject[]> {
	const sources = await fetchClassSubjectsSources(client, classGroupId);
	return mapClassSubjects(classGroupId, sources);
}

export async function loadClassSubjectsByIds(
	client: SchoolClient,
	classSubjectIds: readonly string[],
): Promise<Subject[]> {
	const ids = uniqueIds(classSubjectIds.filter(Boolean));
	if (ids.length === 0) {
		return [];
	}

	const classSubjectsRaw = await client.entities.classSubjects.list(entitiesByIds(ids));
	if (classSubjectsRaw.length === 0) {
		return [];
	}

	const subjectIds = uniqueIds(classSubjectsRaw.map(entry => entry.subjectId));
	const [subjectsRaw, subjectMattersRaw] = await Promise.all([
		subjectIds.length > 0
			? client.entities.subjects.list(entitiesByIds(subjectIds))
			: Promise.resolve([]),
		subjectIds.length > 0
			? safeOptionalEntityList(() => client.entities.subjectMatters.list(subjectMattersForSubjects(subjectIds)))
			: Promise.resolve([]),
	]);
	const fetchedClassSubjectIds = uniqueIds(classSubjectsRaw.map(entry => entry.id));
	const instructorSources = await fetchClassSubjectInstructorSourcesBundle(client, fetchedClassSubjectIds);
	const sources: ClassSubjectsSources = {
		classSubjectsRaw,
		subjectsRaw: subjectsRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
		...instructorSources,
	};
	const classIds = uniqueIds(classSubjectsRaw.map(entry => entry.classGroupId));
	const idSet = new Set(ids);
	return classIds
		.flatMap(classId => mapClassSubjects(classId, sources))
		.filter(subject => idSet.has(subject.id));
}
