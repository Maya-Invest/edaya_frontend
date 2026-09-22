import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ClassSubjectInstructorSources } from '$lib/api/teacher-display';
import type { CatalogChapter, Subject } from '$lib/types/school';
import type { EntityQuery } from '@maya-invest/edaya-api-client';
import {
	classGroupScope,
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
	schoolScopedEntityList,
	schoolSubjectsCatalogList,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import {
	fetchClassSubjectInstructorSourcesBundle,

	teacherNameForClassSubject,
} from '$lib/api/teacher-display';
import { buildSubjectChapterSummary } from '$lib/subjects/chapter-summary';
import { categoryNameById, loadSubjectCategories } from '$lib/api/subject-categories-data';

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
	categoryNameById?: Record<string, string>;
}

export interface ClassSubjectsSources extends ClassSubjectInstructorSources {
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	subjectMattersRaw: SubjectMatterRaw[];
	categoryNameById?: Record<string, string>;
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
	field: string,
): Promise<T[]> {
	return listAllEntityPagesForIdFilters(
		async query => safeOptionalEntityList(() => list(query)),
		[{ field, ids }],
	);
}

const DEFAULT_CATEGORY_BY_SLUG: Record<string, string> = {
	scientifique: 'Scientifique',
	litteraire: 'Littéraire',
	langues: 'Langues',
	'sciences-humaines': 'Sciences humaines',
	sport: 'Sport',
	arts: 'Arts',
};

const SUBJECT_COLORS = new Set<Subject['color']>(['mint', 'sky', 'warm']);

function subjectCategory(raw: SubjectRaw, names?: Record<string, string>): string {
	const fromCatalog = names?.[raw.categoryId];
	if (fromCatalog) {
		return fromCatalog;
	}
	const slug = raw.categoryId.split(':subject-category:').at(-1) ?? '';
	return DEFAULT_CATEGORY_BY_SLUG[slug] ?? '';
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
	categoryNameById?: Record<string, string>;
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
		categoryId: input.subject.categoryId,
		category: subjectCategory(input.subject, input.categoryNameById),
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
			'gradeLevelId',
		),
		listPagesForIds(
			classGroupIds,
			query => client.entities.classSubjects.list(query),
			'classGroupId',
		),
		listPagesForIds(
			subjectIds,
			query => client.entities.subjectMatters.list(query),
			'subjectId',
		),
	]);
	const gradeLevelSubjectIds = uniqueIds(gradeLevelSubjectsRaw.map(entry => entry.id));
	const gradeLevelSubjectMattersRaw = await listPagesForIds(
		gradeLevelSubjectIds,
		query => client.entities.gradeLevelSubjectMatters.list(query),
		'gradeLevelSubjectId',
	);

	return {
		gradeLevelSubjectsRaw,
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
		gradeLevelSubjectMattersRaw,
		categoryNameById: categoryNameById(await loadSubjectCategories(client, schoolId)),
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
				categoryNameById: sources.categoryNameById,
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
			categoryNameById: sources.categoryNameById,
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
			'classGroupId',
		),
		listPagesForIds(
			subjectIds,
			query => client.entities.subjectMatters.list(query),
			'subjectId',
		),
	]);
	const classSubjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.id));
	const instructorSources = await fetchClassSubjectInstructorSourcesBundle(client, classSubjectIds);

	return {
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
		categoryNameById: categoryNameById(await loadSubjectCategories(client, schoolId)),
		...instructorSources,
	};
}

export async function fetchClassSubjectsSources(
	client: SchoolClient,
	classGroupId: string,
): Promise<ClassSubjectsSources> {
	const classSubjectsRaw = await listAllEntityPages(
		query => client.entities.classSubjects.list(query),
		{ baseQuery: classGroupScope(classGroupId) },
	);
	const classSubjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.id));
	const subjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.subjectId));

	const [
		subjectsRaw,
		subjectMattersRaw,
	] = await Promise.all([
		listAllEntityPagesByIds(query => client.entities.subjects.list(query), subjectIds),
		listPagesForIds(
			subjectIds,
			query => client.entities.subjectMatters.list(query),
			'subjectId',
		),
	]);

	const instructorSources = await fetchClassSubjectInstructorSourcesBundle(client, classSubjectIds);
	const schoolId = subjectsRaw[0]?.schoolId ?? '';

	return {
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
		...(schoolId
			? { categoryNameById: categoryNameById(await loadSubjectCategories(client, schoolId)) }
			: {}),
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
			categoryId: subject.categoryId,
			category: subjectCategory(subject, sources.categoryNameById),
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

	const classSubjectsRaw = await listAllEntityPagesByIds(
		query => client.entities.classSubjects.list(query),
		ids,
	);
	if (classSubjectsRaw.length === 0) {
		return [];
	}

	const subjectIds = uniqueIds(classSubjectsRaw.map(entry => entry.subjectId));
	const [subjectsRaw, subjectMattersRaw] = await Promise.all([
		listAllEntityPagesByIds(query => client.entities.subjects.list(query), subjectIds),
		listPagesForIds(
			subjectIds,
			query => client.entities.subjectMatters.list(query),
			'subjectId',
		),
	]);
	const fetchedClassSubjectIds = uniqueIds(classSubjectsRaw.map(entry => entry.id));
	const instructorSources = await fetchClassSubjectInstructorSourcesBundle(client, fetchedClassSubjectIds);
	const sources: ClassSubjectsSources = {
		classSubjectsRaw,
		subjectsRaw,
		subjectMattersRaw,
		...instructorSources,
	};
	const classIds = uniqueIds(classSubjectsRaw.map(entry => entry.classGroupId));
	const idSet = new Set(ids);
	return classIds
		.flatMap(classId => mapClassSubjects(classId, sources))
		.filter(subject => idSet.has(subject.id));
}
