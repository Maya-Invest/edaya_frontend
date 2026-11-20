import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { StudentListFilters } from '$lib/list/list-url-filters';
import type { Student } from '$lib/types/school';
import { studentListUsesFullRoster } from './student-list-filters';

export type DirectoryQuery = NonNullable<Parameters<ReturnType<typeof getBrowserSchoolClient>['queries']['getStudentDirectory']>[0]>;

export function schoolDirectoryQuery(filters: StudentListFilters, periodId?: string | null): DirectoryQuery {
	const classGroupId = filters.class === 'all' ? undefined : filters.class;
	return {
		q: filters.q.trim() || undefined,
		classGroupId,
		periodId: classGroupId && studentListUsesFullRoster(filters) ? periodId || undefined : undefined,
		status: (['active', 'inactive', 'graduated', 'archived'] as const).find(value => value === filters.status),
		photoReview: filters.photoReview === 'pending' ? 'pending' : undefined,
		sort: (['roster', 'name', 'class', 'status', 'average', 'attendance'] as const).find(value => value === filters.sort),
		sortDir: filters.sortDir === 'desc' ? 'desc' : 'asc',
	};
}

export async function readDirectoryPage(
	client: ReturnType<typeof getBrowserSchoolClient>,
	query: DirectoryQuery,
	offset: number,
	limit: number,
	signal: AbortSignal,
) {
	const page = await client.queries.getStudentDirectory({ ...query, offset, limit }, { signal });
	const students: Student[] = page.rows.map(row => ({
		...row,
		name: `${row.firstName} ${row.lastName}`,
		initials: (row.firstName[0] ?? '') + (row.lastName[0] ?? ''),
		email: '',
		birthdate: row.birthdate ?? '',
		classId: row.classId ?? '',
		enrollmentId: row.enrollmentId ?? undefined,
		guardian: row.guardianName ?? 'Non renseigné',
		photoUrl: row.photoAttachmentId ? `/core/files/${encodeURIComponent(row.photoAttachmentId)}/content` : row.photoUrl,
		average: row.average ?? 0,
		gradesAvailable: row.average !== null,
		academicBadge: row.average === null ? null : row.average >= 16 ? 'honor' : row.average > 0 && row.average < 10 ? 'warning' : null,
	}));
	return { students, total: page.total };
}
