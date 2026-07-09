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

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type SubjectRaw = components['schemas']['Subject'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectMatterRaw = components['schemas']['SubjectMatter'];

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
	const descriptions = subjectMattersRaw
		.filter(matter => matter.subjectId === subject.id && matter.description)
		.sort((left, right) => left.sequenceOrder - right.sequenceOrder)
		.map(matter => matter.description as string);

	if (descriptions.length > 0) {
		return descriptions.join(' ');
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

			return {
				id: classSubject.id,
				classId: classSubject.classGroupId,
				name: subject.name,
				teacher: teacherNameForClassSubjectFromSources(
					classSubject.id,
					sources,
				),
				hoursPerWeek: hoursPerWeekForSubject(subject, classSubject, sources.subjectMattersRaw),
				color: subjectColor(subject),
				description: descriptionForSubject(subject, sources.subjectMattersRaw),
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
