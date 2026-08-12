import type { EntityQuery } from '@maya-invest/edaya-api-client';

export const DEFAULT_LIST_PAGE_SIZE = 50;

/** Matches API `MAX_LIST_LIMIT` — use for school-wide catalog loads that exceed the default 50. */
export const CATALOG_LIST_PAGE_SIZE = 500;

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

/**
 * Fetches every page of an entity list until a short/empty page.
 * Prefer this for school-wide catalogs that exceed `DEFAULT_LIST_PAGE_SIZE`.
 */
export async function listAllEntityPages<T>(
	fetchPage: (query: EntityQuery) => Promise<T[] | null | undefined>,
	options?: {
		baseQuery?: EntityQuery;
		pageSize?: number;
	},
): Promise<T[]> {
	const pageSize = options?.pageSize ?? CATALOG_LIST_PAGE_SIZE;
	const baseQuery = options?.baseQuery ?? {};
	const all: T[] = [];
	let offset = 0;

	while (true) {
		const page = (await fetchPage(paginatedList(baseQuery, {
			limit: pageSize,
			offset,
		}))) ?? [];
		all.push(...page);
		if (page.length < pageSize) {
			break;
		}
		offset += pageSize;
	}

	return all;
}

export const ENROLLMENT_LIST_ORDER: EntityQuery['$orderBy'] = [
	{ field: 'studentId', direction: 'asc' },
];

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
 * School-scoped entity list read.
 * Prefer this for school-wide roster/catalog loads on multi-tenant databases.
 */
export function schoolScopedEntityList(schoolId: string, _reason?: string): EntityQuery {
	return { schoolId };
}

/**
 * Documented unscoped entity list read.
 * Use only when a route intentionally loads a school-wide collection.
 * Pair with `listAllEntityPages` when the collection can exceed the default list limit.
 * @deprecated Prefer `schoolScopedEntityList` when the session school is known.
 */
export function schoolWideEntityList(_reason: string): EntityQuery {
	return {};
}

const CONFIG_SUBJECTS_SCOPE
	= 'Configuration subjects screen loads the school-wide subject catalog via paginated listAllEntityPages.';

export function schoolSubjectsCatalogList(schoolId: string): EntityQuery {
	return {
		...schoolWideEntityList(CONFIG_SUBJECTS_SCOPE),
		schoolId,
	};
}

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

export function homeworkAssessmentsForClass(classGroupId: string, periodId?: string): EntityQuery {
	return periodId
		? { classGroupId, periodId, kind: 'homework' }
		: { classGroupId, kind: 'homework' };
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
	kind: 'staff' | 'guardian' | 'student' | 'teacher',
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

export function attendancesForClass(classGroupId: string): EntityQuery {
	return { classGroupId };
}

export function attendanceRecordsForOccurrences(occurrenceIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('attendanceId', occurrenceIds);
}

export function classActivityEnrollmentsForClass(classGroupId: string): EntityQuery {
	return { classGroupId };
}

export function classActivityEnrollmentForActivityClass(
	activityId: string,
	classGroupId: string,
): EntityQuery {
	return { activityId, classGroupId, $limit: 1 };
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

export function assignmentsForLessonSessions(lessonSessionIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('lessonSessionId', lessonSessionIds);
}

export function assignmentsForActivitySessions(activitySessionIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('activitySessionId', activitySessionIds);
}

export function assignmentsForAssessments(assessmentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('assessmentId', assessmentIds);
}

export function lessonSessionsForClasses(classGroupIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('classGroupId', classGroupIds);
}

export function attendanceForLessonSessions(lessonSessionIds: readonly string[]): EntityQuery {
	return {
		...recordsForFieldIds('lessonSessionId', lessonSessionIds),
		status: 'absent',
	};
}

export function progressForLessonSessions(lessonSessionIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('lessonSessionId', lessonSessionIds);
}

export function disciplinaryActionsForIncident(incidentId: string): EntityQuery {
	return { incidentId };
}

export function involvementsForIncidents(incidentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('incidentId', incidentIds);
}

export function activityEnrollmentsForActivities(activityIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('activityId', activityIds);
}

export function classActivityEnrollmentsForActivities(activityIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('activityId', activityIds);
}

export function staffAssignmentsForClassGroup(classGroupId: string): EntityQuery {
	return { classGroupId };
}

export function staffAssignmentsForStaff(staffIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('staffId', staffIds);
}

export function classSubjectsForClasses(classGroupIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('classGroupId', classGroupIds);
}

export function assignmentsForClassSubjects(classSubjectIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('classSubjectId', classSubjectIds);
}

export function teacherAssignmentsForClassSubjects(classSubjectIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('classSubjectId', classSubjectIds);
}

export function teacherAssignmentsForTeachers(teacherIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('teacherId', teacherIds);
}

export function subjectMattersForSubjects(subjectIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('subjectId', subjectIds);
}
