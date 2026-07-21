import type { getBrowserSchoolClient } from '$lib/api/school-client';
import {
	activeEnrollmentsForClass,
	classGroupScope,
	recordsForFieldIds,
	teacherAssignmentsForClassSubjects,
} from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

async function listOrEmpty<T>(load: () => Promise<T[] | null | undefined>): Promise<T[]> {
	return (await load()) ?? [];
}

async function deleteEntityIds(
	deleteOne: (id: string) => Promise<unknown>,
	batchDelete: ((input: { ids: string[] }) => Promise<unknown>) | undefined,
	ids: readonly string[],
): Promise<void> {
	const uniqueIds = [...new Set(ids.filter(Boolean))];
	if (uniqueIds.length === 0) {
		return;
	}
	if (batchDelete && uniqueIds.length > 1) {
		await batchDelete({ ids: uniqueIds });
		return;
	}
	for (const id of uniqueIds) {
		await deleteOne(id);
	}
}

export class ClassGroupDeleteBlockedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ClassGroupDeleteBlockedError';
	}
}

export async function cleanupClassGroupDependencies(
	client: SchoolClient,
	classGroupId: string,
): Promise<void> {
	const activeEnrollments = await listOrEmpty(() =>
		client.entities.enrollments.list(activeEnrollmentsForClass(classGroupId)),
	);
	if (activeEnrollments.length > 0) {
		throw new ClassGroupDeleteBlockedError('ACTIVE_ENROLLMENTS');
	}

	const classSubjects = await listOrEmpty(() =>
		client.entities.classSubjects.list(classGroupScope(classGroupId)),
	);
	const classSubjectIds = classSubjects.map(entry => entry.id);

	const [
		teacherAssignmentsByClass,
		teacherAssignmentsBySubject,
		staffAssignments,
		resourceAssignments,
		schedules,
		lessonSessions,
		activitySessions,
		assessments,
		enrollments,
		classSubjectMatters,
		attendances,
	] = await Promise.all([
		listOrEmpty(() => client.entities.teacherAssignments.list(classGroupScope(classGroupId))),
		classSubjectIds.length > 0
			? listOrEmpty(() => client.entities.teacherAssignments.list(
					teacherAssignmentsForClassSubjects(classSubjectIds),
				))
			: Promise.resolve([]),
		listOrEmpty(() => client.entities.staffAssignments.list(classGroupScope(classGroupId))),
		listOrEmpty(() => client.entities.resourceAssignments.list(classGroupScope(classGroupId))),
		listOrEmpty(() => client.entities.schedules.list(classGroupScope(classGroupId))),
		listOrEmpty(() => client.entities.lessonSessions.list(classGroupScope(classGroupId))),
		listOrEmpty(() => client.entities.activitySessions.list(classGroupScope(classGroupId))),
		listOrEmpty(() => client.entities.assessments.list(classGroupScope(classGroupId))),
		listOrEmpty(() => client.entities.enrollments.list(classGroupScope(classGroupId))),
		classSubjectIds.length > 0
			? listOrEmpty(() => client.entities.classSubjectMatters.list(
					recordsForFieldIds('classSubjectId', classSubjectIds),
				))
			: Promise.resolve([]),
		listOrEmpty(() => client.entities.attendances.list(classGroupScope(classGroupId))),
	]);

	await deleteEntityIds(
		id => client.entities.teacherAssignments.delete({ id }),
		client.entities.teacherAssignments.batchDelete.bind(client.entities.teacherAssignments),
		[
			...teacherAssignmentsByClass.map(entry => entry.id),
			...teacherAssignmentsBySubject.map(entry => entry.id),
		],
	);

	await deleteEntityIds(
		id => client.entities.staffAssignments.delete({ id }),
		client.entities.staffAssignments.batchDelete.bind(client.entities.staffAssignments),
		staffAssignments.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.resourceAssignments.delete({ id }),
		client.entities.resourceAssignments.batchDelete.bind(client.entities.resourceAssignments),
		resourceAssignments.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.lessonSessions.delete({ id }),
		client.entities.lessonSessions.batchDelete.bind(client.entities.lessonSessions),
		lessonSessions.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.activitySessions.delete({ id }),
		client.entities.activitySessions.batchDelete.bind(client.entities.activitySessions),
		activitySessions.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.schedules.delete({ id }),
		client.entities.schedules.batchDelete.bind(client.entities.schedules),
		schedules.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.assessments.delete({ id }),
		client.entities.assessments.batchDelete.bind(client.entities.assessments),
		assessments.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.attendances.delete({ id }),
		client.entities.attendances.batchDelete.bind(client.entities.attendances),
		attendances.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.enrollments.delete({ id }),
		client.entities.enrollments.batchDelete.bind(client.entities.enrollments),
		enrollments.map(entry => entry.id),
	);

	const subjectMatterIds = [...new Set(classSubjectMatters.map(entry => entry.subjectMatterId))];

	await deleteEntityIds(
		id => client.entities.classSubjectMatters.delete({ id }),
		client.entities.classSubjectMatters.batchDelete.bind(client.entities.classSubjectMatters),
		classSubjectMatters.map(entry => entry.id),
	);

	await deleteEntityIds(
		id => client.entities.subjectMatters.delete({ id }),
		client.entities.subjectMatters.batchDelete.bind(client.entities.subjectMatters),
		subjectMatterIds,
	);

	await deleteEntityIds(
		id => client.entities.classSubjects.delete({ id }),
		client.entities.classSubjects.batchDelete.bind(client.entities.classSubjects),
		classSubjectIds,
	);
}
