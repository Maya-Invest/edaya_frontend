import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { LogEntry } from '$lib/types/teaching-log';
import {
	assignmentsForClassSubjects,
	classGroupScope,
	entitiesByIds,
	progressForLessonSessions,
	staffMembersByIds,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type LessonSessionRaw = components['schemas']['LessonSession'];
type ClassSubjectProgressRaw = components['schemas']['ClassSubjectProgress'];
type ClassSubjectMatterRaw = components['schemas']['ClassSubjectMatter'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];
type StaffMemberRaw = components['schemas']['StaffMember'];
type StaffAssignmentRaw = components['schemas']['StaffAssignment'];

export interface TeachingLogSources {
	lessonSessionsRaw: LessonSessionRaw[];
	classSubjectProgressRaw: ClassSubjectProgressRaw[];
	classSubjectMattersRaw: ClassSubjectMatterRaw[];
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	staffMembersRaw: StaffMemberRaw[];
	staffAssignmentsRaw: StaffAssignmentRaw[];
}

function formatDate(value: unknown): string {
	if (!value) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	return String(value).slice(0, 10);
}

function subjectNameForClassSubject(
	classSubjectId: string,
	classSubjectsRaw: ClassSubjectRaw[],
	subjectsRaw: SubjectRaw[],
): string {
	const classSubject = classSubjectsRaw.find(entry => entry.id === classSubjectId);
	if (!classSubject) {
		return 'Unknown subject';
	}

	const subject = subjectsRaw.find(entry => entry.id === classSubject.subjectId);
	return subject?.name ?? 'Unknown subject';
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

export async function fetchClassTeachingLogSources(
	client: SchoolClient,
	classGroupId: string,
): Promise<TeachingLogSources> {
	const [
		lessonSessionsRaw,
		classSubjectsRaw,
	] = await Promise.all([
		client.entities.lessonSessions.list(classGroupScope(classGroupId)),
		client.entities.classSubjects.list(classGroupScope(classGroupId)),
	]);

	const lessonSessionIds = uniqueIds((lessonSessionsRaw ?? []).map(session => session.id));
	const classSubjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.id));
	const subjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.subjectId));

	const [
		classSubjectProgressRaw,
		classSubjectMattersRaw,
		staffAssignmentsRaw,
		subjectsRaw,
	] = await Promise.all([
		lessonSessionIds.length > 0
			? client.entities.classSubjectProgress.list(progressForLessonSessions(lessonSessionIds))
			: Promise.resolve([]),
		classSubjectIds.length > 0
			? client.entities.classSubjectMatters.list(assignmentsForClassSubjects(classSubjectIds))
			: Promise.resolve([]),
		classSubjectIds.length > 0
			? safeOptionalEntityList(() =>
					client.entities.staffAssignments.list(assignmentsForClassSubjects(classSubjectIds)))
			: Promise.resolve([]),
		subjectIds.length > 0
			? client.entities.subjects.list(entitiesByIds(subjectIds))
			: Promise.resolve([]),
	]);

	const staffIds = uniqueIds((staffAssignmentsRaw ?? []).map(assignment => assignment.staffId));
	const staffMembersRaw = staffIds.length > 0
		? await safeOptionalEntityList(() => client.entities.staffMembers.list(staffMembersByIds(staffIds)))
		: [];

	return {
		lessonSessionsRaw: lessonSessionsRaw ?? [],
		classSubjectProgressRaw: classSubjectProgressRaw ?? [],
		classSubjectMattersRaw: classSubjectMattersRaw ?? [],
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
		staffMembersRaw: staffMembersRaw ?? [],
		staffAssignmentsRaw: staffAssignmentsRaw ?? [],
	};
}

function matterNameForProgress(
	progress: ClassSubjectProgressRaw,
	classSubjectMattersRaw: ClassSubjectMatterRaw[],
	subjectMattersRaw: components['schemas']['SubjectMatter'][] = [],
): string {
	const link = classSubjectMattersRaw.find(entry => entry.id === progress.classSubjectMatterId);
	if (!link) {
		return '';
	}
	const matter = subjectMattersRaw.find(entry => entry.id === link.subjectMatterId);
	return matter?.name ?? '';
}

export function mapTeachingLogEntries(
	sources: TeachingLogSources,
	subjectName?: string,
): LogEntry[] {
	const progressBySession = new Map<string, ClassSubjectProgressRaw[]>();
	for (const progress of sources.classSubjectProgressRaw) {
		const current = progressBySession.get(progress.lessonSessionId) ?? [];
		current.push(progress);
		progressBySession.set(progress.lessonSessionId, current);
	}

	return sources.lessonSessionsRaw
		.filter((session) => {
			if (!subjectName) {
				return true;
			}
			return subjectNameForClassSubject(
				session.classSubjectId,
				sources.classSubjectsRaw,
				sources.subjectsRaw,
			) === subjectName;
		})
		.map((session) => {
			const subject = subjectNameForClassSubject(
				session.classSubjectId,
				sources.classSubjectsRaw,
				sources.subjectsRaw,
			);
			const progressRecords = progressBySession.get(session.id) ?? [];
			const primaryProgress = progressRecords[0];
			const averageProgress = progressRecords.length > 0
				? Math.round(
						progressRecords.reduce((sum, entry) => sum + entry.completedPercentage, 0)
						/ progressRecords.length,
					)
				: 0;

			return {
				id: session.id,
				classId: session.classGroupId,
				date: formatDate(session.startsAt),
				subject,
				teacher: teacherNameForClassSubject(
					session.classSubjectId,
					sources.staffAssignmentsRaw,
					sources.staffMembersRaw,
				),
				chapter: primaryProgress
					? matterNameForProgress(primaryProgress, sources.classSubjectMattersRaw)
					: session.displayLabel,
				content: session.sessionNote ?? '',
				objectives: primaryProgress?.notes ? [primaryProgress.notes] : [],
				homework: undefined,
				attachments: undefined,
				progress: primaryProgress?.completedPercentage ?? averageProgress,
			} satisfies LogEntry;
		})
		.sort((left, right) => (left.date < right.date ? 1 : -1));
}

export async function fetchTeachingLogEntries(
	classGroupId: string,
	client?: SchoolClient,
	options?: { subjectName?: string },
): Promise<LogEntry[]> {
	const resolvedClient = client ?? (await import('$lib/api/school-client')).getBrowserSchoolClient();
	const sources = await fetchClassTeachingLogSources(resolvedClient, classGroupId);
	return mapTeachingLogEntries(sources, options?.subjectName);
}
