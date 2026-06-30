import type { EntityQuery } from '@edaya/api-client';

export const DEFAULT_LIST_PAGE_SIZE = 50;

export function pageToOffset(page: number, pageSize = DEFAULT_LIST_PAGE_SIZE): number {
	const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
	return (safePage - 1) * pageSize;
}

export function paginatedList(
	query: EntityQuery = {},
	options?: {
		limit?: number;
		offset?: number;
		orderBy?: EntityQuery['$orderBy'];
	},
): EntityQuery {
	return {
		...query,
		$limit: options?.limit ?? DEFAULT_LIST_PAGE_SIZE,
		$offset: options?.offset ?? 0,
		...(options?.orderBy ? { $orderBy: options.orderBy } : {}),
	};
}

export const STUDENT_LIST_ORDER: EntityQuery['$orderBy'] = [
	{ field: 'lastName', direction: 'asc' },
	{ field: 'firstName', direction: 'asc' },
];

export const GUARDIAN_LIST_ORDER: EntityQuery['$orderBy'] = [
	{ field: 'lastName', direction: 'asc' },
	{ field: 'firstName', direction: 'asc' },
];

export const STAFF_LIST_ORDER: EntityQuery['$orderBy'] = [
	{ field: 'lastName', direction: 'asc' },
	{ field: 'firstName', direction: 'asc' },
];

/**
 * Documented unscoped entity list read.
 * Use only when a route intentionally loads a school-wide collection.
 */
export function schoolWideEntityList(_reason: string): EntityQuery {
	return {};
}

const CONFIG_SUBJECTS_SCOPE
	= 'Configuration subjects screen intentionally loads the school-wide subject catalog until route-level pagination is added.';

export const schoolSubjectsCatalogList = () => schoolWideEntityList(CONFIG_SUBJECTS_SCOPE);

export function uniqueIds(ids: readonly string[]): string[] {
	return [...new Set(ids)];
}

export function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
	const seen = new Map<string, T>();
	for (const item of items) {
		seen.set(item.id, item);
	}
	return [...seen.values()];
}

export function classGroupScope(classGroupId: string): EntityQuery {
	return { classGroupId };
}

export function activeEnrollmentsForClass(classGroupId: string): EntityQuery {
	return { classGroupId, status: 'active' };
}

export function activeEnrollmentsForYear(academicYearId: string): EntityQuery {
	return { academicYearId, status: 'active' };
}

/** Count filter alias used by shell and class roster loaders. */
export const activeEnrollmentCountForClass = activeEnrollmentsForClass;

export function assessmentsForClassPeriod(classGroupId: string, periodId: string): EntityQuery {
	return { classGroupId, periodId };
}

export function recordsForFieldIds(field: string, ids: readonly string[]): EntityQuery {
	if (ids.length === 0) {
		return { [field]: { $in: ['__no_match__'] } };
	}
	return { [field]: { $in: [...ids] } };
}

export function entitiesByIds(ids: readonly string[]): EntityQuery {
	return recordsForFieldIds('id', ids);
}

export function guardiansByIds(ids: readonly string[]): EntityQuery {
	return entitiesByIds(ids);
}

export function staffMembersByIds(ids: readonly string[]): EntityQuery {
	return entitiesByIds(ids);
}

export function resourcesByIds(ids: readonly string[]): EntityQuery {
	return entitiesByIds(ids);
}

export function guardianLinksForStudents(studentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentId', studentIds);
}

export function guardianLinksForGuardians(guardianIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('guardianId', guardianIds);
}

export function pendingAccountInvitationForTarget(
	kind: 'staff' | 'guardian' | 'student',
	targetId: string,
): EntityQuery {
	return {
		kind,
		targetId,
		status: 'pending',
		$limit: 1,
	};
}

export function deliveriesForSubject(subjectId: string): EntityQuery {
	return { subjectId };
}

export function enrollmentsForStudents(studentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentId', studentIds);
}

export function studentFeesForStudents(studentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentId', studentIds);
}

export function paymentsForStudentFees(studentFeeIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentFeeId', studentFeeIds);
}

export function enrollmentsForStudentsInYear(
	studentIds: readonly string[],
	academicYearId: string,
): EntityQuery {
	return {
		...recordsForFieldIds('studentId', studentIds),
		academicYearId,
		status: 'active',
	};
}

export function recordsForStudent(studentId: string): EntityQuery {
	return { studentId };
}

export function attendanceForStudents(studentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentId', studentIds);
}

export function assessmentResultsForStudents(studentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentId', studentIds);
}

export function assessmentResultsForAssessments(assessmentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('assessmentId', assessmentIds);
}

export function assessmentResultsForScope(
	assessmentIds: readonly string[],
	studentIds: readonly string[],
): EntityQuery {
	return {
		...recordsForFieldIds('assessmentId', assessmentIds),
		...recordsForFieldIds('studentId', studentIds),
	};
}

export function reportCardResultsForClassPeriod(
	classGroupId: string,
	periodId: string,
): EntityQuery {
	return { classGroupId, periodId };
}

export function assignmentsForSessions(sessionIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('sessionId', sessionIds);
}

export function sessionsForClasses(classGroupIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('classGroupId', classGroupIds);
}

export function attendanceForSessions(sessionIds: readonly string[]): EntityQuery {
	return {
		...recordsForFieldIds('sessionId', sessionIds),
		status: 'absent',
	};
}

export function involvementsForIncidents(incidentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('incidentId', incidentIds);
}

export function activityEnrollmentsForActivities(activityIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('activityId', activityIds);
}

export function staffAssignmentsForStaff(staffIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('staffId', staffIds);
}

export function staffRoleAssignmentsForStaff(staffIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('staffId', staffIds);
}

export function classSubjectsForClasses(classGroupIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('classGroupId', classGroupIds);
}

export function assignmentsForClassSubjects(classSubjectIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('classSubjectId', classSubjectIds);
}

export function submissionsForHomeworkAssignments(assignmentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('homeworkAssignmentId', assignmentIds);
}

export function subjectMattersForSubjects(subjectIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('subjectId', subjectIds);
}
