import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject, SubjectCategory } from '$lib/types/school';
import {
	assignmentsForClassSubjects,
	classGroupScope,
	entitiesByIds,
	schoolSubjectsCatalogList,
	staffMembersByIds,
	subjectMattersForSubjects,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type SubjectRaw = components['schemas']['Subject'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectMatterRaw = components['schemas']['SubjectMatter'];
type StaffMemberRaw = components['schemas']['StaffMember'];
type StaffAssignmentRaw = components['schemas']['StaffAssignment'];

export interface ClassSubjectsSources {
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	subjectMattersRaw: SubjectMatterRaw[];
	staffMembersRaw: StaffMemberRaw[];
	staffAssignmentsRaw: StaffAssignmentRaw[];
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

function teacherNameForClassSubject(
	classSubjectId: string,
	staffAssignmentsRaw: StaffAssignmentRaw[],
	staffMembersRaw: StaffMemberRaw[],
): string {
	const assignment = staffAssignmentsRaw.find(entry => entry.classSubjectId === classSubjectId);
	if (!assignment) {
		return 'Non assigné';
	}

	const teacher = staffMembersRaw.find(member => member.id === assignment.staffId);
	if (!teacher) {
		return 'Non assigné';
	}

	return `${teacher.firstName} ${teacher.lastName}`;
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
		staffMembersRaw,
		staffAssignmentsRaw,
	] = await Promise.all([
		client.entities.classSubjects.list(schoolSubjectsCatalogList()),
		client.entities.subjects.list(schoolSubjectsCatalogList()),
		client.entities.subjectMatters.list(schoolSubjectsCatalogList()),
		safeOptionalEntityList(() => client.entities.staffMembers.list(schoolSubjectsCatalogList())),
		safeOptionalEntityList(() => client.entities.staffAssignments.list(schoolSubjectsCatalogList())),
	]);

	return {
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
		staffMembersRaw: staffMembersRaw ?? [],
		staffAssignmentsRaw: staffAssignmentsRaw ?? [],
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
		staffAssignmentsRaw,
	] = await Promise.all([
		subjectIds.length > 0
			? client.entities.subjects.list(entitiesByIds(subjectIds))
			: Promise.resolve([]),
		subjectIds.length > 0
			? client.entities.subjectMatters.list(subjectMattersForSubjects(subjectIds))
			: Promise.resolve([]),
		classSubjectIds.length > 0
			? safeOptionalEntityList(() =>
					client.entities.staffAssignments.list(assignmentsForClassSubjects(classSubjectIds)))
			: Promise.resolve([]),
	]);

	const staffIds = uniqueIds((staffAssignmentsRaw ?? []).map(assignment => assignment.staffId));
	const staffMembersRaw = staffIds.length > 0
		? await safeOptionalEntityList(() => client.entities.staffMembers.list(staffMembersByIds(staffIds)))
		: [];

	return {
		classSubjectsRaw,
		subjectsRaw: subjectsRaw ?? [],
		subjectMattersRaw: subjectMattersRaw ?? [],
		staffMembersRaw: staffMembersRaw ?? [],
		staffAssignmentsRaw: staffAssignmentsRaw ?? [],
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
				teacher: teacherNameForClassSubject(
					classSubject.id,
					sources.staffAssignmentsRaw,
					sources.staffMembersRaw,
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
