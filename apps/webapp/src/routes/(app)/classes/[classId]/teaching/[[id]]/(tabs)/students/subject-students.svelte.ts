import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { EnrollmentEditorContext } from '$lib/subjects/enrollment-editor';
import { listAllEntityPages, listAllEntityPagesByIds } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { resolvePageLoad } from '$lib/queries/page-status';
import { SvelteDate, SvelteMap } from 'svelte/reactivity';

export async function loadSubjectRosterCandidates(context: EnrollmentEditorContext) {
	const client = getBrowserSchoolClient();
	const now = new SvelteDate().toISOString();
	const placements = await listAllEntityPages(query => client.entities.enrollments.list(query), {
		baseQuery: { classGroupId: context.classGroupId, academicYearId: context.academicYearId, status: 'active' },
	});
	const active = placements.filter(row => !row.endedAt || row.endedAt > now);
	const students = await listAllEntityPagesByIds(query => client.entities.students.list(query), active.map(row => row.studentId));
	const byId = new SvelteMap(students.map(student => [student.id, student]));
	return active.map((placement) => {
		const student = byId.get(placement.studentId);
		return { id: placement.studentId, name: student ? `${student.lastName} ${student.firstName}` : placement.studentId, enrollmentId: placement.id };
	});
}

export class SubjectStudentsState {
	private readonly versioned = new VersionedRouteQuery(new RouteVersionSnapshot(['subjectEnrollments', 'enrollments', 'subjects']));
	invalidateIfStale = () => this.versioned.invalidateIfStale();
	roster = $state<components['schemas']['ClassSubjectRosterResponse'] | null>(null);

	query(classSubjectId: string) {
		return this.versioned.track((url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const at = url.searchParams.get('rosterAt') ?? new SvelteDate().toISOString();
				const roster = await getBrowserSchoolClient().queries.getClassSubjectRoster({ classSubjectId, at });
				signal.throwIfAborted();
				this.roster = roster;
				return {};
			},
			hasItems: () => true,
		}, request));
	}
}
