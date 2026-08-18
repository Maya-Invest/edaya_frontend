import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ClassSubjectInstructorSources } from '$lib/api/teacher-display';
import type { CatalogChapter, Subject, SubjectCategory } from '$lib/types/school';
import type { EntityQuery } from '@maya-invest/edaya-api-client';
import {
	classGroupScope,
	classSubjectsForClasses,
	entitiesByIds,
	gradeLevelSubjectMattersForGradeLevelSubjects,
	gradeLevelSubjectsForLevels,
	listAllEntityPages,
	schoolScopedEntityList,
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

const SUBJECTS_PARENT_SCOPE
	= 'Subject catalog loads school-owned parents, then child rows by those ids.';

async function listPages<T>(
	list: (query: EntityQuery) => Promise<T[] | null | undefined>,
	baseQuery: EntityQuery,
): Promise<T[]> {
	return listAllEntityPages(
		async query => safeOptionalEntityList(() => list(query)),
		{ baseQuery },
	);
}

async function listPagesForIds<T>(
	ids: readonly string[],
	list: (query: EntityQuery) => Promise<T[] | null | undefined>,
	baseQuery: EntityQuery,
): Promise<T[]> {
	if (ids.length === 0) {
		return [];
	}
	return listPages(list, baseQuery);
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
): number | null {
	if (typeof gradeLevelSubject.periodsPerWeek === 'number' && gradeLevelSubject.periodsPerWeek > 0) {
		return gradeLevelSubject.periodsPerWeek;
	}

	const estimatedHours = subjectMattersRaw
		.filter(matter => matter.subjectId === subject.id)
		.reduce((total, matter) => total + (matter.estimatedHours ?? 0), 0);

	if (estimatedHours > 0) {
		return estimatedHours;
	}

	return null;
}

function catalogSubjectKey(gradeLevelId: string, subjectName: string): string {
	return `${gradeLevelId}:${subjectName.trim().toLowerCase()}`;
}

export function subjectMattersLinkedToGradeLevelSubject<T extends { id: string; sequenceOrder: number }>(
	gradeLevelSubjectId: string,
	subjectMattersRaw: readonly T[],
	gradeLevelSubjectMattersRaw: readonly GradeLevelSubjectMatterRaw[],
): T[] {
	const linkedMatterIds = new Set(
		gradeLevelSubjectMattersRaw
			.filter(link => link.gradeLevelSubjectId === gradeLevelSubjectId)
			.map(link => link.subjectMatterId),
	);

	return [...subjectMattersRaw]
		.filter(matter => linkedMatterIds.has(matter.id))
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder);
}

export function catalogChaptersForGradeLevelSubject(
	gradeLevelSubjectId: string,
	subjectMattersRaw: readonly SubjectMatterRaw[],
	gradeLevelSubjectMattersRaw: readonly GradeLevelSubjectMatterRaw[],
): CatalogChapter[] {
	return subjectMattersLinkedToGradeLevelSubject(
		gradeLevelSubjectId,
		subjectMattersRaw,
		gradeLevelSubjectMattersRaw,
	).map(matter => ({
		id: matter.id,
		name: matter.name,
		description: matter.description ?? null,
		sequenceOrder: matter.sequenceOrder,
		estimatedHours: matter.estimatedHours ?? null,
	}));
}

export function catalogChapterNamesForGradeLevelSubject(
	gradeLevelSubjectId: string,
	subjectMattersRaw: readonly SubjectMatterRaw[],
	gradeLevelSubjectMattersRaw: readonly GradeLevelSubjectMatterRaw[],
): string[] {
	return catalogChaptersForGradeLevelSubject(
		gradeLevelSubjectId,
		subjectMattersRaw,
		gradeLevelSubjectMattersRaw,
	).map(matter => matter.name);
}

function mapCatalogSubjectEntry(input: {
	id: string;
	gradeLevelId: string;
	subject: SubjectRaw;
	hoursPerWeek: number | null;
	gradeLevelSubject?: GradeLevelSubjectRaw;
	subjectMattersRaw: SubjectMatterRaw[];
	gradeLevelSubjectMattersRaw: readonly GradeLevelSubjectMatterRaw[];
}): Subject {
	const catalogChapters = catalogChaptersForGradeLevelSubject(
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
		description: buildSubjectChapterSummary(catalogChapters.map(c => c.name))
			|| descriptionForSubject(input.subject, linkedMatters),
		category: subjectCategory(input.subject),
		code: input.subject.code ?? null,
		shortName: input.subject.shortName ?? null,
		defaultCoefficient: input.subject.defaultCoefficient
			?? input.gradeLevelSubject?.coefficient
			?? null,
		periodsPerWeek: input.gradeLevelSubject?.periodsPerWeek ?? null,
		minPeriodSpan: input.gradeLevelSubject?.minPeriodSpan ?? null,
		maxPeriodSpan: input.gradeLevelSubject?.maxPeriodSpan ?? null,
		catalogChapters,
	};
}

export async function fetchCatalogSubjectsSources(
	client: SchoolClient,
	schoolId: string,
): Promise<CatalogSubjectsSources> {
	if (!schoolId) {
		return {
			gradeLevelSubjectsRaw: [],
			classSubjectsRaw: [],
			subjectsRaw: [],
			subjectMattersRaw: [],
			gradeLevelSubjectMattersRaw: [],
		};
	}

	const parentQuery = schoolScopedEntityList(schoolId, SUBJECTS_PARENT_SCOPE);
	const [gradeLevelsRaw, classGroupsRaw, subjectsRaw] = await Promise.all([
		listPages(query => client.entities.gradeLevels.list(query), parentQuery),
		listPages(query => client.entities.classGroups.list(query), parentQuery),
		listPages(query => client.entities.subjects.list(query), schoolSubjectsCatalogList(schoolId)),
	]);
	const gradeLevelIds = uniqueIds(gradeLevelsRaw.map(level => level.id));
	const classGroupIds = uniqueIds(classGroupsRaw.map(classGroup => classGroup.id));
	const subjectIds = uniqueIds(subjectsRaw.map(subject => subject.id));

	const [gradeLevelSubjectsRaw, classSubjectsRaw, subjectMattersRaw] = await Promise.all([
		listPagesForIds(
			gradeLevelIds,
			query => client.entities.gradeLevelSubjects.list(query),
			gradeLevelSubjectsForLevels(gradeLevelIds),
		),
		listPagesForIds(
			classGroupIds,
			query => client.entities.classSubjects.list(query),
			classSubjectsForClasses(classGroupIds),
		),
		listPagesForIds(
			subjectIds,
			query => client.entities.subjectMatters.list(query),
			subjectMattersForSubjects(subjectIds),
		),
	]);
	const gradeLevelSubjectIds = uniqueIds(gradeLevelSubjectsRaw.map(entry => entry.id));
	const gradeLevelSubjectMattersRaw = await listPagesForIds(
		gradeLevelSubjectIds,
		query => client.entities.gradeLevelSubjectMatters.list(query),
		gradeLevelSubjectMattersForGradeLevelSubjects(gradeLevelSubjectIds),
	);

	return {
		gradeLevelSubjectsRaw,
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
		gradeLevelSubjectMattersRaw,
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
				gradeLevelSubject,
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
	schoolId: string,
	classGradeLevelById: Readonly<Record<string, string>>,
): Promise<Subject[]> {
	const sources = await fetchCatalogSubjectsSources(client, schoolId);
	return mapCatalogSubjects(sources, classGradeLevelById);
}

function hoursPerWeekForSubject(
	subject: SubjectRaw,
	classSubject: ClassSubjectRaw,
	subjectMattersRaw: SubjectMatterRaw[],
): number | null {
	if (typeof classSubject.periodsPerWeek === 'number' && classSubject.periodsPerWeek > 0) {
		return classSubject.periodsPerWeek;
	}

	const estimatedHours = subjectMattersRaw
		.filter(matter => matter.subjectId === subject.id)
		.reduce((total, matter) => total + (matter.estimatedHours ?? 0), 0);

	if (estimatedHours > 0) {
		return estimatedHours;
	}

	return null;
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

export async function fetchSchoolSubjectsSources(
	client: SchoolClient,
	schoolId: string,
): Promise<ClassSubjectsSources> {
	if (!schoolId) {
		return {
			classSubjectsRaw: [],
			subjectsRaw: [],
			subjectMattersRaw: [],
			...(await fetchClassSubjectInstructorSourcesBundle(client, [])),
		};
	}

	const parentQuery = schoolScopedEntityList(schoolId, SUBJECTS_PARENT_SCOPE);
	const [classGroupsRaw, subjectsRaw] = await Promise.all([
		listPages(query => client.entities.classGroups.list(query), parentQuery),
		listPages(query => client.entities.subjects.list(query), schoolSubjectsCatalogList(schoolId)),
	]);
	const classGroupIds = uniqueIds(classGroupsRaw.map(classGroup => classGroup.id));
	const subjectIds = uniqueIds(subjectsRaw.map(subject => subject.id));
	const [classSubjectsRaw, subjectMattersRaw] = await Promise.all([
		listPagesForIds(
			classGroupIds,
			query => client.entities.classSubjects.list(query),
			classSubjectsForClasses(classGroupIds),
		),
		listPagesForIds(
			subjectIds,
			query => client.entities.subjectMatters.list(query),
			subjectMattersForSubjects(subjectIds),
		),
	]);
	const classSubjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.id));
	const instructorSources = await fetchClassSubjectInstructorSourcesBundle(client, classSubjectIds);

	return {
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
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

	const mapped: Subject[] = [];
	for (const classSubject of sources.classSubjectsRaw) {
		if (classSubject.classGroupId !== classGroupId) {
			continue;
		}
		const subject = subjectById.get(classSubject.subjectId);
		if (!subject) {
			continue;
		}
		const teacher = teacherNameForClassSubjectFromSources(classSubject.id, sources);
		mapped.push({
			id: classSubject.id,
			classId: classSubject.classGroupId,
			name: subject.name,
			teacher,
			hoursPerWeek: hoursPerWeekForSubject(subject, classSubject, sources.subjectMattersRaw),
			color: subjectColor(subject),
			description: teacher,
			category: subjectCategory(subject),
			code: subject.code ?? null,
			shortName: subject.shortName ?? null,
			defaultCoefficient: classSubject.coefficient ?? subject.defaultCoefficient ?? null,
			isOffered: classSubject.isOffered,
			completedPercentage: classSubject.completedPercentage ?? null,
			periodsPerWeek: classSubject.periodsPerWeek ?? null,
			minPeriodSpan: classSubject.minPeriodSpan ?? null,
			maxPeriodSpan: classSubject.maxPeriodSpan ?? null,
		});
	}
	return mapped.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
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
