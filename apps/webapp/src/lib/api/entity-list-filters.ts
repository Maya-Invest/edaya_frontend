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
	fetchPage: (query: EntityQuery) => Promise<readonly T[] | null | undefined>,
	options?: {
		baseQuery?: EntityQuery;
		pageSize?: number;
		signal?: AbortSignal;
	},
): Promise<T[]> {
	const pageSize = options?.pageSize ?? CATALOG_LIST_PAGE_SIZE;
	const baseQuery = options?.baseQuery ?? {};
	const all: T[] = [];
	let offset = 0;

	while (true) {
		options?.signal?.throwIfAborted();
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

/** Alias used by catalog and export loaders that must not stop at the first page. */
export const listCompleteCollection = listAllEntityPages;

export function chunkIds(ids: readonly string[], size = DEFAULT_LIST_PAGE_SIZE): string[][] {
	if (!Number.isInteger(size) || size < 1) {
		throw new RangeError('Batch size must be a positive integer');
	}
	const unique = uniqueIds(ids);
	const chunks: string[][] = [];
	for (let index = 0; index < unique.length; index += size) {
		chunks.push(unique.slice(index, index + size));
	}
	return chunks;
}

export async function listAllEntityPagesForIdFilters<T>(
	fetchPage: (query: EntityQuery) => Promise<readonly T[] | null | undefined>,
	filters: ReadonlyArray<{ field: string; ids: readonly string[] }>,
	options?: {
		extraQuery?: EntityQuery;
		pageSize?: number;
		batchSize?: number;
		signal?: AbortSignal;
	},
): Promise<T[]> {
	if (filters.some(filter => uniqueIds(filter.ids).length === 0)) {
		return [];
	}

	const batchSize = options?.batchSize ?? DEFAULT_LIST_PAGE_SIZE;
	const batched = filters.map(filter => ({
		field: filter.field,
		batches: chunkIds(filter.ids, batchSize),
	}));

	// Produce the Cartesian product lazily and preserve its ordering in the result.
	function* queries(index: number, query: EntityQuery): Generator<EntityQuery> {
		if (index === batched.length) {
			yield query;
			return;
		}
		const { field, batches } = batched[index]!;
		for (const batch of batches) {
			yield* queries(index + 1, { ...query, [field]: { $in: batch } });
		}
	}

	const remaining = queries(0, options?.extraQuery ?? {});
	const pages: T[][] = [];
	async function readBatches() {
		try {
			for (const query of remaining) {
				const position = pages.length;
				pages.push([]);
				pages[position] = await listAllEntityPages(fetchPage, {
					baseQuery: query,
					pageSize: options?.pageSize,
					signal: options?.signal,
				});
			}
		}
		catch (error) {
			remaining.return(undefined);
			throw error;
		}
	}
	await Promise.all(Array.from({ length: 4 }, readBatches));
	return pages.flat();
}

export function listAllEntityPagesByIds<T>(
	fetchPage: (query: EntityQuery) => Promise<readonly T[] | null | undefined>,
	ids: readonly string[],
	options?: {
		extraQuery?: EntityQuery;
		pageSize?: number;
		batchSize?: number;
		signal?: AbortSignal;
	},
): Promise<T[]> {
	return listAllEntityPagesForIdFilters(fetchPage, [{ field: 'id', ids }], options);
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
	return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
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

export function enrollmentsForStudents(studentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentId', studentIds);
}

export function studentChargesForStudents(studentIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('studentId', studentIds);
}

export function paymentsForAccounts(accountIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('accountId', accountIds);
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

export function subjectsForLevels(gradeLevelIds: readonly string[]): EntityQuery {
	return recordsForFieldIds('gradeLevelId', gradeLevelIds);
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
