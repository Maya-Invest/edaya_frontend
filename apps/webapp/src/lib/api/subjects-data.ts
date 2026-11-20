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
import { categoryNameById, loadSubjectCategories } from '$lib/api/subject-categories-data';
import {
	fetchClassSubjectInstructorSourcesBundle,

	teacherNameForClassSubject,
} from '$lib/api/teacher-display';
import { buildSubjectChapterSummary } from '$lib/subjects/chapter-summary';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type SubjectRaw = components['schemas']['Subject'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectMatterRaw = components['schemas']['SubjectMatter'];

export interface CatalogSubjectsSources {
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	subjectMattersRaw: SubjectMatterRaw[];
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
	'scientifique': 'Scientifique',
	'litteraire': 'Littéraire',
	'langues': 'Langues',
	'sciences-humaines': 'Sciences humaines',
	'sport': 'Sport',
	'arts': 'Arts',
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

export function subjectMattersForSubject<T extends { subjectId: string; sequenceOrder: number }>(
	subjectId: string,
	subjectMattersRaw: readonly T[],
): T[] {
	return subjectMattersRaw.filter(matter => matter.subjectId === subjectId)
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder);
}

export function catalogChaptersForSubject(subjectId: string, matters: readonly SubjectMatterRaw[]): CatalogChapter[] {
	return subjectMattersForSubject(subjectId, matters).map(matter => ({
		id: matter.id,
		name: matter.name,
		description: matter.description ?? null,
		sequenceOrder: matter.sequenceOrder,
		estimatedHours: matter.estimatedHours ?? null,
	}));
}

export function catalogChapterNamesForSubject(subjectId: string, matters: readonly SubjectMatterRaw[]): string[] {
	return catalogChaptersForSubject(subjectId, matters).map(matter => matter.name);
}

export type GradeSubjectOption = Pick<SubjectRaw, 'id' | 'gradeLevelId' | 'name'>;

function catalogSubjectQuery(schoolId: string, academicYearId?: string) {
	return { ...schoolSubjectsCatalogList(schoolId), ...(academicYearId ? { academicYearId } : {}) };
}

export async function fetchGradeSubjectOptions(client: SchoolClient, schoolId: string, academicYearId?: string, signal?: AbortSignal): Promise<GradeSubjectOption[]> {
	const subjects = await safeOptionalEntityList(() => listAllEntityPages(
		query => client.entities.subjects.list(query),
		{ baseQuery: catalogSubjectQuery(schoolId, academicYearId), signal },
	));
	return subjects.map(({ id, gradeLevelId, name }) => ({ id, gradeLevelId, name }));
}

export async function fetchCatalogSubjectsSources(client: SchoolClient, schoolId: string, academicYearId?: string): Promise<CatalogSubjectsSources> {
	if (!schoolId)
		return { classSubjectsRaw: [], subjectsRaw: [], subjectMattersRaw: [] };
	const subjectsRaw = await listPages(query => client.entities.subjects.list(query), catalogSubjectQuery(schoolId, academicYearId));
	const ids = subjectsRaw.map(subject => subject.id);
	const [classSubjectsRaw, subjectMattersRaw, categories] = await Promise.all([
		listPagesForIds(ids, query => client.entities.classSubjects.list(query), 'subjectId'),
		listPagesForIds(ids, query => client.entities.subjectMatters.list(query), 'subjectId'),
		loadSubjectCategories(client, schoolId),
	]);
	return { subjectsRaw, classSubjectsRaw, subjectMattersRaw, categoryNameById: categoryNameById(categories) };
}

export function mapCatalogSubjects(sources: CatalogSubjectsSources): Subject[] {
	return sources.subjectsRaw.map(subject => ({
		id: subject.id,
		subjectId: subject.id,
		classId: subject.gradeLevelId,
		gradeLevelId: subject.gradeLevelId,
		name: subject.name,
		teacher: '',
		hoursPerWeek: subject.periodsPerWeek ?? null,
		color: subjectColor(subject),
		description: descriptionForSubject(subject, sources.subjectMattersRaw),
		categoryId: subject.categoryId,
		category: subjectCategory(subject, sources.categoryNameById),
		disciplineId: subject.disciplineId ?? null,
		isOptional: subject.isOptional,
		shortName: subject.shortName ?? null,
		coefficient: subject.coefficient ?? null,
		reportModuleId: subject.reportModuleId,
		reportOrder: subject.reportOrder,
		periodsPerWeek: subject.periodsPerWeek ?? null,
		minPeriodSpan: subject.minPeriodSpan ?? null,
		maxPeriodSpan: subject.maxPeriodSpan ?? null,
		catalogChapters: catalogChaptersForSubject(subject.id, sources.subjectMattersRaw),
	})).sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export async function loadCatalogSubjects(client: SchoolClient, schoolId: string): Promise<Subject[]> {
	return mapCatalogSubjects(await fetchCatalogSubjectsSources(client, schoolId));
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

	if (subject.shortName) {
		return `${subject.name} (${subject.shortName})`;
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
			subjectId: subject.id,
			classId: classSubject.classGroupId,
			name: subject.name,
			teacher,
			hoursPerWeek: hoursPerWeekForSubject(subject, classSubject, sources.subjectMattersRaw),
			color: subjectColor(subject),
			description: teacher,
			categoryId: subject.categoryId,
			category: subjectCategory(subject, sources.categoryNameById),
			disciplineId: subject.disciplineId ?? null,
			isOptional: subject.isOptional,
			shortName: subject.shortName ?? null,
			coefficient: classSubject.coefficient ?? subject.coefficient ?? null,
			isOffered: classSubject.isOffered,
			participationRevision: classSubject.participationRevision,
			chapterCount: classSubject.chapterCount,
			completedChapterCount: classSubject.completedChapterCount,
			ongoingChapterCount: classSubject.ongoingChapterCount,
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

/** Compact labels shared by the teacher assignment, evaluation and feedback drawers. */
export async function loadClassSubjectLabels(client: SchoolClient, classSubjectIds: readonly string[]) {
	const offerings = await listAllEntityPagesByIds(
		query => safeOptionalEntityList(() => client.entities.classSubjects.list(query)),
		classSubjectIds,
	);
	const subjects = await listAllEntityPagesByIds(
		query => safeOptionalEntityList(() => client.entities.subjects.list(query)),
		offerings.map(row => row.subjectId),
	);
	const names = new Map(subjects.map(row => [row.id, row.name]));
	return offerings.flatMap((row) => {
		const name = names.get(row.subjectId);
		return name === undefined ? [] : [{ id: row.id, classId: row.classGroupId, name }];
	});
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
